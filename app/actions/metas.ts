"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { registrar } from "@/lib/historico";
import { reais } from "@/lib/formato";

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

    const { data: antes } = await supabase
      .from("metas")
      .select("descricao, valor, pago")
      .eq("id", id)
      .maybeSingle();

    const { error } = await supabase
      .from("metas")
      .update({ descricao: limpo, valor })
      .eq("id", id);
    if (error) return falhar(error, "Ao editar a meta");

    // Mudar o valor de uma meta JÁ PAGA muda quanto saiu do caixa. Registramos
    // só a diferença. (Se a meta não estava paga, nada saiu — nada a lançar.)
    if (antes?.pago) {
      const diferenca = Number(antes.valor) - valor;
      if (diferenca !== 0) {
        await registrar({
          tipo: "ajuste",
          valor: diferenca,
          meta_descricao: limpo,
          descricao:
            `Meta paga "${limpo}": valor mudou de ${reais(Number(antes.valor))} ` +
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

/**
 * Liga/desliga o ✅ de uma meta.
 *
 * Marcar uma meta como paga é dinheiro SAINDO do caixa; desmarcar devolve.
 * É por isso que a soma do extrato bate com o "em caixa" do topo da tela.
 */
export async function marcarMetaPaga(
  id: string,
  pago: boolean,
): Promise<Resultado> {
  try {
    const { data: antes } = await supabase
      .from("metas")
      .select("descricao, valor, pago")
      .eq("id", id)
      .maybeSingle();

    const { error } = await supabase.from("metas").update({ pago }).eq("id", id);
    if (error) return falhar(error, "Ao marcar a meta");

    // Só registra se realmente virou — clicar duas vezes no mesmo estado não
    // pode gerar duas linhas.
    if (antes && antes.pago !== pago) {
      const valor = Number(antes.valor);
      await registrar({
        tipo: pago ? "meta_paga" : "meta_estornada",
        valor: pago ? -valor : valor,
        meta_descricao: antes.descricao,
        descricao: pago
          ? `Meta paga: ${antes.descricao}`
          : `Meta desmarcada, dinheiro de volta: ${antes.descricao}`,
      });
    }

    atualizarTelas();
    return { ok: true };
  } catch (e) {
    return falhar(e, "Erro inesperado");
  }
}

export async function excluirMeta(id: string): Promise<Resultado> {
  try {
    const { data: antes } = await supabase
      .from("metas")
      .select("descricao, valor, pago")
      .eq("id", id)
      .maybeSingle();

    const { error } = await supabase.from("metas").delete().eq("id", id);
    if (error) return falhar(error, "Ao excluir a meta");

    // Se a meta estava paga, ela tinha tirado dinheiro do caixa. Excluí-la
    // devolve esse dinheiro, senão o extrato deixaria de fechar.
    if (antes?.pago) {
      await registrar({
        tipo: "meta_estornada",
        valor: Number(antes.valor),
        meta_descricao: antes.descricao,
        descricao: `Meta paga excluída, dinheiro de volta: ${antes.descricao}`,
      });
    }

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

    const { data: cfg } = await supabase
      .from("configuracao")
      .select("valor_numero")
      .eq("id", 1)
      .maybeSingle();
    const anterior = Number(cfg?.valor_numero ?? 0);

    const { error } = await supabase
      .from("configuracao")
      .update({ valor_numero: valor, atualizado_em: new Date().toISOString() })
      .eq("id", 1);
    if (error) return falhar(error, "Ao mudar o valor do número");

    // O arrecadado é sempre recalculado com o preço ATUAL, então trocar o valor
    // do número muda o passado inteiro de uma vez. Sem esta linha de ajuste, o
    // extrato passaria a não fechar com o "em caixa" do topo da tela.
    if (anterior !== valor) {
      const { data: pagos } = await supabase
        .from("compradores")
        .select("id")
        .eq("status", "pago");

      const ids = (pagos ?? []).map((p) => p.id);
      const { count } = ids.length
        ? await supabase
            .from("atribuicoes")
            .select("id", { count: "exact", head: true })
            .in("comprador_id", ids)
        : { count: 0 };

      const numerosPagos = count ?? 0;
      const diferenca = (valor - anterior) * numerosPagos;

      if (diferenca !== 0) {
        await registrar({
          tipo: "ajuste",
          valor: diferenca,
          descricao:
            `Valor do número mudou de ${reais(anterior)} para ${reais(valor)} — ` +
            `${numerosPagos} ${numerosPagos === 1 ? "número pago recalculado" : "números pagos recalculados"}`,
        });
      }
    }

    atualizarTelas();
    return { ok: true };
  } catch (e) {
    return falhar(e, "Erro inesperado");
  }
}
