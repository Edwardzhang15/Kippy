// Shared design tokens for the unified Kippy share card system

export const SC = {
  CARD_W:   300,
  CARD_H:   533,    // 9:16 portrait ratio
  HEADER_H: 148,    // ~28 % of CARD_H — photo / gradient zone
  OVERLAP:   20,    // white body panel overlaps the header by this
  H_PAD:     18,    // horizontal padding inside the body
  ICON_CHIP:  32,   // icon chip square size
  AVATAR:     30,   // avatar circle diameter

  // Neutral palette
  card:         '#FFFFFF',
  pageBg:       '#F7F7F5',
  dark:         '#1A1A1A',
  labelGray:    '#9A9A9A',
  rowSecondary: '#848484',
  divider:      '#EFEFEF',
  footerGray:   '#AAAAAA',

  // SEMANTIC ONLY — never use for chrome, chips, or labels
  coral: '#FF6B5B',   // owes / negative balance
  sage:  '#7FA68C',   // owed / positive balance

  // Header fallback gradient when no destination photo
  headerGradient: ['#2C3040', '#1A1C28'] as readonly [string, string],
} as const;

// Muted 6-hue palette for person avatars — independent from coral & sage
const AVATAR_PALETTE = [
  '#8BA7BF',   // slate blue
  '#89AB8A',   // muted green
  '#A99BBF',   // soft lavender
  '#BF9F7A',   // warm sand
  '#89A9BF',   // muted cyan
  '#BF8FA0',   // dusty rose
];

export function scAvatarColor(index: number): string {
  return AVATAR_PALETTE[index % AVATAR_PALETTE.length];
}

export function scInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}
