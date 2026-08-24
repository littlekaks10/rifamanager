"use client";

import { useState, useTransition } from "react";
import type { Apoio } from "@/lib/dados";
import { paraNumero, reais, reaisCurto } from "@/lib/formato";
import {
  criarApoio,
  editarApoio,
  excluirApoio,
  type Resultado,
} from "@/app/actions/apoios";
import { Botao, Cartao, Estatistica } from "./ui";

/**
 * A aba dos apoios: dinheiro que entrou sem ser venda de número.
 *
 * Fica separado do "arrecadado" de propósito — assim a contagem de números
 * vendidos continua honesta —, mas soma no "em caixa" da aba Metas, porque é
 * dinheiro disponível para pagar as despesas.
 */
export function TelaApoios({
  apoios,
  total,
  quantidade,
  emCaixa,
}: {
  apoios: Apoio[];
  total: number;
  /** -1 quando a tabela ainda não foi criada no banco. */
  quantidade: number;
  emCaixa: number;
}) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);

  function executar(acao: () => Promise<Resultado>, depois?: () => void) {
    setErro(null);
    iniciar(async () => {
      const r = await acao();
      if (!r.ok) setErro(r.erro);
      else depois?.();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Apoios</h1>

      {erro && (
        <p className="rounded-xl border border-perigoborda bg-perigofundo px-3 py-2 text-xs text-perigo">
          {erro}
        </p>
      )}

      {quantidade < 0 && (
        <p className="rounded-xl border border-alertaborda bg-alertafundo px-3 py-2 text-xs text-alerta">
          A tabela dos apoios ainda não existe no banco. Rode o arquivo{" "}
          <strong>supabase/04_apoios.sql</strong> no SQL Editor do Supabase.
        </p>
      )}

      <Cartao className="flex flex-col gap-3">
        <div>
          <p className="text-3xl font-bold tabular-nums text-ok">
            {reaisCurto(total)}
          </p>
          <p className="text-xs text-apagado">
            {apoios.length === 0
              ? "nenhum apoio registrado"
              : `em ${apoios.length} ${apoios.length === 1 ? "apoio" : "apoios"}`}
          </p>
        </div>

        <div className="border-t border-borda pt-3">
          <Estatistica rotulo="em caixa hoje" valor={reaisCurto(emCaixa)} />
        </div>

        <p className="text-[11px] leading-relaxed text-apagado">
          Dinheiro que chegou <strong className="text-texto">sem ser venda de
          número</strong> — um amigo que ajudou, um patrocínio, uma vaquinha.
          Fica fora do &ldquo;arrecadado&rdquo;, para a contagem de números
          vendidos continuar certa, mas soma no caixa e ajuda a cobrir as metas.
        </p>
      </Cartao>

      <div className="flex flex-col gap-2">
        {apoios.map((a) => (
          <ItemApoio
            key={a.id}
            apoio={a}
            ocupado={pendente}
            executar={executar}
          />
        ))}

        {apoios.length === 0 && quantidade >= 0 && (
          <p className="rounded-2xl border border-borda bg-superficie px-4 py-6 text-center text-sm text-apagado">
            Nenhum apoio ainda. Use o botão abaixo para registrar o primeiro.
          </p>
        )}
      </div>

      {criando ? (
        <Cartao>
          <FormApoio
            ocupado={pendente}
            aoSalvar={(d, v) =>
              executar(() => criarApoio(d, v), () => setCriando(false))
            }
            aoCancelar={() => setCriando(false)}
          />
        </Cartao>
      ) : (
        <Botao tipo="principal" onClick={() => setCriando(true)}>
          + Novo apoio
        </Botao>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ItemApoio({
  apoio,
  ocupado,
  executar,
}: {
  apoio: Apoio;
  ocupado: boolean;
  executar: (acao: () => Promise<Resultado>, depois?: () => void) => void;
}) {
  const [editando, setEditando] = useState(false);

  return (
    <div className="rounded-2xl border border-okborda bg-superficie p-3">
      {editando ? (
        <FormApoio
          descricaoInicial={apoio.descricao}
          valorInicial={apoio.valor}
          ocupado={ocupado}
          aoSalvar={(d, v) =>
            executar(() => editarApoio(apoio.id, d, v), () => setEditando(false))
          }
          aoCancelar={() => setEditando(false)}
        />
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{apoio.descricao}</p>
              <p className="mt-0.5 text-xs text-apagado">
                {data(apoio.recebido_em)}
              </p>
            </div>
            <span className="shrink-0 text-lg font-bold tabular-nums text-ok">
              +{reais(apoio.valor)}
            </span>
          </div>

          <div className="mt-2 flex gap-2">
            <Botao tipo="discreto" onClick={() => setEditando(true)}>
              Editar
            </Botao>
            <Botao
              tipo="discreto"
              disabled={ocupado}
              onClick={() => {
                if (
                  confirm(
                    `Excluir o apoio "${apoio.descricao}"? O valor sai do caixa.`,
                  )
                )
                  executar(() => excluirApoio(apoio.id));
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

function FormApoio({
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
  const valido = descricao.trim() !== "" && Number.isFinite(numero) && numero > 0;

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
        placeholder="De quem veio? Ex.: Apoio de um amigo"
        className="min-h-12 rounded-xl border border-borda bg-superficie2 px-3"
      />
      <input
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        inputMode="decimal"
        placeholder="Ex.: 119,99"
        className="min-h-12 rounded-xl border border-borda bg-superficie2 px-3 tabular-nums"
      />
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

function data(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    // Fuso fixo de propósito: esta tela também é desenhada no servidor (que
    // roda em UTC). Sem fixar, perto da meia-noite o servidor diria um dia e o
    // celular diria outro, e o React reclamaria da diferença.
    timeZone: "America/Sao_Paulo",
  });
}
