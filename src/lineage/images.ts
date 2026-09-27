import type { KamiId } from './catalog';

// 系統のページの背景。御祭神の神さまの絵を使う
export const KAMI_BACKGROUNDS: Record<KamiId, number> = {
  amaterasu: require('../../assets/blessing-amaterasu.png'),
  susanoo: require('../../assets/blessing-susanoo.png'),
  okuninushi: require('../../assets/blessing-okuninushi.png'),
  inari: require('../../assets/blessing-inari.png'),
};
