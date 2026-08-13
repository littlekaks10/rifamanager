-- ============================================================================
--  RIFA MANAGER — HISTORICO DO CAIXA (rode DEPOIS do 01 e do 02)
-- ============================================================================
--  Como usar: painel do Supabase -> "SQL Editor" -> "New query" -> cole TODO
--  este arquivo -> "Run".
--
--  Este arquivo NAO APAGA NADA. Ele so' cria a tabela nova e lanca o saldo de
--  abertura. Pode rodar de novo sem medo: a abertura so' e' criada uma vez.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- MOVIMENTOS — o extrato do caixa
-- ----------------------------------------------------------------------------
create table if not exists movimentos (
  id             uuid          primary key default gen_random_uuid(),
  ocorrido_em    timestamptz   not null default now(),

  tipo           text          not null check (tipo in (
                                 'abertura',        -- saldo inicial
                                 'pagamento',       -- entrou dinheiro
                                 'estorno',         -- saiu (pagamento desfeito)
                                 'meta_paga',       -- saiu (voce pagou uma meta)
                                 'meta_estornada',  -- voltou (meta desmarcada)
                                 'ajuste'           -- mudanca no valor do numero
                               )),

  -- Texto ja' pronto para a tela: "Maximus pagou 1 numero (no 24)".
  descricao      text          not null check (length(btrim(descricao)) > 0),

  -- Positivo = entrou. Negativo = saiu. A soma de tudo = "em caixa".
  valor          numeric(12,2) not null,

  -- ATENCAO, e' de proposito: nome em TEXTO, e nao ligacao com a tabela de
  -- compradores. Se voce excluir a Mirela, a linha "Mirela pagou R$ 20"
  -- precisa continuar existindo e legivel. Um historico que some junto com o
  -- cadastro nao e' historico.
  comprador_nome text,
  meta_descricao text,

  numeros        integer[],    -- quais numeros, quando fizer sentido

  criado_em      timestamptz   not null default now()
);

-- A tela lista do mais recente para o mais antigo.
create index if not exists movimentos_ocorrido_idx
  on movimentos (ocorrido_em desc);

-- Fechado para fora, aberto so' para o servidor — igual as outras tabelas.
alter table movimentos enable row level security;


-- ----------------------------------------------------------------------------
-- SALDO DE ABERTURA
-- ----------------------------------------------------------------------------
--  Os numeros ja' pagos e as metas ja' quitadas aconteceram ANTES de existir
--  historico. Sem lancar essa abertura, o extrato comecaria em zero e nao
--  bateria com o "em caixa" da tela.
--
--  Os valores abaixo NAO sao fixos: sao calculados a partir dos seus dados
--  reais neste momento, entao continuam corretos mesmo que voce ja' tenha
--  mexido em alguma coisa pelo app.
-- ----------------------------------------------------------------------------

-- 1) Tudo que ja' entrou: reivindicacoes de compradores pagos x valor do numero.
insert into movimentos (tipo, descricao, valor, ocorrido_em)
select
  'abertura',
  'Saldo inicial — ' || conta.pagos || ' ' ||
    case when conta.pagos = 1 then 'número já pago' else 'números já pagos' end ||
    ' antes do histórico existir',
  conta.pagos * cfg.valor_numero,
  now()
from
  (select count(*)::int as pagos
     from atribuicoes a
     join compradores c on c.id = a.comprador_id
    where c.status = 'pago') conta,
  (select valor_numero from configuracao where id = 1) cfg
where not exists (select 1 from movimentos where tipo = 'abertura');

-- 2) Tudo que ja' saiu: cada meta que ja' estava marcada como paga.
insert into movimentos (tipo, descricao, valor, meta_descricao, ocorrido_em)
select
  'meta_paga',
  'Meta já paga antes do histórico: ' || m.descricao,
  -m.valor,
  m.descricao,
  now()
from metas m
where m.pago = true
  and not exists (
    select 1 from movimentos v
     where v.tipo = 'meta_paga' and v.meta_descricao = m.descricao
  );


-- ============================================================================
--  CONFERENCIA — o saldo do extrato tem que bater com o "em caixa" da tela.
--  Esperado hoje:  entrou 570,00 | saiu -385,00 | saldo 185,00 | confere = OK
-- ============================================================================
select
  (select coalesce(sum(valor), 0) from movimentos where valor > 0) as entrou,
  (select coalesce(sum(valor), 0) from movimentos where valor < 0) as saiu,
  (select coalesce(sum(valor), 0) from movimentos)                 as saldo_historico,
  (select
     (select count(*) from atribuicoes a
        join compradores c on c.id = a.comprador_id
       where c.status = 'pago')
     * (select valor_numero from configuracao where id = 1)
     - coalesce((select sum(valor) from metas where pago), 0)
  ) as em_caixa,
  case when (select coalesce(sum(valor), 0) from movimentos) =
            (select
               (select count(*) from atribuicoes a
                  join compradores c on c.id = a.comprador_id
                 where c.status = 'pago')
               * (select valor_numero from configuracao where id = 1)
               - coalesce((select sum(valor) from metas where pago), 0))
       then 'OK — conferem' else 'DIVERGIU — me avise' end as confere;
