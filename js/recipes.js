const RECIPES = [
  {
    id: 'omelete', name: 'Omelete de queijo', type: 'Comida', time: '15 min', servings: '2 porções',
    ingredients: [
      { name: 'Ovos', matches: ['ovo'] }, { name: 'Queijo', matches: ['queijo'] },
      { name: 'Leite', matches: ['leite'] }, { name: 'Cebola', matches: ['cebola'] }
    ],
    steps: ['Bata os ovos com um pouco de leite.', 'Misture o queijo e a cebola picada.', 'Cozinhe em frigideira untada até firmar dos dois lados.']
  },
  {
    id: 'macarrao-molho', name: 'Macarrão ao molho de tomate', type: 'Comida', time: '25 min', servings: '3 porções',
    ingredients: [
      { name: 'Macarrão', matches: ['macarrao', 'massa'] }, { name: 'Molho de tomate', matches: ['molho de tomate'] },
      { name: 'Tomate', matches: ['tomate'] }, { name: 'Cebola', matches: ['cebola'] }, { name: 'Queijo', matches: ['queijo'] }
    ],
    steps: ['Cozinhe o macarrão conforme a embalagem.', 'Refogue a cebola e o tomate, junte o molho e aqueça.', 'Sirva o molho sobre a massa e finalize com queijo.']
  },
  {
    id: 'frango-panela', name: 'Frango de panela com batata', type: 'Comida', time: '40 min', servings: '4 porções',
    ingredients: [
      { name: 'Frango', matches: ['frango'] }, { name: 'Batata', matches: ['batata'] },
      { name: 'Tomate', matches: ['tomate'] }, { name: 'Cebola', matches: ['cebola'] }
    ],
    steps: ['Doure o frango com a cebola.', 'Acrescente tomate, batata em pedaços e água até quase cobrir.', 'Tampe e cozinhe até o frango ficar bem cozido e a batata macia.']
  },
  {
    id: 'arroz-feijao-ovo', name: 'Arroz, feijão e ovo', type: 'Comida', time: '20 min', servings: '2 porções',
    ingredients: [
      { name: 'Arroz', matches: ['arroz'] }, { name: 'Feijão', matches: ['feijao'] },
      { name: 'Ovos', matches: ['ovo'] }, { name: 'Cebola', matches: ['cebola'] }
    ],
    steps: ['Aqueça o arroz e o feijão já preparados.', 'Frite ou cozinhe os ovos como preferir.', 'Sirva com cebola refogada, se desejar.']
  },
  {
    id: 'panqueca-banana', name: 'Panqueca de banana', type: 'Comida', time: '15 min', servings: '2 porções',
    ingredients: [
      { name: 'Banana', matches: ['banana'] }, { name: 'Ovos', matches: ['ovo'] },
      { name: 'Leite', matches: ['leite'] }, { name: 'Farinha de trigo', matches: ['farinha de trigo'] }
    ],
    steps: ['Amasse a banana e misture com ovos, leite e farinha até formar uma massa.', 'Despeje pequenas porções em frigideira antiaderente.', 'Doure dos dois lados e sirva.']
  },
  {
    id: 'salada-ovo', name: 'Salada de tomate com ovo', type: 'Comida', time: '15 min', servings: '2 porções',
    ingredients: [
      { name: 'Tomate', matches: ['tomate'] }, { name: 'Ovos', matches: ['ovo'] },
      { name: 'Cebola', matches: ['cebola'] }, { name: 'Alface', matches: ['alface'] }
    ],
    steps: ['Cozinhe os ovos e corte em pedaços.', 'Pique o tomate, a cebola e a alface.', 'Misture e tempere a gosto.']
  },
  {
    id: 'vitamina-banana', name: 'Vitamina de banana', type: 'Drink', time: '5 min', servings: '2 copos',
    ingredients: [
      { name: 'Banana', matches: ['banana'] }, { name: 'Leite', matches: ['leite'] },
      { name: 'Iogurte natural', matches: ['iogurte'] }, { name: 'Aveia', matches: ['aveia'] }
    ],
    steps: ['Bata a banana com leite e iogurte.', 'Acrescente aveia e bata mais um pouco.', 'Sirva gelada.']
  },
  {
    id: 'cafe-gelado', name: 'Café gelado com leite', type: 'Drink', time: '5 min', servings: '1 copo',
    ingredients: [
      { name: 'Café', matches: ['cafe'] }, { name: 'Leite', matches: ['leite'] },
      { name: 'Açúcar', matches: ['acucar'] }, { name: 'Gelo', matches: ['gelo'] }
    ],
    steps: ['Prepare o café e deixe esfriar.', 'Misture com leite e açúcar a gosto.', 'Sirva com gelo.']
  },
  {
    id: 'limonada', name: 'Limonada', type: 'Drink', time: '10 min', servings: '4 copos',
    ingredients: [
      { name: 'Limão', matches: ['limao'] }, { name: 'Água', matches: ['agua'] },
      { name: 'Açúcar', matches: ['acucar'] }, { name: 'Gelo', matches: ['gelo'] }
    ],
    steps: ['Esprema os limões e misture o suco com água.', 'Adoce a gosto.', 'Sirva com gelo.']
  },
  {
    id: 'suco-laranja', name: 'Suco de laranja', type: 'Drink', time: '10 min', servings: '3 copos',
    ingredients: [
      { name: 'Laranja', matches: ['laranja'] }, { name: 'Água', matches: ['agua'] },
      { name: 'Açúcar', matches: ['acucar'] }, { name: 'Gelo', matches: ['gelo'] }
    ],
    steps: ['Esprema as laranjas.', 'Se quiser, misture com um pouco de água e açúcar.', 'Sirva com gelo.']
  },
  {
    id: 'caipirinha', name: 'Caipirinha', type: 'Drink alcoólico', time: '5 min', servings: '1 copo',
    ingredients: [
      { name: 'Cachaça', matches: ['cachaca'] }, { name: 'Limão', matches: ['limao'] },
      { name: 'Açúcar', matches: ['acucar'] }, { name: 'Gelo', matches: ['gelo'] }
    ],
    steps: ['Corte o limão em pedaços e macere com açúcar.', 'Acrescente cachaça e gelo.', 'Misture e sirva.']
  },
  {
    id: 'chocolate-quente', name: 'Chocolate quente', type: 'Drink', time: '10 min', servings: '2 xícaras',
    ingredients: [
      { name: 'Leite', matches: ['leite'] }, { name: 'Chocolate em pó', matches: ['chocolate'] },
      { name: 'Açúcar', matches: ['acucar'] }, { name: 'Amido de milho', matches: ['amido de milho', 'maisena'] }
    ],
    steps: ['Dissolva o chocolate e o amido em um pouco de leite frio.', 'Junte o restante do leite e açúcar a gosto.', 'Aqueça mexendo até engrossar levemente.']
  }
];

function recipeSuggestions(receipts) {
  const recent = [...(Array.isArray(receipts) ? receipts : [])]
    .sort((a, b) => b.date - a.date)
    .slice(0, 5);
  const purchased = recent.flatMap(r => (Array.isArray(r.items) ? r.items : [])
    .map(i => norm(i && i.name || '')).filter(Boolean));

  return RECIPES.map(recipe => {
    const available = recipe.ingredients.filter(i =>
      purchased.some(product => i.matches.some(term => product.includes(term)))
    );
    const availableNames = new Set(available.map(i => i.name));
    const missing = recipe.ingredients.filter(i => !availableNames.has(i.name));
    return {
      ...recipe,
      available,
      missing,
      score: available.length / recipe.ingredients.length
    };
  }).filter(recipe => recipe.available.length)
    .sort((a, b) => b.score - a.score || b.available.length - a.available.length || a.name.localeCompare(b.name));
}
