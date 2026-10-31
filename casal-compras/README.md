# CasalCompras – Inteligência Residencial

App de compras para casais (HTML + Tailwind CDN + JS puro). Instalável como PWA, dados no `localStorage`, tema claro/escuro.

## Uso diário
1. **Lista**: adicione itens (autocompletar pelo histórico) ou use **Gerar por histórico**.
2. **Supermercado**: escolha o mercado, marque os itens no carrinho, informe preços e toque em **Finalizar compra** – isso grava a compra no histórico.
3. **Nota**: leia o QR da NFC-e e o app busca itens, quantidades, preços e nomes completos sozinho (precisa do servidor); confira e salve. Também dá para registrar manualmente.
4. **Comparar**: mostra o mercado mais barato por item com base no histórico (e preços online, se configurado).
5. **Ajustes** (engrenagem): mercados, servidor, sincronização, backup, demonstração, instalar app.

## Sincronização entre os celulares
Em **Ajustes → Servidor do casal** cole a URL do Worker (veja `worker/README.md`), depois **Criar grupo do casal** e **Convidar**.
Abrindo o link do convite no outro celular, os dois passam a trocar lista e compras automaticamente (a cada alteração, a cada 20 s e ao abrir o app). Funciona offline e sincroniza quando a internet volta.
Backup manual (exportar/importar) continua disponível.

## Estrutura
- `index.html`, `css/`, `js/` (config, utils, data, state, intelligence, `services/`, `views/`, app)
- `manifest.webmanifest`, `sw.js`, `icons/` – PWA/offline (aumente `CACHE` em `sw.js` a cada publicação)
- `worker/` – servidor Cloudflare gratuito: sincronização, leitura de NFC-e e preços online; veja `worker/README.md`
- `tests/` – testes: `node tests/run.js`

## Publicar no GitHub Pages
Suba a pasta ao repositório e ative Settings → Pages (branch `main`, raiz).

## Limites
- Sincronização e leitura de itens da nota exigem o Worker publicado; sem ele o app funciona local e manual.
- A leitura de itens depende do layout da SEFAZ do estado (testada só com nota sintética; veja `worker/README.md`).
- Preços online só do Super Muffato; Jacomar e outros funcionam via notas registradas.
- Câmera/QR/PWA exigem HTTPS (Pages já fornece).
