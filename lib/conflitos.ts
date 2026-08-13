import type {
  Atribuicao,
  Comprador,
  Configuracao,
  EstadoNumero,
} from "./types";

/**
 * A REGRA DAS CORES, num lugar só.
 *
 * Tanto a grade quanto os alertas do topo e a lista de compradores leem daqui,
 * então é impossível a grade dizer uma coisa e o alerta dizer outra.
 *
 * Prioridade: conflito (vermelho) ganha de tudo. Um número disputado aparece
 * vermelho mesmo que as duas pessoas já tenham pago.
 */

export type NumeroInfo = {
  numero: number;
  estado: EstadoNumero;
  /** Normalmente 0 ou 1 pessoa. 2 ou mais = conflito. */
  donos: Comprador[];
};

export type CompradorComNumeros = Comprador & {
  numeros: number[];
  /** Quais dos números dessa pessoa estão sendo disputados por outra. */
  numerosEmConflito: number[];
};

export type Panorama = {
  config: Configuracao;
  numeros: NumeroInfo[];
  compradores: CompradorComNumeros[];

  /** Os números disputados por 2+ pessoas, em ordem. Ex.: [21, 33, 111] */
  conflitos: number[];
  /** Quem ainda não pagou (amarelo). */
  pendentes: CompradorComNumeros[];
  /** Quem está cadastrado mas ainda não escolheu número. */
  semNumero: CompradorComNumeros[];

  contagem: {
    livres: number;
    pagos: number;
    pendentes: number;
    emConflito: number;
    ocupados: number;
  };

  /** Dinheiro que já entrou: reivindicações de compradores marcados como pagos. */
  arrecadado: number;
  /** Dinheiro que entra quando os pendentes pagarem. */
  aReceber: number;
};

export function montarPanorama(
  config: Configuracao,
  compradores: Comprador[],
  atribuicoes: Atribuicao[],
): Panorama {
  const porId = new Map(compradores.map((c) => [c.id, c]));

  // Para cada número, a lista de quem o reivindica.
  const donosPorNumero = new Map<number, Comprador[]>();
  // Para cada pessoa, a lista de números que ela reivindica.
  const numerosPorComprador = new Map<string, number[]>();

  for (const a of atribuicoes) {
    const dono = porId.get(a.comprador_id);
    if (!dono) continue; // segurança: atribuição órfã é ignorada

    if (a.numero < 1 || a.numero > config.total_numeros) continue;

    const lista = donosPorNumero.get(a.numero) ?? [];
    lista.push(dono);
    donosPorNumero.set(a.numero, lista);

    const meus = numerosPorComprador.get(dono.id) ?? [];
    meus.push(a.numero);
    numerosPorComprador.set(dono.id, meus);
  }

  const conflitos: number[] = [];
  const numeros: NumeroInfo[] = [];

  for (let n = 1; n <= config.total_numeros; n++) {
    const donos = donosPorNumero.get(n) ?? [];

    let estado: EstadoNumero;
    if (donos.length === 0) {
      estado = "livre";
    } else if (donos.length > 1) {
      estado = "conflito"; // vermelho tem prioridade sobre tudo
      conflitos.push(n);
    } else {
      // Um dono só: a cor do número é a cor do estado da pessoa.
      // ("inexistente" com número é uma inconsistência que as ações do app
      //  corrigem sozinhas; até lá mostramos como pendente, nunca como pago.)
      estado = donos[0].status === "pago" ? "pago" : "pendente";
    }

    numeros.push({ numero: n, estado, donos });
  }

  const emConflito = new Set(conflitos);

  const comNumeros: CompradorComNumeros[] = compradores.map((c) => {
    const meus = (numerosPorComprador.get(c.id) ?? []).sort((a, b) => a - b);
    return {
      ...c,
      numeros: meus,
      numerosEmConflito: meus.filter((n) => emConflito.has(n)),
    };
  });

  const contagem = {
    livres: numeros.filter((n) => n.estado === "livre").length,
    pagos: numeros.filter((n) => n.estado === "pago").length,
    pendentes: numeros.filter((n) => n.estado === "pendente").length,
    emConflito: conflitos.length,
    ocupados: 0,
  };
  contagem.ocupados = config.total_numeros - contagem.livres;

  // Dinheiro: contamos por reivindicação, não por número. Se duas pessoas
  // pagaram pelo nº 21, você recebeu por duas — o conflito é de numeração,
  // não de caixa.
  let reivindicacoesPagas = 0;
  let reivindicacoesPendentes = 0;
  for (const c of comNumeros) {
    if (c.status === "pago") reivindicacoesPagas += c.numeros.length;
    else if (c.status === "pendente") reivindicacoesPendentes += c.numeros.length;
  }

  return {
    config,
    numeros,
    compradores: comNumeros,
    conflitos,
    pendentes: comNumeros.filter((c) => c.status === "pendente"),
    semNumero: comNumeros.filter((c) => c.numeros.length === 0),
    contagem,
    arrecadado: reivindicacoesPagas * config.valor_numero,
    aReceber: reivindicacoesPendentes * config.valor_numero,
  };
}

/** Ordena a lista de compradores colocando os casos a resolver no topo. */
export function problemasPrimeiro(
  compradores: CompradorComNumeros[],
): CompradorComNumeros[] {
  const peso = (c: CompradorComNumeros) => {
    if (c.numerosEmConflito.length > 0) return 0; // vermelho
    if (c.status === "pendente") return 1; // amarelo
    if (c.numeros.length === 0) return 2; // sem número
    return 3; // tudo certo
  };

  return [...compradores].sort(
    (a, b) => peso(a) - peso(b) || a.nome.localeCompare(b.nome, "pt-BR"),
  );
}
