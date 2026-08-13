/**
 * Os "formatos" dos dados que vêm do banco.
 *
 * TypeScript usa isto para te avisar, ainda enquanto o código é escrito, se
 * algum lugar do app tentar ler um campo que não existe ou escrever um valor
 * inválido — em vez de o erro só aparecer com o app já publicado.
 */

/** Os três estados possíveis de um comprador. Nenhum outro valor é aceito. */
export type StatusComprador = "pago" | "pendente" | "inexistente";

export const STATUS_COMPRADOR: StatusComprador[] = [
  "pago",
  "pendente",
  "inexistente",
];

export type Comprador = {
  id: string;
  nome: string;
  telefone: string | null;
  status: StatusComprador;
};

/** Uma reivindicação: "esta pessoa diz que o número X é dela". */
export type Atribuicao = {
  id: string;
  numero: number;
  comprador_id: string;
};

export type Meta = {
  id: string;
  descricao: string;
  valor: number;
  ordem: number;
  pago: boolean;
};

export type Configuracao = {
  id: number;
  titulo: string;
  total_numeros: number;
  valor_numero: number;
};

/**
 * O estado visual de um número na grade.
 *
 * "conflito" não é um estado de comprador — ele nasce de duas ou mais pessoas
 * reivindicarem o mesmo número, e tem prioridade sobre todo o resto.
 */
export type EstadoNumero = "livre" | "pago" | "pendente" | "conflito";
