import { ImageResponse } from "next/og";
import { carregarPanorama } from "@/lib/dados";

/**
 * A IMAGEM PARA DIVULGAR A RIFA.
 *
 * Endereço: /imagem — devolve um PNG desenhado na hora, com a situação atual.
 *
 * Mostra só duas coisas: número livre ou já resgatado. Quem pagou, quem está
 * devendo e onde há conflito NÃO aparecem — isso é assunto seu, não do grupo
 * para onde a imagem vai.
 *
 * É gerada pelo mesmo `next/og` que desenha o ícone do app, então não precisou
 * de nenhuma biblioteca nova.
 */

export const dynamic = "force-dynamic";

const LARGURA = 1080;
const COLUNAS = 20;
const CELULA = 42;
const ESPACO = 4; // margem de cada lado da célula

export async function GET() {
  const p = await carregarPanorama();

  const livres = p.contagem.livres;
  const ocupados = p.config.total_numeros - livres;

  const linhas = Math.ceil(p.config.total_numeros / COLUNAS);
  const altura = 300 + linhas * (CELULA + ESPACO * 2) + 130;

  const agora = new Date().toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#0b0f14",
          padding: 40,
          fontFamily: "sans-serif",
        }}
      >
        {/* Cabeçalho */}
        <div style={{ display: "flex", flexDirection: "column", marginBottom: 28 }}>
          <div style={{ fontSize: 52, fontWeight: 700, color: "#e8eef5" }}>
            {p.config.titulo}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", marginTop: 10 }}>
            <span style={{ fontSize: 64, fontWeight: 700, color: "#22c55e" }}>
              {livres}
            </span>
            <span style={{ fontSize: 32, color: "#8fa1b3", marginLeft: 14 }}>
              {`${livres === 1 ? "número livre" : "números livres"} de ${p.config.total_numeros}`}
            </span>
          </div>
          {/* Cada texto tem de ser UM filho só: o Satori recusa div com vários
              filhos sem "display" explícito, e texto + variável já conta como
              dois. Por isso tudo aqui vira uma string única. */}
          <div style={{ fontSize: 28, color: "#8fa1b3", marginTop: 4 }}>
            {`${ocupados} ${ocupados === 1 ? "já resgatado" : "já resgatados"}`}
          </div>
        </div>

        {/* A grade */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            width: LARGURA - 80,
          }}
        >
          {p.numeros.map((n) => {
            const livre = n.estado === "livre";
            return (
              <div
                key={n.numero}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: CELULA,
                  height: CELULA,
                  margin: ESPACO,
                  borderRadius: 8,
                  // Livre em claro para saltar aos olhos — é o que quem recebe
                  // a imagem está procurando. O resgatado é escuro para se
                  // distinguir à primeira vista, mas com verde forte o
                  // suficiente para o número continuar legível: a imagem
                  // também serve para a pessoa achar o número dela.
                  background: livre ? "#e8eef5" : "#12301f",
                  color: livre ? "#0b0f14" : "#54d98c",
                  border: livre ? "none" : "2px solid #2c7a52",
                  fontSize: n.numero > 99 ? 16 : 18,
                  fontWeight: 700,
                }}
              >
                {n.numero}
              </div>
            );
          })}
        </div>

        {/* Legenda e data */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginTop: 34,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", marginRight: 40 }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 6,
                background: "#e8eef5",
                marginRight: 12,
              }}
            />
            <span style={{ fontSize: 28, color: "#e8eef5" }}>livre</span>
          </div>

          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 6,
                background: "#12301f",
                border: "2px solid #2c7a52",
                marginRight: 12,
              }}
            />
            <span style={{ fontSize: 28, color: "#8fa1b3" }}>já resgatado</span>
          </div>
        </div>

        <div style={{ fontSize: 22, color: "#5c6b7a", marginTop: 16 }}>
          {`atualizado em ${agora}`}
        </div>
      </div>
    ),
    {
      width: LARGURA,
      height: altura,
      headers: {
        // Nunca guardar em cache: a imagem tem de refletir a rifa de agora.
        "cache-control": "no-store, max-age=0",
      },
    },
  );
}
