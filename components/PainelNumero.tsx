"use client";

import { useState, useTransition } from "react";
import type { CompradorComNumeros, NumeroInfo } from "@/lib/conflitos";
import type { StatusComprador } from "@/lib/types";
import {
  atribuirNumeros,
  definirEstadoComprador,
  editarComprador,
  liberarNumero,
  moverReivindicacao,
  removerReivindicacao,
  type Resultado,
} from "@/app/actions/numeros";
import { faixas } from "@/lib/formato";
import { Botao, EtiquetaEstado } from "./ui";

/**
 * O painel que sobe de baixo ao tocar num número.
 *
 * Ele muda de cara conforme a situação do número:
 *   livre     -> formulário para atribuir a alguém
 *   ocupado   -> dados do dono e ações (pagar, mover, liberar)
 *   conflito  -> os dois donos lado a lado, para você decidir quem fica
 */
export function PainelNumero({
  numero,
  info,
  compradores,
  livres,
  aoFechar,
}: {
  numero: number;
  info: NumeroInfo;
  compradores: CompradorComNumeros[];
  livres: number[];
  aoFechar: () => void;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function executar(acao: () => Promise<Resultado>, fecharDepois = false) {
    setErro(null);
    iniciar(async () => {
      const r = await acao();
      if (!r.ok) setErro(r.erro);
      else if (fecharDepois) aoFechar();
    });
  }

  const emConflito = info.donos.length > 1;

  return (
    <Folha
      titulo={`Número ${numero}`}
      subtitulo={
        emConflito
          ? `${info.donos.length} pessoas reivindicam este número`
          : info.donos.length === 1
            ? info.donos[0].nome
            : "Livre"
      }
      destaque={emConflito ? "perigo" : null}
      aoFechar={aoFechar}
      ocupado={pendente}
      erro={erro}
    >
      {info.donos.length === 0 && (
        <FormAtribuir
          numeros={[numero]}
          compradores={compradores}
          ocupado={pendente}
          aoEnviar={(dados) => executar(() => atribuirNumeros(dados), true)}
        />
      )}

      {info.donos.length === 1 && (
        <DonoUnico
          numero={numero}
          dono={compradores.find((c) => c.id === info.donos[0].id) ?? null}
          livres={livres}
          ocupado={pendente}
          executar={executar}
          aoFechar={aoFechar}
        />
      )}

      {emConflito && (
        <ResolverConflito
          numero={numero}
          donos={info.donos
            .map((d) => compradores.find((c) => c.id === d.id))
            .filter((c): c is CompradorComNumeros => Boolean(c))}
          livres={livres}
          ocupado={pendente}
          executar={executar}
        />
      )}
    </Folha>
  );
}

/* ------------------------------------------------------------------ */
/* Caso 1: número livre — atribuir a alguém                            */
/* ------------------------------------------------------------------ */

export function FormAtribuir({
  numeros,
  compradores,
  ocupado,
  aoEnviar,
}: {
  numeros: number[];
  compradores: CompradorComNumeros[];
  ocupado: boolean;
  aoEnviar: (dados: {
    numeros: number[];
    compradorId?: string;
    nome?: string;
    telefone?: string | null;
    status: StatusComprador;
  }) => void;
}) {
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [status, setStatus] = useState<StatusComprador>("pago");

  const existente = compradores.find(
    (c) => c.nome.toLowerCase() === nome.trim().toLowerCase(),
  );

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        aoEnviar({
          numeros,
          compradorId: existente?.id,
          nome: nome.trim(),
          telefone: telefone.trim() || null,
          status,
        });
      }}
    >
      <p className="text-xs text-apagado">
        Atribuindo {numeros.length === 1 ? "o número" : "os números"}{" "}
        <strong className="text-texto">{faixas(numeros)}</strong>
      </p>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-apagado">Comprador</span>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          list="lista-compradores"
          placeholder="Nome de quem pegou"
          autoComplete="off"
          required
          className="min-h-12 rounded-xl border border-borda bg-superficie2 px-3 text-texto placeholder:text-apagado/60"
        />
        {/* Sugere os nomes já cadastrados enquanto você digita. */}
        <datalist id="lista-compradores">
          {compradores.map((c) => (
            <option key={c.id} value={c.nome} />
          ))}
        </datalist>
        {existente && (
          <span className="text-[11px] text-destaque">
            Já cadastrado — os números serão somados aos que ele já tem
            {existente.numeros.length > 0 && ` (${faixas(existente.numeros)})`}.
          </span>
        )}
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-apagado">
          Telefone (opcional)
        </span>
        <input
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          inputMode="tel"
          placeholder="(00) 00000-0000"
          className="min-h-12 rounded-xl border border-borda bg-superficie2 px-3 text-texto placeholder:text-apagado/60"
        />
      </label>

      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-xs font-semibold text-apagado">
          Já pagou?
        </legend>
        <div className="grid grid-cols-2 gap-2">
          <OpcaoEstado
            valor="pago"
            atual={status}
            aoEscolher={setStatus}
            rotulo="✓ Pago"
            classe="border-okborda bg-okfundo text-ok"
          />
          <OpcaoEstado
            valor="pendente"
            atual={status}
            aoEscolher={setStatus}
            rotulo="⏳ Pendente"
            classe="border-alertaborda bg-alertafundo text-alerta"
          />
        </div>
      </fieldset>

      <Botao type="submit" tipo="principal" disabled={ocupado}>
        {ocupado ? "Salvando…" : "Atribuir"}
      </Botao>
    </form>
  );
}

function OpcaoEstado({
  valor,
  atual,
  aoEscolher,
  rotulo,
  classe,
}: {
  valor: StatusComprador;
  atual: StatusComprador;
  aoEscolher: (v: StatusComprador) => void;
  rotulo: string;
  classe: string;
}) {
  const escolhido = atual === valor;
  return (
    <button
      type="button"
      onClick={() => aoEscolher(valor)}
      className={`min-h-12 rounded-xl border text-sm font-bold transition active:scale-95 ${
        escolhido ? classe : "border-borda bg-transparent text-apagado"
      }`}
    >
      {rotulo}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Caso 2: um dono só                                                  */
/* ------------------------------------------------------------------ */

function DonoUnico({
  numero,
  dono,
  livres,
  ocupado,
  executar,
  aoFechar,
}: {
  numero: number;
  dono: CompradorComNumeros | null;
  livres: number[];
  ocupado: boolean;
  executar: (acao: () => Promise<Resultado>, fecharDepois?: boolean) => void;
  aoFechar: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(dono?.nome ?? "");
  const [telefone, setTelefone] = useState(dono?.telefone ?? "");
  const [movendo, setMovendo] = useState(false);

  if (!dono) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-base font-bold">{dono.nome}</p>
          {dono.telefone && (
            <a
              href={`tel:${dono.telefone}`}
              className="text-xs text-destaque underline"
            >
              {dono.telefone}
            </a>
          )}
          <p className="mt-0.5 text-xs text-apagado">
            Números desta pessoa: {faixas(dono.numeros)}
          </p>
        </div>
        <EtiquetaEstado status={dono.status} />
      </div>

      {editando ? (
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
          <div className="flex gap-2">
            <Botao
              tipo="principal"
              disabled={ocupado}
              className="flex-1"
              onClick={() => {
                executar(() =>
                  editarComprador(dono.id, nome, telefone.trim() || null),
                );
                setEditando(false);
              }}
            >
              Salvar
            </Botao>
            <Botao tipo="discreto" onClick={() => setEditando(false)}>
              Cancelar
            </Botao>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {dono.status === "pago" ? (
            <Botao
              disabled={ocupado}
              onClick={() => executar(() => definirEstadoComprador(dono.id, "pendente"))}
            >
              ⏳ Marcar pendente
            </Botao>
          ) : (
            <Botao
              tipo="principal"
              disabled={ocupado}
              onClick={() => executar(() => definirEstadoComprador(dono.id, "pago"))}
            >
              ✓ Marcar pago
            </Botao>
          )}

          <Botao disabled={ocupado} onClick={() => setEditando(true)}>
            Editar dados
          </Botao>

          <Botao disabled={ocupado} onClick={() => setMovendo((v) => !v)}>
            Mover número
          </Botao>

          <Botao
            tipo="perigo"
            disabled={ocupado}
            onClick={() => {
              if (confirm(`Liberar o número ${numero}? Ele volta a ficar disponível.`))
                executar(() => liberarNumero(numero), true);
            }}
          >
            Liberar nº {numero}
          </Botao>
        </div>
      )}

      {movendo && (
        <EscolherNumeroLivre
          livres={livres}
          ocupado={ocupado}
          aoEscolher={(destino) => {
            setMovendo(false);
            executar(() => moverReivindicacao(numero, dono.id, destino), true);
          }}
          aoCancelar={() => setMovendo(false)}
        />
      )}

      <Botao tipo="discreto" onClick={aoFechar}>
        Fechar
      </Botao>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Caso 3: conflito — dois ou mais donos                               */
/* ------------------------------------------------------------------ */

function ResolverConflito({
  numero,
  donos,
  livres,
  ocupado,
  executar,
}: {
  numero: number;
  donos: CompradorComNumeros[];
  livres: number[];
  ocupado: boolean;
  executar: (acao: () => Promise<Resultado>, fecharDepois?: boolean) => void;
}) {
  const [movendo, setMovendo] = useState<string | null>(null);

  /** Deixa este ficar com o número e tira todos os outros. */
  function manterSomente(id: string) {
    const outros = donos.filter((d) => d.id !== id);
    executar(async () => {
      for (const o of outros) {
        const r = await removerReivindicacao(numero, o.id);
        if (!r.ok) return r;
      }
      return { ok: true };
    }, true);
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="rounded-xl border border-perigoborda bg-perigofundo px-3 py-2 text-xs text-perigo">
        Estas pessoas anotaram o mesmo número. Escolha quem fica com o nº {numero}
        — a outra pode ser movida para um número livre, sem perder o cadastro.
      </p>

      {donos.map((dono) => (
        <div
          key={dono.id}
          className="flex flex-col gap-2 rounded-xl border border-borda bg-superficie2 p-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-bold">{dono.nome}</p>
              <p className="text-xs text-apagado">
                Outros números: {faixas(dono.numeros.filter((n) => n !== numero))}
              </p>
            </div>
            <EtiquetaEstado status={dono.status} />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Botao
              tipo="principal"
              disabled={ocupado}
              onClick={() => manterSomente(dono.id)}
            >
              Fica com o nº
            </Botao>
            <Botao
              disabled={ocupado}
              onClick={() => setMovendo(movendo === dono.id ? null : dono.id)}
            >
              Mover
            </Botao>
            <Botao
              tipo="perigo"
              disabled={ocupado}
              onClick={() => {
                if (confirm(`Tirar o nº ${numero} de ${dono.nome}?`))
                  executar(() => removerReivindicacao(numero, dono.id), true);
              }}
            >
              Remover
            </Botao>
          </div>

          {movendo === dono.id && (
            <EscolherNumeroLivre
              livres={livres}
              ocupado={ocupado}
              aoEscolher={(destino) => {
                setMovendo(null);
                executar(() => moverReivindicacao(numero, dono.id, destino), true);
              }}
              aoCancelar={() => setMovendo(null)}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Seletor de número livre (usado ao mover alguém)                     */
/* ------------------------------------------------------------------ */

function EscolherNumeroLivre({
  livres,
  ocupado,
  aoEscolher,
  aoCancelar,
}: {
  livres: number[];
  ocupado: boolean;
  aoEscolher: (numero: number) => void;
  aoCancelar: () => void;
}) {
  const [busca, setBusca] = useState("");

  const filtrados = busca.trim()
    ? livres.filter((n) => String(n).startsWith(busca.trim()))
    : livres;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-destaque/40 bg-superficie p-3">
      <p className="text-xs font-semibold text-apagado">
        Escolha um número livre ({livres.length} disponíveis)
      </p>
      <input
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        inputMode="numeric"
        placeholder="Filtrar, ex.: 12"
        className="min-h-11 rounded-xl border border-borda bg-superficie2 px-3"
      />
      <div className="rolagem-fina flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
        {filtrados.slice(0, 200).map((n) => (
          <button
            key={n}
            disabled={ocupado}
            onClick={() => aoEscolher(n)}
            className="min-h-10 min-w-11 rounded-lg border border-borda px-2 text-sm font-bold tabular-nums text-texto active:scale-90 disabled:opacity-40"
          >
            {n}
          </button>
        ))}
        {filtrados.length === 0 && (
          <p className="text-xs text-apagado">Nenhum número livre com esse começo.</p>
        )}
      </div>
      <Botao tipo="discreto" onClick={aoCancelar}>
        Cancelar
      </Botao>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* A "folha" que desliza de baixo                                      */
/* ------------------------------------------------------------------ */

export function Folha({
  titulo,
  subtitulo,
  destaque,
  aoFechar,
  ocupado,
  erro,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  destaque?: "perigo" | null;
  aoFechar: () => void;
  ocupado?: boolean;
  erro?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Fundo escurecido: tocar fora fecha o painel. */}
      <button
        aria-label="Fechar"
        onClick={aoFechar}
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className={`rolagem-fina relative max-h-[85vh] overflow-y-auto rounded-t-3xl border-t bg-superficie p-4 ${
          destaque === "perigo" ? "border-perigo" : "border-borda"
        }`}
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-borda" />

        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold">{titulo}</h2>
            {subtitulo && <p className="text-xs text-apagado">{subtitulo}</p>}
          </div>
          <button
            onClick={aoFechar}
            aria-label="Fechar"
            className="-mr-1 -mt-1 flex h-11 w-11 items-center justify-center rounded-full text-xl text-apagado"
          >
            ✕
          </button>
        </div>

        {erro && (
          <p className="mb-3 rounded-xl border border-perigoborda bg-perigofundo px-3 py-2 text-xs text-perigo">
            {erro}
          </p>
        )}

        <div className={ocupado ? "pointer-events-none opacity-60" : ""}>
          {children}
        </div>
      </div>
    </div>
  );
}
