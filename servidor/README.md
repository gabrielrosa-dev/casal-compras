# Servidor do CasalCompras

Um Worker do Cloudflare oferece três funções:

| Rota | Função |
|---|---|
| `GET /sync/<código>` e `PUT /sync/<código>` | Sincroniza lista e compras dos celulares usando o armazenamento KV. |
| `GET /nfce?url=<link-do-QR>` | Lê itens e preços de uma nota fiscal de consumidor. |
| `GET /search?store=muffato&q=leite` | Consulta preços online do Super Muffato. |

## Publicação inicial

Abra o terminal na pasta principal do projeto.

1. Instale o Wrangler, se necessário, e entre na sua conta:

   ```powershell
   npm.cmd install --global wrangler
   wrangler.cmd login
   ```

2. Crie o espaço de armazenamento de sincronização:

   ```powershell
   wrangler.cmd kv namespace create SYNC
   ```

3. Copie o identificador retornado para `id` no arquivo `servidor/wrangler.toml`.
4. Confira `ALLOWED_ORIGINS` nesse mesmo arquivo. Use a origem exata do site, sem caminho. Exemplo: `https://gabrielrosa-dev.github.io`.
5. Publique o servidor:

   ```powershell
   wrangler.cmd deploy --config .\servidor\wrangler.toml
   ```

6. Copie o endereço mostrado pelo comando para **Ajustes → Servidor do casal** no aplicativo.
7. Em Ajustes, crie o grupo do casal e envie o convite ao outro celular.

Para publicar alterações futuras no servidor, repita apenas o passo 5. Alterações na interface e nas pastas do site devem ser publicadas pelo GitHub Pages.

## Segurança e limites

- Só são aceitas chamadas vindas das origens em `ALLOWED_ORIGINS`.
- O código de sincronização é secreto; no KV fica salvo somente o hash. Não publique o link de convite.
- A rota `/nfce` só consulta endereços `.gov.br`, inclusive após redirecionamentos.
- Cada grupo pode armazenar até 1,5 MB.

## Como a leitura da nota funciona

`servidor/servidor.js` busca a página pública da nota e `servidor/nota-fiscal.js` extrai emitente, data, produtos, quantidades e valores. Os portais variam; o leitor reconhece classes como `txtTit` e `txtTit2`. Os testes usam páginas de exemplo em `testes/exemplos/`, sem dados de notas reais.

## Preços online

A loja padrão é configurada em `servidor/servidor.js` e `codigo/configuracoes.js`. O catálogo online não é filtrado por CEP e os resultados ficam em cache por uma hora.

## Testes

Na pasta principal do projeto, execute `node testes/executar.js`. Os testes simulam o servidor, o armazenamento KV e páginas de nota.
