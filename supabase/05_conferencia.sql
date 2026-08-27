-- ============================================================================
--  RIFA MANAGER — CONFERENCIA COM O BANCO (rode DEPOIS do 01 ao 04)
-- ============================================================================
--  Guarda quanto voce viu na Caixinha da ultima vez que conferiu, para o app
--  poder comparar com o "em caixa" que ele calcula sozinho.
--
--  Como usar: painel do Supabase -> "SQL Editor" -> "New query" -> cole TODO
--  este arquivo -> "Run".
--
--  Este arquivo NAO APAGA NADA. So' acrescenta tres colunas, e pode ser
--  rodado quantas vezes quiser.
-- ============================================================================

alter table configuracao
  add column if not exists saldo_banco      numeric(12,2),
  add column if not exists rendimento_banco numeric(12,2),
  add column if not exists conferido_em     timestamptz;

comment on column configuracao.saldo_banco is
  'Quanto tinha na conta/Caixinha na ultima conferencia. Nulo = nunca conferido.';
comment on column configuracao.rendimento_banco is
  'Quanto do saldo acima veio de rendimento do banco, e nao da rifa.';
comment on column configuracao.conferido_em is
  'Quando a conferencia foi informada.';


-- ============================================================================
--  CONFERENCIA — as tres colunas devem aparecer, ainda vazias.
-- ============================================================================
select
  saldo_banco,
  rendimento_banco,
  conferido_em,
  case when saldo_banco is null
       then 'OK — colunas criadas, ainda sem conferencia'
       else 'OK — ja existe uma conferencia informada' end as situacao
from configuracao
where id = 1;
