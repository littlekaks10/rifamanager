import type { ReactNode } from "react";
import type { EstadoNumero, StatusComprador } from "@/lib/types";

/** Pecinhas visuais reaproveitadas pelas duas abas. */

export function Cartao({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-borda bg-superficie p-4 ${className}`}
    >
      {children}
    </section>
  );
}

export function Botao({
  children,
  onClick,
  tipo = "normal",
  disabled,
  className = "",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  tipo?: "normal" | "principal" | "perigo" | "discreto";
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}) {
  const estilos = {
    principal: "bg-destaque text-white border-destaque",
    perigo: "bg-perigofundo text-perigo border-perigoborda",
    normal: "bg-superficie2 text-texto border-borda",
    discreto: "bg-transparent text-apagado border-transparent",
  }[tipo];

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`min-h-11 rounded-xl border px-4 text-sm font-semibold transition active:scale-[0.97] disabled:opacity-40 ${estilos} ${className}`}
    >
      {children}
    </button>
  );
}

/** Etiqueta colorida do estado de um comprador. Cor + palavra + símbolo. */
export function EtiquetaEstado({
  status,
  emConflito = false,
}: {
  status: StatusComprador;
  emConflito?: boolean;
}) {
  if (emConflito) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-perigoborda bg-perigofundo px-2 py-0.5 text-[11px] font-bold text-perigo">
        ⚠ conflito
      </span>
    );
  }

  const mapa = {
    pago: { texto: "✓ pago", classe: "border-okborda bg-okfundo text-ok" },
    pendente: {
      texto: "⏳ pendente",
      classe: "border-alertaborda bg-alertafundo text-alerta",
    },
    inexistente: {
      texto: "◌ sem número",
      classe: "border-dashed border-borda bg-transparent text-apagado",
    },
  }[status];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${mapa.classe}`}
    >
      {mapa.texto}
    </span>
  );
}

/** As cores de cada estado de número, num lugar só. */
export const CORES_NUMERO: Record<
  EstadoNumero,
  { caixa: string; marca: string | null }
> = {
  livre: { caixa: "border-borda bg-transparent text-apagado", marca: null },
  pago: { caixa: "border-okborda bg-okfundo text-ok", marca: "✓" },
  pendente: {
    caixa: "border-alertaborda bg-alertafundo text-alerta",
    marca: "⏳",
  },
  conflito: {
    caixa: "border-perigo bg-perigofundo text-perigo",
    marca: "⚠",
  },
};

export function Estatistica({
  rotulo,
  valor,
  cor = "text-texto",
}: {
  rotulo: string;
  valor: string | number;
  cor?: string;
}) {
  return (
    <div className="flex flex-col">
      <span className={`text-lg font-bold tabular-nums ${cor}`}>{valor}</span>
      <span className="text-[11px] font-medium text-apagado">{rotulo}</span>
    </div>
  );
}
