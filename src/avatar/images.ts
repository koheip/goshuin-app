import type { BlessingId } from './catalog';

// ホームと神さま図鑑で共有する、おともごとのメインイラスト。
export const GUIDE_ILLUSTRATIONS: Record<BlessingId, number> = {
  amaterasu: require('../../assets/kami-megu-home-hero.png'),
  susanoo: require('../../assets/home-guide-susanoo-soft-v3.png'),
  okuninushi: require('../../assets/home-guide-okuninushi-soft-v3.png'),
  inari: require('../../assets/home-guide-inari-soft-v3.png'),
};

// 神さま図鑑専用の正面向き肖像。顔立ちはホームのおともを引き継ぎ、
// 神さまごとの装束・象徴物・背景で個性を描き分ける。
export const KAMI_CATALOG_ILLUSTRATIONS: Record<BlessingId, number> = {
  amaterasu: require('../../assets/kami-catalog-amaterasu-front-v1.png'),
  susanoo: require('../../assets/kami-catalog-susanoo-front-v1.png'),
  okuninushi: require('../../assets/kami-catalog-okuninushi-front-v1.png'),
  inari: require('../../assets/kami-catalog-inari-front-v1.png'),
};

// 一覧の額に余白なく収まる、正方形の正面バストアップ。
export const KAMI_CATALOG_CARD_ILLUSTRATIONS: Record<BlessingId, number> = {
  amaterasu: require('../../assets/kami-catalog-amaterasu-card-v2.png'),
  susanoo: require('../../assets/kami-catalog-susanoo-card-v2.png'),
  okuninushi: require('../../assets/kami-catalog-okuninushi-card-v2.png'),
  inari: require('../../assets/kami-catalog-inari-card-v2.png'),
};
