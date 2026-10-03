import type { KamiId } from './catalog';

// 系統のページの背景。御祭神の神さまの絵を使う
export const KAMI_BACKGROUNDS: Record<KamiId, number> = {
  amaterasu: require('../../assets/optimized/blessing-amaterasu.jpg'),
  susanoo: require('../../assets/optimized/blessing-susanoo.jpg'),
  okuninushi: require('../../assets/optimized/blessing-okuninushi.jpg'),
  inari: require('../../assets/optimized/blessing-inari.jpg'),
};
