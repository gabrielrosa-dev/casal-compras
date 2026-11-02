// Tokens semânticos: os valores reais ficam em estilos/estilos.css (:root e .dark).
const token = name => `rgb(var(--${name}) / <alpha-value>)`;

tailwind.config = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        page: token('page'),
        surface: token('surface'),
        soft: token('soft'),
        line: token('line'),
        ink: token('ink'),
        mute: token('mute'),
        faint: token('faint'),
        brand: token('brand'),
        'brand-soft': token('brand-soft'),
        'brand-line': token('brand-line'),
        'brand-ink': token('brand-ink'),
        accent: token('accent')
      },
      borderColor: { DEFAULT: token('line') }
    }
  }
};
