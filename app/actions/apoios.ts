"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { registrar } from "@/lib/historico";
import { reais } from "@/lib/formato";

/**
 * APOIOS: dinheiro que entra sem ser venda de número.
 *
 * Cada mexida aqui rende uma linha no extrato do caixa, senão o saldo do
 * histórico deixaria de bater com o "em caixa" da aba Metas.
 *
 * Não dá para usar o `comRegistro()` do histórico: ele mede um comprador antes
 * e depois (números × estar pago), e um apoio não tem número nem estado de
 * pagamento — aqui o valor É o próprio movimento.
 */

export type Resultado = { ok: true } | { ok: false; erro: string };

function atualizarTelas() {
  revalidatePath("/apoios");
  revalidatePath("/metas");
}

function falhar(erro: unknown, contexto: string): Resultado {
  const msg =
    typeof erro === "object" && erro !== null && "message" in erro
      ? String((erro as { message: unknown }).message)
      : String(erro);
  return { ok: false, erro: `${contexto}: ${msg}` };
}

export async function criarApoio(
  descricao: string,
  valor: number,
): Promise<Resultado> {
  try {
    const limpo = descricao.trim();
    if (!limpo) return { ok: false, erro: "Escreva de quem veio o apoio." };
    if (!Number.isFinite(valor) || valor <= 0)
      return { ok: false, erro: "O valor precisa ser maior que zero." };

    const { error } = await supabase
      .from("apoios")
      .insert({ descricao: limpo, valor });
    if (error) return falhar(error, "Ao registrar o apoio");

    await registrar({
      tipo: "apoio",
      valor, // positivo: entrou dinheiro
      descricao: `Apoio recebido: ${limpo}`,
    });

    atualizarTelas();
    return { ok: true };
  } catch (e) {
    return falhar(e, "Erro inesperado");
  }
}

export async function editarApoio(
  id: string,
  descricao: string,
  valor: number,
): Promise<Resultado> {
  try {
    const limpo = descricao.trim();
    if (!limpo) return { ok: false, erro: "Escreva de quem veio o apoio." };
    if (!Number.isFinite(valor) || valor <= 0)
      return { ok: false, erro: "O valor precisa ser maior que zero." };

    const { data: antes } = await supabase
      .from("apoios")
      .select("descricao, valor")
      .eq("id", id)
      .maybeSingle();

    const { error } = await supabase
      .from("apoios")
      .update({ descricao: limpo, valor })
      .eq("id", id);
    if (error) return falhar(error, "Ao editar o apoio");

    // Só a DIFERENÇA vai para o extrato: o valor antigo já está lançado lá.
    if (antes) {
      const diferenca = valor - Number(antes.valor);
      if (diferenca !== 0) {
        await registrar({
          tipo: "ajuste",
          valor: diferenca,
          descricao:
            `Apoio "${limpo}": valor mudou de ${reais(Number(antes.valor))} ` +
            `para ${reais(valor)}`,
        });
      }
    }

    atualizarTelas();
    return { ok: true };
  } catch (e) {
    return falhar(e, "Erro inesperado");
  }
}

export async function excluirApoio(id: string): Promise<Resultado> {
  try {
    const { data: antes } = await supabase
      .from("apoios")
      .select("descricao, valor")
      .eq("id", id)
      .maybeSingle();

    const { error } = await supabase.from("apoios").delete().eq("id", id);
    if (error) return falhar(error, "Ao excluir o apoio");

    // Esse dinheiro tinha entrado no caixa; tirar o apoio precisa tirá-lo de lá
    // também, senão o extrato para de fechar.
    if (antes) {
      await registrar({
        tipo: "apoio_estornado",
        valor: -Number(antes.valor),
        descricao: `Apoio removido: ${antes.descricao}`,
      });
    }

    atualizarTelas();
    return { ok: true };
  } catch (e) {
    return falhar(e, "Erro inesperado");
  }
}
