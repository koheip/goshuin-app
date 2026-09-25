import { LinearGradient } from 'expo-linear-gradient';
import { Image, ImageBackground, StyleSheet, View, type ViewStyle } from 'react-native';

import { EQUIPMENT, type Blessing, type BlessingId, type EquipmentId } from '@/avatar/catalog';
import { equipmentArtwork } from '@/avatar/assets';
import { glow } from '@/theme';

const avatar = require('../../assets/avatar-base.png');
const pixel = require('../../assets/avatar-pixel-sprite.png');
const blessingBackgrounds: Record<BlessingId, number> = {
  amaterasu: require('../../assets/blessing-amaterasu.png'),
  susanoo: require('../../assets/blessing-susanoo.png'),
  okuninushi: require('../../assets/blessing-okuninushi.png'),
  inari: require('../../assets/blessing-inari.png'),
};

export function IllustratedAvatar({ blessing, equipment, style }: { blessing: Blessing; equipment: EquipmentId[]; style?: ViewStyle }) {
  return (
    <View style={[styles.illustratedWrap, style]}>
      <ImageBackground source={blessingBackgrounds[blessing.id]} resizeMode="cover" style={StyleSheet.absoluteFill} imageStyle={styles.blessingBackdrop}>
        <LinearGradient colors={['rgba(255,255,255,.08)', 'rgba(255,248,253,.18)', 'rgba(255,247,252,.72)']} locations={[0, .55, 1]} style={StyleSheet.absoluteFill} />
      </ImageBackground>
      <LinearGradient colors={['transparent', `${blessing.pale}88`]} style={StyleSheet.absoluteFill} />
      {blessing.id !== 'amaterasu' && <View style={[styles.halo, { borderColor: blessing.color, shadowColor: blessing.color }]} />}
      <Image source={avatar} resizeMode="contain" style={styles.avatarImage} />
      <EquipmentBadges equipment={equipment} />
    </View>
  );
}

export function PixelAvatar({ blessing, equipment, direction = 0, size = 132 }: { blessing: Blessing; equipment: EquipmentId[]; direction?: 0 | 1 | 2 | 3; size?: number }) {
  const top = direction > 1 ? '-100%' : '0%';
  const left = direction % 2 ? '-100%' : '0%';
  return (
    <View style={[styles.pixelWrap, { width: size, height: size, backgroundColor: blessing.pale }] }>
      <Image source={pixel} resizeMode="stretch" style={[styles.sprite, { top, left }]} />
      <EquipmentBadges equipment={equipment.slice(0, 3)} compact />
    </View>
  );
}

function EquipmentBadges({ equipment, compact }: { equipment: EquipmentId[]; compact?: boolean }) {
  return (
    <View style={[styles.badges, compact && styles.badgesCompact]}>
      {equipment.map((id) => {
        const item = EQUIPMENT.find((entry) => entry.id === id);
        return item ? (
          <LinearGradient key={id} colors={equipmentColors[id]} style={[styles.badge, compact && styles.badgeCompact]}>
            <Image source={equipmentArtwork[id]} resizeMode="contain" style={[styles.badgeArtwork, compact && styles.badgeArtworkCompact]} />
          </LinearGradient>
        ) : null;
      })}
    </View>
  );
}

const equipmentColors: Record<EquipmentId, readonly [string, string]> = {
  magatama: ['#55D4E3', '#6688E8'],
  omamori: ['#FF82AE', '#E45089'],
  shide: ['#B898F2', '#7968D9'],
  'fox-mask': ['#FFAF78', '#E76B6B'],
  'kagura-bell': ['#FFD56A', '#D99A31'],
  sakaki: ['#71C997', '#388568'],
  haori: ['#F5A7D2', '#A888E8'],
};

const styles = StyleSheet.create({
  illustratedWrap: { minHeight: 390, overflow: 'hidden', borderRadius: 28, alignItems: 'center', justifyContent: 'flex-end', boxShadow: glow.soft },
  blessingBackdrop: { borderRadius: 28 },
  halo: { position: 'absolute', top: 34, width: 210, height: 210, borderRadius: 105, borderWidth: 3, opacity: .65, boxShadow: '0px 0px 30px rgba(255,180,94,.5)' },
  avatarImage: { width: '96%', height: '98%' },
  pixelWrap: { overflow: 'hidden', borderRadius: 24, borderWidth: 2, borderColor: '#FFFFFF', boxShadow: glow.soft },
  sprite: { position: 'absolute', width: '200%', height: '200%' },
  badges: { position: 'absolute', right: 10, bottom: 10, flexDirection: 'row', gap: 5 },
  badgesCompact: { right: 5, bottom: 5, gap: 2 },
  badge: { width: 31, height: 31, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,.92)', boxShadow: '0px 3px 9px rgba(57,35,92,.25)' },
  badgeCompact: { width: 18, height: 18, borderRadius: 9 },
  badgeArtwork: { width: 25, height: 25 },
  badgeArtworkCompact: { width: 15, height: 15 },
});
