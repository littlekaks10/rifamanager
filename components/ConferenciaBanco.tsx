"use client";

import { useState, useTransition } from "react";
import { paraNumero, reais } from "@/lib/formato";
import { registrarConferencia, type Resultado } from "@/app/actions/metas";
import { Botao, Cartao } from "./ui";

/**
 * Bate o "em caixa" que o app calcula com o dinheiro que existe de verdade
 * na conta.
 *
 * O app não tem ligação nenhuma com o banco: ele só sabe somar o que você
 * registra. Este cartão é o ponto onde os dois mundos se encontram — e a
 * diferença entre eles é a informação útil, porque revela o que escapou do
 * registro.
 */
export function ConferenciaBanco({
  emCaixa,
  saldoBanco,
  rendimentoBanco,
  conferidoEm,
}: {
  /** O que o app calculou: arrecadado + apoios − metas pagas. */
  emCaixa: number;
  saldoBanco: number | null;
  rendimentoBanco: number | null;
  conferidoEm: string | null;
}) {
  const [editando, setEditando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function executar(acao: () => Promise<Resultado>, depois?: () => void) {
    setErro(null);
    iniciar(async () => {
      const r = await acao();
      if (!r.ok) setErro(r.erro);
      else depois?.();
    });
  }

  const nuncaConferido = saldoBanco === null;

  return (
    <Cartao className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">Conferência com o banco</p>
        {!editando && (
          <Botao tipo="discreto" onClick={() => setEditando(true)}>
            {nuncaConferido ? "Informar" : "Atualizar"}
          </Botao>
        )}
      </div>

      {erro && (
        <p className="rounded-xl border border-perigoborda bg-perigofundo px-3 py-2 text-xs text-perigo">
          {erro}
        </p>
      )}

      {editando ? (
        <Formulario
          saldoInicial={saldoBanco}
          rendimentoInicial={rendimentoBanco}
          ocupado={pendente}
          aoSalvar={(s, r) =>
            executar(() => registrarConferencia(s, r), () => setEditando(false))
          }
          aoCancelar={() => {
            setErro(null);
            setEditando(false);
          }}
        />
      ) : nuncaConferido ? (
        <p className="text-xs leading-relaxed text-apagado">
          Informe quanto tem hoje na conta e o app mostra se bate com os{" "}
          <strong className="text-texto">{reais(emCaixa)}</strong> que ele
          calculou. É assim que você descobre se algum recebimento ou pagamento
          ficou sem registrar.
        </p>
      ) : (
        <Comparacao
          emCaixa={emCaixa}
          saldo={saldoBanco}
          rendimento={rendimentoBanco ?? 0}
          conferidoEm={conferidoEm}
        />
      )}
    </Cartao>
  );
}

/* ------------------------------------------------------------------ */

function Comparacao({
  emCaixa,
  saldo,
  rendimento,
  conferidoEm,
}: {
  emCaixa: number;
  saldo: number;
  rendimento: number;
  conferidoEm: string | null;
}) {
  // O dinheiro do banco que veio da rifa é o saldo menos o que a conta rendeu
  // sozinha — só isso é comparável com o "em caixa".
  const daRifa = saldo - rendimento;

  // Em centavos: sem isso, 1630 + 119.99 − 1268.20 dá 481.78999999999996 em
  // JavaScript e o cartão acusaria uma diferença de um centavo que não existe.
  const diferencaCentavos = Math.round(daRifa * 100) - Math.round(emCaixa * 100);
  const diferenca = diferencaCentavos / 100;

  const situacao =
    diferencaCentavos === 0
      ? ({
          cor: "text-ok",
          borda: "border-okborda bg-okfundo",
          titulo: "✓ batem",
          texto:
            "Tudo que entrou e saiu está registrado. O app e a conta contam a mesma história.",
        } as const)
      : diferencaCentavos > 0
        ? ({
            cor: "text-alerta",
            borda: "border-alertaborda bg-alertafundo",
            titulo: `⚠ sobrando ${reais(Math.abs(diferenca))} no banco`,
            texto:
              "Entrou dinheiro que o app não conhece. Procure no extrato da conta as entradas que você não registrou — alguém que pagou e ficou marcado como pendente, alguém que pagou a mais, ou um depósito que não é da rifa.",
          } as const)
        : ({
            cor: "text-perigo",
            borda: "border-perigo bg-perigofundo",
            titulo: `⚠ faltando ${reais(Math.abs(diferenca))} no banco`,
            texto:
              "O app acha que tem mais dinheiro do que existe na conta. Ou você recebeu em mãos e ainda não depositou, ou marcou uma meta como paga antes de o dinheiro sair.",
          } as const);

  return (
    <div className="flex flex-col gap-2">
      <dl className="flex flex-col gap-1 text-sm">
        <Linha rotulo="Em caixa (calculado)" valor={reais(emCaixa)} />
        <Linha rotulo="Na conta (informado)" valor={reais(saldo)} />
        {rendimento > 0 && (
          <Linha
            rotulo="Rendimento (não é da rifa)"
            valor={`− ${reais(rendimento)}`}
            apagado
          />
        )}
        <div className="mt-1 flex items-center justify-between border-t border-borda pt-2">
          <dt className="text-sm font-semibold">Diferença</dt>
          <dd className={`text-base font-bold tabular-nums ${situacao.cor}`}>
            {diferencaCentavos > 0 ? "+" : diferencaCentavos < 0 ? "−" : ""}
            {reais(Math.abs(diferenca))}
          </dd>
        </div>
      </dl>

      <div className={`rounded-xl border px-3 py-2 ${situacao.borda}`}>
        <p className={`text-xs font-bold ${situacao.cor}`}>{situacao.titulo}</p>
        <p className="mt-1 text-[11px] leading-relaxed text-apagado">
          {situacao.texto}
        </p>
      </div>

      {conferidoEm && (
        <p className="text-[11px] text-apagado">
          conferido em {quando(conferidoEm)}
        </p>
      )}
    </div>
  );
}

function Linha({
  rotulo,
  valor,
  apagado = false,
}: {
  rotulo: string;
  valor: string;
  apagado?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-xs text-apagado">{rotulo}</dt>
      <dd
        className={`tabular-nums ${apagado ? "text-xs text-apagado" : "text-sm font-semibold"}`}
      >
        {valor}
      </dd>
    </div>
  );
}

function Formulario({
  saldoInicial,
  rendimentoInicial,
  ocupado,
  aoSalvar,
  aoCancelar,
}: {
  saldoInicial: number | null;
  rendimentoInicial: number | null;
  ocupado: boolean;
  aoSalvar: (saldo: number, rendimento: number) => void;
  aoCancelar: () => void;
}) {
  const [saldo, setSaldo] = useState(
    saldoInicial !== null ? String(saldoInicial).replace(".", ",") : "",
  );
  const [rendimento, setRendimento] = useState(
    rendimentoInicial !== null ? String(rendimentoInicial).replace(".", ",") : "",
  );

  const s = paraNumero(saldo);
  const r = rendimento.trim() === "" ? 0 : paraNumero(rendimento);
  const valido =
    Number.isFinite(s) && s >= 0 && Number.isFinite(r) && r >= 0 && r <= s;

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (valido) aoSalvar(s, r);
      }}
    >
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-apagado">
          Saldo total na conta hoje
        </span>
        <input
          value={saldo}
          onChange={(e) => setSaldo(e.target.value)}
          inputMode="decimal"
          placeholder="Ex.: 574,97"
          autoFocus
          className="min-h-12 rounded-xl border border-borda bg-superficie2 px-3 tabular-nums"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-apagado">
          Quanto disso é rendimento (opcional)
        </span>
        <input
          value={rendimento}
          onChange={(e) => setRendimento(e.target.value)}
          inputMode="decimal"
          placeholder="Ex.: 1,46"
          className="min-h-12 rounded-xl border border-borda bg-superficie2 px-3 tabular-nums"
        />
        <span className="text-[11px] leading-relaxed text-apagado">
          A conta rende sozinha, e esse dinheiro não veio da rifa. Separando
          ele, a conferência fecha exata em vez de acusar diferença todo mês.
        </span>
      </label>

      <div className="flex gap-2">
        <Botao
          type="submit"
          tipo="principal"
          disabled={ocupado || !valido}
          className="flex-1"
        >
          Salvar
        </Botao>
        <Botao tipo="discreto" onClick={aoCancelar}>
          Cancelar
        </Botao>
      </div>
    </form>
  );
}

function quando(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    // Fuso fixo: esta tela também é desenhada no servidor, que roda em UTC.
    timeZone: "America/Sao_Paulo",
  });
}
