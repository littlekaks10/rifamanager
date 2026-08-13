import { carregarPanorama } from "@/lib/dados";
import { TelaNumeros } from "@/components/TelaNumeros";

// Os dados mudam a cada toque seu, então nunca guardamos página pronta em cache.
export const dynamic = "force-dynamic";

export default async function PaginaNumeros() {
  const panorama = await carregarPanorama();
  return <TelaNumeros panorama={panorama} />;
}
