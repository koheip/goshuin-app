import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Animated, Easing, ImageBackground, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Torii } from '@/components/shrine';
import { PixelWordmark, Sparkle } from '@/components/ui';
import { colors, fonts, glow } from '@/theme';

const hero = require('../../assets/kami-megu-home-hero.png');

const FALLING = [
  ['shide', .08, 0], ['sakaki', .22, 420], ['shide', .39, 760], ['magatama', .58, 180],
  ['shide', .76, 980], ['sakaki', .9, 620], ['shide', .16, 1400], ['magatama', .68, 1320],
  ['shide', .48, 1720], ['sakaki', .82, 1920], ['shide', .3, 2240], ['magatama', .94, 2480],
] as const;

type KamiLoadingScreenProps = {
  onFinish?: () => void;
  variant?: 'startup' | 'loading';
  message?: string;
};

export function KamiLoadingScreen({ onFinish, variant = 'startup', message }: KamiLoadingScreenProps) {
  const [logo] = useState(() => new Animated.Value(0));
  const [progress] = useState(() => new Animated.Value(0));
  const [ready] = useState(() => new Animated.Value(0));
  const [screen] = useState(() => new Animated.Value(1));
  const [progressLabel, setProgressLabel] = useState(0);

  useEffect(() => {
    const listener = progress.addListener(({ value }) => setProgressLabel(Math.round(value * 100)));
    const entrance = Animated.spring(logo, { toValue: 1, friction: 6, tension: 54, useNativeDriver: true });
    if (variant === 'loading') {
      progress.setValue(.12);
      const loop = Animated.loop(Animated.sequence([
        Animated.timing(progress, { toValue: .88, duration: 1100, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
        Animated.timing(progress, { toValue: .18, duration: 850, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
      ]));
      entrance.start();
      loop.start();
      return () => {
        entrance.stop();
        loop.stop();
        progress.removeListener(listener);
      };
    }
    const startup = Animated.parallel([
      entrance,
      Animated.timing(progress, { toValue: 1, duration: 2500, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      Animated.sequence([
        Animated.delay(2050),
        Animated.timing(ready, { toValue: 1, duration: 380, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(3100),
        Animated.timing(screen, { toValue: 0, duration: 420, useNativeDriver: true }),
      ]),
    ]);
    startup.start(({ finished }) => finished && onFinish?.());
    return () => {
      startup.stop();
      progress.removeListener(listener);
    };
  }, [logo, onFinish, progress, ready, screen, variant]);

  const logoScale = logo.interpolate({ inputRange: [0, 1], outputRange: [.82, 1] });
  const barWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <Animated.View accessibilityViewIsModal style={[styles.overlay, { opacity: screen }]}>
      <ImageBackground source={hero} resizeMode="cover" style={styles.background} imageStyle={styles.image}>
        <LinearGradient colors={['rgba(246,235,255,.5)', 'rgba(255,234,247,.58)', 'rgba(255,247,252,.78)']} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={styles.safe}>
          {FALLING.map(([kind, x, delay], index) => <FallingSacredSymbol key={`${kind}-${index}`} kind={kind} x={x} delay={delay} />)}
          <Animated.View style={[styles.brand, variant === 'loading' && styles.brandLoading, { opacity: logo, transform: [{ scale: logoScale }] }] }>
            <View style={styles.toriiHalo}><Torii size={112} /></View>
            <PixelWordmark />
            <Text style={styles.kana}>カ ミ め ぐ</Text>
          </Animated.View>

          <View style={styles.loader}>
            <Text style={styles.message}>{message ?? (variant === 'startup' ? '神さまとのご縁を結んでいます…' : 'ご縁をたどっています…')}</Text>
            <View style={styles.track}><Animated.View style={[styles.fill, { width: barWidth }]} /></View>
            <Text style={styles.percent}>{progressLabel}%</Text>
          </View>

          {variant === 'startup' && (
            <Animated.View style={[styles.ready, { opacity: ready, transform: [{ translateY: ready.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }] }>
              <Sparkle size={15} color={colors.violet} />
              <Text style={styles.readyText}>ようこそ、カミめぐへ。</Text>
              <Sparkle size={15} color={colors.accent} />
            </Animated.View>
          )}
        </SafeAreaView>
      </ImageBackground>
    </Animated.View>
  );
}

function FallingSacredSymbol({ kind, x, delay }: { kind: 'shide' | 'sakaki' | 'magatama'; x: number; delay: number }) {
  const { height } = useWindowDimensions();
  const [fall] = useState(() => new Animated.Value(0));
  const [spin] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.loop(Animated.parallel([
      Animated.timing(fall, { toValue: 1, duration: 3800 + delay % 700, delay, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(spin, { toValue: 1, duration: 4200, easing: Easing.linear, useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [delay, fall, spin]);

  return (
    <Animated.View pointerEvents="none" style={[styles.symbol, { left: `${x * 100}%`, transform: [
      { translateY: fall.interpolate({ inputRange: [0, 1], outputRange: [-90, height + 80] }) },
      { translateX: fall.interpolate({ inputRange: [0, .5, 1], outputRange: [-10, 14, -8] }) },
      { rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '260deg'] }) },
    ] }] }>
      {kind === 'shide' ? <MiniShide /> : kind === 'sakaki' ? <Ionicons name="leaf" size={22} color="#57B897" /> : <Magatama />}
    </Animated.View>
  );
}

function MiniShide() {
  return <View style={styles.shide}><View style={styles.shideOne} /><View style={styles.shideTwo} /><View style={styles.shideThree} /></View>;
}

function Magatama() {
  return <View style={styles.magatama}><View style={styles.magatamaHole} /></View>;
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', inset: 0, zIndex: 1000, backgroundColor: colors.paper },
  background: { flex: 1 }, image: { opacity: .44 }, safe: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  brand: { alignItems: 'center', marginTop: -120 }, toriiHalo: { marginBottom: 35, padding: 22, borderRadius: 90, backgroundColor: 'rgba(255,255,255,.25)' },
  brandLoading: { marginTop: -70 },
  kana: { marginTop: 2, marginLeft: 4, fontFamily: fonts.bold, fontSize: 11, letterSpacing: 5, color: colors.accent },
  loader: { position: 'absolute', left: 42, right: 42, bottom: 154, alignItems: 'center', gap: 12 },
  message: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
  track: { width: '100%', height: 12, padding: 2, overflow: 'hidden', borderRadius: 6, backgroundColor: 'rgba(255,255,255,.74)', borderWidth: 1, borderColor: '#FFFFFF', boxShadow: glow.soft },
  fill: { height: '100%', minWidth: 8, borderRadius: 4, backgroundColor: colors.accent },
  percent: { fontFamily: fonts.regular, fontSize: 12, color: colors.inkSoft },
  ready: { position: 'absolute', left: 38, right: 38, bottom: 62, minHeight: 58, borderRadius: 29, backgroundColor: 'rgba(255,255,255,.9)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: glow.pink },
  readyText: { fontFamily: fonts.display, fontSize: 15, color: colors.ink },
  symbol: { position: 'absolute', top: 0, zIndex: 2, opacity: .82 },
  shide: { width: 22, height: 31 },
  shideOne: { position: 'absolute', top: 0, left: 6, width: 13, height: 9, backgroundColor: '#FFFFFF', transform: [{ skewX: '-18deg' }] },
  shideTwo: { position: 'absolute', top: 8, left: 1, width: 13, height: 10, backgroundColor: '#FFFFFF', transform: [{ skewX: '-18deg' }] },
  shideThree: { position: 'absolute', top: 17, left: 7, width: 13, height: 12, backgroundColor: '#FFFFFF', transform: [{ skewX: '-18deg' }] },
  magatama: { width: 23, height: 19, borderRadius: 12, backgroundColor: colors.violet, transform: [{ rotate: '-28deg' }] },
  magatamaHole: { position: 'absolute', top: 4, right: 4, width: 7, height: 7, borderRadius: 4, backgroundColor: '#F7E9FF' },
});
