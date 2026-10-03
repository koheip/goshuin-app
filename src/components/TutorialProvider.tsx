import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { Animated, ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { isTutorialComplete, setTutorialComplete } from '@/db/repo';
import { colors, fonts, glow } from '@/theme';

const slides = [
  { chapter: '一', title: '神さまって、\n意外と近くにいる。', body: 'KAMI MEGUは、神社との出会いと\nあなたの参拝を残す巡礼ノートです。', label: 'WELCOME TO KAMI MEGU', icon: 'sparkles' as const, image: require('../../assets/kami-megu-home-hero.png'), guideTitle: 'まずは、めぐりを始めましょう', guideBody: '画面下のメニューから、いつでも神社さがし・記録・図鑑へ移動できます。', guideIcon: 'heart' as const },
  { chapter: '二', title: '近くの神社へ\n会いにいこう', body: '「めぐる」タブで、今いる場所の近くにある\n神社・お寺を近い順に探せます。', label: 'FIND YOUR SHRINE', icon: 'search' as const, image: require('../../assets/blessing-amaterasu.png'), guideTitle: '名前でも探せます', guideBody: '気になる場所は Google マップで開けます。「参拝を記録」から、そのまま記録も始められます。', guideIcon: 'navigate' as const },
  { chapter: '三', title: '参拝の思い出を\nそっと残そう', body: '参拝した日、写真、御朱印、ひとこと。\nその日の気持ちまで一緒に記録できます。', label: 'KEEP YOUR MEMORY', icon: 'camera' as const, image: require('../../assets/blessing-okuninushi.png'), guideTitle: '「参拝を記録」から残せます', guideBody: '御朱印がない日も大丈夫。写真だけ、メモだけでも参拝記録になります。', guideIcon: 'add-circle' as const },
  { chapter: '四', title: 'ご縁がつながり\n神話がひらく', body: '参拝を重ねると神さまや神社の物語が解放。\nあなただけの図鑑が育っていきます。', label: 'DISCOVER THE MYTHS', icon: 'book' as const, image: require('../../assets/kami-catalog-amaterasu-front-v1.png'), guideTitle: '解放演出を見逃さないで', guideBody: '新しいご縁が結ばれると特別な演出が発生。図鑑で神話を読み返せます。', guideIcon: 'lock-open' as const },
];

type TutorialContextValue = { replayTutorial: () => void };
const TutorialContext = createContext<TutorialContextValue>({ replayTutorial: () => undefined });

export function useTutorial() { return useContext(TutorialContext); }

export function TutorialProvider({ children }: PropsWithChildren) {
  const db = useSQLiteContext();
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [page, setPage] = useState(0);
  const [contentOpacity] = useState(() => new Animated.Value(0));
  const [contentY] = useState(() => new Animated.Value(28));
  const [imageScale] = useState(() => new Animated.Value(1.05));
  const [auraPulse] = useState(() => new Animated.Value(0));

  useEffect(() => {
    let active = true;
    isTutorialComplete(db).then((complete) => { if (active) { setVisible(!complete); setReady(true); } });
    return () => { active = false; };
  }, [db]);

  useEffect(() => {
    if (!visible) return;
    contentOpacity.setValue(0); contentY.setValue(28); imageScale.setValue(1.05);
    Animated.parallel([
      Animated.timing(contentOpacity, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.spring(contentY, { toValue: 0, damping: 16, stiffness: 115, useNativeDriver: true }),
      Animated.timing(imageScale, { toValue: 1, duration: 900, useNativeDriver: true }),
    ]).start();
  }, [contentOpacity, contentY, imageScale, page, visible]);

  useEffect(() => {
    if (!visible) return;
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(auraPulse, { toValue: 1, duration: 1700, useNativeDriver: true }),
      Animated.timing(auraPulse, { toValue: 0, duration: 1700, useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [auraPulse, visible]);

  const finish = useCallback(async () => { await setTutorialComplete(db, true); setVisible(false); setPage(0); }, [db]);
  const replayTutorial = useCallback(() => { setPage(0); setVisible(true); }, []);
  const value = useMemo(() => ({ replayTutorial }), [replayTutorial]);
  const slide = slides[page];
  const isLast = page === slides.length - 1;
  const progress = `${((page + 1) / slides.length) * 100}%` as `${number}%`;

  return (
    <TutorialContext.Provider value={value}>
      {children}
      {ready && visible && (
        <View style={styles.overlay}>
          <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale: imageScale }] }]}>
            <ImageBackground source={slide.image} resizeMode="cover" style={StyleSheet.absoluteFill}>
              <LinearGradient colors={['rgba(53,27,94,.08)', 'rgba(255,225,246,.22)', 'rgba(255,249,253,.98)']} locations={[0, .42, .79]} style={StyleSheet.absoluteFill} />
            </ImageBackground>
          </Animated.View>
          <Animated.View style={[styles.aura, { opacity: auraPulse.interpolate({ inputRange: [0, 1], outputRange: [.22, .48] }), transform: [{ scale: auraPulse.interpolate({ inputRange: [0, 1], outputRange: [.9, 1.12] }) }] }]} />
          <View pointerEvents="none" style={styles.petals}>
            <Text style={[styles.petal, styles.petalOne]}>✦</Text><Text style={[styles.petal, styles.petalTwo]}>❀</Text><Text style={[styles.petal, styles.petalThree]}>✧</Text>
          </View>
          <SafeAreaView style={styles.safe}>
            <View style={styles.topbar}>
              <View><Text style={styles.wordmark}>KAMI♡MEGU</Text><Text style={styles.topCaption}>はじめてのカミめぐ</Text></View>
              <Pressable accessibilityRole="button" onPress={finish} style={({ pressed }) => [styles.skip, pressed && styles.pressed]}><Text style={styles.skipText}>スキップ</Text></Pressable>
            </View>
            <View style={styles.chapterTrack}><View style={[styles.chapterProgress, { width: progress }]} /></View>
            <View style={styles.spacer} />
            <Animated.View style={[styles.sheetWrap, { opacity: contentOpacity, transform: [{ translateY: contentY }] }]}>
              <View style={styles.chapterBadge}><Text style={styles.chapterKanji}>{slide.chapter}</Text><Text style={styles.chapterCount}>{page + 1} / {slides.length}</Text></View>
              <View style={styles.sheet}>
                <LinearGradient colors={['rgba(255,255,255,.97)', 'rgba(255,246,252,.94)']} style={StyleSheet.absoluteFill} />
                <View style={styles.eyebrow}><Ionicons name={slide.icon} size={14} color={colors.accent} /><Text style={styles.eyebrowText}>{slide.label}</Text></View>
                <Text style={styles.title}>{slide.title}</Text><Text style={styles.body}>{slide.body}</Text>
                <View style={styles.guideCard}>
                  <LinearGradient colors={['rgba(255,231,246,.9)', 'rgba(235,231,255,.84)']} style={StyleSheet.absoluteFill} />
                  <View style={styles.guideIcon}><Ionicons name={slide.guideIcon} size={20} color={colors.accent} /></View>
                  <View style={styles.guideCopy}><Text style={styles.guideTitle}>{slide.guideTitle}</Text><Text style={styles.guideBody}>{slide.guideBody}</Text></View>
                </View>
                <View style={styles.footerRow}>
                  <View style={styles.dots}>{slides.map((_, index) => <View key={index} style={[styles.dot, index === page && styles.dotActive]} />)}</View>
                  <Text style={styles.swipeHint}>{isLast ? '準備完了' : 'つぎの案内へ'}</Text>
                </View>
                <View style={styles.actions}>
                  {page > 0 && <Pressable accessibilityRole="button" accessibilityLabel="前へ" onPress={() => setPage((current) => current - 1)} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><Ionicons name="arrow-back" size={19} color={colors.ink} /></Pressable>}
                  <Pressable accessibilityRole="button" onPress={() => isLast ? finish() : setPage((current) => current + 1)} style={({ pressed }) => [styles.next, pressed && styles.pressed]}>
                    <LinearGradient colors={isLast ? ['#FF5B9E', '#8D69E8'] : ['#FF79B5', '#B46FE8']} style={StyleSheet.absoluteFill} />
                    {isLast && <Ionicons name="sparkles" size={17} color="#FFFFFF" />}<Text style={styles.nextText}>{isLast ? 'カミめぐをはじめる' : 'つぎへ'}</Text><Ionicons name={isLast ? 'heart' : 'arrow-forward'} size={18} color="#FFFFFF" />
                  </Pressable>
                </View>
              </View>
            </Animated.View>
          </SafeAreaView>
        </View>
      )}
    </TutorialContext.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, zIndex: 1000, backgroundColor: colors.paper }, safe: { flex: 1, paddingHorizontal: 17, paddingTop: 8, paddingBottom: 14 },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, wordmark: { fontFamily: fonts.displayHeavy, fontSize: 19, letterSpacing: 1.6, color: '#FFFFFF', textShadowColor: 'rgba(48,25,72,.62)', textShadowRadius: 9 }, topCaption: { marginTop: 1, fontFamily: fonts.bold, fontSize: 8, letterSpacing: 1.2, color: 'rgba(255,255,255,.92)', textShadowColor: 'rgba(48,25,72,.5)', textShadowRadius: 6 },
  skip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18, backgroundColor: 'rgba(255,255,255,.86)', borderWidth: 1, borderColor: 'rgba(255,255,255,.95)' }, skipText: { fontFamily: fonts.bold, fontSize: 11, color: colors.ink },
  chapterTrack: { height: 4, marginTop: 14, overflow: 'hidden', borderRadius: 2, backgroundColor: 'rgba(255,255,255,.42)' }, chapterProgress: { height: 4, borderRadius: 2, backgroundColor: '#FF65A8' }, spacer: { flex: 1 },
  aura: { position: 'absolute', left: '24%', top: '13%', width: 210, height: 210, borderRadius: 105, backgroundColor: '#FFF3A9', boxShadow: '0 0 65px rgba(255,245,169,.9)' }, petals: { ...StyleSheet.absoluteFill }, petal: { position: 'absolute', color: 'rgba(255,255,255,.9)', textShadowColor: '#F690C3', textShadowRadius: 8 }, petalOne: { top: '17%', left: '10%', fontSize: 18, transform: [{ rotate: '-15deg' }] }, petalTwo: { top: '29%', right: '9%', fontSize: 23, transform: [{ rotate: '18deg' }] }, petalThree: { top: '42%', left: '14%', fontSize: 14 },
  sheetWrap: { position: 'relative', paddingTop: 16 }, chapterBadge: { position: 'absolute', zIndex: 2, top: 0, right: 22, minWidth: 54, height: 54, paddingHorizontal: 8, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#FFD5E9', boxShadow: glow.strong }, chapterKanji: { fontFamily: fonts.displayHeavy, fontSize: 18, lineHeight: 21, color: colors.accent }, chapterCount: { fontFamily: fonts.bold, fontSize: 7, color: colors.violet },
  sheet: { overflow: 'hidden', minHeight: 400, paddingHorizontal: 22, paddingTop: 23, paddingBottom: 19, borderRadius: 32, borderWidth: 1.5, borderColor: 'rgba(255,255,255,.96)', boxShadow: glow.strong }, eyebrow: { flexDirection: 'row', alignItems: 'center', gap: 6 }, eyebrowText: { fontFamily: fonts.bold, fontSize: 8, letterSpacing: 1.5, color: colors.violet }, title: { marginTop: 10, fontFamily: fonts.displayHeavy, fontSize: 27, lineHeight: 36, color: colors.ink }, body: { marginTop: 8, fontFamily: fonts.regular, fontSize: 11.5, lineHeight: 19, color: colors.inkSoft },
  guideCard: { marginTop: 14, minHeight: 74, overflow: 'hidden', padding: 12, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderColor: 'rgba(255,255,255,.92)' }, guideIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,.82)' }, guideCopy: { flex: 1, gap: 2 }, guideTitle: { fontFamily: fonts.bold, fontSize: 11.5, color: colors.ink }, guideBody: { fontFamily: fonts.regular, fontSize: 9.5, lineHeight: 15, color: colors.inkSoft },
  footerRow: { marginTop: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, dots: { flexDirection: 'row', gap: 6 }, dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.lineStrong }, dotActive: { width: 24, backgroundColor: colors.accent }, swipeHint: { fontFamily: fonts.bold, fontSize: 8, letterSpacing: .5, color: colors.muted }, actions: { marginTop: 13, flexDirection: 'row', gap: 9 }, back: { width: 49, height: 49, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.line }, next: { flex: 1, height: 49, overflow: 'hidden', borderRadius: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 10px 25px rgba(226,80,152,.28)' }, nextText: { fontFamily: fonts.bold, fontSize: 13, color: '#FFFFFF' }, pressed: { opacity: .72, transform: [{ scale: .98 }] },
});
