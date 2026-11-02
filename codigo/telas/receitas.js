function vRecipes() {
  const matches = recipeSuggestions(state.receipts);
  const recipes = matches.filter(r => r.type === 'Comida');
  const drinks = matches.filter(r => r.type === 'Drink' || r.type === 'Drink alcoólico');

  if (!state.receipts.length) {
    return card(`${h2('chef-hat', 'Receitas e drinks', 'Ideias com base nas últimas compras') }
      <p class="text-sm text-mute mb-4">Registre algumas compras para receber sugestões de receitas e bebidas com ingredientes que apareceram no seu histórico.</p>
      ${gradBtn('data-tab="receipts"', 'receipt', 'Registrar uma compra', 'w-full')}`);
  }

  const renderRecipe = recipe => {
    const alreadyInList = recipe.missing.filter(i => inList(i.name)).length;
    const toAdd = recipe.missing.length - alreadyInList;
    const ingredients = recipe.ingredients.map(i => {
      const found = recipe.available.some(a => a.name === i.name);
      return `<li class="flex items-center gap-2 text-sm py-1">
        <i data-lucide="${found ? 'circle-check' : 'circle'}" class="w-4 h-4 ${found ? 'text-brand' : 'text-faint'}"></i>
        <span class="${found ? 'text-ink' : 'text-mute'}">${esc(i.name)}</span>
        <span class="ml-auto text-xs ${found ? 'text-brand-ink' : 'text-faint'}">${found ? 'nas compras recentes' : alreadyInList && inList(i.name) ? 'na lista' : 'não encontrado'}</span>
      </li>`;
    }).join('');
    const steps = recipe.steps.map((step, index) => `<li class="text-sm text-mute">${index + 1}. ${esc(step)}</li>`).join('');
    return `<details class="border border-line rounded-xl p-3">
      <summary class="cursor-pointer list-none flex items-center justify-between gap-2">
        <span class="min-w-0"><span class="font-semibold">${esc(recipe.name)}</span>
          <span class="block text-xs text-mute mt-0.5">${esc(recipe.type)} · ${esc(recipe.time)} · ${esc(recipe.servings)}</span></span>
        <span class="shrink-0 rounded-full bg-brand-soft text-brand-ink text-xs font-bold px-2.5 py-1">${recipe.available.length}/${recipe.ingredients.length}</span>
      </summary>
      <div class="mt-3">
        <p class="text-xs text-mute mb-1">Ingredientes — o histórico não confirma o que ainda há na despensa:</p>
        <ul class="divide-y divide-line">${ingredients}</ul>
        <p class="font-semibold text-sm mt-3 mb-1">Preparo</p>
        <ol class="space-y-1">${steps}</ol>
        ${recipe.type === 'Drink alcoólico' ? '<p class="text-xs text-mute mt-2">Beba com responsabilidade. Proibido para menores de 18 anos.</p>' : ''}
        ${recipe.missing.length ? `<button data-act="addRecipeMissing" data-recipe="${esc(recipe.id)}" class="tap mt-3 w-full rounded-lg bg-brand-soft text-brand-ink font-semibold text-sm py-2.5">
          ${toAdd ? `Adicionar ${toAdd} ${toAdd === 1 ? 'item que falta' : 'itens que faltam'} à lista` : 'Itens que faltam já estão na lista'}
        </button>` : '<p class="text-xs text-brand-ink font-semibold mt-3">Todos os ingredientes apareceram nas compras recentes.</p>'}
      </div>
    </details>`;
  };

  const recentCount = Math.min(5, state.receipts.length);
  const intro = card(`${h2('chef-hat', 'Receitas e drinks', `Sugestões com base nas ${recentCount} compras mais recentes.`)}
    <p class="text-xs text-mute">“Encontrado” significa que o item apareceu nas compras, não que ainda esteja em casa. Os demais ingredientes podem ser adicionados à lista.</p>`);
  const foodCard = recipes.length
    ? card(`${h2('cooking-pot', 'Para comer', 'Receitas com produtos do seu histórico') }<div class="space-y-2">${recipes.map(renderRecipe).join('')}</div>`)
    : card(`${h2('cooking-pot', 'Para comer')}<p class="text-sm text-mute">Ainda não encontrei ingredientes das suas compras para sugerir uma receita. Registre mais itens ou compras.</p>`);
  const drinkCard = drinks.length
    ? card(`${h2('cup-soda', 'Para beber', 'Drinks e bebidas com produtos do seu histórico') }<div class="space-y-2">${drinks.map(renderRecipe).join('')}</div>`)
    : card(`${h2('cup-soda', 'Para beber')}<p class="text-sm text-mute">Ainda não encontrei ingredientes para sugerir um drink. Registre mais itens nas compras.</p>`);

  return intro + foodCard + drinkCard;
}
