import { ImageResponse } from "next/og";

/**
 * O ícone do app, desenhado em código.
 *
 * O Next.js gera a imagem PNG sozinho durante a publicação — assim você não
 * precisa de nenhum programa de desenho nem de instalar biblioteca de imagem.
 */

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(150deg, #16a34a 0%, #0b0f14 75%)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            width: 300,
            gap: 18,
            justifyContent: "center",
          }}
        >
          {/* Uma mini-grade de rifa: verdes, um amarelo e um vermelho —
              as três cores que o app usa. */}
          {[
            "#22c55e",
            "#22c55e",
            "#f5b301",
            "#22c55e",
            "#f04747",
            "#22c55e",
            "#22c55e",
            "#22c55e",
            "#ffffff",
          ].map((cor, i) => (
            <div
              key={i}
              style={{
                width: 88,
                height: 88,
                borderRadius: 20,
                background: cor,
                opacity: cor === "#ffffff" ? 0.28 : 1,
              }}
            />
          ))}
        </div>
      </div>
    ),
    size,
  );
}
