# CasalCompras

Aplicativo de lista de compras para duas pessoas. Guarda os dados no próprio aparelho e pode sincronizar os celulares usando um servidor Cloudflare.

## Mapa do projeto

| Pasta ou arquivo | O que faz |
|---|---|
| `index.html` | Página inicial: carrega os estilos e os arquivos JavaScript na ordem necessária. |
| `codigo/` | Lógica do aplicativo, organizada por função. |
| `codigo/aplicativo.js` | Monta a navegação, mostra a tela escolhida e trata cliques e formulários. |
| `codigo/configuracoes.js` | Versão, nomes dos perfis e opções padrão. |
| `codigo/estado.js` | Dados atuais, rascunhos e salvamento no armazenamento do navegador. |
| `codigo/dados.js` | Catálogo de exemplo e dados usados na demonstração. |
| `codigo/inteligencia.js` | Histórico de consumo e sugestões para a lista de compras. |
| `codigo/receitas.js` | Receitas e regras que comparam ingredientes com as compras recentes. |
| `codigo/servicos/` | Integrações: preços, leitura de QR e nota fiscal, sincronização, compartilhamento e instalação. |
| `codigo/telas/` | HTML de cada área do aplicativo, gerado pelo JavaScript. |
| `estilos/estilos.css` | Cores, tema escuro, animações e pequenos ajustes visuais. |
| `icones/` | Ícones usados na tela inicial e na instalação do aplicativo. |
| `servidor/` | Código e configuração do servidor Cloudflare: leitura de notas, preços e sincronização. |
| `testes/` | Testes automáticos e exemplos de páginas de nota fiscal. |
| `manifest.webmanifest` | Instruções para instalar o aplicativo na tela inicial do celular. |
| `sw.js` | Cache offline e atualização dos arquivos do aplicativo. |
| `wrangler.jsonc` | Configuração do Wrangler para publicar os arquivos do site. |

Os nomes `index.html`, `manifest.webmanifest`, `sw.js` e `wrangler.toml` seguem convenções das ferramentas usadas. Os endereços técnicos do servidor, como `/nfce` e `/sync`, também permanecem estáveis para não quebrar a comunicação.

## Como o aplicativo funciona

1. `index.html` carrega `codigo/tema.js`, os estilos e os demais scripts.
2. `codigo/estado.js` lê e salva lista, compras, mercados e preferências neste aparelho.
3. `codigo/aplicativo.js` conecta as telas aos botões e atualiza o que aparece na página.
4. As telas em `codigo/telas/` exibem lista, histórico, receitas, comparação de preços, notas e mercado.
5. Os arquivos em `codigo/servicos/` cuidam de operações externas, como consultar uma nota fiscal no servidor.
6. `servidor/servidor.js` recebe essas consultas. A configuração `servidor/wrangler.toml` define como publicá-lo.

## Uso diário

- **Lista**: adicione produtos ou use as sugestões do histórico.
- **Histórico**: veja o que costuma comprar e gere uma lista sugerida.
- **Receitas**: veja pratos e bebidas com ingredientes das cinco compras mais recentes. O histórico não confirma se ainda há produtos em casa.
- **Preços**: compare valores registrados e, se configurado, consulte preços online.
- **Nota**: leia o QR Code da NFC-e para preencher os itens, ou registre uma compra manualmente.
- **Mercado**: acompanhe os itens enquanto faz compras.
- **Ajustes** (engrenagem): configure os mercados, servidor, sincronização e cópias de segurança.

## Rodar os testes

Instale o Node.js e, na pasta principal do projeto, execute:

```powershell
node testes/executar.js
```

## Publicar o site

Envie as alterações ao repositório e publique pelo GitHub Pages (ramo `main`, pasta principal). Como os arquivos do aplicativo mudaram de pasta, a publicação do Pages é necessária para atualizar o site e os celulares.

## Publicar o servidor

Na pasta principal do projeto, execute:

```powershell
wrangler.cmd deploy --config .\servidor\wrangler.toml
```

O servidor só precisa ser republicado quando houver alterações dentro de `servidor/`. Veja o guia em [`servidor/README.md`](./servidor/README.md).

## Observações

- Os dados ficam neste aparelho; configure o servidor e a sincronização para compartilhá-los entre celulares.
- A leitura automática de NFC-e depende do formato da página da SEFAZ do estado.
- O leitor de QR e o modo de instalação precisam de HTTPS; o GitHub Pages fornece HTTPS.
- Para adicionar outra loja à busca de preços, consulte `codigo/configuracoes.js` e `servidor/servidor.js`.
