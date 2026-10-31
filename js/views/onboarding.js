function vOnboarding() {
  return `
  <div class="text-center pt-6 pb-4">
    <div class="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-violet-600 to-pink-500 flex items-center justify-center shadow-lg"><i data-lucide="shopping-basket" class="w-10 h-10 text-white"></i></div>
    <h2 class="text-2xl font-extrabold mt-4">Bem-vindos ao CasalCompras</h2>
    <p class="text-mute mt-1">Lista compartilhada, histórico de preços e economia para a casa.</p>
  </div>
  ${card(`<ol class="space-y-3 text-sm">
    <li class="flex gap-3"><span class="w-7 h-7 rounded-full bg-brand-soft text-brand-ink font-bold flex items-center justify-center shrink-0">1</span><span><b>Registre as compras</b> na aba Nota (cupom, QR Code) ou finalize a compra no modo Mercado.</span></li>
    <li class="flex gap-3"><span class="w-7 h-7 rounded-full bg-brand-soft text-brand-ink font-bold flex items-center justify-center shrink-0">2</span><span><b>O app aprende</b> o que vocês consomem e quando acaba, e gera a lista sozinho.</span></li>
    <li class="flex gap-3"><span class="w-7 h-7 rounded-full bg-brand-soft text-brand-ink font-bold flex items-center justify-center shrink-0">3</span><span><b>Compare preços</b> entre mercados com base nas suas notas.</span></li>
  </ol>`)}
  ${card(`<p class="text-sm text-mute mb-3">Os dados ficam salvos <b>neste aparelho</b>. Use Ajustes → Backup para guardar uma cópia ou levar para o celular do(a) parceiro(a).</p>
    ${gradBtn('data-act="startEmpty"', 'rocket', 'Começar do zero', 'w-full')}
    <button data-act="startDemo" class="tap w-full mt-2 py-3 text-sm font-semibold text-brand">Explorar com dados de exemplo</button>`)}`;
}
