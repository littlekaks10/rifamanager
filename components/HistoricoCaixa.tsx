"use client";

import type { Movimento } from "@/lib/historico";
import { faixas, reais } from "@/lib/formato";
import { Folha } from "./PainelNumero";

/**
 * O extrato do caixa.
 *
 * Reaproveita a mesma folha deslizante dos painéis de número e de comprador,
 * para o app inteiro se comportar igual.
 */
export function HistoricoCaixa({
  movimentos,
  total,
  saldoHistorico,
  emCaixa,
  aoFechar,
}: {
  movimentos: Movimento[];
  /** -1 quando a tabela ainda não existe no banco. */
  total: number;
  saldoHistorico: number;
  emCaixa: number;
  aoFechar: () => void;
}) {
  // A diferença é calculada em centavos para não tropeçar no arredondamento
  // de casas decimais do JavaScript (0.1 + 0.2 não dá exatamente 0.3).
  const confere =
    Math.round(saldoHistorico * 100) === Math.round(emCaixa * 100);

  const grupos = agruparPorDia(movimentos);

  return (
    <Folha
      titulo="Histórico do caixa"
      subtitulo={
        total < 0
          ? "tabela ainda não criada"
          : `${total} ${total === 1 ? "lançamento" : "lançamentos"}`
      }
      aoFechar={aoFechar}
    >
      <div className="flex flex-col gap-4">
        {/* A conferência: o autoteste da funcionalidade, visível para você. */}
        {total >= 0 && (
          <div
            className={`rounded-xl border p-3 ${
              confere
                ? "border-okborda bg-okfundo"
                : "border-perigo bg-perigofundo"
            }`}
          >
            <div className="flex items-center justify-between text-sm">
              <span className="text-apagado">Saldo do histórico</span>
              <span className="font-bold tabular-nums">
                {reais(saldoHistorico)}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-sm">
              <span className="text-apagado">Em caixa agora</span>
              <span className="font-bold tabular-nums">{reais(emCaixa)}</span>
            </div>
            <p
              className={`mt-2 text-xs font-bold ${
                confere ? "text-ok" : "text-perigo"
              }`}
            >
              {confere
                ? "✓ conferem — o extrato explica todo o dinheiro em caixa"
                : `⚠ diferença de ${reais(Math.abs(saldoHistorico - emCaixa))} — me avise para eu conferir`}
            </p>
          </div>
        )}

        {total < 0 && (
          <p className="rounded-xl border border-alertaborda bg-alertafundo px-3 py-2 text-xs text-alerta">
            A tabela do histórico ainda não existe no banco. Rode o arquivo{" "}
            <strong>supabase/03_historico.sql</strong> no SQL Editor do Supabase
            para começar a registrar.
          </p>
        )}

        {total === 0 && (
          <p className="rounded-xl border border-borda bg-superficie2 px-3 py-6 text-center text-sm text-apagado">
            Nenhum lançamento ainda.
          </p>
        )}

        {grupos.map((grupo) => (
          <section key={grupo.chave} className="flex flex-col gap-1">
            <h3 className="sticky top-0 bg-superficie py-1 text-xs font-bold uppercase tracking-wide text-apagado">
              {grupo.rotulo}
            </h3>

            {grupo.itens.map((m) => (
              <Linha key={m.id} movimento={m} />
            ))}
          </section>
        ))}

        {total > movimentos.length && (
          <p className="text-center text-[11px] text-apagado">
            mostrando os {movimentos.length} mais recentes de {total}
          </p>
        )}
      </div>
    </Folha>
  );
}

function Linha({ movimento: m }: { movimento: Movimento }) {
  const entra = m.valor > 0;

  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-borda bg-superficie2 px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug">{m.descricao}</p>
        <p className="mt-0.5 text-[11px] text-apagado">
          {hora(m.ocorrido_em)}
          {m.numeros && m.numeros.length > 0 && (
            <span className="tabular-nums"> · nº {faixas(m.numeros)}</span>
          )}
        </p>
      </div>

      <span
        className={`shrink-0 text-sm font-bold tabular-nums ${
          entra ? "text-ok" : "text-perigo"
        }`}
      >
        {entra ? "+" : "−"}
        {reais(Math.abs(m.valor))}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Agrupamento por dia: Hoje, Ontem, depois a data                     */
/* ------------------------------------------------------------------ */

function agruparPorDia(movimentos: Movimento[]) {
  const grupos: { chave: string; rotulo: string; itens: Movimento[] }[] = [];

  for (const m of movimentos) {
    const chave = new Date(m.ocorrido_em).toDateString();
    const ultimo = grupos[grupos.length - 1];

    if (ultimo && ultimo.chave === chave) ultimo.itens.push(m);
    else grupos.push({ chave, rotulo: rotuloDoDia(m.ocorrido_em), itens: [m] });
  }

  return grupos;
}

function rotuloDoDia(iso: string): string {
  const data = new Date(iso);
  const hoje = new Date();
  const ontem = new Date();
  ontem.setDate(hoje.getDate() - 1);

  if (data.toDateString() === hoje.toDateString()) return "Hoje";
  if (data.toDateString() === ontem.toDateString()) return "Ontem";

  return data.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: data.getFullYear() === hoje.getFullYear() ? undefined : "numeric",
  });
}

function hora(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
