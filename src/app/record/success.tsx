import Ionicons from '@expo/vector-icons/Ionicons';
import { useAudioPlayer } from 'expo-audio';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Animated, ImageBackground, Modal, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Pressable } from '@/components/Pressable';
import { BLESSINGS, type BlessingId } from '@/avatar/catalog';
import { KAMI_CATALOG_CARD_ILLUSTRATIONS } from '@/avatar/images';
import { PixelAvatar } from '@/components/AvatarPreview';
import { Sakura, Torii } from '@/components/shrine';
import { Sparkle } from '@/components/ui';
import { isSoundEnabled } from '@/db/repo';
import { soundVolume } from '@/lib/feedback';
import { getLineage } from '@/lineage/catalog';
import { KAMI_BACKGROUNDS } from '@/lineage/images';
import { colors, fonts, glow, gradients } from '@/theme';

const praise: Record<BlessingId, string> = {
  amaterasu: '今日のご縁を、たいせつに残せましたね。あなたの歩みが、またひとつ輝きました。',
  susanoo: 'よく参った！ 今日の一歩は、きっと次へ進む力になるぞ。',
  okuninushi: 'すてきなご縁が、またひとつ結ばれました。大切に育てていきましょう。',
  inari: 'お参り、おつかれさまでした。今日の積み重ねが、豊かな実りになりますよ。',
};

const unlockedNames: Record<string, string> = { '2': '須佐之男命', '5': '大国主命', '10': '宇迦之御魂神' };
const unlockedKami: Record<string, BlessingId> = { '2': 'susanoo', '5': 'okuninushi', '10': 'inari' };
const particles = [
  { left: '8%', top: '13%', color: '#FF8FBE', delay: 0 }, { left: '82%', top: '16%', color: '#A98BFF', delay: 160 },
  { left: '18%', top: '35%', color: '#FFD072', delay: 300 }, { left: '74%', top: '38%', color: '#67D9D2', delay: 80 },
  { left: '10%', top: '58%', color: '#CBA7FF', delay: 220 }, { left: '86%', top: '55%', color: '#FF9BC8', delay: 380 },
] as const;
const unlockParticles = [
  { left: '8%', top: '12%', size: 8, color: '#FFD66E' }, { left: '87%', top: '15%', size: 10, color: '#FF9DCC' },
  { left: '4%', top: '42%', size: 6, color: '#BFA6FF' }, { left: '91%', top: '45%', size: 7, color: '#8DE8DF' },
  { left: '13%', top: '76%', size: 9, color: '#FFB5D8' }, { left: '84%', top: '79%', size: 6, color: '#FFE396' },
] as const;

export default function RecordSuccessScreen() {
  const params = useLocalSearchParams<{ book?: string; shrine?: string; guide?: string; visits?: string; firstVisit?: string; unlockedAt?: string; mythUnlocked?: string }>();
  const guideId = BLESSINGS.some((item) => item.id === params.guide) ? params.guide as BlessingId : 'amaterasu';
  const guide = BLESSINGS.find((item) => item.id === guideId) ?? BLESSINGS[0];
  const [scale] = useState(() => new Animated.Value(.72));
  const [opacity] = useState(() => new Animated.Value(0));
  const [float] = useState(() => new Animated.Value(0));
  const specialUnlock = params.unlockedAt ? unlockedNames[params.unlockedAt] : undefined;
  const unlockedKamiId = params.unlockedAt ? unlockedKami[params.unlockedAt] : undefined;
  const [showUnlockEvent, setShowUnlockEvent] = useState(Boolean(unlockedKamiId));
  const mythLineage = getLineage(params.mythUnlocked);
  const [showMythEvent, setShowMythEvent] = useState(Boolean(mythLineage) && !unlockedKamiId);
  const [openKamiAfterMyth, setOpenKamiAfterMyth] = useState(false);
  const [unlockReveal] = useState(() => new Animated.Value(0));
  const [unlockPulse] = useState(() => new Animated.Value(0));
  const [unlockOrbit] = useState(() => new Animated.Value(0));
  const db = useSQLiteContext();
  const chime = useAudioPlayer(require('../../../assets/sounds/visit-complete-wafuu.wav'));

  useEffect(() => {
    isSoundEnabled(db)
      .then(async (enabled) => {
        if (!enabled) return;
        chime.volume = 0.55;
        chime.volume = soundVolume();
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

  useEffect(() => {
    if (!showUnlockEvent) return;
    unlockReveal.setValue(0);
    unlockPulse.setValue(0);
    unlockOrbit.setValue(0);
    const reveal = Animated.parallel([
      Animated.spring(unlockReveal, { toValue: 1, damping: 10, stiffness: 90, mass: .75, useNativeDriver: true }),
      Animated.timing(unlockPulse, { toValue: 1, duration: 750, useNativeDriver: true }),
    ]);
    const breathe = Animated.loop(Animated.sequence([
      Animated.timing(unlockPulse, { toValue: .35, duration: 1150, useNativeDriver: true }),
      Animated.timing(unlockPulse, { toValue: 1, duration: 1150, useNativeDriver: true }),
    ]));
    const orbit = Animated.loop(Animated.timing(unlockOrbit, { toValue: 1, duration: 9000, useNativeDriver: true }));
    reveal.start(() => breathe.start());
    orbit.start();
    return () => { reveal.stop(); breathe.stop(); orbit.stop(); };
  }, [showUnlockEvent, unlockOrbit, unlockPulse, unlockReveal]);

  function openBook() {
    router.dismissTo({ pathname: '/book', params: params.book ? { book: params.book } : {} });
  }

  function openUnlockedKami() {
    if (!unlockedKamiId) return;
    if (mythLineage) {
      setOpenKamiAfterMyth(true);
      setShowUnlockEvent(false);
      setShowMythEvent(true);
      return;
    }
    setShowUnlockEvent(false);
    router.dismissTo({ pathname: '/kami', params: { open: unlockedKamiId } });
  }

  function dismissUnlockEvent() {
    setShowUnlockEvent(false);
    if (mythLineage) setShowMythEvent(true);
  }

  function finishMythEvent(openMyth: boolean) {
    setShowMythEvent(false);
    if (openMyth && mythLineage) {
      router.dismissTo({ pathname: '/lineage/[id]', params: { id: mythLineage.id } });
    } else if (openKamiAfterMyth && unlockedKamiId) {
      router.dismissTo({ pathname: '/kami', params: { open: unlockedKamiId } });
    }
  }

  const unlockedGuide = unlockedKamiId ? BLESSINGS.find((item) => item.id === unlockedKamiId) : undefined;

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

    <Modal visible={showUnlockEvent && Boolean(unlockedGuide)} transparent animationType="fade" statusBarTranslucent onRequestClose={dismissUnlockEvent}>
      {unlockedGuide && <View style={styles.unlockOverlay}>
        <LinearGradient colors={['rgba(40,25,76,.82)', 'rgba(91,56,129,.72)', 'rgba(255,143,199,.68)']} style={StyleSheet.absoluteFill} />
        <Animated.View style={[styles.unlockHalo, { opacity: unlockPulse.interpolate({ inputRange: [0, 1], outputRange: [.18, .62] }), transform: [{ rotate: unlockOrbit.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }, { scale: unlockPulse.interpolate({ inputRange: [0, 1], outputRange: [.88, 1.05] }) }] }]}><View style={styles.unlockHaloInner} /></Animated.View>
        {unlockParticles.map((particle, index) => <Animated.View key={`unlock-particle-${index}`} style={[styles.unlockParticle, { left: particle.left, top: particle.top, width: particle.size, height: particle.size, backgroundColor: particle.color, opacity: unlockReveal, transform: [{ translateY: unlockReveal.interpolate({ inputRange: [0, 1], outputRange: [28 + index * 3, -8 - index * 2] }) }, { rotate: `${index * 31}deg` }, { scale: unlockPulse.interpolate({ inputRange: [0, 1], outputRange: [.55, 1.2] }) }] }]} />)}
        <SafeAreaView style={styles.unlockSafe}>
          <Animated.View style={[styles.unlockEventCard, { opacity: unlockReveal, transform: [{ translateY: unlockReveal.interpolate({ inputRange: [0, 1], outputRange: [46, 0] }) }, { scale: unlockReveal.interpolate({ inputRange: [0, 1], outputRange: [.82, 1] }) }] }]}>
            <Animated.View style={[styles.unlockCrest, { opacity: unlockPulse, transform: [{ scale: unlockPulse.interpolate({ inputRange: [0, 1], outputRange: [.86, 1.08] }) }] }]}><View style={styles.unlockCrestWing} /><Sparkle size={22} color="#FFD66E" /><View style={[styles.unlockCrestWing, styles.unlockCrestWingRight]} /></Animated.View>
            <View style={styles.unlockEventKickerRow}><Sparkle size={15} color="#FFD87A" /><Text style={styles.unlockEventKicker}>KAMI FOUND!</Text><Sparkle size={15} color="#FFD87A" /></View>
            <Text style={styles.unlockEventCaption}>神さま図鑑に、新しいご縁がひらきました</Text>
            <Animated.View style={[styles.unlockPortraitFrame, { transform: [{ scale: unlockReveal.interpolate({ inputRange: [0, 1], outputRange: [.9, 1] }) }] }]}>
              <ImageBackground source={KAMI_CATALOG_CARD_ILLUSTRATIONS[unlockedGuide.id]} resizeMode="cover" style={styles.unlockPortrait} imageStyle={styles.unlockPortraitImage}>
                <LinearGradient colors={['transparent', 'rgba(30,18,60,.04)', 'rgba(30,18,60,.56)']} locations={[0, .62, 1]} style={StyleSheet.absoluteFill} />
                <Animated.View style={[styles.newBadge, { transform: [{ translateY: unlockPulse.interpolate({ inputRange: [0, 1], outputRange: [2, -3] }) }] }]}><Ionicons name="sparkles" size={12} color="#FFFFFF" /><Text style={styles.newBadgeText}>NEW</Text></Animated.View>
                <View style={styles.unlockIdentity}><Text style={styles.unlockDeity}>{unlockedGuide.invocation}</Text><Text style={styles.unlockBlessing}>{unlockedGuide.deity}</Text></View>
              </ImageBackground>
            </Animated.View>
            <Text style={styles.unlockMessage}>{unlockedGuide.story}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={`${unlockedGuide.invocation}を図鑑で見る`} onPress={openUnlockedKami} style={({ pressed }) => [styles.unlockPrimary, pressed && styles.pressed]}><LinearGradient colors={gradients.primary} style={StyleSheet.absoluteFill} /><Ionicons name="book-outline" size={19} color="#FFFFFF" /><Text style={styles.unlockPrimaryText}>図鑑で見る</Text><Ionicons name="arrow-forward" size={18} color="#FFFFFF" /></Pressable>
            <Pressable accessibilityRole="button" onPress={dismissUnlockEvent} style={styles.unlockLater}><Text style={styles.unlockLaterText}>{mythLineage ? 'つぎの解放を見る' : 'あとで見る'}</Text></Pressable>
          </Animated.View>
        </SafeAreaView>
      </View>}
    </Modal>

    <Modal visible={showMythEvent && Boolean(mythLineage)} transparent animationType="fade" statusBarTranslucent onRequestClose={() => finishMythEvent(false)}>
      {mythLineage && <View style={styles.mythOverlay}>
        <LinearGradient colors={['rgba(28,21,53,.9)', 'rgba(83,58,117,.82)', 'rgba(221,143,184,.76)']} style={StyleSheet.absoluteFill} />
        {unlockParticles.map((particle, index) => <View key={`myth-particle-${index}`} style={[styles.mythParticle, { left: particle.left, top: particle.top, width: particle.size, height: particle.size, backgroundColor: particle.color, transform: [{ rotate: `${index * 31}deg` }] }]} />)}
        <SafeAreaView style={styles.unlockSafe}>
          <View style={styles.mythEventCard}>
            <View style={styles.mythSeal}><Ionicons name="book-outline" size={25} color="#FFFFFF" /></View>
            <Text style={styles.mythEventKicker}>MYTH UNLOCKED</Text>
            <Text style={styles.mythEventCaption}>神社図鑑の神話がひらきました</Text>
            <ImageBackground source={KAMI_BACKGROUNDS[mythLineage.kamiId]} resizeMode="cover" style={styles.mythHero} imageStyle={styles.mythHeroImage}>
              <LinearGradient colors={['rgba(29,17,55,.04)', 'rgba(29,17,55,.72)']} style={StyleSheet.absoluteFill} />
              <View style={styles.mythOpenBadge}><Ionicons name="lock-open" size={12} color="#FFFFFF" /><Text style={styles.mythOpenBadgeText}>神話 解放</Text></View>
              <View style={styles.mythIdentity}><Text style={styles.mythLineageName}>{mythLineage.name}</Text><Text style={styles.mythTitle}>{mythLineage.mythTitle}</Text></View>
            </ImageBackground>
            <View style={styles.scrollMessage}><View style={styles.scrollRoll} /><Text style={styles.scrollKicker}>新しい物語とのご縁</Text><Text style={styles.scrollText}>{mythLineage.myth[0]}</Text><View style={[styles.scrollRoll, styles.scrollRollBottom]} /></View>
            <Pressable accessibilityRole="button" accessibilityLabel={`${mythLineage.mythTitle}を読む`} onPress={() => finishMythEvent(true)} style={({ pressed }) => [styles.unlockPrimary, pressed && styles.pressed]}><LinearGradient colors={gradients.primary} style={StyleSheet.absoluteFill} /><Ionicons name="book-outline" size={19} color="#FFFFFF" /><Text style={styles.unlockPrimaryText}>神話を読む</Text><Ionicons name="arrow-forward" size={18} color="#FFFFFF" /></Pressable>
            <Pressable accessibilityRole="button" onPress={() => finishMythEvent(false)} style={styles.unlockLater}><Text style={styles.unlockLaterText}>あとで読む</Text></Pressable>
          </View>
        </SafeAreaView>
      </View>}
    </Modal>
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
  unlockOverlay: { flex: 1, overflow: 'hidden' }, unlockSafe: { flex: 1, zIndex: 2, padding: 20, alignItems: 'center', justifyContent: 'center' },
  unlockHalo: { position: 'absolute', zIndex: 0, alignSelf: 'center', top: '17%', width: 440, height: 440, borderRadius: 220, borderWidth: 2, borderColor: 'rgba(255,221,129,.8)', backgroundColor: 'rgba(255,255,255,.1)' }, unlockHaloInner: { position: 'absolute', inset: 44, borderRadius: 176, borderWidth: 1, borderColor: 'rgba(255,255,255,.65)' },
  unlockParticle: { position: 'absolute', zIndex: 1, borderRadius: 2, boxShadow: '0px 0px 12px rgba(255,255,255,.9)' },
  unlockEventCard: { width: '100%', maxWidth: 420, padding: 18, alignItems: 'center', borderRadius: 32, backgroundColor: 'rgba(255,250,255,.96)', borderWidth: 2, borderColor: 'rgba(255,255,255,.95)', boxShadow: glow.strong },
  unlockCrest: { height: 25, marginTop: -7, marginBottom: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }, unlockCrestWing: { width: 42, height: 1.5, borderRadius: 1, backgroundColor: '#E9B74E', transform: [{ rotate: '8deg' }] }, unlockCrestWingRight: { transform: [{ rotate: '-8deg' }] },
  unlockEventKickerRow: { flexDirection: 'row', alignItems: 'center', gap: 7 }, unlockEventKicker: { fontFamily: fonts.displayHeavy, fontSize: 19, letterSpacing: 2.2, color: colors.accent }, unlockEventCaption: { marginTop: 5, marginBottom: 14, fontFamily: fonts.bold, fontSize: 10, color: colors.violet },
  unlockPortraitFrame: { width: '100%', aspectRatio: 1, overflow: 'hidden', borderRadius: 25, borderWidth: 3, borderColor: '#FFFFFF', boxShadow: glow.pink }, unlockPortrait: { flex: 1, justifyContent: 'flex-end' }, unlockPortraitImage: { borderRadius: 22 },
  newBadge: { position: 'absolute', top: 13, right: 13, minHeight: 29, paddingHorizontal: 11, borderRadius: 15, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.accent, borderWidth: 1, borderColor: '#FFFFFF' }, newBadgeText: { fontFamily: fonts.bold, fontSize: 9, letterSpacing: 1, color: '#FFFFFF' },
  unlockIdentity: { padding: 16 }, unlockDeity: { fontFamily: fonts.displayHeavy, fontSize: 27, color: '#FFFFFF', textShadowColor: 'rgba(20,10,45,.7)', textShadowRadius: 8 }, unlockBlessing: { marginTop: 3, fontFamily: fonts.bold, fontSize: 11, color: '#FFFFFF' }, unlockMessage: { marginTop: 13, paddingHorizontal: 8, fontFamily: fonts.regular, fontSize: 11, lineHeight: 19, color: colors.inkSoft, textAlign: 'center' },
  unlockPrimary: { width: '100%', minHeight: 52, marginTop: 15, overflow: 'hidden', borderRadius: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: glow.pink }, unlockPrimaryText: { fontFamily: fonts.bold, fontSize: 13, color: '#FFFFFF' }, unlockLater: { minHeight: 40, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' }, unlockLaterText: { fontFamily: fonts.bold, fontSize: 10, color: colors.violet },
  mythOverlay: { flex: 1, overflow: 'hidden' }, mythParticle: { position: 'absolute', borderRadius: 2, opacity: .8, boxShadow: '0px 0px 12px rgba(255,255,255,.85)' },
  mythEventCard: { width: '100%', maxWidth: 420, padding: 18, alignItems: 'center', borderRadius: 32, backgroundColor: 'rgba(255,252,246,.97)', borderWidth: 2, borderColor: 'rgba(255,255,255,.96)', boxShadow: glow.strong },
  mythSeal: { width: 48, height: 48, marginTop: -40, marginBottom: 7, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.violet, borderWidth: 3, borderColor: '#FFF3CA', boxShadow: '0px 0px 22px rgba(255,218,119,.6)' }, mythEventKicker: { fontFamily: fonts.displayHeavy, fontSize: 18, letterSpacing: 1.8, color: colors.violet }, mythEventCaption: { marginTop: 4, marginBottom: 13, fontFamily: fonts.bold, fontSize: 10, color: colors.accent },
  mythHero: { width: '100%', aspectRatio: 1.45, overflow: 'hidden', justifyContent: 'flex-end', borderRadius: 23, borderWidth: 3, borderColor: '#FFFFFF', boxShadow: glow.pink }, mythHeroImage: { borderRadius: 20 }, mythOpenBadge: { position: 'absolute', top: 12, right: 12, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.accent }, mythOpenBadgeText: { fontFamily: fonts.bold, fontSize: 9, color: '#FFFFFF' }, mythIdentity: { padding: 15 }, mythLineageName: { fontFamily: fonts.bold, fontSize: 10, color: 'rgba(255,255,255,.8)' }, mythTitle: { marginTop: 2, fontFamily: fonts.displayHeavy, fontSize: 22, color: '#FFFFFF', textShadowColor: 'rgba(20,10,45,.8)', textShadowRadius: 7 },
  scrollMessage: { width: '94%', marginTop: 12, paddingHorizontal: 15, paddingVertical: 12, backgroundColor: '#FFF9E9', borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#E9D29A' }, scrollRoll: { position: 'absolute', left: -5, right: -5, top: -4, height: 8, borderRadius: 4, backgroundColor: '#E2C27D' }, scrollRollBottom: { top: undefined, bottom: -4 }, scrollKicker: { fontFamily: fonts.bold, fontSize: 8, letterSpacing: 1.2, color: '#9A6A29' }, scrollText: { marginTop: 5, fontFamily: fonts.regular, fontSize: 10, lineHeight: 17, color: colors.inkSoft },
  primary: { width: '100%', minHeight: 52, marginTop: 'auto', overflow: 'hidden', borderRadius: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: glow.pink }, primaryText: { flex: 1, textAlign: 'center', marginLeft: 18, fontFamily: fonts.bold, fontSize: 13, color: '#FFFFFF' }, secondary: { minHeight: 42, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' }, secondaryText: { fontFamily: fonts.bold, fontSize: 11, color: colors.violet }, pressed: { opacity: .8, transform: [{ scale: .98 }] },
});
