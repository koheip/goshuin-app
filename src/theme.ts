// Kawaii Future Bass 風（パステルのグラデーション・ぶどう色の文字・ピンクの差し色）の配色と書体
export const colors = {
  paper: '#FFF3FA',
  surface: '#FFFFFF',
  page: '#FFFDFE',
  ink: '#3B2766',
  inkSoft: '#54408A',
  muted: '#76679A',
  placeholder: '#A597C4',
  line: '#F4DDF0',
  lineStrong: '#EBC6E6',
  track: '#F7E6F6',
  accent: '#E8468F',
  accentPressed: '#C92F75',
  accentTint: '#FFE2F0',
  accentOnTint: '#BF2469',
  violet: '#8B6CFF',
  mint: '#5FD6CF',
  sky: '#7CC4FF',
  special: '#8B5CF6',
  danger: '#D93A6E',
  // 神社モチーフ（パステル寄りの朱・しめ縄の藁・桜）
  shu: '#FF5C7A',
  shuDeep: '#E23E5F',
  kasagi: '#3B2766',
  straw: '#F2CF7E',
  strawDeep: '#D9AE55',
  shide: '#FFFFFF',
  sakura: '#FFB3D1',
};

// グラデーション（左上→右下）
export const gradients = {
  primary: ['#EC4A94', '#9464F5'] as const,
  primaryPressed: ['#CF3179', '#7A4BE0'] as const,
  cover: ['#FF9ACB', '#B9A2FF', '#8FE3F0'] as const,
  sky: ['#FFE6F4', '#F1E6FF', '#E1F7FA'] as const,
  stepper: ['#FF6FB1', '#8B6CFF'] as const,
};

export const fonts = {
  display: 'MPLUSRounded1c_800ExtraBold',
  displayHeavy: 'MPLUSRounded1c_900Black',
  bold: 'MPLUSRounded1c_700Bold',
  regular: 'MPLUSRounded1c_500Medium',
};

export const radius = {
  sm: 14,
  md: 22,
  lg: 28,
  pill: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 20,
  xl: 28,
} as const;

export const glass = {
  fill: 'rgba(255, 255, 255, 0.78)',
  border: 'rgba(255, 255, 255, 0.9)',
} as const;

// ふんわり光る影
export const glow = {
  soft: '0px 6px 18px rgba(183, 123, 255, 0.22)',
  pink: '0px 8px 20px rgba(255, 111, 177, 0.38)',
};
