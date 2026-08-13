"use client";

import { useEffect, useState } from "react";
import { Botao } from "./ui";
import { Folha } from "./PainelNumero";

/**
 * O painel que mostra a imagem para divulgar a rifa.
 *
 * A imagem em si é desenhada no servidor (rota /imagem). Aqui a gente só
 * mostra e oferece o jeito de mandar para alguém.
 *
 * No iPhone o caminho bom é o menu nativo de compartilhar: dali sai direto
 * para o WhatsApp, ou para "Salvar Imagem". Quando o navegador não tiver esse
 * recurso, sobra o velho "toque e segure na imagem", que sempre funciona.
 */
export function ImagemDaRifa({ aoFechar }: { aoFechar: () => void }) {
  // O endereço leva um carimbo de tempo para o celular nunca mostrar uma
  // versão velha guardada em cache.
  const [endereco, setEndereco] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [compartilhando, setCompartilhando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [podeCompartilhar, setPodeCompartilhar] = useState(false);

  useEffect(() => {
    setEndereco(`/imagem?t=${Date.now()}`);
    // canShare com arquivos não existe em todo navegador — por isso o teste.
    try {
      const teste = new File([new Blob()], "t.png", { type: "image/png" });
      setPodeCompartilhar(Boolean(navigator.canShare?.({ files: [teste] })));
    } catch {
      setPodeCompartilhar(false);
    }
  }, []);

  async function compartilhar() {
    if (!endereco) return;
    setAviso(null);
    setCompartilhando(true);

    try {
      const resposta = await fetch(endereco);
      if (!resposta.ok) throw new Error("não consegui gerar a imagem");

      const blob = await resposta.blob();
      const arquivo = new File([blob], "rifa.png", { type: "image/png" });

      if (navigator.canShare?.({ files: [arquivo] })) {
        await navigator.share({
          files: [arquivo],
          title: "Rifa — números disponíveis",
        });
      } else {
        setAviso(
          "Seu navegador não abre o menu de compartilhar. Toque e segure na imagem para salvar.",
        );
      }
    } catch (e) {
      // Fechar o menu de compartilhar do iPhone conta como "cancelado" e cai
      // aqui — isso não é erro, então não mostramos aviso nenhum.
      const cancelou = e instanceof Error && e.name === "AbortError";
      if (!cancelou) {
        setAviso("Não deu para compartilhar. Toque e segure na imagem para salvar.");
      }
    } finally {
      setCompartilhando(false);
    }
  }

  return (
    <Folha
      titulo="Imagem para divulgar"
      subtitulo="mostra só o que está livre e o que já foi resgatado"
      aoFechar={aoFechar}
    >
      <div className="flex flex-col gap-3">
        {aviso && (
          <p className="rounded-xl border border-alertaborda bg-alertafundo px-3 py-2 text-xs text-alerta">
            {aviso}
          </p>
        )}

        <div className="overflow-hidden rounded-xl border border-borda bg-fundo">
          {carregando && (
            <p className="px-4 py-10 text-center text-sm text-apagado">
              Desenhando a imagem…
            </p>
          )}

          {endereco && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={endereco}
              alt="Grade da rifa mostrando quais números estão livres e quais já foram resgatados"
              className={`w-full ${carregando ? "hidden" : "block"}`}
              onLoad={() => setCarregando(false)}
              onError={() => {
                setCarregando(false);
                setAviso("Não consegui gerar a imagem. Tente de novo.");
              }}
            />
          )}
        </div>

        <Botao
          tipo="principal"
          disabled={compartilhando || carregando}
          onClick={compartilhar}
        >
          {compartilhando ? "Preparando…" : "📤 Compartilhar imagem"}
        </Botao>

        <p className="text-center text-[11px] leading-relaxed text-apagado">
          {podeCompartilhar
            ? "Abre o menu do iPhone: dali você manda no WhatsApp ou salva nas Fotos."
            : "Toque e segure na imagem acima para salvar ou enviar."}
          <br />
          A imagem é gerada na hora, com a situação deste momento.
        </p>

        <Botao tipo="discreto" onClick={aoFechar}>
          Fechar
        </Botao>
      </div>
    </Folha>
  );
}
