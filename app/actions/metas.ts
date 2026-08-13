"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";

export type Resultado = { ok: true } | { ok: false; erro: string };

function atualizarTelas() {
  revalidatePath("/metas");
  revalidatePath("/numeros");
}

function falhar(erro: unknown, contexto: string): Resultado {
  const msg =
    typeof erro === "object" && erro !== null && "message" in erro
      ? String((erro as { message: unknown }).message)
      : String(erro);
  return { ok: false, erro: `${contexto}: ${msg}` };
}

export async function criarMeta(
  descricao: string,
  valor: number,
): Promise<Resultado> {
  try {
    const limpo = descricao.trim();
    if (!limpo) return { ok: false, erro: "Escreva a descrição da meta." };
    if (!Number.isFinite(valor) || valor < 0)
      return { ok: false, erro: "Valor inválido." };

    // A nova meta entra no fim da lista.
    const { data: ultima } = await supabase
      .from("metas")
      .select("ordem")
      .order("ordem", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { error } = await supabase
      .from("metas")
      .insert({ descricao: limpo, valor, ordem: (ultima?.ordem ?? 0) + 1 });
    if (error) return falhar(error, "Ao criar a meta");

    atualizarTelas();
    return { ok: true };
  } catch (e) {
    return falhar(e, "Erro inesperado");
  }
}

export async function editarMeta(
  id: string,
  descricao: string,
  valor: number,
): Promise<Resultado> {
  try {
    const limpo = descricao.trim();
    if (!limpo) return { ok: false, erro: "Escreva a descrição da meta." };
    if (!Number.isFinite(valor) || valor < 0)
      return { ok: false, erro: "Valor inválido." };

    const { error } = await supabase
      .from("metas")
      .update({ descricao: limpo, valor })
      .eq("id", id);
    if (error) return falhar(error, "Ao editar a meta");

    atualizarTelas();
    return { ok: true };
  } catch (e) {
    return falhar(e, "Erro inesperado");
  }
}

/** Liga/desliga o ✅ de uma meta. */
export async function marcarMetaPaga(
  id: string,
  pago: boolean,
): Promise<Resultado> {
  try {
    const { error } = await supabase.from("metas").update({ pago }).eq("id", id);
    if (error) return falhar(error, "Ao marcar a meta");

    atualizarTelas();
    return { ok: true };
  } catch (e) {
    return falhar(e, "Erro inesperado");
  }
}

export async function excluirMeta(id: string): Promise<Resultado> {
  try {
    const { error } = await supabase.from("metas").delete().eq("id", id);
    if (error) return falhar(error, "Ao excluir a meta");

    atualizarTelas();
    return { ok: true };
  } catch (e) {
    return falhar(e, "Erro inesperado");
  }
}

/** Sobe ou desce uma meta na lista de prioridade, trocando de lugar com a vizinha. */
export async function moverMeta(
  id: string,
  direcao: "cima" | "baixo",
): Promise<Resultado> {
  try {
    const { data: todas, error } = await supabase
      .from("metas")
      .select("id, ordem")
      .order("ordem")
      .order("criado_em");
    if (error) return falhar(error, "Ao reordenar");
    if (!todas) return { ok: true };

    const i = todas.findIndex((m) => m.id === id);
    const j = direcao === "cima" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= todas.length) return { ok: true };

    // Reescreve a ordem inteira como 1, 2, 3... com os dois itens trocados.
    const nova = [...todas];
    [nova[i], nova[j]] = [nova[j], nova[i]];

    for (let k = 0; k < nova.length; k++) {
      const { error: e } = await supabase
        .from("metas")
        .update({ ordem: k + 1 })
        .eq("id", nova[k].id);
      if (e) return falhar(e, "Ao reordenar");
    }

    atualizarTelas();
    return { ok: true };
  } catch (e) {
    return falhar(e, "Erro inesperado");
  }
}

/** Muda quanto custa cada número da rifa. */
export async function definirValorNumero(valor: number): Promise<Resultado> {
  try {
    if (!Number.isFinite(valor) || valor < 0)
      return { ok: false, erro: "Valor inválido." };

    const { error } = await supabase
      .from("configuracao")
      .update({ valor_numero: valor, atualizado_em: new Date().toISOString() })
      .eq("id", 1);
    if (error) return falhar(error, "Ao mudar o valor do número");

    atualizarTelas();
    return { ok: true };
  } catch (e) {
    return falhar(e, "Erro inesperado");
  }
}
