"use client";

import { useMemo, useState, useTransition } from "react";
import type { Panorama } from "@/lib/conflitos";
import { problemasPrimeiro } from "@/lib/conflitos";
import { normalizar, reaisCurto } from "@/lib/formato";
import { atribuirNumeros } from "@/app/actions/numeros";
import { Alertas } from "./Alertas";
import { GradeNumeros } from "./GradeNumeros";
import { ListaCompradores } from "./ListaCompradores";
import { PainelComprador } from "./PainelComprador";
import { FormAtribuir, Folha, PainelNumero } from "./PainelNumero";
import { ImagemDaRifa } from "./ImagemDaRifa";
import { Botao, Cartao, Estatistica } from "./ui";

type Filtro = "todos" | "livres" | "pagos" | "pendentes" | "conflitos";

const FILTROS: { id: Filtro; rotulo: string }[] = [
  { id: "todos", rotulo: "Todos" },
  { id: "livres", rotulo: "Livres" },
  { id: "pagos", rotulo: "✓ Pagos" },
  { id: "pendentes", rotulo: "⏳ Pendentes" },
  { id: "conflitos", rotulo: "⚠ Conflitos" },
];

export function TelaNumeros({ panorama }: { panorama: Panorama }) {
  const [visao, setVisao] = useState<"grade" | "lista">("grade");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busca, setBusca] = useState("");

  const [modoSelecao, setModoSelecao] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [atribuindoLote, setAtribuindoLote] = useState(false);

  const [numeroAberto, setNumeroAberto] = useState<number | null>(null);
  const [compradorAberto, setCompradorAberto] = useState<string | null>(null);
  const [verImagem, setVerImagem] = useState(false);
  const [pendente, iniciar] = useTransition();

  const livres = useMemo(
    () => panorama.numeros.filter((n) => n.estado === "livre").map((n) => n.numero),
    [panorama.numeros],
  );

  /**
   * Quais números ficam ACESOS na grade, combinando filtro + busca.
   * null significa "todos acesos".
   */
  const destacados = useMemo(() => {
    const termo = normalizar(busca);
    let conjunto: Set<number> | null = null;

    if (termo) {
      conjunto = new Set<number>();

      // Busca por número: "11" acende 11, 110, 111...
      if (/^\d+$/.test(termo)) {
        for (const n of panorama.numeros)
          if (String(n.numero).startsWith(termo)) conjunto.add(n.numero);
      }

      // Busca por nome: acende todos os números da pessoa.
      for (const c of panorama.compradores)
        if (normalizar(c.nome).includes(termo))
          for (const n of c.numeros) conjunto.add(n);
    }

    if (filtro !== "todos") {
      const doFiltro = new Set(
        panorama.numeros
          .filter((n) =>
            filtro === "livres"
              ? n.estado === "livre"
              : filtro === "pagos"
                ? n.estado === "pago"
                : filtro === "pendentes"
                  ? n.estado === "pendente"
                  : n.estado === "conflito",
          )
          .map((n) => n.numero),
      );

      conjunto =
        conjunto === null
          ? doFiltro
          : new Set([...conjunto].filter((n) => doFiltro.has(n)));
    }

    return conjunto;
  }, [busca, filtro, panorama]);

  const compradoresFiltrados = useMemo(() => {
    const termo = normalizar(busca);
    const lista = problemasPrimeiro(panorama.compradores);
    if (!termo) return lista;

    return lista.filter(
      (c) =>
        normalizar(c.nome).includes(termo) ||
        c.numeros.some((n) => String(n).startsWith(termo)),
    );
  }, [busca, panorama.compradores]);

  const infoAberta =
    numeroAberto !== null
      ? panorama.numeros.find((n) => n.numero === numeroAberto)
      : undefined;
  const compradorSelecionado = panorama.compradores.find(
    (c) => c.id === compradorAberto,
  );

  function tocarNumero(numero: number) {
    if (modoSelecao) {
      setSelecionados((antes) => {
        const novo = new Set(antes);
        if (novo.has(numero)) novo.delete(numero);
        else novo.add(numero);
        return novo;
      });
      return;
    }
    setNumeroAberto(numero);
  }

  function sairDaSelecao() {
    setModoSelecao(false);
    setSelecionados(new Set());
    setAtribuindoLote(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold">{panorama.config.titulo}</h1>
        <span className="text-xs text-apagado">
          {panorama.config.total_numeros} números ·{" "}
          {reaisCurto(panorama.config.valor_numero)} cada
        </span>
      </header>

      <Alertas
        panorama={panorama}
        aoTocarConflito={(n) => {
          sairDaSelecao();
          setNumeroAberto(n);
        }}
        aoTocarComprador={(id) => {
          sairDaSelecao();
          setCompradorAberto(id);
        }}
      />

      <Cartao className="grid grid-cols-4 gap-2">
        <Estatistica rotulo="pagos" valor={panorama.contagem.pagos} cor="text-ok" />
        <Estatistica
          rotulo="pendentes"
          valor={panorama.contagem.pendentes}
          cor="text-alerta"
        />
        <Estatistica
          rotulo="conflito"
          valor={panorama.contagem.emConflito}
          cor={panorama.contagem.emConflito > 0 ? "text-perigo" : "text-apagado"}
        />
        <Estatistica rotulo="livres" valor={panorama.contagem.livres} />
        <div className="col-span-2 border-t border-borda pt-2">
          <Estatistica
            rotulo="arrecadado"
            valor={reaisCurto(panorama.arrecadado)}
            cor="text-ok"
          />
        </div>
        <div className="col-span-2 border-t border-borda pt-2">
          <Estatistica
            rotulo="a receber"
            valor={reaisCurto(panorama.aReceber)}
            cor="text-alerta"
          />
        </div>
      </Cartao>

      {/* Imagem para divulgar */}
      <button
        onClick={() => setVerImagem(true)}
        className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-borda bg-superficie px-4 text-left transition active:scale-[0.99]"
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          🖼️ Gerar imagem para divulgar
        </span>
        <span className="flex items-center gap-2 text-xs text-apagado">
          {panorama.contagem.livres} livres
          <span aria-hidden="true">›</span>
        </span>
      </button>

      {verImagem && <ImagemDaRifa aoFechar={() => setVerImagem(false)} />}

      {/* Grade x Lista */}
      <div className="flex gap-2">
        <Alternador
          ativo={visao === "grade"}
          onClick={() => setVisao("grade")}
          rotulo="Grade"
        />
        <Alternador
          ativo={visao === "lista"}
          onClick={() => setVisao("lista")}
          rotulo="Compradores"
        />
      </div>

      <input
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar por número ou nome…"
        className="min-h-12 rounded-xl border border-borda bg-superficie px-4 text-texto placeholder:text-apagado/60"
      />

      {visao === "grade" ? (
        <>
          <div className="rolagem-fina -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {FILTROS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFiltro(f.id)}
                className={`min-h-10 shrink-0 rounded-full border px-3 text-xs font-bold transition ${
                  filtro === f.id
                    ? "border-destaque bg-destaque text-white"
                    : "border-borda bg-superficie text-apagado"
                }`}
              >
                {f.rotulo}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-apagado">
              {modoSelecao
                ? `${selecionados.size} selecionado(s) — toque nos números`
                : "Toque num número para editar"}
            </p>
            <Botao
              tipo={modoSelecao ? "normal" : "discreto"}
              onClick={() => (modoSelecao ? sairDaSelecao() : setModoSelecao(true))}
            >
              {modoSelecao ? "Cancelar" : "Selecionar vários"}
            </Botao>
          </div>

          <GradeNumeros
            numeros={panorama.numeros}
            destacados={destacados}
            selecionados={selecionados}
            modoSelecao={modoSelecao}
            aoTocar={tocarNumero}
          />

          <Legenda />
        </>
      ) : (
        <ListaCompradores
          compradores={compradoresFiltrados}
          aoTocar={(id) => setCompradorAberto(id)}
        />
      )}

      {/* Barra flutuante do modo "selecionar vários" */}
      {modoSelecao && selecionados.size > 0 && (
        <div
          className="fixed inset-x-0 bottom-16 z-40 mx-auto flex max-w-2xl gap-2 px-4"
          style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))" }}
        >
          <Botao
            tipo="principal"
            className="flex-1 shadow-lg"
            disabled={pendente}
            onClick={() => setAtribuindoLote(true)}
          >
            Atribuir {selecionados.size} número(s)
          </Botao>
        </div>
      )}

      {/* Painéis */}
      {numeroAberto !== null && infoAberta && (
        <PainelNumero
          numero={numeroAberto}
          info={infoAberta}
          compradores={panorama.compradores}
          livres={livres}
          aoFechar={() => setNumeroAberto(null)}
        />
      )}

      {compradorSelecionado && (
        <PainelComprador
          comprador={compradorSelecionado}
          livres={livres}
          aoFechar={() => setCompradorAberto(null)}
        />
      )}

      {atribuindoLote && (
        <Folha
          titulo={`${selecionados.size} números`}
          subtitulo="Atribuir todos a uma pessoa"
          aoFechar={() => setAtribuindoLote(false)}
          ocupado={pendente}
        >
          <FormAtribuir
            numeros={[...selecionados].sort((a, b) => a - b)}
            compradores={panorama.compradores}
            ocupado={pendente}
            aoEnviar={(dados) =>
              iniciar(async () => {
                const r = await atribuirNumeros(dados);
                if (r.ok) sairDaSelecao();
                else alert(r.erro);
              })
            }
          />
        </Folha>
      )}
    </div>
  );
}

function Alternador({
  ativo,
  onClick,
  rotulo,
}: {
  ativo: boolean;
  onClick: () => void;
  rotulo: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`min-h-11 flex-1 rounded-xl border text-sm font-bold transition ${
        ativo
          ? "border-destaque bg-destaque/15 text-destaque"
          : "border-borda bg-superficie text-apagado"
      }`}
    >
      {rotulo}
    </button>
  );
}

function Legenda() {
  const itens = [
    { cor: "border-okborda bg-okfundo text-ok", texto: "✓ pago" },
    { cor: "border-alertaborda bg-alertafundo text-alerta", texto: "⏳ pendente" },
    { cor: "border-perigo bg-perigofundo text-perigo", texto: "⚠ conflito" },
    { cor: "border-borda text-apagado", texto: "livre" },
  ];

  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {itens.map((i) => (
        <span
          key={i.texto}
          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${i.cor}`}
        >
          {i.texto}
        </span>
      ))}
    </div>
  );
}
