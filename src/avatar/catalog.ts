import type { ComponentProps } from 'react';
import type Ionicons from '@expo/vector-icons/Ionicons';

export type BlessingId = 'amaterasu' | 'susanoo' | 'okuninushi' | 'inari';
export type EquipmentId = 'magatama' | 'omamori' | 'shide' | 'fox-mask' | 'kagura-bell' | 'sakaki' | 'haori';

export type Blessing = {
  id: BlessingId;
  name: string;
  deity: string;
  threshold: number;
  color: string;
  pale: string;
  deep: string;
  symbol: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  invocation: string;
  story: string;
  effect: string;
};

export type Equipment = {
  id: EquipmentId;
  name: string;
  threshold: number;
  icon: ComponentProps<typeof Ionicons>['name'];
  glyph?: string;
};

export const BLESSINGS: Blessing[] = [
  { id: 'amaterasu', name: 'アマテラスの加護', deity: '光と導き', threshold: 0, color: '#FFB45E', pale: '#FFF1CF', deep: '#D87542', symbol: '日', icon: 'sunny', invocation: '天照大御神', story: '新しい道を照らし、よき巡りへ導く。', effect: '金色の光輪と桜のきらめき' },
  { id: 'susanoo', name: 'スサノオの加護', deity: '水と勇気', threshold: 2, color: '#5B95F5', pale: '#DCEBFF', deep: '#3C66C9', symbol: '嵐', icon: 'water', invocation: '須佐之男命', story: '荒波を越える勇気を授け、災いを祓う。', effect: '蒼い水紋と稲妻のきらめき' },
  { id: 'okuninushi', name: 'オオクニヌシの加護', deity: 'ご縁むすび', threshold: 5, color: '#E75C91', pale: '#FFE0ED', deep: '#B83B72', symbol: '縁', icon: 'heart', invocation: '大国主命', story: '人と場所を結ぶ、あたたかなご縁を育む。', effect: '赤い結び糸と白兎の光跡' },
  { id: 'inari', name: 'お稲荷さまの加護', deity: '実りと商売', threshold: 10, color: '#D8922D', pale: '#FFF0CE', deep: '#A86424', symbol: '稲', icon: 'leaf', invocation: '宇迦之御魂神', story: '日々の営みに実りと豊かさをもたらす。', effect: '狐火と黄金の稲穂のきらめき' },
];

export const EQUIPMENT: Equipment[] = [
  { id: 'magatama', name: '勾玉', threshold: 0, icon: 'water-outline', glyph: '勾' },
  { id: 'omamori', name: '御守り', threshold: 1, icon: 'bag-handle-outline', glyph: '守' },
  { id: 'shide', name: '紙垂飾り', threshold: 2, icon: 'flash-outline', glyph: '紙' },
  { id: 'fox-mask', name: '狐面', threshold: 3, icon: 'paw-outline', glyph: '狐' },
  { id: 'kagura-bell', name: '神楽鈴', threshold: 5, icon: 'notifications-outline', glyph: '鈴' },
  { id: 'sakaki', name: '榊', threshold: 7, icon: 'leaf-outline', glyph: '榊' },
  { id: 'haori', name: '羽織', threshold: 10, icon: 'shirt-outline', glyph: '衣' },
];
