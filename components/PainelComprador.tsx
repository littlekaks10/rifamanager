"use client";

import { useState, useTransition } from "react";
import type { CompradorComNumeros } from "@/lib/conflitos";
import {
  atribuirNumeros,
  definirEstadoComprador,
  editarComprador,
  excluirComprador,
  removerReivindicacao,
  type Resultado,
} from "@/app/actions/numeros";
import { faixas } from "@/lib/formato";
import { Botao, EtiquetaEstado } from "./ui";
import { Folha } from "./PainelNumero";

/**
 * O painel de uma PESSOA (aberto pela lista de compradores ou pelos alertas).
 *
 * O painel do número resolve "de quem é este número?".
 * Este aqui resolve "quais números são desta pessoa, e ela já pagou?".
 */
export function PainelComprador({
  comprador,
  livres,
  aoFechar,
}: {
  comprador: CompradorComNumeros;
  livres: number[];
  aoFechar: () => void;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(comprador.nome);
  const [telefone, setTelefone] = useState(comprador.telefone ?? "");
  const [novoNumero, setNovoNumero] = useState("");

  function executar(acao: () => Promise<Resultado>, fecharDepois = false) {
    setErro(null);
    iniciar(async () => {
      const r = await acao();
      if (!r.ok) setErro(r.erro);
      else if (fecharDepois) aoFechar();
    });
  }

  const numeroDigitado = Number(novoNumero);
  const numeroValido =
    Number.isInteger(numeroDigitado) && numeroDigitado >= 1 && novoNumero !== "";
  const jaOcupado = numeroValido && !livres.includes(numeroDigitado);

  return (
    <Folha
      titulo={comprador.nome}
      subtitulo={
        comprador.numeros.length > 0
          ? `nº ${faixas(comprador.numeros)}`
          : "ainda sem número"
      }
      destaque={comprador.numerosEmConflito.length > 0 ? "perigo" : null}
      aoFechar={aoFechar}
      ocupado={pendente}
      erro={erro}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <EtiquetaEstado status={comprador.status} />
          {comprador.telefone && (
            <a
              href={`tel:${comprador.telefone}`}
              className="text-sm text-destaque underline"
            >
              {comprador.telefone}
            </a>
          )}
        </div>

        {comprador.numerosEmConflito.length > 0 && (
          <p className="rounded-xl border border-perigoborda bg-perigofundo px-3 py-2 text-xs text-perigo">
            ⚠ O nº {faixas(comprador.numerosEmConflito)} está sendo disputado com
            outra pessoa. Abra esse número na grade para decidir quem fica.
          </p>
        )}

        {/* Estado de pagamento */}
        <div className="grid grid-cols-2 gap-2">
          {comprador.status === "pago" ? (
            <Botao
              disabled={pendente}
              onClick={() =>
                executar(() => definirEstadoComprador(comprador.id, "pendente"))
              }
            >
              ⏳ Marcar pendente
            </Botao>
          ) : (
            <Botao
              tipo="principal"
              disabled={pendente || comprador.numeros.length === 0}
              onClick={() =>
                executar(() => definirEstadoComprador(comprador.id, "pago"))
              }
            >
              ✓ Marcar pago
            </Botao>
          )}
          <Botao disabled={pendente} onClick={() => setEditando((v) => !v)}>
            {editando ? "Cancelar edição" : "Editar dados"}
          </Botao>
        </div>

        {comprador.numeros.length === 0 && (
          <p className="text-[11px] text-apagado">
            Para marcar como pago, esta pessoa precisa ter pelo menos um número.
          </p>
        )}

        {editando && (
          <div className="flex flex-col gap-2 rounded-xl border border-borda bg-superficie2 p-3">
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="min-h-12 rounded-xl border border-borda bg-superficie px-3"
              placeholder="Nome"
            />
            <input
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              inputMode="tel"
              className="min-h-12 rounded-xl border border-borda bg-superficie px-3"
              placeholder="Telefone"
            />
            <Botao
              tipo="principal"
              disabled={pendente}
              onClick={() => {
                executar(() =>
                  editarComprador(comprador.id, nome, telefone.trim() || null),
                );
                setEditando(false);
              }}
            >
              Salvar dados
            </Botao>
          </div>
        )}

        {/* Números desta pessoa */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-apagado">
            Números ({comprador.numeros.length})
          </p>
          {comprador.numeros.length === 0 ? (
            <p className="text-xs text-apagado">Nenhum número ainda.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {comprador.numeros.map((n) => {
                const conflito = comprador.numerosEmConflito.includes(n);
                return (
                  <button
                    key={n}
                    disabled={pendente}
                    onClick={() => {
                      if (confirm(`Tirar o nº ${n} de ${comprador.nome}?`))
                        executar(() => removerReivindicacao(n, comprador.id));
                    }}
                    className={`min-h-10 rounded-lg border px-3 text-sm font-bold tabular-nums active:scale-90 ${
                      conflito
                        ? "border-perigo bg-perigofundo text-perigo"
                        : "border-borda text-texto"
                    }`}
                  >
                    {n} <span className="text-[10px] opacity-60">✕</span>
                  </button>
                );
              })}
            </div>
          )}
          <p className="text-[11px] text-apagado">
            Toque num número para tirá-lo desta pessoa.
          </p>
        </div>

        {/* Adicionar número */}
        <div className="flex flex-col gap-2 rounded-xl border border-borda bg-superficie2 p-3">
          <p className="text-xs font-semibold text-apagado">Adicionar número</p>
          <div className="flex gap-2">
            <input
              value={novoNumero}
              onChange={(e) => setNovoNumero(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              placeholder="Ex.: 42"
              className="min-h-12 flex-1 rounded-xl border border-borda bg-superficie px-3 tabular-nums"
            />
            <Botao
              tipo="principal"
              disabled={pendente || !numeroValido}
              onClick={() => {
                executar(() =>
                  atribuirNumeros({
                    numeros: [numeroDigitado],
                    compradorId: comprador.id,
                    status:
                      comprador.status === "inexistente"
                        ? "pendente"
                        : comprador.status,
                  }),
                );
                setNovoNumero("");
              }}
            >
              Adicionar
            </Botao>
          </div>
          {jaOcupado && (
            <p className="text-[11px] text-alerta">
              ⚠ O nº {numeroDigitado} já é de outra pessoa. Se adicionar mesmo
              assim, ele vira um conflito vermelho até você resolver.
            </p>
          )}
        </div>

        <Botao
          tipo="perigo"
          disabled={pendente}
          onClick={() => {
            if (
              confirm(
                `Excluir ${comprador.nome}? Os números dele voltam a ficar livres.`,
              )
            )
              executar(() => excluirComprador(comprador.id), true);
          }}
        >
          Excluir comprador
        </Botao>
      </div>
    </Folha>
  );
}
