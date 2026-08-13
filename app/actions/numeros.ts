"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import type { StatusComprador } from "@/lib/types";

/**
 * AS AÇÕES QUE GRAVAM NO BANCO.
 *
 * "use server" no topo: estas funções rodam no servidor da Vercel, mesmo sendo
 * chamadas por um botão na tela do celular. É o que permite usar a chave
 * secreta do Supabase sem ela nunca sair do servidor.
 */

export type Resultado = { ok: true } | { ok: false; erro: string };

function atualizarTelas() {
  revalidatePath("/numeros");
  revalidatePath("/metas");
}

function falhar(erro: unknown, contexto: string): Resultado {
  const msg =
    typeof erro === "object" && erro !== null && "message" in erro
      ? String((erro as { message: unknown }).message)
      : String(erro);
  return { ok: false, erro: `${contexto}: ${msg}` };
}

/**
 * Mantém o estado do comprador coerente com os números que ele tem.
 *
 * Regra: quem fica sem nenhum número volta a ser "inexistente"; quem era
 * "inexistente" e ganha um número passa a "pendente" (afinal ainda não pagou).
 * Quem já estava "pago" ou "pendente" continua como estava.
 */
async function sincronizarEstado(compradorId: string) {
  const [{ count }, { data: comprador }] = await Promise.all([
    supabase
      .from("atribuicoes")
      .select("id", { count: "exact", head: true })
      .eq("comprador_id", compradorId),
    supabase
      .from("compradores")
      .select("status")
      .eq("id", compradorId)
      .maybeSingle(),
  ]);

  if (!comprador) return;

  const quantidade = count ?? 0;
  let novo: StatusComprador | null = null;

  if (quantidade === 0 && comprador.status !== "inexistente") {
    novo = "inexistente";
  } else if (quantidade > 0 && comprador.status === "inexistente") {
    novo = "pendente";
  }

  if (novo) {
    await supabase
      .from("compradores")
      .update({ status: novo, atualizado_em: new Date().toISOString() })
      .eq("id", compradorId);
  }
}

/** Localiza um comprador pelo nome (ignorando acentos/maiúsculas) ou cria um novo. */
async function acharOuCriarComprador(
  nome: string,
  telefone: string | null,
  status: StatusComprador,
): Promise<{ id: string } | { erro: string }> {
  const limpo = nome.trim();
  if (!limpo) return { erro: "Escreva o nome do comprador." };

  // "%" e "_" são curingas no ilike; escapamos para procurar o nome literal.
  const literal = limpo.replace(/[%_\\]/g, (c) => `\\${c}`);

  const { data: existente, error: erroBusca } = await supabase
    .from("compradores")
    .select("id")
    .ilike("nome", literal)
    .maybeSingle();

  if (erroBusca) return { erro: erroBusca.message };

  if (existente) {
    const { error } = await supabase
      .from("compradores")
      .update({
        status,
        ...(telefone !== null ? { telefone } : {}),
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", existente.id);
    if (error) return { erro: error.message };
    return { id: existente.id };
  }

  const { data: novo, error } = await supabase
    .from("compradores")
    .insert({ nome: limpo, telefone, status })
    .select("id")
    .single();

  if (error) return { erro: error.message };
  return { id: novo.id };
}

/**
 * Atribui um ou vários números a uma pessoa.
 *
 * NÃO recusa números já ocupados de propósito: se o número já for de outra
 * pessoa, os dois ficam registrados e o app acusa o conflito em vermelho, para
 * você decidir. O que ele evita é a mesma pessoa aparecer duas vezes no mesmo
 * número (isso o banco recusa sozinho, e nós ignoramos o erro em silêncio).
 */
export async function atribuirNumeros(dados: {
  numeros: number[];
  compradorId?: string;
  nome?: string;
  telefone?: string | null;
  status: StatusComprador;
}): Promise<Resultado> {
  try {
    const numeros = [...new Set(dados.numeros)].filter(
      (n) => Number.isInteger(n) && n >= 1,
    );
    if (numeros.length === 0) return { ok: false, erro: "Nenhum número escolhido." };

    let compradorId = dados.compradorId;

    if (!compradorId) {
      const r = await acharOuCriarComprador(
        dados.nome ?? "",
        dados.telefone ?? null,
        dados.status,
      );
      if ("erro" in r) return { ok: false, erro: r.erro };
      compradorId = r.id;
    } else {
      const { error } = await supabase
        .from("compradores")
        .update({
          status: dados.status,
          ...(dados.telefone !== undefined ? { telefone: dados.telefone } : {}),
          atualizado_em: new Date().toISOString(),
        })
        .eq("id", compradorId);
      if (error) return falhar(error, "Ao atualizar o comprador");
    }

    const { error } = await supabase
      .from("atribuicoes")
      .upsert(
        numeros.map((numero) => ({ numero, comprador_id: compradorId! })),
        { onConflict: "numero,comprador_id", ignoreDuplicates: true },
      );
    if (error) return falhar(error, "Ao gravar os números");

    await sincronizarEstado(compradorId);
    atualizarTelas();
    return { ok: true };
  } catch (e) {
    return falhar(e, "Erro inesperado");
  }
}

/** Troca o estado de uma pessoa (pago / pendente / inexistente). */
export async function definirEstadoComprador(
  compradorId: string,
  status: StatusComprador,
): Promise<Resultado> {
  try {
    const { error } = await supabase
      .from("compradores")
      .update({ status, atualizado_em: new Date().toISOString() })
      .eq("id", compradorId);
    if (error) return falhar(error, "Ao mudar o estado");

    atualizarTelas();
    return { ok: true };
  } catch (e) {
    return falhar(e, "Erro inesperado");
  }
}

/** Edita nome e telefone de uma pessoa. */
export async function editarComprador(
  compradorId: string,
  nome: string,
  telefone: string | null,
): Promise<Resultado> {
  try {
    const limpo = nome.trim();
    if (!limpo) return { ok: false, erro: "O nome não pode ficar vazio." };

    const { error } = await supabase
      .from("compradores")
      .update({ nome: limpo, telefone, atualizado_em: new Date().toISOString() })
      .eq("id", compradorId);

    if (error) {
      if (error.code === "23505")
        return { ok: false, erro: `Já existe um comprador chamado "${limpo}".` };
      return falhar(error, "Ao editar o comprador");
    }

    atualizarTelas();
    return { ok: true };
  } catch (e) {
    return falhar(e, "Erro inesperado");
  }
}

/** Tira UM número de UMA pessoa (usado para resolver conflitos). */
export async function removerReivindicacao(
  numero: number,
  compradorId: string,
): Promise<Resultado> {
  try {
    const { error } = await supabase
      .from("atribuicoes")
      .delete()
      .eq("numero", numero)
      .eq("comprador_id", compradorId);
    if (error) return falhar(error, "Ao remover o número");

    await sincronizarEstado(compradorId);
    atualizarTelas();
    return { ok: true };
  } catch (e) {
    return falhar(e, "Erro inesperado");
  }
}

/** Passa uma pessoa de um número para outro — o jeito de resolver um conflito. */
export async function moverReivindicacao(
  numeroAtual: number,
  compradorId: string,
  novoNumero: number,
): Promise<Resultado> {
  try {
    if (!Number.isInteger(novoNumero) || novoNumero < 1)
      return { ok: false, erro: "Número de destino inválido." };

    const { data: ocupantes, error: erroBusca } = await supabase
      .from("atribuicoes")
      .select("comprador_id")
      .eq("numero", novoNumero);
    if (erroBusca) return falhar(erroBusca, "Ao conferir o número de destino");

    if (ocupantes && ocupantes.length > 0)
      return {
        ok: false,
        erro: `O número ${novoNumero} já está ocupado. Escolha um livre para não criar outro conflito.`,
      };

    const { error } = await supabase
      .from("atribuicoes")
      .update({ numero: novoNumero })
      .eq("numero", numeroAtual)
      .eq("comprador_id", compradorId);
    if (error) return falhar(error, "Ao mover o número");

    atualizarTelas();
    return { ok: true };
  } catch (e) {
    return falhar(e, "Erro inesperado");
  }
}

/** Libera um número por completo: tira todo mundo que o reivindica. */
export async function liberarNumero(numero: number): Promise<Resultado> {
  try {
    const { data: donos } = await supabase
      .from("atribuicoes")
      .select("comprador_id")
      .eq("numero", numero);

    const { error } = await supabase
      .from("atribuicoes")
      .delete()
      .eq("numero", numero);
    if (error) return falhar(error, "Ao liberar o número");

    for (const d of donos ?? []) await sincronizarEstado(d.comprador_id);

    atualizarTelas();
    return { ok: true };
  } catch (e) {
    return falhar(e, "Erro inesperado");
  }
}

/** Apaga uma pessoa e libera todos os números dela. */
export async function excluirComprador(compradorId: string): Promise<Resultado> {
  try {
    const { error } = await supabase
      .from("compradores")
      .delete()
      .eq("id", compradorId);
    if (error) return falhar(error, "Ao excluir o comprador");

    atualizarTelas();
    return { ok: true };
  } catch (e) {
    return falhar(e, "Erro inesperado");
  }
}
