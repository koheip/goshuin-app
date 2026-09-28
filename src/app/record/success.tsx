import Ionicons from '@expo/vector-icons/Ionicons';
import { useAudioPlayer } from 'expo-audio';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BLESSINGS, type BlessingId } from '@/avatar/catalog';
import { PixelAvatar } from '@/components/AvatarPreview';
import { Sakura, Torii } from '@/components/shrine';
import { Sparkle } from '@/components/ui';
import { isSoundEnabled } from '@/db/repo';
import { colors, fonts, glow, gradients } from '@/theme';

const praise: Record<BlessingId, string> = {
  amaterasu: '今日のご縁を、たいせつに残せましたね。あなたの歩みが、またひとつ輝きました。',
  susanoo: 'よく参った！ 今日の一歩は、きっと次へ進む力になるぞ。',
  okuninushi: 'すてきなご縁が、またひとつ結ばれました。大切に育てていきましょう。',
  inari: 'お参り、おつかれさまでした。今日の積み重ねが、豊かな実りになりますよ。',
};

const unlockedNames: Record<string, string> = { '2': '須佐之男命', '5': '大国主命', '10': '宇迦之御魂神' };
const particles = [
  { left: '8%', top: '13%', color: '#FF8FBE', delay: 0 }, { left: '82%', top: '16%', color: '#A98BFF', delay: 160 },
  { left: '18%', top: '35%', color: '#FFD072', delay: 300 }, { left: '74%', top: '38%', color: '#67D9D2', delay: 80 },
  { left: '10%', top: '58%', color: '#CBA7FF', delay: 220 }, { left: '86%', top: '55%', color: '#FF9BC8', delay: 380 },
] as const;

export default function RecordSuccessScreen() {
  const params = useLocalSearchParams<{ book?: string; shrine?: string; guide?: string; visits?: string; firstVisit?: string; unlockedAt?: string }>();
  const guideId = BLESSINGS.some((item) => item.id === params.guide) ? params.guide as BlessingId : 'amaterasu';
  const guide = BLESSINGS.find((item) => item.id === guideId) ?? BLESSINGS[0];
  const [scale] = useState(() => new Animated.Value(.72));
  const [opacity] = useState(() => new Animated.Value(0));
  const [float] = useState(() => new Animated.Value(0));
  const specialUnlock = params.unlockedAt ? unlockedNames[params.unlockedAt] : undefined;
  const db = useSQLiteContext();
  const chime = useAudioPlayer(require('../../../assets/sounds/visit-complete-wafuu.wav'));

  useEffect(() => {
    isSoundEnabled(db)
      .then(async (enabled) => {
        if (!enabled) return;
        await chime.seekTo(0);
        chime.play();
      })
      .catch(() => {});
  }, [chime, db]);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, damping: 10, stiffness: 105, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 520, useNativeDriver: true }),
    ]).start();
    Animated.loop(Animated.sequence([
      Animated.timing(float, { toValue: -7, duration: 1300, useNativeDriver: true }),
      Animated.timing(float, { toValue: 0, duration: 1300, useNativeDriver: true }),
    ])).start();
  }, [float, opacity, scale]);

  const [particleAnimations] = useState(() => particles.map(() => new Animated.Value(0)));
  useEffect(() => {
    particleAnimations.forEach((value, index) => Animated.loop(Animated.sequence([
      Animated.delay(particles[index].delay),
      Animated.timing(value, { toValue: 1, duration: 1200, useNativeDriver: true }),
      Animated.timing(value, { toValue: 0, duration: 0, useNativeDriver: true }),
    ])).start());
  }, [particleAnimations]);

  function openBook() {
    router.dismissTo({ pathname: '/book', params: params.book ? { book: params.book } : {} });
  }

  return <View style={styles.screen}>
    <LinearGradient colors={['#E8F6FF', '#F5E8FF', '#FFEAF4', '#FFF9F0']} locations={[0, .34, .7, 1]} style={StyleSheet.absoluteFill} />
    {particleAnimations.map((value, index) => <Animated.View key={index} style={[styles.particle, { left: particles[index].left, top: particles[index].top, backgroundColor: particles[index].color, opacity: value, transform: [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [18, -28] }) }, { rotate: `${index * 28}deg` }, { scale: value.interpolate({ inputRange: [0, .35, 1], outputRange: [.3, 1, .5] }) }] }]} />)}
    <SafeAreaView style={styles.safe}>
      <Animated.View style={[styles.content, { opacity, transform: [{ scale }] }]}>
        <View style={styles.completePill}><Ionicons name="checkmark" size={15} color="#FFFFFF" /><Text style={styles.completePillText}>参拝の記録ができました</Text></View>
        <View style={styles.titleRow}><Sparkle size={18} color={colors.accent} /><Text style={styles.title}>ご参拝、おつかれさま！</Text><Sparkle size={18} color={colors.violet} /></View>
        <Text style={styles.shrine}>{params.shrine ?? '今日の神社'}</Text>

        <Animated.View style={[styles.guideWrap, { transform: [{ translateY: float }] }]}>
          <View style={styles.guideGlow} />
          <PixelAvatar blessing={guide} equipment={[]} size={190} />
        </Animated.View>

        <View style={styles.messageCard}>
          <View style={styles.speechTail} />
          <Text style={styles.guideName}>{guide.invocation}より</Text>
          <Text style={styles.message}>{praise[guideId]}</Text>
        </View>

        <View style={styles.rewards}>
          <View style={styles.reward}><View style={styles.rewardIcon}><Torii size={29} /></View><View><Text style={styles.rewardValue}>{params.visits ?? '1'} 回</Text><Text style={styles.rewardLabel}>これまでの参拝</Text></View></View>
          {params.firstVisit === 'true' && <View style={styles.reward}><View style={styles.rewardIcon}><Ionicons name="library-outline" size={24} color={colors.accent} /></View><View><Text style={styles.rewardValue}>NEW</Text><Text style={styles.rewardLabel}>はじめての場所</Text></View></View>}
        </View>

        {specialUnlock && <View style={styles.unlock}><Sakura size={24} /><View style={styles.unlockCopy}><Text style={styles.unlockKicker}>新しいご縁がひらきました</Text><Text style={styles.unlockName}>{specialUnlock}と出会えます</Text></View><Ionicons name="sparkles" size={20} color={colors.violet} /></View>}

        <Pressable accessibilityRole="button" onPress={openBook} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}><LinearGradient colors={gradients.primary} style={StyleSheet.absoluteFill} /><Ionicons name="book-outline" size={19} color="#FFFFFF" /><Text style={styles.primaryText}>記録を見る</Text><Ionicons name="arrow-forward" size={18} color="#FFFFFF" /></Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.dismissTo('/map')} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}><Text style={styles.secondaryText}>つぎの神社を探す</Text></Pressable>
      </Animated.View>
    </SafeAreaView>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, overflow: 'hidden' }, safe: { flex: 1 }, content: { flex: 1, paddingHorizontal: 22, paddingTop: 18, paddingBottom: 16, alignItems: 'center' },
  particle: { position: 'absolute', zIndex: 1, width: 12, height: 12, borderRadius: 3 }, completePill: { minHeight: 30, paddingHorizontal: 12, borderRadius: 15, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.mint, boxShadow: glow.soft }, completePillText: { fontFamily: fonts.bold, fontSize: 10, color: '#FFFFFF' },
  titleRow: { marginTop: 15, flexDirection: 'row', alignItems: 'center', gap: 7 }, title: { fontFamily: fonts.displayHeavy, fontSize: 24, color: colors.ink, textAlign: 'center' }, shrine: { marginTop: 3, fontFamily: fonts.bold, fontSize: 12, color: colors.violet },
  guideWrap: { height: 210, alignItems: 'center', justifyContent: 'center' }, guideGlow: { position: 'absolute', width: 150, height: 80, bottom: 17, borderRadius: 75, backgroundColor: 'rgba(255,255,255,.72)', boxShadow: '0px 0px 30px rgba(255,123,187,.36)' },
  messageCard: { width: '100%', minHeight: 112, padding: 17, borderRadius: 24, backgroundColor: 'rgba(255,255,255,.9)', borderWidth: 1.5, borderColor: '#FFFFFF', boxShadow: glow.soft }, speechTail: { position: 'absolute', alignSelf: 'center', top: -9, width: 18, height: 18, backgroundColor: '#FFFFFF', transform: [{ rotate: '45deg' }] }, guideName: { fontFamily: fonts.bold, fontSize: 9, letterSpacing: 1, color: colors.accent }, message: { marginTop: 6, fontFamily: fonts.display, fontSize: 14, lineHeight: 23, color: colors.ink, textAlign: 'center' },
  rewards: { width: '100%', marginTop: 11, flexDirection: 'row', gap: 8 }, reward: { flex: 1, minHeight: 66, padding: 10, borderRadius: 19, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: 'rgba(255,255,255,.75)', borderWidth: 1, borderColor: colors.line }, rewardIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentTint }, rewardValue: { fontFamily: fonts.display, fontSize: 15, color: colors.ink }, rewardLabel: { fontFamily: fonts.regular, fontSize: 8, color: colors.muted },
  unlock: { width: '100%', marginTop: 9, padding: 11, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: '#FFF6D9', borderWidth: 1, borderColor: '#F6D98A' }, unlockCopy: { flex: 1 }, unlockKicker: { fontFamily: fonts.bold, fontSize: 8, color: '#A56C23' }, unlockName: { marginTop: 2, fontFamily: fonts.display, fontSize: 12, color: colors.ink },
  primary: { width: '100%', minHeight: 52, marginTop: 'auto', overflow: 'hidden', borderRadius: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: glow.pink }, primaryText: { flex: 1, textAlign: 'center', marginLeft: 18, fontFamily: fonts.bold, fontSize: 13, color: '#FFFFFF' }, secondary: { minHeight: 42, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' }, secondaryText: { fontFamily: fonts.bold, fontSize: 11, color: colors.violet }, pressed: { opacity: .8, transform: [{ scale: .98 }] },
});
