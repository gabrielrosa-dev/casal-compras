# Servidor do CasalCompras (Cloudflare Worker)

Um único Worker gratuito faz três coisas, sempre liberado só para o seu site (CORS):

| Rota | Para quê |
|------|----------|
| `GET /sync/<código>` · `PUT /sync/<código>` | Sincronização automática entre os celulares (guarda o estado no KV) |
| `GET /nfce?url=<link do QR>` | Lê os itens e preços de uma NFC-e e completa o nome pelo código de barras |
| `GET /search?store=muffato&q=leite` | Preços online (Super Muffato, via VTEX) |

## Publicar (uma vez)

1. `npm i -g wrangler` e `wrangler login`
2. Dentro desta pasta: `wrangler kv namespace create SYNC` e cole o `id` mostrado em `wrangler.toml` (`[[kv_namespaces]]`).
3. Em `wrangler.toml`, troque `ALLOWED_ORIGINS` pelo endereço do seu GitHub Pages
   (ex.: `https://gabriel.github.io`, sem barra no final). Para testar local, acrescente `,http://localhost:8080`.
4. `wrangler deploy`
5. Copie a URL (`https://casalcompras-precos.<conta>.workers.dev`) e cole em **Ajustes → Servidor do casal**.
6. Ainda em Ajustes, toque em **Criar grupo do casal** e envie o convite para o outro celular.

## Segurança

- Sem `Origin` autorizado a resposta é 403.
- O código do grupo tem 24 caracteres aleatórios; no KV só é guardado o hash SHA-256. Quem tem o link do convite acessa os dados, então não o publique.
- `/nfce` só abre endereços `.gov.br` (inclusive em redirecionamentos), sem porta ou credenciais.
- Limites: 1,5 MB por grupo de sincronização.

## Observações

- O KV é eventualmente consistente (até ~1 min entre regiões). Como o app mescla registro a registro, nenhum dado é perdido; só pode demorar um pouco para aparecer.
- A leitura de itens da NFC-e depende do layout da página da SEFAZ do estado. O leitor segue o padrão do portal NFC-e
  (`txtTit`, `Rqtd`, `RvlUnit`, `valor`) e foi testado com uma nota de exemplo sintética (`tests/fixtures`). Se alguma nota não for lida,
  o app avisa e mantém o preenchimento manual; para adaptar, salve a página da nota (HTML) e ajuste `nfce.js`.
- Preços online: qualquer loja VTEX que responda a `/api/catalog_system/pub/products/search?ft=leite`
  funciona; inclua em `STORES` (aqui) e em `PRICE_API.stores` (`js/config.js`). Condor e Atacadão não expõem essa API.
- Os preços online vêm do catálogo da loja, sem filtro por CEP, e ficam em cache por 1 hora.

## Testes

`node tests/run.js` (na raiz do projeto) executa os testes do servidor com um KV e uma SEFAZ simulados.
