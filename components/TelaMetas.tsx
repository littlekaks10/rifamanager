"use client";

import { useMemo, useState, useTransition } from "react";
import type { Meta } from "@/lib/types";
import { paraNumero, reais, reaisCurto } from "@/lib/formato";
import {
  criarMeta,
  definirValorNumero,
  editarMeta,
  excluirMeta,
  marcarMetaPaga,
  moverMeta,
  type Resultado,
} from "@/app/actions/metas";
import { Botao, Cartao, Estatistica } from "./ui";
import { HistoricoCaixa } from "./HistoricoCaixa";
import { ConferenciaBanco } from "./ConferenciaBanco";
import type { Movimento } from "@/lib/historico";

/**
 * A aba das metas.
 *
 * A conta que ela faz:
 *   caixa disponível = arrecadado − o que já foi pago das metas
 * e então desce pela lista, na sua ordem de prioridade, marcando o que o
 * dinheiro em caixa já cobre e quanto falta para a próxima.
 */
export function TelaMetas({
  metas,
  arrecadado,
  aReceber,
  valorNumero,
  numerosVendidos,
  conflitosPagos,
  apoios,
  movimentos,
  totalMovimentos,
  saldoHistorico,
  saldoBanco,
  rendimentoBanco,
  conferidoEm,
}: {
  metas: Meta[];
  arrecadado: number;
  aReceber: number;
  valorNumero: number;
  numerosVendidos: number;
  /** Quantos números duplicados têm mais de uma pessoa que já pagou. */
  conflitosPagos: number;
  /** Dinheiro que entrou sem ser venda de número (aba Apoios). */
  apoios: number;
  movimentos: Movimento[];
  /** -1 quando a tabela do histórico ainda não foi criada no banco. */
  totalMovimentos: number;
  saldoHistorico: number;
  /** Última conferência com o banco. Nulo = nunca conferido. */
  saldoBanco: number | null;
  rendimentoBanco: number | null;
  conferidoEm: string | null;
}) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [editandoValor, setEditandoValor] = useState(false);
  const [criando, setCriando] = useState(false);
  const [verHistorico, setVerHistorico] = useState(false);

  function executar(acao: () => Promise<Resultado>, depois?: () => void) {
    setErro(null);
    iniciar(async () => {
      const r = await acao();
      if (!r.ok) setErro(r.erro);
      else depois?.();
    });
  }

  const calculo = useMemo(() => {
    const total = metas.reduce((s, m) => s + m.valor, 0);
    const jaPagas = metas.filter((m) => m.pago).reduce((s, m) => s + m.valor, 0);

    // O caixa tem TRÊS fontes: o que veio da venda de números, o que veio de
    // apoios (amigo, patrocínio) e o que já saiu para pagar metas. Esquecer os
    // apoios aqui faria o autoteste do extrato acusar divergência.
    const entrou = arrecadado + apoios;
    const emCaixa = entrou - jaPagas;

    // Desce pela lista das metas que faltam, gastando o caixa.
    let sobra = emCaixa;
    const situacao = new Map<string, { coberta: boolean; falta: number }>();

    for (const m of metas) {
      if (m.pago) continue;
      if (sobra >= m.valor) {
        situacao.set(m.id, { coberta: true, falta: 0 });
        sobra -= m.valor;
      } else {
        situacao.set(m.id, { coberta: false, falta: m.valor - sobra });
        sobra = 0;
      }
    }

    return {
      total,
      jaPagas,
      emCaixa,
      entrou,
      situacao,
      falta: Math.max(0, total - entrou),
      progresso: total > 0 ? Math.min(100, (entrou / total) * 100) : 0,
    };
  }, [metas, arrecadado, apoios]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Metas</h1>

      {erro && (
        <p className="rounded-xl border border-perigoborda bg-perigofundo px-3 py-2 text-xs text-perigo">
          {erro}
        </p>
      )}

      {/* Resumo do dinheiro */}
      <Cartao className="flex flex-col gap-3">
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-3xl font-bold tabular-nums text-ok">
              {reaisCurto(arrecadado)}
            </p>
            <p className="text-xs text-apagado">
              arrecadado · {numerosVendidos}{" "}
              {numerosVendidos === 1 ? "número pago" : "números pagos"}
            </p>
            {conflitosPagos > 0 && (
              <p className="mt-1 max-w-[22rem] text-[11px] leading-snug text-perigo">
                ⚠ {conflitosPagos}{" "}
                {conflitosPagos === 1
                  ? "número duplicado tem"
                  : "números duplicados têm"}{" "}
                mais de uma pessoa que pagou — todas estão contadas aqui, porque
                o dinheiro entrou. Por isso este total é maior que os
                quadradinhos verdes da aba Números.
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-lg font-bold tabular-nums">
              {reaisCurto(calculo.total)}
            </p>
            <p className="text-xs text-apagado">total das metas</p>
          </div>
        </div>

        {/* Sem esta linha, o caixa maior que o arrecadado ficaria sem
            explicação na tela. */}
        {apoios > 0 && (
          <p className="-mt-1 text-xs text-ok">
            + {reaisCurto(apoios)} em apoios{" "}
            <span className="text-apagado">
              (fora da conta dos números vendidos)
            </span>
          </p>
        )}

        <div
          className="h-3 overflow-hidden rounded-full bg-superficie2"
          role="progressbar"
          aria-valuenow={Math.round(calculo.progresso)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progresso do arrecadado sobre o total das metas"
        >
          <div
            className="h-full rounded-full bg-ok transition-all"
            style={{ width: `${calculo.progresso}%` }}
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Estatistica
            rotulo="ainda faltam"
            valor={reaisCurto(calculo.falta)}
            cor={calculo.falta > 0 ? "text-texto" : "text-ok"}
          />
          <Estatistica
            rotulo="a receber"
            valor={reaisCurto(aReceber)}
            cor="text-alerta"
          />
          <Estatistica
            rotulo="em caixa"
            valor={reaisCurto(calculo.emCaixa)}
            cor={calculo.emCaixa < 0 ? "text-perigo" : "text-texto"}
          />
        </div>

        <p className="text-[11px] leading-relaxed text-apagado">
          <strong className="text-texto">Em caixa</strong> = arrecadado menos as
          metas que você já marcou como pagas ({reaisCurto(calculo.jaPagas)}).
          É esse dinheiro que a lista abaixo distribui, de cima para baixo.
        </p>
      </Cartao>

      <ConferenciaBanco
        emCaixa={calculo.emCaixa}
        saldoBanco={saldoBanco}
        rendimentoBanco={rendimentoBanco}
        conferidoEm={conferidoEm}
      />

      {/* Histórico do caixa */}
      <button
        onClick={() => setVerHistorico(true)}
        className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-borda bg-superficie px-4 text-left transition active:scale-[0.99]"
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          📜 Histórico do caixa
        </span>
        <span className="flex items-center gap-2 text-xs text-apagado">
          {totalMovimentos < 0
            ? "não configurado"
            : `${totalMovimentos} ${totalMovimentos === 1 ? "lançamento" : "lançamentos"}`}
          <span aria-hidden="true">›</span>
        </span>
      </button>

      {verHistorico && (
        <HistoricoCaixa
          movimentos={movimentos}
          total={totalMovimentos}
          saldoHistorico={saldoHistorico}
          emCaixa={calculo.emCaixa}
          aoFechar={() => setVerHistorico(false)}
        />
      )}

      {/* Valor de cada número */}
      <Cartao>
        {editandoValor ? (
          <EditarValorNumero
            atual={valorNumero}
            ocupado={pendente}
            aoSalvar={(v) =>
              executar(() => definirValorNumero(v), () => setEditandoValor(false))
            }
            aoCancelar={() => setEditandoValor(false)}
          />
        ) : (
          <button
            onClick={() => setEditandoValor(true)}
            className="flex w-full items-center justify-between gap-2 text-left"
          >
            <div>
              <p className="text-sm font-semibold">Valor de cada número</p>
              <p className="text-xs text-apagado">
                Toque para mudar — recalcula tudo na hora
              </p>
            </div>
            <span className="text-xl font-bold tabular-nums text-destaque">
              {reais(valorNumero)}
            </span>
          </button>
        )}
      </Cartao>

      {/* Lista de metas */}
      <div className="flex flex-col gap-2">
        {metas.map((m, i) => (
          <ItemMeta
            key={m.id}
            meta={m}
            situacao={calculo.situacao.get(m.id)}
            primeira={i === 0}
            ultima={i === metas.length - 1}
            ocupado={pendente}
            executar={executar}
          />
        ))}

        {metas.length === 0 && (
          <p className="rounded-2xl border border-borda bg-superficie px-4 py-6 text-center text-sm text-apagado">
            Nenhuma meta cadastrada ainda.
          </p>
        )}
      </div>

      {criando ? (
        <Cartao>
          <FormMeta
            ocupado={pendente}
            aoSalvar={(descricao, valor) =>
              executar(() => criarMeta(descricao, valor), () => setCriando(false))
            }
            aoCancelar={() => setCriando(false)}
          />
        </Cartao>
      ) : (
        <Botao tipo="principal" onClick={() => setCriando(true)}>
          + Nova meta
        </Botao>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ItemMeta({
  meta,
  situacao,
  primeira,
  ultima,
  ocupado,
  executar,
}: {
  meta: Meta;
  situacao?: { coberta: boolean; falta: number };
  primeira: boolean;
  ultima: boolean;
  ocupado: boolean;
  executar: (acao: () => Promise<Resultado>, depois?: () => void) => void;
}) {
  const [editando, setEditando] = useState(false);

  const borda = meta.pago
    ? "border-okborda"
    : situacao?.coberta
      ? "border-destaque/50"
      : "border-borda";

  return (
    <div className={`rounded-2xl border bg-superficie p-3 ${borda}`}>
      {editando ? (
        <FormMeta
          descricaoInicial={meta.descricao}
          valorInicial={meta.valor}
          ocupado={ocupado}
          aoSalvar={(d, v) =>
            executar(() => editarMeta(meta.id, d, v), () => setEditando(false))
          }
          aoCancelar={() => setEditando(false)}
        />
      ) : (
        <>
          <div className="flex items-start gap-3">
            {/* O ✅ que você liga e desliga com o dedo */}
            <button
              onClick={() => executar(() => marcarMetaPaga(meta.id, !meta.pago))}
              disabled={ocupado}
              aria-pressed={meta.pago}
              aria-label={
                meta.pago ? "Desmarcar como paga" : "Marcar como paga"
              }
              className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-lg transition active:scale-90 ${
                meta.pago
                  ? "border-okborda bg-okfundo text-ok"
                  : "border-borda text-apagado"
              }`}
            >
              {meta.pago ? "✓" : ""}
            </button>

            <div className="min-w-0 flex-1">
              <p
                className={`font-semibold ${
                  meta.pago ? "text-apagado line-through" : ""
                }`}
              >
                {meta.descricao}
              </p>
              <p className="text-lg font-bold tabular-nums">
                {reais(meta.valor)}
              </p>

              {meta.pago ? (
                <p className="mt-0.5 text-xs font-semibold text-ok">✓ já paga</p>
              ) : situacao?.coberta ? (
                <p className="mt-0.5 text-xs font-semibold text-destaque">
                  💰 já dá para pagar
                </p>
              ) : (
                <p className="mt-0.5 text-xs font-semibold text-alerta">
                  faltam {reaisCurto(situacao?.falta ?? meta.valor)}
                </p>
              )}
            </div>

            <div className="flex shrink-0 flex-col gap-1">
              <button
                onClick={() => executar(() => moverMeta(meta.id, "cima"))}
                disabled={ocupado || primeira}
                aria-label="Subir na prioridade"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-borda text-xs text-apagado disabled:opacity-25"
              >
                ▲
              </button>
              <button
                onClick={() => executar(() => moverMeta(meta.id, "baixo"))}
                disabled={ocupado || ultima}
                aria-label="Descer na prioridade"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-borda text-xs text-apagado disabled:opacity-25"
              >
                ▼
              </button>
            </div>
          </div>

          <div className="mt-2 flex gap-2">
            <Botao tipo="discreto" onClick={() => setEditando(true)}>
              Editar
            </Botao>
            <Botao
              tipo="discreto"
              disabled={ocupado}
              onClick={() => {
                if (confirm(`Excluir a meta "${meta.descricao}"?`))
                  executar(() => excluirMeta(meta.id));
              }}
            >
              Excluir
            </Botao>
          </div>
        </>
      )}
    </div>
  );
}

function FormMeta({
  descricaoInicial = "",
  valorInicial,
  ocupado,
  aoSalvar,
  aoCancelar,
}: {
  descricaoInicial?: string;
  valorInicial?: number;
  ocupado: boolean;
  aoSalvar: (descricao: string, valor: number) => void;
  aoCancelar: () => void;
}) {
  const [descricao, setDescricao] = useState(descricaoInicial);
  const [valor, setValor] = useState(
    valorInicial !== undefined ? String(valorInicial).replace(".", ",") : "",
  );

  const numero = paraNumero(valor);
  const valido = descricao.trim() !== "" && Number.isFinite(numero) && numero >= 0;

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (valido) aoSalvar(descricao, numero);
      }}
    >
      <input
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
        placeholder="Ex.: Custo hospedagem"
        className="min-h-12 rounded-xl border border-borda bg-superficie2 px-3"
      />
      <input
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        inputMode="decimal"
        placeholder="Ex.: 500,00"
        className="min-h-12 rounded-xl border border-borda bg-superficie2 px-3 tabular-nums"
      />
      <div className="flex gap-2">
        <Botao type="submit" tipo="principal" disabled={ocupado || !valido} className="flex-1">
          Salvar
        </Botao>
        <Botao tipo="discreto" onClick={aoCancelar}>
          Cancelar
        </Botao>
      </div>
    </form>
  );
}

function EditarValorNumero({
  atual,
  ocupado,
  aoSalvar,
  aoCancelar,
}: {
  atual: number;
  ocupado: boolean;
  aoSalvar: (valor: number) => void;
  aoCancelar: () => void;
}) {
  const [texto, setTexto] = useState(String(atual).replace(".", ","));
  const numero = paraNumero(texto);
  const valido = Number.isFinite(numero) && numero >= 0;

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (valido) aoSalvar(numero);
      }}
    >
      <label className="text-sm font-semibold">Valor de cada número</label>
      <input
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        inputMode="decimal"
        autoFocus
        className="min-h-12 rounded-xl border border-borda bg-superficie2 px-3 text-lg tabular-nums"
      />
      <div className="flex gap-2">
        <Botao type="submit" tipo="principal" disabled={ocupado || !valido} className="flex-1">
          Salvar
        </Botao>
        <Botao tipo="discreto" onClick={aoCancelar}>
          Cancelar
        </Botao>
      </div>
    </form>
  );
}
