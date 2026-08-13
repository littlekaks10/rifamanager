import type { MetadataRoute } from "next";

/**
 * O "manifesto" é a carteira de identidade do app: é ele que faz o iPhone
 * tratar o site como aplicativo ao adicionar na tela de início.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rifa — controle de números e metas",
    short_name: "Rifa", // o nome que cabe embaixo do ícone
    description:
      "Controle dos números vendidos da rifa e das metas de arrecadação.",
    start_url: "/numeros",
    display: "standalone", // abre sem a barra do Safari
    background_color: "#0b0f14",
    theme_color: "#0b0f14",
    orientation: "portrait",
    lang: "pt-BR",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
