import type { ImageSourcePropType } from 'react-native';

import type { EquipmentId } from './catalog';

export const equipmentArtwork: Record<EquipmentId, ImageSourcePropType> = {
  magatama: require('../../assets/item-magatama.png'),
  omamori: require('../../assets/item-omamori.png'),
  shide: require('../../assets/item-shide.png'),
  'fox-mask': require('../../assets/item-fox-mask.png'),
  'kagura-bell': require('../../assets/item-kagura-bell.png'),
  sakaki: require('../../assets/item-sakaki.png'),
  haori: require('../../assets/item-haori.png'),
};
