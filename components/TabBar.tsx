"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * As duas abas do app, fixas no rodapé — como num app nativo de iPhone.
 *
 * "use client" no topo significa que este pedaço roda no navegador: ele
 * precisa saber em qual página você está para acender a aba certa.
 */

const ABAS = [
  { href: "/numeros", rotulo: "Números", icone: GradeIcone },
  { href: "/metas", rotulo: "Metas", icone: AlvoIcone },
];

export function TabBar() {
  const caminho = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-borda bg-superficie/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Abas do aplicativo"
    >
      <ul className="mx-auto flex max-w-2xl">
        {ABAS.map((aba) => {
          const ativa = caminho.startsWith(aba.href);
          const Icone = aba.icone;

          return (
            <li key={aba.href} className="flex-1">
              <Link
                href={aba.href}
                aria-current={ativa ? "page" : undefined}
                className={`flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                  ativa ? "text-destaque" : "text-apagado"
                }`}
              >
                <Icone ativa={ativa} />
                {aba.rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function GradeIcone({ ativa }: { ativa: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      {[
        [4, 4],
        [14, 4],
        [4, 14],
        [14, 14],
      ].map(([x, y]) => (
        <rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width="6"
          height="6"
          rx="1.5"
          fill={ativa ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.8"
        />
      ))}
    </svg>
  );
}

function AlvoIcone({ ativa }: { ativa: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <circle
        cx="12"
        cy="12"
        r="8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle
        cx="12"
        cy="12"
        r="3.2"
        fill={ativa ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}
