-- ============================================================================
--  RIFA MANAGER — CARGA DOS SEUS DADOS (rode este arquivo DEPOIS do 01)
-- ============================================================================
--  Como usar: painel do Supabase -> "SQL Editor" -> "New query" -> cole TODO
--  este arquivo -> "Run".
--
--  ATENCAO: este arquivo APAGA compradores, atribuicoes e metas antes de
--  inserir, para poder ser rodado de novo do zero. Depois que voce comecar a
--  editar pelo app, NAO rode este arquivo de novo — voce perderia as edicoes.
-- ============================================================================

begin;

truncate table atribuicoes, compradores restart identity cascade;
truncate table metas restart identity cascade;


-- ----------------------------------------------------------------------------
-- CONFIGURACAO DA RIFA
-- ----------------------------------------------------------------------------
-- valor_numero: quanto custa cada numero. Colocamos R$ 10,00 como palpite —
-- da' para trocar direto no app, na aba Metas, sem mexer em SQL.
insert into configuracao (id, titulo, total_numeros, valor_numero)
values (1, 'Minha Rifa', 300, 10.00)
on conflict (id) do update
  set titulo        = excluded.titulo,
      total_numeros = excluded.total_numeros,
      valor_numero  = excluded.valor_numero,
      atualizado_em = now();


-- ----------------------------------------------------------------------------
-- COMPRADORES + NUMEROS  (a sua lista do WhatsApp, na integra)
-- ----------------------------------------------------------------------------
--  Os numeros em CONFLITO entram DE PROPOSITO duplicados. O app vai mostra-los
--  em vermelho ate voce decidir quem fica com cada um:
--
--    no  21  -> Juliana Queiroga  X  Waldeir Hernani
--    no  33  -> Frederico Ferreira X  Waldeir Hernani
--    no 111  -> Julia Gramiscelli  X  Maria Aparecida
--
--  Quem estava SEM o ✅ na lista entra como 'pendente' (Maximus, no 24).
--  Quem estava SEM numero nenhum entra como 'inexistente' (Mirela Chagas).
-- ----------------------------------------------------------------------------
with dados (nome, telefone, status, numeros) as (
  values
    ('Vitor Hugo',                          null::text, 'pago',     array[1,2,3,4,5,6,7,8,9,10]),
    ('Juliana Queiroga Toffalini',          null::text, 'pago',     array[11, 21]),              -- 21 em conflito
    ('Johnatas Silva de Paula',             null::text, 'pago',     array[13]),
    ('Cellia Freire',                       null::text, 'pago',     array[14, 16]),
    ('Waldeir Hernâni',                     null::text, 'pago',     array[15, 21, 33]),          -- 21 e 33 em conflito
    ('Karla Las Cazas',                     null::text, 'pago',     array[17, 125]),
    ('Daniella Maria de Lacerda Santana',   null::text, 'pago',     array[18, 41]),
    ('Sheila Silva do Carmo',               null::text, 'pago',     array[19, 27]),
    ('Janaina Cassia',                      null::text, 'pago',     array[20, 76]),
    ('João Vitor Gomes Franco',             null::text, 'pago',     array[22]),
    ('Maximus',                             null::text, 'pendente', array[24]),                  -- sem o ✅ na lista
    ('Graziele Barbosa da Silva',           null::text, 'pago',     array[26]),
    ('Julia Gramiscelli Cerqueira',         null::text, 'pago',     array[28, 111, 117, 203, 268]), -- 111 em conflito
    ('Frederico de Alcântara Ferreira',     null::text, 'pago',     array[31, 32, 33]),          -- 33 em conflito
    ('Julia Paixa Miranda Pinto',           null::text, 'pago',     array[34]),
    ('Adriana A F Luiz Silva',              null::text, 'pago',     array[48]),
    ('Gislaine Lima Oliveira Santana',      null::text, 'pago',     array[49, 51]),
    ('Marcelo José Maximiano de Santana',   null::text, 'pago',     array[72]),
    ('Emanuel Victor Moreira Saturnino',    null::text, 'pago',     array[73, 74, 75]),
    ('Roberto Caixeta',                     null::text, 'pago',     array[95, 96, 97]),
    ('Marlene Paiva',                       null::text, 'pago',     array[99]),
    ('Flavia Milena Pereira',               null::text, 'pago',     array[100]),
    ('Maria Aparecida',                     null::text, 'pago',     array[111, 112, 113]),       -- 111 em conflito
    ('Mauricio Ceff',                       null::text, 'pago',     array[230, 231, 232, 233, 234]),
    ('Mirela Chagas',                       null::text, 'inexistente', array[]::integer[])       -- ainda sem numero
),
inseridos as (
  insert into compradores (nome, telefone, status)
  select nome, telefone, status from dados
  returning id, nome
)
insert into atribuicoes (numero, comprador_id)
select unnest(d.numeros), i.id
from dados d
join inseridos i on i.nome = d.nome;


-- ----------------------------------------------------------------------------
-- METAS (as despesas que a rifa precisa cobrir) — total: R$ 2.073,00
-- ----------------------------------------------------------------------------
insert into metas (descricao, valor, ordem, pago) values
  ('Custo passagem ida e volta',  595.00, 1, false),
  ('Custo inscrição aprendiz',    385.00, 2, true),   -- estava com ✅ na sua lista
  ('Custo inscrição iniciante',   193.00, 3, false),
  ('Custo hospedagem',            500.00, 4, false),
  ('Custo alimentação',           400.00, 5, false);

commit;


-- ============================================================================
--  CONFERENCIA — rode a consulta abaixo para ver se a carga bateu.
--  Esperado:  compradores 25 | reivindicacoes 58 | numeros_ocupados 55
--             pagos 23 | pendentes 1 | inexistentes 1 | conflitos 3
-- ============================================================================
select
  (select count(*) from compradores)                          as compradores,
  (select count(*) from atribuicoes)                          as reivindicacoes,
  (select count(distinct numero) from atribuicoes)            as numeros_ocupados,
  (select count(*) from compradores where status = 'pago')        as pagos,
  (select count(*) from compradores where status = 'pendente')    as pendentes,
  (select count(*) from compradores where status = 'inexistente') as inexistentes,
  (select count(*) from (
      select numero from atribuicoes group by numero having count(*) > 1
   ) c)                                                       as conflitos;
