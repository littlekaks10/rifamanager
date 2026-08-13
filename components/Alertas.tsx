"use client";

import type { Panorama } from "@/lib/conflitos";
import { faixas } from "@/lib/formato";

/**
 * A faixa de avisos do topo.
 *
 * Cada aviso some SOZINHO quando o problema deixa de existir — não há nada
 * para "marcar como lido". Se a faixa está vazia, está tudo resolvido.
 */
export function Alertas({
  panorama,
  aoTocarConflito,
  aoTocarComprador,
}: {
  panorama: Panorama;
  aoTocarConflito: (numero: number) => void;
  aoTocarComprador: (compradorId: string) => void;
}) {
  const { conflitos, pendentes, semNumero } = panorama;

  if (conflitos.length === 0 && pendentes.length === 0 && semNumero.length === 0) {
    return (
      <div className="rounded-2xl border border-okborda bg-okfundo px-4 py-3 text-sm font-semibold text-ok">
        ✓ Tudo em ordem: nenhum número duplicado e ninguém devendo.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {conflitos.length > 0 && (
        <div className="rounded-2xl border border-perigo bg-perigofundo px-4 py-3">
          <p className="text-sm font-bold text-perigo">
            ⚠ {conflitos.length}{" "}
            {conflitos.length === 1 ? "número duplicado" : "números duplicados"}
          </p>
          <p className="mt-1 text-xs text-perigo/80">
            Duas pessoas pegaram o mesmo número. Toque para decidir quem fica.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {conflitos.map((n) => (
              <button
                key={n}
                onClick={() => aoTocarConflito(n)}
                className="min-h-9 rounded-lg border border-perigo bg-perigofundo px-3 text-sm font-bold text-perigo active:scale-95"
              >
                nº {n}
              </button>
            ))}
          </div>
        </div>
      )}

      {pendentes.length > 0 && (
        <div className="rounded-2xl border border-alertaborda bg-alertafundo px-4 py-3">
          <p className="text-sm font-bold text-alerta">
            ⏳ {pendentes.length}{" "}
            {pendentes.length === 1
              ? "comprador ainda não pagou"
              : "compradores ainda não pagaram"}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {pendentes.map((c) => (
              <button
                key={c.id}
                onClick={() => aoTocarComprador(c.id)}
                className="min-h-9 rounded-lg border border-alertaborda bg-alertafundo px-3 text-left text-xs font-semibold text-alerta active:scale-95"
              >
                {c.nome}
                <span className="ml-1 font-normal opacity-80">
                  ({c.numeros.length > 0 ? `nº ${faixas(c.numeros)}` : "sem número"})
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {semNumero.length > 0 && (
        <div className="rounded-2xl border border-dashed border-borda bg-superficie px-4 py-3">
          <p className="text-sm font-bold text-apagado">
            ◌ {semNumero.length}{" "}
            {semNumero.length === 1
              ? "comprador sem número escolhido"
              : "compradores sem número escolhido"}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {semNumero.map((c) => (
              <button
                key={c.id}
                onClick={() => aoTocarComprador(c.id)}
                className="min-h-9 rounded-lg border border-dashed border-borda px-3 text-xs font-semibold text-apagado active:scale-95"
              >
                {c.nome}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
