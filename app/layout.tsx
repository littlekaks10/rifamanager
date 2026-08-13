import type { Metadata, Viewport } from "next";
import "./globals.css";
import { TabBar } from "@/components/TabBar";

export const metadata: Metadata = {
  title: "Rifa",
  description: "Controle dos números e das metas da rifa",
  applicationName: "Rifa",
  appleWebApp: {
    // Faz o app abrir em tela cheia quando aberto pelo ícone da tela de início.
    capable: true,
    title: "Rifa",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    // Impede o iOS de transformar os números da rifa em links de telefone.
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0f14",
  // "cover" deixa o app usar a tela inteira, inclusive atrás do notch — as
  // margens de segurança são tratadas no CSS com env(safe-area-inset-*).
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
  // Trava o zoom por pinça: numa grade de 300 quadradinhos, o zoom acidental
  // atrapalha mais do que ajuda.
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="min-h-full bg-fundo text-texto antialiased">
        {/* pb-24 reserva o espaço da barra de abas fixa no rodapé. */}
        <main
          className="mx-auto w-full max-w-2xl px-4 pb-28"
          style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
        >
          {children}
        </main>
        <TabBar />
      </body>
    </html>
  );
}
