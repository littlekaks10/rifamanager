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

export async function carregarConfiguracao(): Promise<Configuracao> {
  const linha = conferir<Configuracao>(
    await supabase
      .from("configuracao")
      .select("id, titulo, total_numeros, valor_numero")
      .eq("id", 1)
      .maybeSingle(),
    "configuracao",
  );

  return { ...linha, valor_numero: Number(linha.valor_numero) };
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
