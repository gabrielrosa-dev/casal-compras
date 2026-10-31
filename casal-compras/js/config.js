const APP = {
  version: '2.1.0',
  storageKey: 'casalcompras.v2',
  people: ['Gabriel', 'Danielle'],
  defaultMarkets: ['Condor', 'Atacadão', 'Jacomar', 'Super Muffato'],
  onlineTtlDays: 7,
  maxLog: 40
};

// url: endereço do Cloudflare Worker (também pode ser informado em Ajustes)
const PRICE_API = {
  url: '',
  stores: [
    { id: 'muffato', label: 'Super Muffato' }
  ],
  concurrency: 4
};
