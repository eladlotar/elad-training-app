// ELAD Training App — themeable palettes
// Base tokens are shared; each palette can override the primary accent + a few
// tokens (secondary accent, subtle surface tint) for a richer look.

const BASE = {
  bg: '#FFFFFF',
  card: '#FFFFFF',
  cardAlt: '#F6F8FA',
  border: '#E1E4E8',
  borderLt: '#F0F0F0',
  text: '#1B1F23',
  textSecondary: '#444D56',
  muted: '#6A737D',
  mutedLt: '#959DA5',
  accentLt: '#F6F8FA',
  ok: '#28A745',
  okLt: '#E6F4EA',
  err: '#D73A49',
  errLt: '#FFEEF0',
  warn: '#E36209',
  warnLt: '#FFF8E1',
  blue: '#0366D6',
  blueLt: '#F1F8FF',
  white: '#FFFFFF',
};

// Each palette sets primary (buttons/selected/accents) + optional overrides.
export const PALETTES = [
  {
    id: 'tactical', name: 'טקטי', swatch: '#3F4A2E',
    over: {
      black: '#3F4A2E', accent: '#3F4A2E',
      accent2: '#8A7B4F',      // khaki/sand secondary
      cardAlt: '#F1F2EC',      // warm olive-tinted surface
      border: '#DDE0D4',
      borderLt: '#EBEDE4',
      text: '#232A19',         // deep olive-charcoal text
      textSecondary: '#3F4A2E',
    },
  },
  {
    id: 'gold', name: 'זהב יוקרתי', swatch: '#B4892B',
    over: { black: '#B4892B', accent: '#B4892B', accent2: '#8A6A1F' },
  },
  {
    id: 'classic', name: 'שחור קלאסי', swatch: '#1B1F23',
    over: { black: '#1B1F23', accent: '#1B1F23', accent2: '#444D56' },
  },
];

export function paletteById(id) {
  return PALETTES.find(p => p.id === id) || PALETTES[0];
}

export function buildTheme(paletteId) {
  const p = paletteById(paletteId);
  return { ...BASE, accent2: '#444D56', ...p.over };
}

// Default export = the default palette (tactical), for files not yet themed.
export const C = buildTheme('tactical');
