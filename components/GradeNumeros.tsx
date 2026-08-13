"use client";

import type { NumeroInfo } from "@/lib/conflitos";
import { CORES_NUMERO } from "./ui";

/**
 * A grade de 1 até 300.
 *
 * Os números que não passam no filtro/busca ficam apagados em vez de sumir —
 * assim a grade não "pula" e você continua achando o 117 no mesmo lugar.
 */
export function GradeNumeros({
  numeros,
  destacados,
  selecionados,
  modoSelecao,
  aoTocar,
}: {
  numeros: NumeroInfo[];
  /** null = mostrar todos acesos. Senão, só estes ficam acesos. */
  destacados: Set<number> | null;
  selecionados: Set<number>;
  modoSelecao: boolean;
  aoTocar: (numero: number) => void;
}) {
  return (
    <div
      className="grid gap-1.5"
      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(44px, 1fr))" }}
    >
      {numeros.map((n) => {
        const aceso = destacados === null || destacados.has(n.numero);
        const marcado = selecionados.has(n.numero);
        const cor = CORES_NUMERO[n.estado];

        return (
          <button
            key={n.numero}
            onClick={() => aoTocar(n.numero)}
            aria-label={rotuloAcessivel(n)}
            aria-pressed={modoSelecao ? marcado : undefined}
            className={`relative flex aspect-square min-h-11 items-center justify-center rounded-lg border text-[13px] font-bold tabular-nums transition active:scale-90 ${cor.caixa} ${
              aceso ? "opacity-100" : "opacity-15"
            } ${marcado ? "ring-2 ring-destaque ring-offset-2 ring-offset-fundo" : ""}`}
          >
            {n.numero}

            {/* Além da cor, um símbolo: continua legível no sol e para quem
                não distingue bem vermelho de verde. */}
            {cor.marca && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-0.5 top-0 text-[8px] leading-none opacity-90"
              >
                {cor.marca}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function rotuloAcessivel(n: NumeroInfo): string {
  const nomes = n.donos.map((d) => d.nome).join(" e ");
  switch (n.estado) {
    case "livre":
      return `Número ${n.numero}, livre`;
    case "conflito":
      return `Número ${n.numero}, em conflito entre ${nomes}`;
    case "pago":
      return `Número ${n.numero}, pago por ${nomes}`;
    case "pendente":
      return `Número ${n.numero}, de ${nomes}, pagamento pendente`;
  }
}
