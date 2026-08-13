import { ImageResponse } from "next/og";

/**
 * Versão do ícone que o iPhone usa na tela de início.
 *
 * O iOS recorta o ícone em quadrado arredondado por conta própria e NÃO
 * respeita transparência, por isso o fundo aqui é sólido.
 */

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
            width: 108,
            gap: 6,
            justifyContent: "center",
          }}
        >
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
                width: 32,
                height: 32,
                borderRadius: 8,
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
