import { carregarMetas, carregarPanorama } from "@/lib/dados";
import { TelaMetas } from "@/components/TelaMetas";

export const dynamic = "force-dynamic";

export default async function PaginaMetas() {
  // As metas precisam do arrecadado, que vem da aba dos números — por isso
  // as duas leituras acontecem aqui, ao mesmo tempo.
  const [metas, panorama] = await Promise.all([
    carregarMetas(),
    carregarPanorama(),
  ]);

  const numerosVendidos = panorama.compradores
    .filter((c) => c.status === "pago")
    .reduce((s, c) => s + c.numeros.length, 0);

  // Números duplicados em que mais de uma pessoa já pagou: são eles que fazem
  // o total de "números pagos" daqui ficar maior que o da grade.
  const conflitosPagos = panorama.conflitos.filter(
    (n) =>
      (panorama.numeros[n - 1]?.donos.filter((d) => d.status === "pago")
        .length ?? 0) > 1,
  ).length;

  return (
    <TelaMetas
      metas={metas}
      arrecadado={panorama.arrecadado}
      aReceber={panorama.aReceber}
      valorNumero={panorama.config.valor_numero}
      numerosVendidos={numerosVendidos}
      conflitosPagos={conflitosPagos}
    />
  );
}
