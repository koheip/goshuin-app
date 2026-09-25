import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { isTutorialComplete, setTutorialComplete } from '@/db/repo';
import { colors, fonts, glow } from '@/theme';

const slides = [
  { title: '神さまって、\n意外と近くにいる。', body: 'KAMI MEGUは、神社との出会いと\nあなたの参拝を残す巡礼ノートです。', label: 'WELCOME TO KAMI MEGU', icon: 'sparkles' as const, image: require('../../assets/kami-megu-home-hero.png') },
  { title: '近くの神社へ\n会いにいこう', body: '地図から気になる神社を見つけて、\n新しいご縁を結びましょう。', label: 'FIND YOUR SHRINE', icon: 'map' as const, image: require('../../assets/blessing-amaterasu.png') },
  { title: '参拝と御朱印を\nたいせつに記録', body: '写真や日付、感じたことを残して、\n自分だけの御朱印帳を育てます。', label: 'KEEP YOUR MEMORY', icon: 'book' as const, image: require('../../assets/blessing-okuninushi.png') },
  { title: 'ご縁が、新しい\n神さまを導く', body: '参拝を重ねると図鑑や加護、\nアバターアイテムが少しずつ開きます。', label: 'BEGIN YOUR PILGRIMAGE', icon: 'heart' as const, image: require('../../assets/blessing-inari.png') },
];

type TutorialContextValue = { replayTutorial: () => void };
const TutorialContext = createContext<TutorialContextValue>({ replayTutorial: () => undefined });

export function useTutorial() {
  return useContext(TutorialContext);
}

export function TutorialProvider({ children }: PropsWithChildren) {
  const db = useSQLiteContext();
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [page, setPage] = useState(0);

  useEffect(() => {
    let active = true;
    isTutorialComplete(db).then((complete) => {
      if (!active) return;
      setVisible(!complete);
      setReady(true);
    });
    return () => { active = false; };
  }, [db]);

  const finish = useCallback(async () => {
    await setTutorialComplete(db, true);
    setVisible(false);
    setPage(0);
  }, [db]);

  const replayTutorial = useCallback(() => {
    setPage(0);
    setVisible(true);
  }, []);

  const value = useMemo(() => ({ replayTutorial }), [replayTutorial]);
  const slide = slides[page];

  return (
    <TutorialContext.Provider value={value}>
      {children}
      {ready && visible && (
        <View style={styles.overlay}>
          <ImageBackground source={slide.image} resizeMode="cover" style={StyleSheet.absoluteFill}>
            <LinearGradient colors={['rgba(248,231,255,.12)', 'rgba(255,240,250,.35)', 'rgba(255,249,253,.98)']} locations={[0, .47, .78]} style={StyleSheet.absoluteFill} />
          </ImageBackground>
          <SafeAreaView style={styles.safe}>
            <View style={styles.topbar}>
              <Text style={styles.wordmark}>KAMI♡MEGU</Text>
              <Pressable accessibilityRole="button" onPress={finish} style={styles.skip}><Text style={styles.skipText}>スキップ</Text></Pressable>
            </View>
            <View style={styles.spacer} />
            <View style={styles.sheet}>
              <LinearGradient colors={['rgba(255,255,255,.96)', 'rgba(255,247,253,.92)']} style={StyleSheet.absoluteFill} />
              <View style={styles.eyebrow}><Ionicons name={slide.icon} size={14} color={colors.accent} /><Text style={styles.eyebrowText}>{slide.label}</Text></View>
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.body}>{slide.body}</Text>
              <View style={styles.dots}>{slides.map((_, index) => <View key={index} style={[styles.dot, index === page && styles.dotActive]} />)}</View>
              <View style={styles.actions}>
                {page > 0 && <Pressable accessibilityRole="button" onPress={() => setPage((current) => current - 1)} style={styles.back}><Ionicons name="arrow-back" size={18} color={colors.ink} /></Pressable>}
                <Pressable accessibilityRole="button" onPress={() => page === slides.length - 1 ? finish() : setPage((current) => current + 1)} style={styles.next}>
                  <LinearGradient colors={['#FF6FAF', '#B46FE8']} style={StyleSheet.absoluteFill} />
                  <Text style={styles.nextText}>{page === slides.length - 1 ? 'めぐりをはじめる' : 'つぎへ'}</Text><Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>
          </SafeAreaView>
        </View>
      )}
    </TutorialContext.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, zIndex: 1000, backgroundColor: colors.paper }, safe: { flex: 1, padding: 18 }, topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, wordmark: { fontFamily: fonts.displayHeavy, fontSize: 18, letterSpacing: 1.5, color: '#FFFFFF', textShadowColor: 'rgba(48,25,72,.55)', textShadowRadius: 8 }, skip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: 'rgba(255,255,255,.8)' }, skipText: { fontFamily: fonts.bold, fontSize: 11, color: colors.ink }, spacer: { flex: 1 }, sheet: { overflow: 'hidden', minHeight: 322, padding: 24, borderRadius: 32, borderWidth: 1.5, borderColor: 'rgba(255,255,255,.95)', boxShadow: glow.strong }, eyebrow: { flexDirection: 'row', alignItems: 'center', gap: 6 }, eyebrowText: { fontFamily: fonts.bold, fontSize: 8, letterSpacing: 1.5, color: colors.violet }, title: { marginTop: 12, fontFamily: fonts.displayHeavy, fontSize: 29, lineHeight: 39, color: colors.ink }, body: { marginTop: 11, fontFamily: fonts.regular, fontSize: 12, lineHeight: 21, color: colors.inkSoft }, dots: { marginTop: 18, flexDirection: 'row', gap: 6 }, dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.lineStrong }, dotActive: { width: 24, backgroundColor: colors.accent }, actions: { marginTop: 20, flexDirection: 'row', gap: 9 }, back: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.line }, next: { flex: 1, height: 48, overflow: 'hidden', borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, nextText: { fontFamily: fonts.bold, fontSize: 13, color: '#FFFFFF' },
});
