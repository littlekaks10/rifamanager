import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * A conexão com o banco de dados.
 *
 * O `import "server-only"` no topo é uma trava de segurança: se algum dia algum
 * arquivo que roda NO NAVEGADOR tentar importar este aqui, o projeto se recusa
 * a compilar. Assim a chave secreta nunca tem como vazar para o celular de
 * ninguém — ela fica só no servidor da Vercel.
 *
 * A conexão é criada só na PRIMEIRA vez que alguém usa o banco (e não quando o
 * arquivo é carregado). Isso é de propósito: se faltar alguma variável de
 * ambiente, o app avisa com uma mensagem clara na tela em vez de quebrar a
 * publicação inteira na Vercel com um erro difícil de entender.
 */

let cliente: SupabaseClient | null = null;

function obterCliente(): SupabaseClient {
  if (cliente) return cliente;

  const url = process.env.SUPABASE_URL;
  const chaveSecreta = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !chaveSecreta) {
    throw new Error(
      "Faltam as variáveis SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY. " +
        "No seu PC: crie o arquivo .env.local na raiz do projeto (copie o .env.example). " +
        "Na Vercel: Settings -> Environment Variables, e depois publique de novo.",
    );
  }

  cliente = createClient(url, chaveSecreta, {
    auth: {
      // Não há tela de login neste app, então não há sessão para guardar.
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cliente;
}

/**
 * O objeto que o resto do app usa: `supabase.from("compradores")...`
 *
 * Ele repassa tudo para a conexão de verdade, criando-a na hora do primeiro uso.
 */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_alvo, propriedade) {
    const real = obterCliente();
    const valor = Reflect.get(real, propriedade, real);
    return typeof valor === "function" ? valor.bind(real) : valor;
  },
});
