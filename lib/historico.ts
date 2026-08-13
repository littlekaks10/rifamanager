import "server-only";

import { supabase } from "./supabase";
import { faixas } from "./formato";

/**
 * O MOTOR DO EXTRATO DO CAIXA.
 *
 * A ideia central: em vez de tentar tratar cada ação em separado ("marcou
 * pago", "ganhou número", "perdeu número", "foi excluído") — que é onde esse
 * tipo de recurso costuma furar, porque sempre escapa um caminho —, o app mede
 * quanto cada pessoa representa em caixa ANTES e DEPOIS da ação, e registra
 * apenas a diferença.
 *
 *    valor da pessoa = (está paga ? quantidade de números : 0) × valor do número
 *
 * Uma conta só cobre todos os casos, e o extrato nunca fica devendo uma linha.
 */

export type TipoMovimento =
  | "abertura"
  | "pagamento"
  | "estorno"
  | "meta_paga"
  | "meta_estornada"
  | "ajuste";

export type Movimento = {
  id: string;
  ocorrido_em: string;
  tipo: TipoMovimento;
  descricao: string;
  valor: number;
  comprador_nome: string | null;
  meta_descricao: string | null;
  numeros: number[] | null;
};

/**
 * Grava uma linha do extrato.
 *
 * Nunca derruba a ação principal: se o registro falhar, o pagamento continua
 * salvo e o erro vai para o log do servidor. O histórico é importante, mas não
 * pode ser o motivo de você perder um lançamento.
 */
export async function registrar(m: {
  tipo: TipoMovimento;
  descricao: string;
  valor: number;
  comprador_nome?: string | null;
  meta_descricao?: string | null;
  numeros?: number[] | null;
}): Promise<void> {
  try {
    const { error } = await supabase.from("movimentos").insert({
      tipo: m.tipo,
      descricao: m.descricao,
      valor: m.valor,
      comprador_nome: m.comprador_nome ?? null,
      meta_descricao: m.meta_descricao ?? null,
      numeros: m.numeros && m.numeros.length > 0 ? m.numeros : null,
    });
    if (error) console.error("[historico] não registrou:", error.message);
  } catch (e) {
    console.error("[historico] não registrou:", e);
  }
}

/* ------------------------------------------------------------------ */
/* A fotografia de um comprador                                        */
/* ------------------------------------------------------------------ */

type Foto = {
  existe: boolean;
  nome: string;
  status: string;
  numeros: number[];
  valor: number;
};

const FOTO_VAZIA: Foto = {
  existe: false,
  nome: "",
  status: "inexistente",
  numeros: [],
  valor: 0,
};

async function valorDoNumero(): Promise<number> {
  const { data } = await supabase
    .from("configuracao")
    .select("valor_numero")
    .eq("id", 1)
    .maybeSingle();
  return Number(data?.valor_numero ?? 0);
}

async function fotografar(compradorId: string, preco: number): Promise<Foto> {
  const [{ data: c }, { data: atrs }] = await Promise.all([
    supabase
      .from("compradores")
      .select("nome, status")
      .eq("id", compradorId)
      .maybeSingle(),
    supabase.from("atribuicoes").select("numero").eq("comprador_id", compradorId),
  ]);

  if (!c) return FOTO_VAZIA;

  const numeros = (atrs ?? []).map((a) => a.numero).sort((x, y) => x - y);

  return {
    existe: true,
    nome: c.nome,
    status: c.status,
    numeros,
    // Só quem está PAGO representa dinheiro em caixa.
    valor: c.status === "pago" ? numeros.length * preco : 0,
  };
}

/**
 * Envolve uma ação sobre compradores e lança no extrato o que ela mudou no caixa.
 *
 * Só registra se a ação der certo e se o valor realmente mudar — mexer no
 * telefone de alguém, por exemplo, não gera linha nenhuma.
 */
export async function comRegistro<T extends { ok: boolean }>(
  compradorIds: string[],
  acao: () => Promise<T>,
  /**
   * Para ações que CRIAM o comprador (aí o id só existe depois de rodar).
   * Quem aparece aqui e não estava na lista de antes começa valendo zero,
   * que é exatamente a verdade: a pessoa não existia.
   */
  idsDepois?: () => string[],
): Promise<T> {
  const ids = [...new Set(compradorIds.filter(Boolean))];

  let preco = 0;
  const antes = new Map<string, Foto>();

  try {
    preco = await valorDoNumero();
    for (const id of ids) antes.set(id, await fotografar(id, preco));
  } catch (e) {
    console.error("[historico] não consegui fotografar antes:", e);
  }

  const resultado = await acao();
  if (!resultado.ok) return resultado;

  try {
    const alvos = [...new Set([...ids, ...(idsDepois?.() ?? [])])].filter(Boolean);

    for (const id of alvos) {
      const a = antes.get(id) ?? FOTO_VAZIA;
      const d = await fotografar(id, preco);
      const delta = d.valor - a.valor;
      if (delta === 0) continue;

      await registrar({
        tipo: delta > 0 ? "pagamento" : "estorno",
        valor: delta,
        comprador_nome: a.nome || d.nome,
        numeros: numerosDaMudanca(a, d),
        descricao: descrever(a, d, delta),
      });
    }
  } catch (e) {
    console.error("[historico] não consegui registrar a mudança:", e);
  }

  return resultado;
}

/** Quais números explicam a mudança: os que entraram, ou os que saíram. */
function numerosDaMudanca(a: Foto, d: Foto): number[] {
  const antes = new Set(a.numeros);
  const depois = new Set(d.numeros);

  const entraram = d.numeros.filter((n) => !antes.has(n));
  const sairam = a.numeros.filter((n) => !depois.has(n));

  if (entraram.length > 0) return entraram;
  if (sairam.length > 0) return sairam;

  // Nenhum número mudou: foi o estado de pagamento que virou. Aí o que
  // explica o valor é a lista inteira da pessoa.
  return d.numeros.length > 0 ? d.numeros : a.numeros;
}

/** Monta a frase que aparece na tela, a partir do que de fato mudou. */
function descrever(a: Foto, d: Foto, delta: number): string {
  const nome = a.nome || d.nome || "Comprador";
  const mudou = numerosDaMudanca(a, d);
  const quantos = mudou.length;
  const unidade = quantos === 1 ? "número" : "números";
  const lista = quantos > 0 ? ` (nº ${faixas(mudou)})` : "";

  if (delta > 0) {
    // Passou a estar pago agora
    if (a.status !== "pago") return `${nome} pagou ${quantos} ${unidade}${lista}`;
    // Já estava pago e pegou mais números
    return `${nome} pagou mais ${quantos} ${unidade}${lista}`;
  }

  if (!d.existe) return `${nome} foi excluído — ${quantos} ${unidade} devolvidos${lista}`;
  if (d.status !== "pago")
    return `${nome} voltou para pendente — pagamento desfeito${lista}`;
  return `${nome} devolveu ${quantos} ${unidade}${lista}`;
}
