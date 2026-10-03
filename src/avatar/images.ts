import type { BlessingId } from './catalog';

// ホームと神さま図鑑で共有する、おともごとのメインイラスト。
export const GUIDE_ILLUSTRATIONS: Record<BlessingId, number> = {
  amaterasu: require('../../assets/optimized/kami-megu-home-hero.jpg'),
  susanoo: require('../../assets/optimized/home-guide-susanoo-soft-v3.jpg'),
  okuninushi: require('../../assets/optimized/home-guide-okuninushi-soft-v3.jpg'),
  inari: require('../../assets/optimized/home-guide-inari-soft-v3.jpg'),
};

// 神さま図鑑専用の正面向き肖像。顔立ちはホームのおともを引き継ぎ、
// 神さまごとの装束・象徴物・背景で個性を描き分ける。
export const KAMI_CATALOG_ILLUSTRATIONS: Record<BlessingId, number> = {
  amaterasu: require('../../assets/optimized/kami-catalog-amaterasu-card-v5.jpg'),
  susanoo: require('../../assets/optimized/kami-catalog-susanoo-card-v5.jpg'),
  okuninushi: require('../../assets/optimized/kami-catalog-okuninushi-card-v5.jpg'),
  inari: require('../../assets/optimized/kami-catalog-inari-card-v5.jpg'),
};

// 一覧の額に余白なく収まる、正方形の正面バストアップ。
export const KAMI_CATALOG_CARD_ILLUSTRATIONS: Record<BlessingId, number> = {
  amaterasu: require('../../assets/optimized/kami-catalog-amaterasu-card-v5-thumb.jpg'),
  susanoo: require('../../assets/optimized/kami-catalog-susanoo-card-v5-thumb.jpg'),
  okuninushi: require('../../assets/optimized/kami-catalog-okuninushi-card-v5-thumb.jpg'),
  inari: require('../../assets/optimized/kami-catalog-inari-card-v5-thumb.jpg'),
};

// おとものドット絵（1柱ずつ）。scripts/optimize-images.py が、4柱が並んだ元の絵から切り分ける
export const GUIDE_PIXEL_IMAGES: Record<BlessingId, number> = {
  amaterasu: require('../../assets/optimized/guide-pixel-amaterasu.png'),
  susanoo: require('../../assets/optimized/guide-pixel-susanoo.png'),
  okuninushi: require('../../assets/optimized/guide-pixel-okuninushi.png'),
  inari: require('../../assets/optimized/guide-pixel-inari.png'),
};
