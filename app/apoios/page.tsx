import { carregarApoios, carregarMetas, carregarPanorama } from "@/lib/dados";
import { TelaApoios } from "@/components/TelaApoios";

export const dynamic = "force-dynamic";

export default async function PaginaApoios() {
  // O "em caixa" mostrado aqui é o mesmo da aba Metas, e depende das três
  // fontes: números vendidos, apoios e o que já foi pago das metas.
  const [extrato, metas, panorama] = await Promise.all([
    carregarApoios(),
    carregarMetas(),
    carregarPanorama(),
  ]);

  const metasPagas = metas
    .filter((m) => m.pago)
    .reduce((s, m) => s + m.valor, 0);

  return (
    <TelaApoios
      apoios={extrato.apoios}
      total={extrato.total}
      quantidade={extrato.quantidade}
      emCaixa={panorama.arrecadado + extrato.total - metasPagas}
    />
  );
}
