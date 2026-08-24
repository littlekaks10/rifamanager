-- ============================================================================
--  RIFA MANAGER — APOIOS (rode DEPOIS do 01, 02 e 03)
-- ============================================================================
--  Dinheiro que entra SEM ser venda de numero: um amigo que ajudou, um
--  patrocinio, uma vaquinha.
--
--  Como usar: painel do Supabase -> "SQL Editor" -> "New query" -> cole TODO
--  este arquivo -> "Run".
--
--  Este arquivo NAO APAGA NADA e pode ser rodado mais de uma vez: o apoio so'
--  e' lancado se ainda nao existir.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1) A TABELA NOVA
-- ----------------------------------------------------------------------------
create table if not exists apoios (
  id          uuid          primary key default gen_random_uuid(),
  descricao   text          not null check (length(btrim(descricao)) > 0),
  valor       numeric(12,2) not null check (valor >= 0),
  recebido_em timestamptz   not null default now(),
  criado_em   timestamptz   not null default now()
);

create index if not exists apoios_recebido_idx on apoios (recebido_em desc);

-- Fechado para fora, aberto so' para o servidor — igual as outras tabelas.
alter table apoios enable row level security;


-- ----------------------------------------------------------------------------
-- 2) MIGRACAO DA TRAVA DO EXTRATO
-- ----------------------------------------------------------------------------
--  A coluna "tipo" da tabela movimentos so' aceitava seis valores, e nenhum
--  servia para apoio — o banco recusaria a linha. Aqui derrubamos a trava
--  antiga e criamos uma nova, incluindo 'apoio' e 'apoio_estornado'.
--
--  O bloco abaixo procura a trava pelo que ela FAZ (mencionar a coluna tipo)
--  em vez de pelo nome, porque o nome foi gerado automaticamente pelo Postgres
--  e pode variar.
-- ----------------------------------------------------------------------------
do $$
declare
  trava record;
begin
  for trava in
    select conname
      from pg_constraint
     where conrelid = 'movimentos'::regclass
       and contype  = 'c'
       and pg_get_constraintdef(oid) ilike '%tipo%'
  loop
    execute format('alter table movimentos drop constraint %I', trava.conname);
  end loop;
end $$;

alter table movimentos
  add constraint movimentos_tipo_check check (tipo in (
    'abertura',        -- saldo inicial
    'pagamento',       -- entrou dinheiro (venda de numero)
    'estorno',         -- saiu (pagamento desfeito)
    'meta_paga',       -- saiu (voce pagou uma meta)
    'meta_estornada',  -- voltou (meta desmarcada)
    'ajuste',          -- mudanca no valor do numero ou de uma meta paga
    'apoio',           -- entrou dinheiro de fora (amigo, patrocinio)
    'apoio_estornado'  -- apoio removido
  ));


-- ----------------------------------------------------------------------------
-- 3) O SEU APOIO DE R$ 119,99
-- ----------------------------------------------------------------------------
insert into apoios (descricao, valor)
select 'Apoio de um amigo', 119.99
where not exists (
  select 1 from apoios where descricao = 'Apoio de um amigo'
);

-- E a linha correspondente no extrato do caixa.
insert into movimentos (tipo, descricao, valor, ocorrido_em)
select 'apoio', 'Apoio recebido: Apoio de um amigo', 119.99, now()
where not exists (
  select 1 from movimentos
   where tipo = 'apoio' and descricao = 'Apoio recebido: Apoio de um amigo'
);


-- ============================================================================
--  CONFERENCIA
--
--  Nao ha' numero fixo para esperar aqui: seu caixa muda a cada numero vendido
--  e a cada meta que voce marca como paga. O que TEM de acontecer e':
--
--    coluna "apoios"  = 119,99   (o apoio do seu amigo entrou)
--    coluna "confere" = OK       (em_caixa e saldo_historico identicos)
--
--  Se "confere" disser DIVERGIU, me avise com o resultado.
-- ============================================================================
with contas as (
  select
    (select count(*) from atribuicoes a
       join compradores c on c.id = a.comprador_id
      where c.status = 'pago')
    * (select valor_numero from configuracao where id = 1)   as arrecadado,
    coalesce((select sum(valor) from apoios), 0)             as apoios,
    coalesce((select sum(valor) from metas where pago), 0)   as metas_pagas,
    coalesce((select sum(valor) from movimentos), 0)         as saldo_historico
)
select
  arrecadado,
  apoios,
  metas_pagas,
  arrecadado + apoios - metas_pagas as em_caixa,
  saldo_historico,
  case when arrecadado + apoios - metas_pagas = saldo_historico
       then 'OK — conferem' else 'DIVERGIU — me avise' end as confere
from contas;
