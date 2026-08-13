-- ============================================================================
--  RIFA MANAGER — ESTRUTURA DO BANCO (rode este arquivo PRIMEIRO)
-- ============================================================================
--  Como usar: painel do Supabase -> menu lateral "SQL Editor" -> "New query"
--  -> cole TODO este arquivo -> botao "Run".
--
--  Pode rodar mais de uma vez sem medo: tudo aqui usa "if not exists".
-- ============================================================================

-- Extensao que gera identificadores unicos aleatorios (os "uuid").
create extension if not exists "pgcrypto";


-- ----------------------------------------------------------------------------
-- 1) CONFIGURACAO — uma unica linha, com os ajustes gerais da rifa.
-- ----------------------------------------------------------------------------
create table if not exists configuracao (
  id             smallint      primary key default 1,
  titulo         text          not null default 'Rifa',
  total_numeros  integer       not null default 300  check (total_numeros between 1 and 10000),
  valor_numero   numeric(10,2) not null default 10.00 check (valor_numero >= 0),
  atualizado_em  timestamptz   not null default now(),

  -- Trava que garante que so pode existir a linha de id = 1.
  constraint configuracao_linha_unica check (id = 1)
);


-- ----------------------------------------------------------------------------
-- 2) COMPRADORES — as pessoas. O estado de pagamento fica AQUI, na pessoa,
--    igual ao seu ✅ do WhatsApp, que fica na linha de cada nome.
-- ----------------------------------------------------------------------------
create table if not exists compradores (
  id            uuid        primary key default gen_random_uuid(),
  nome          text        not null check (length(btrim(nome)) > 0),
  telefone      text,

  -- O banco SO aceita estes tres valores. Qualquer outra coisa e' recusada,
  -- entao e' impossivel um comprador ficar sem estado definido.
  --   pago        = ja pagou                      -> verde
  --   pendente    = pegou o numero, nao pagou     -> amarelo
  --   inexistente = cadastrado, sem numero ainda  -> contorno tracejado
  status        text        not null default 'inexistente'
                            check (status in ('pago', 'pendente', 'inexistente')),

  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Impede cadastrar a mesma pessoa duas vezes ("Maximus" e "maximus" sao iguais).
create unique index if not exists compradores_nome_unico
  on compradores (lower(btrim(nome)));


-- ----------------------------------------------------------------------------
-- 3) ATRIBUICOES — liga uma pessoa a um numero. O CORACAO DO APP.
-- ----------------------------------------------------------------------------
--  ATENCAO, e' de proposito: esta tabela PERMITE que o mesmo numero apareca
--  mais de uma vez. E' assim que os conflitos (nos 21, 33 e 111) ficam
--  guardados, em vez de o banco recusar e voce PERDER a informacao de quem
--  reivindicou o que.
--
--  Um numero com 2 ou mais linhas aqui = conflito = vermelho na tela.
--
--  O que ele impede e' a MESMA pessoa reivindicar o MESMO numero duas vezes.
-- ----------------------------------------------------------------------------
create table if not exists atribuicoes (
  id           uuid        primary key default gen_random_uuid(),
  numero       integer     not null check (numero >= 1),

  -- "on delete cascade": se voce apagar o comprador, os numeros dele sao
  -- liberados automaticamente, sem deixar lixo para tras.
  comprador_id uuid        not null references compradores(id) on delete cascade,

  criado_em    timestamptz not null default now(),

  constraint atribuicoes_pessoa_numero_unico unique (numero, comprador_id)
);

create index if not exists atribuicoes_numero_idx    on atribuicoes (numero);
create index if not exists atribuicoes_comprador_idx on atribuicoes (comprador_id);


-- ----------------------------------------------------------------------------
-- 4) METAS — as despesas que a rifa precisa cobrir.
-- ----------------------------------------------------------------------------
create table if not exists metas (
  id        uuid          primary key default gen_random_uuid(),
  descricao text          not null check (length(btrim(descricao)) > 0),
  valor     numeric(10,2) not null check (valor >= 0),
  ordem     integer       not null default 0,   -- ordem de prioridade na tela
  pago      boolean       not null default false,
  criado_em timestamptz   not null default now()
);


-- ----------------------------------------------------------------------------
-- 5) SEGURANCA (RLS)
-- ----------------------------------------------------------------------------
--  Ligamos o "Row Level Security" em todas as tabelas e NAO criamos nenhuma
--  policy. Efeito pratico: ninguem consegue ler nem escrever vindo de fora,
--  nem com a chave publica "anon".
--
--  So a chave secreta "service_role" — que fica guardada no servidor da Vercel
--  e nunca chega ao navegador de ninguem — atravessa o RLS. Como todo acesso
--  do app passa pelo servidor, tudo funciona e o banco fica fechado.
-- ----------------------------------------------------------------------------
alter table configuracao enable row level security;
alter table compradores  enable row level security;
alter table atribuicoes  enable row level security;
alter table metas        enable row level security;
