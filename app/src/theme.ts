// PokePrice design tokens — derived from branding assets
export const theme = {
  // Backgrounds
  bg: '#F7FAFE',
  bgAlt: '#EEF3FF',
  surface: '#FFFFFF',
  surfaceAlt: '#F0F5FF',
  border: '#E2EAF4',

  // Brand palette
  blue: '#4B90DC',   // "Poke" — primary brand blue
  green: '#4CB87A',  // "Price" — secondary brand green
  yellow: '#FFCB05', // Pikachu yellow — price highlights, CTAs
  red: '#EF4444',    // Pokeball red
  dark: '#1E293B',   // Primary dark (text, outlines)

  // Text
  textPrimary: '#1E293B',
  textSecondary: '#6E85A5',
  textMuted: '#9AACC4',

  // Semantic
  trendUp: '#4CB87A',
  trendDown: '#EF4444',
  trendStable: '#9AACC4',

  // Shadows (use as style array items: [styles.card, theme.shadow])
  shadowSm: {
    shadowColor: '#4B90DC',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  shadow: {
    shadowColor: '#4B90DC',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
};
