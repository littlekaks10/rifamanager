import "server-only";

import { supabase } from "./supabase";
import { montarPanorama, type Panorama } from "./conflitos";
import type { Movimento } from "./historico";
import type { Atribuicao, Comprador, Configuracao, Meta } from "./types";

/**
 * Leitura do banco. Tudo aqui roda no servidor da Vercel — o celular só recebe
 * o resultado já pronto, nunca a chave de acesso.
 */

/** Se algo der errado, mostra a mensagem do Supabase em vez de uma tela branca. */
function conferir<T>(
  resultado: { data: T | null; error: unknown },
  onde: string,
): NonNullable<T> {
  if (resultado.error) {
    const msg =
      typeof resultado.error === "object" &&
      resultado.error !== null &&
      "message" in resultado.error
        ? String((resultado.error as { message: unknown }).message)
        : String(resultado.error);
    throw new Error(`Erro ao ler "${onde}" no Supabase: ${msg}`);
  }
  if (resultado.data === null || resultado.data === undefined) {
    throw new Error(`Nada encontrado em "${onde}". Você já rodou os arquivos SQL?`);
  }
  return resultado.data as NonNullable<T>;
}

const CAMPOS_BASE = "id, titulo, total_numeros, valor_numero";
const CAMPOS_CONFERENCIA = "saldo_banco, rendimento_banco, conferido_em";

export async function carregarConfiguracao(): Promise<Configuracao> {
  // Tenta com as colunas da conferência. Se elas ainda não existirem (você não
  // rodou o 05_conferencia.sql), lê sem elas em vez de derrubar a página.
  let resposta = await supabase
    .from("configuracao")
    .select(`${CAMPOS_BASE}, ${CAMPOS_CONFERENCIA}`)
    .eq("id", 1)
    .maybeSingle();

  let temConferencia = true;

  if (resposta.error) {
    temConferencia = false;
    resposta = await supabase
      .from("configuracao")
      .select(CAMPOS_BASE)
      .eq("id", 1)
      .maybeSingle();
  }

  const linha = conferir<Configuracao>(resposta, "configuracao");

  // O Postgres devolve numeric como texto; "== null" pega null e undefined de
  // uma vez, que é o que chega quando a coluna nem foi lida.
  const numeroOuNulo = (v: unknown) =>
    !temConferencia || v == null ? null : Number(v);

  return {
    ...linha,
    valor_numero: Number(linha.valor_numero),
    saldo_banco: numeroOuNulo(linha.saldo_banco),
    rendimento_banco: numeroOuNulo(linha.rendimento_banco),
    conferido_em: temConferencia ? (linha.conferido_em ?? null) : null,
  };
}

export async function carregarPanorama(): Promise<Panorama> {
  const [config, compradores, atribuicoes] = await Promise.all([
    carregarConfiguracao(),
    supabase
      .from("compradores")
      .select("id, nome, telefone, status")
      .order("nome")
      .then((r) => conferir<Comprador[]>(r, "compradores")),
    supabase
      .from("atribuicoes")
      .select("id, numero, comprador_id")
      .order("numero")
      .then((r) => conferir<Atribuicao[]>(r, "atribuicoes")),
  ]);

  return montarPanorama(config, compradores, atribuicoes);
}

export type Apoio = {
  id: string;
  descricao: string;
  valor: number;
  recebido_em: string;
};

/**
 * Os apoios: dinheiro que entrou sem ser venda de número.
 *
 * Como em `carregarMovimentos`, se a tabela ainda não existir (você não rodou
 * o 04_apoios.sql) o app não quebra — devolve vazio e a tela avisa.
 */
export async function carregarApoios(): Promise<{
  apoios: Apoio[];
  total: number;
  /** -1 quando a tabela ainda não existe no banco. */
  quantidade: number;
}> {
  const { data, error } = await supabase
    .from("apoios")
    .select("id, descricao, valor, recebido_em")
    .order("recebido_em", { ascending: false });

  if (error) {
    console.error("[apoios] não consegui ler:", error.message);
    return { apoios: [], total: 0, quantidade: -1 };
  }

  const apoios = (data ?? []).map((a) => ({ ...a, valor: Number(a.valor) }));

  return {
    apoios,
    total: apoios.reduce((s, a) => s + a.valor, 0),
    quantidade: apoios.length,
  };
}

/**
 * O extrato do caixa, do mais recente para o mais antigo.
 *
 * Trazemos no máximo 200 linhas para a tela não pesar no celular, mas o total
 * vem junto para o app poder dizer "mostrando 200 de 431".
 */
export async function carregarMovimentos(): Promise<{
  movimentos: Movimento[];
  total: number;
  saldo: number;
}> {
  const { data, error, count } = await supabase
    .from("movimentos")
    .select("id, ocorrido_em, tipo, descricao, valor, comprador_nome, meta_descricao, numeros", {
      count: "exact",
    })
    .order("ocorrido_em", { ascending: false })
    .limit(200);

  // Se a tabela ainda não existe (você não rodou o 03_historico.sql), o app
  // não quebra: mostra o extrato vazio com um aviso na tela.
  if (error) {
    console.error("[historico] não consegui ler:", error.message);
    return { movimentos: [], total: -1, saldo: 0 };
  }

  const movimentos = (data ?? []).map((m) => ({
    ...m,
    valor: Number(m.valor),
  })) as Movimento[];

  // O saldo tem de somar TUDO, não só as 200 linhas mostradas.
  const { data: todos } = await supabase.from("movimentos").select("valor");
  const saldo = (todos ?? []).reduce((s, m) => s + Number(m.valor), 0);

  return { movimentos, total: count ?? movimentos.length, saldo };
}

export async function carregarMetas(): Promise<Meta[]> {
  const linhas = conferir<Meta[]>(
    await supabase
      .from("metas")
      .select("id, descricao, valor, ordem, pago")
      .order("ordem")
      .order("criado_em"),
    "metas",
  );

  return linhas.map((m) => ({ ...m, valor: Number(m.valor) }));
}
