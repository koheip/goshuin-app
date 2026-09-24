import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { colors } from '@/theme';

// 神社モチーフの飾り。どれも読み上げ対象外で、タップも受け取らない

type ToriiProps = { size?: number; opacity?: number; style?: ViewStyle };

// 丸みのある鳥居。size は横幅
export function Torii({ size = 48, opacity = 1, style }: ToriiProps) {
  const w = size;
  const h = Math.round(w * 0.86);
  const beam = (top: number, inset: number, height: number, color: string): ViewStyle => ({
    position: 'absolute',
    top: w * top,
    left: w * inset,
    right: w * inset,
    height: w * height,
    borderRadius: w * height,
    backgroundColor: color,
  });
  const pillar = (side: 'left' | 'right'): ViewStyle => ({
    position: 'absolute',
    top: w * 0.12,
    bottom: w * 0.05,
    [side]: w * 0.18,
    width: w * 0.1,
    borderTopLeftRadius: w * 0.02,
    borderTopRightRadius: w * 0.02,
    backgroundColor: colors.shu,
  });
  const base = (side: 'left' | 'right'): ViewStyle => ({
    position: 'absolute',
    bottom: 0,
    [side]: w * 0.16,
    width: w * 0.14,
    height: w * 0.07,
    borderRadius: w * 0.02,
    backgroundColor: colors.kasagi,
  });

  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[{ width: w, height: h, opacity }, style]}
    >
      <View style={pillar('left')} />
      <View style={pillar('right')} />
      <View style={base('left')} />
      <View style={base('right')} />
      {/* 貫（ぬき） */}
      <View style={beam(0.3, 0.08, 0.065, colors.shu)} />
      {/* 額束（がくづか） */}
      <View
        style={{
          position: 'absolute',
          top: w * 0.12,
          left: w * 0.455,
          width: w * 0.09,
          height: w * 0.2,
          borderRadius: w * 0.015,
          backgroundColor: colors.shuDeep,
        }}
      />
      {/* 島木と笠木 */}
      <View style={beam(0.075, 0.04, 0.075, colors.shu)} />
      <View style={beam(0, -0.02, 0.085, colors.kasagi)} />
    </View>
  );
}

type ShimenawaProps = { width: number; shide?: number; style?: ViewStyle };

// しめ縄と紙垂（しで）。width は縄の横幅、shide は紙垂の数
export function Shimenawa({ width, shide = 4, style }: ShimenawaProps) {
  const twists = Math.floor(width / 12);
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[{ width }, style]}
    >
      <LinearGradient
        colors={[colors.straw, colors.strawDeep, colors.straw]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.rope}
      >
        {Array.from({ length: twists }, (_, i) => (
          <View key={i} style={[styles.twist, { left: i * 12 + 4 }]} />
        ))}
      </LinearGradient>
      <View style={styles.shideRow}>
        {Array.from({ length: shide }, (_, i) => (
          <Shide key={i} />
        ))}
      </View>
    </View>
  );
}

// 稲妻形に折った紙垂
function Shide() {
  const steps = [0, 5, 0, 5];
  return (
    <View style={styles.shide}>
      {steps.map((x, i) => (
        <View key={i} style={[styles.shidePiece, { marginLeft: x }]} />
      ))}
    </View>
  );
}

type SakuraProps = { size?: number; color?: string; style?: ViewStyle };

// 桜の花
export function Sakura({ size = 16, color = colors.sakura, style }: SakuraProps) {
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants" pointerEvents="none" style={style}>
      <Ionicons name="flower" size={size} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  rope: { height: 12, borderRadius: 6, overflow: 'hidden' },
  twist: {
    position: 'absolute',
    top: -2,
    width: 3,
    height: 16,
    borderRadius: 2,
    backgroundColor: 'rgba(160, 110, 30, 0.28)',
    transform: [{ rotate: '35deg' }],
  },
  shideRow: { flexDirection: 'row', justifyContent: 'space-evenly', marginTop: -1 },
  shide: { width: 14 },
  shidePiece: {
    width: 8,
    height: 7,
    backgroundColor: colors.shide,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    marginTop: -1,
  },
});
