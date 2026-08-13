"use client";

import type { CompradorComNumeros } from "@/lib/conflitos";
import { faixas } from "@/lib/formato";
import { EtiquetaEstado } from "./ui";

/**
 * A lista de pessoas — o espelho da sua lista do WhatsApp.
 *
 * É aqui que aparece quem está cadastrado mas ainda não escolheu número
 * (essa pessoa não tem quadradinho na grade, então some da outra visão).
 */
export function ListaCompradores({
  compradores,
  aoTocar,
}: {
  compradores: CompradorComNumeros[];
  aoTocar: (compradorId: string) => void;
}) {
  if (compradores.length === 0) {
    return (
      <p className="rounded-2xl border border-borda bg-superficie px-4 py-6 text-center text-sm text-apagado">
        Nenhum comprador encontrado.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {compradores.map((c) => {
        const conflito = c.numerosEmConflito.length > 0;

        return (
          <li key={c.id}>
            <button
              onClick={() => aoTocar(c.id)}
              className={`flex w-full items-center justify-between gap-3 rounded-2xl border bg-superficie px-4 py-3 text-left transition active:scale-[0.99] ${
                conflito ? "border-perigo" : "border-borda"
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{c.nome}</p>
                <p className="mt-0.5 truncate text-xs tabular-nums text-apagado">
                  {c.numeros.length > 0
                    ? `nº ${faixas(c.numeros)} · ${c.numeros.length} ${
                        c.numeros.length === 1 ? "número" : "números"
                      }`
                    : "ainda não escolheu número"}
                </p>
                {conflito && (
                  <p className="mt-1 text-xs font-bold text-perigo">
                    ⚠ disputa o nº {faixas(c.numerosEmConflito)} com outra pessoa
                  </p>
                )}
              </div>
              <EtiquetaEstado status={c.status} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
