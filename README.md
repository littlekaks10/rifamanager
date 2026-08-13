# Rifa — controle de números e metas

App de celular (PWA) para gerenciar uma rifa de 300 números: quem pegou cada
número, quem já pagou, e quanto falta para cobrir as despesas.

Feito com Next.js + Supabase, publicado na Vercel. Custo: **zero**.

---

## As quatro cores

O estado de pagamento fica na **pessoa**, e é ele que pinta os números dela na
grade — igual à lista de WhatsApp, onde o ✅ fica na linha de cada nome.

| Cor | Significa | Sai da cor quando… |
|---|---|---|
| 🟢 verde | comprador **pago** | — |
| 🟡 amarelo | comprador **pendente** (pegou, não pagou) | você marcar como pago |
| ⬜ tracejado | comprador **inexistente** (sem número ainda) | você atribuir um número |
| 🔴 vermelho | **conflito**: 2+ pessoas no mesmo número | você mover uma delas |

O vermelho tem prioridade sobre todo o resto. Ele é guardado de propósito no
banco: a tabela `atribuicoes` **permite** o número repetido, para que a
informação de quem reivindicou o quê nunca se perca.

---

## Como colocar para funcionar (passo a passo)

### 1. Criar as tabelas no Supabase

No painel do Supabase → **SQL Editor** → **New query**:

1. Cole todo o [`supabase/01_schema.sql`](supabase/01_schema.sql) → **Run**.
2. Cole todo o [`supabase/02_seed.sql`](supabase/02_seed.sql) → **Run**.

O segundo arquivo termina com uma consulta de conferência. O resultado esperado:

```
compradores 25 | reivindicacoes 58 | numeros_ocupados 55
pagos 23 | pendentes 1 | inexistentes 1 | conflitos 3
```

> ⚠️ O `02_seed.sql` **apaga e recarrega** os dados. Depois que você começar a
> editar pelo app, não rode esse arquivo de novo.

### 2. Ligar o app ao banco

As duas chaves ficam em: Supabase → **Project Settings** → **API**.

**No seu PC** — abra o arquivo `.env.local` (já criado na raiz do projeto) e
preencha:

```
SUPABASE_URL=https://seuprojeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=a_chave_service_role
```

**Na Vercel** — seu projeto → **Settings** → **Environment Variables** → adicione
as mesmas duas, marcando os três ambientes (Production, Preview, Development).

> A chave `service_role` dá acesso total ao banco. Ela nunca chega ao navegador
> (o arquivo `lib/supabase.ts` é marcado como `server-only`), e o `.env.local`
> está no `.gitignore`. Nunca cole essa chave em print, grupo ou commit.

### 3. Rodar no seu PC

```bash
npm install
npm run dev
```

Abra <http://localhost:3000>.

### 4. Publicar

Todo `git push` na branch `main` publica sozinho na Vercel, em cerca de 1 minuto.

### 5. Instalar no iPhone

1. Abra a URL da Vercel **no Safari** (precisa ser o Safari).
2. Botão **Compartilhar** → **Adicionar à Tela de Início**.

---

## Onde fica cada coisa

```
app/
  numeros/page.tsx      aba 1 — lê o banco e entrega para a tela
  metas/page.tsx        aba 2
  actions/              as funções que GRAVAM no banco (rodam no servidor)
  manifest.ts           identidade do app para o iPhone
  icon.tsx              o ícone, desenhado em código
components/
  TelaNumeros.tsx       junta alertas + grade + lista + painéis
  GradeNumeros.tsx      os 300 quadradinhos
  PainelNumero.tsx      o painel que sobe de baixo (inclui resolver conflito)
  PainelComprador.tsx   o painel de uma pessoa
  TelaMetas.tsx         aba 2 inteira
lib/
  conflitos.ts          ⭐ a regra das cores, num lugar só
  dados.ts              a leitura do banco
  supabase.ts           a conexão (nunca chega ao navegador)
  formato.ts            dinheiro, busca sem acento, faixas "1–10"
supabase/
  01_schema.sql         as tabelas
  02_seed.sql           a carga inicial com os dados reais
```

## Como o dinheiro é contado

- **Arrecadado** = reivindicações de compradores **pagos** × valor do número.
  Conta por reivindicação, não por número: se duas pessoas pagaram pelo mesmo
  número, você recebeu de duas — o conflito é de numeração, não de caixa.
- **A receber** = o mesmo, para os compradores **pendentes**.
- **Em caixa** = arrecadado − as metas que você já marcou como pagas. É esse
  valor que a lista de metas distribui, de cima para baixo.
