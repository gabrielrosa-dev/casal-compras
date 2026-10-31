// Sugestões de nome (autocompletar) e base dos dados de exemplo
// [nome, categoria, preço-base, frequência de compra (0-1), qtd típica]
const CATALOG = [
  ['Arroz 5kg', 'Mercearia', 27.9, .55, 1], ['Feijão Carioca 1kg', 'Mercearia', 7.9, .6, 2],
  ['Leite Integral 1L', 'Laticínios', 4.9, .95, 6], ['Ovos 12un', 'Mercearia', 11.9, .8, 1],
  ['Pão de Forma', 'Padaria', 7.5, .8, 1], ['Café 500g', 'Mercearia', 18.9, .5, 1],
  ['Açúcar 1kg', 'Mercearia', 4.6, .4, 1], ['Óleo de Soja 900ml', 'Mercearia', 6.9, .4, 1],
  ['Macarrão Espaguete 500g', 'Mercearia', 4.2, .6, 2], ['Molho de Tomate 340g', 'Mercearia', 2.9, .6, 3],
  ['Peito de Frango 1kg', 'Carnes', 17.9, .85, 2], ['Carne Moída 500g', 'Carnes', 19.9, .6, 1],
  ['Banana Prata kg', 'Hortifrúti', 5.9, .9, 1], ['Tomate kg', 'Hortifrúti', 7.9, .7, 1],
  ['Cebola kg', 'Hortifrúti', 5.5, .6, 1], ['Batata kg', 'Hortifrúti', 6.5, .5, 1],
  ['Queijo Mussarela 200g', 'Laticínios', 12.9, .6, 1], ['Iogurte Natural 170g', 'Laticínios', 2.5, .7, 4],
  ['Papel Higiênico 12un', 'Limpeza', 22.9, .35, 1], ['Detergente 500ml', 'Limpeza', 2.4, .5, 2],
  ['Sabão em Pó 1,6kg', 'Limpeza', 19.9, .25, 1], ['Shampoo 350ml', 'Higiene', 14.9, .2, 1],
  ['Creme Dental 90g', 'Higiene', 4.5, .3, 2], ['Refrigerante 2L', 'Bebidas', 8.9, .5, 2],
  ['Água Mineral 1,5L', 'Bebidas', 2.5, .6, 6]
];

// Fator de preço de cada mercado, usado só para gerar os dados de exemplo
const DEMO_FACTORS = { 'Condor': 1.0, 'Atacadão': .93, 'Jacomar': 1.03, 'Super Muffato': 1.06 };

function demoReceipt(market, daysAgo, rnd) {
  const items = [];
  CATALOG.forEach(([name, , base, freq, qty]) => {
    if (rnd() < freq) {
      items.push({
        name,
        qty: Math.max(1, Math.round(qty * (.7 + rnd() * .7))),
        price: +(base * DEMO_FACTORS[market] * (.94 + rnd() * .14)).toFixed(2)
      });
    }
  });
  return { id: uid(), market, date: Date.now() - daysAgo * dayMs, items, by: rnd() > .5 ? 'Gabriel' : 'Danielle', source: 'demo', url: '' };
}

function demoData() {
  const rnd = seeded(20240611);
  const plan = [['Condor', 4], ['Atacadão', 11], ['Condor', 18], ['Super Muffato', 25], ['Atacadão', 32], ['Jacomar', 39], ['Atacadão', 46], ['Condor', 53]];
  return {
    receipts: plan.map(([m, d]) => demoReceipt(m, d, rnd)),
    list: ['Leite Integral 1L', 'Ovos 12un', 'Pão de Forma', 'Café 500g'].map((name, i) => ({
      id: uid(), name, qty: [6, 1, 1, 1][i], done: false, by: i % 2 ? 'Danielle' : 'Gabriel', price: null
    }))
  };
}
