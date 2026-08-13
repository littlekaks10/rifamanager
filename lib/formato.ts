/** Formata um número como dinheiro brasileiro: 570 -> "R$ 570,00". */
export function reais(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

/** Igual ao anterior, mas sem os centavos quando são zero: 570 -> "R$ 570". */
export function reaisCurto(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: Number.isInteger(valor) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(valor);
}

/**
 * Tira acentos e maiúsculas para a busca funcionar do jeito que a gente espera:
 * digitar "hernani" precisa encontrar "Hernâni".
 */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove os acentos separados pelo normalize
    .toLowerCase()
    .trim();
}

/**
 * Lê um valor digitado como dinheiro e devolve um número.
 * Aceita tanto "1.234,56" (jeito brasileiro) quanto "1234.56".
 * Devolve NaN se não der para entender.
 */
export function paraNumero(texto: string): number {
  const limpo = texto
    .replace(/[^\d.,-]/g, "")
    .replace(/\.(?=\d{3}\b)/g, "") // tira o ponto de milhar
    .replace(",", ".");

  return limpo === "" ? NaN : Number(limpo);
}

/**
 * Agrupa uma lista de números em faixas para ficar curta na tela:
 * [1,2,3,4,5,9,11,12] -> "1–5, 9, 11–12"
 */
export function faixas(numeros: number[]): string {
  if (numeros.length === 0) return "—";

  const ordenados = [...numeros].sort((a, b) => a - b);
  const partes: string[] = [];

  let inicio = ordenados[0];
  let anterior = ordenados[0];

  for (let i = 1; i <= ordenados.length; i++) {
    const atual = ordenados[i];

    if (atual !== anterior + 1) {
      if (inicio === anterior) partes.push(String(inicio));
      else if (anterior === inicio + 1) partes.push(`${inicio}, ${anterior}`);
      else partes.push(`${inicio}–${anterior}`);

      inicio = atual;
    }
    anterior = atual;
  }

  return partes.join(", ");
}
