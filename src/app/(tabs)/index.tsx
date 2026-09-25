import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Image, ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BLESSINGS, type BlessingId, type EquipmentId } from '@/avatar/catalog';
import { PixelAvatar } from '@/components/AvatarPreview';
import { Sakura, Torii } from '@/components/shrine';
import { GlassCard, PixelWordmark, Sparkle } from '@/components/ui';
import { getAvatarPreferences, getCurrentBook, listBookEntries } from '@/db/repo';
import type { Book, GoshuinEntry } from '@/db/types';
import { formatDot } from '@/lib/dates';
import { imageUri } from '@/lib/images';
import { colors, fonts, glow, gradients, spacing } from '@/theme';

const hero = require('../../../assets/kami-megu-home-hero.png');

export default function HomeScreen() {
  const db = useSQLiteContext();
  const [book, setBook] = useState<Book | null>(null);
  const [latest, setLatest] = useState<GoshuinEntry | null | undefined>(undefined);
  const [avatar, setAvatar] = useState<{ blessing: BlessingId; equipment: EquipmentId[] }>({ blessing: 'amaterasu', equipment: ['magatama', 'omamori', 'shide', 'haori'] });

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const current = await getCurrentBook(db);
        const [entries, preferences] = await Promise.all([listBookEntries(db, current.id), getAvatarPreferences(db)]);
        if (!active) return;
        setBook(current);
        setLatest(entries.at(-1) ?? null);
        setAvatar({
          blessing: (BLESSINGS.some((item) => item.id === preferences.blessing) ? preferences.blessing : 'amaterasu') as BlessingId,
          equipment: preferences.equipment.filter((id): id is EquipmentId => ['magatama', 'omamori', 'shide', 'fox-mask', 'kagura-bell', 'sakaki', 'haori'].includes(id)),
        });
      })();
      return () => { active = false; };
    }, [db]),
  );

  return (
    <View style={styles.screen}>
      <ImageBackground source={hero} resizeMode="cover" style={styles.hero} imageStyle={styles.heroImage}>
        <LinearGradient colors={['rgba(255,244,252,0.08)', 'rgba(255,237,249,0.12)', 'rgba(255,247,252,0.94)']} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
        <SafeAreaView edges={['top']} style={styles.safe}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} bounces={false}>
            <View style={styles.topbar}>
              <View>
                <PixelWordmark />
                <Text style={styles.kana}>カ ミ め ぐ</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="バックアップ" onPress={() => router.push('/backup')} style={({ pressed }) => [styles.roundButton, pressed && styles.pressed]}>
                <Ionicons name="cloud-upload-outline" size={21} color={colors.ink} />
              </Pressable>
            </View>

            <View style={styles.copyBlock}>
              <View style={styles.copyAccent} />
              <Text style={styles.copy}>神さまって、{`\n`}意外と近くにいる。</Text>
              <Sparkle size={17} color={colors.violet} style={styles.copySparkle} />
            </View>

            <View style={styles.spacer}>
              <Pressable accessibilityRole="button" accessibilityLabel="マイアバターを編集する" onPress={() => router.push('/avatar')} style={({ pressed }) => [styles.homeAvatar, pressed && styles.pressed]}>
                <PixelAvatar blessing={BLESSINGS.find((item) => item.id === avatar.blessing) ?? BLESSINGS[0]} equipment={avatar.equipment} size={112} />
                <View style={styles.avatarLabel}><Text style={styles.avatarLabelText}>MY AVATAR</Text><Ionicons name="chevron-forward" size={12} color="#FFFFFF" /></View>
              </Pressable>
            </View>

            <Pressable accessibilityRole="button" accessibilityLabel="参拝を記録する" onPress={() => router.push('/record')} style={({ pressed }) => [styles.questionPill, pressed && styles.pressed]}>
              <View style={styles.questionIcon}><Torii size={27} /></View>
              <Text style={styles.questionText}>きょうは、どの神さまに会いにいく？</Text>
              <LinearGradient colors={gradients.primary} style={styles.arrowCircle}>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </LinearGradient>
            </Pressable>

            <GlassCard style={styles.memoryCard}>
              <View style={styles.cardHeading}>
                <View>
                  <Text style={styles.eyebrow}>YOUR LATEST MEGU</Text>
                  <Text style={styles.cardTitle}>{latest ? 'さいきんの参拝' : 'はじめての参拝へ'}</Text>
                </View>
                <Sakura size={23} />
              </View>

              {latest === undefined ? (
                <View style={styles.loadingLine} />
              ) : latest ? (
                <Pressable accessibilityRole="button" accessibilityLabel={`${latest.shrineName}の御朱印を見る`} onPress={() => router.push(`/goshuin/${latest.id}`)} style={({ pressed }) => [styles.latestRow, pressed && styles.pressed]}>
                  <Image source={{ uri: imageUri(latest.imageFile) }} style={styles.thumb} resizeMode="cover" />
                  <View style={styles.latestText}>
                    <Text style={styles.shrineName} numberOfLines={1}>{latest.shrineName}</Text>
                    <View style={styles.metaRow}>
                      <Ionicons name="calendar-outline" size={13} color={colors.accent} />
                      <Text style={styles.meta}>{formatDot(latest.visitedOn)}</Text>
                    </View>
                    <View style={styles.tag}><Text style={styles.tagText}>{latest.shrineKind === 'temple' ? 'お寺' : '神社'}めぐり</Text></View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.violet} />
                </Pressable>
              ) : (
                <View style={styles.emptyRow}>
                  <View style={styles.emptyTorii}><Torii size={45} /></View>
                  <View style={styles.latestText}>
                    <Text style={styles.shrineName}>ご縁を記録しよう</Text>
                    <Text style={styles.emptyText}>写真といっしょに、最初の参拝を残せます。</Text>
                  </View>
                </View>
              )}

              <View style={styles.actions}>
                <Pressable accessibilityRole="button" accessibilityLabel="御朱印帳を開く" onPress={() => router.push('/book')} style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed]}>
                  <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                  <Ionicons name="book-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.primaryActionText}>{book?.name ?? '御朱印帳'}をひらく</Text>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel="地図を開く" onPress={() => router.push('/map')} style={({ pressed }) => [styles.mapAction, pressed && styles.pressed]}>
                  <Ionicons name="map-outline" size={19} color={colors.inkSoft} />
                </Pressable>
              </View>
            </GlassCard>
          </ScrollView>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper }, hero: { flex: 1 }, heroImage: { opacity: 0.98 }, safe: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  topbar: { paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  kana: { marginTop: -1, marginLeft: 3, color: colors.accent, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 3 },
  roundButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.88)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center', boxShadow: glow.soft },
  pressed: { opacity: 0.76, transform: [{ scale: 0.98 }] },
  copyBlock: { marginTop: 38, alignSelf: 'flex-start', position: 'relative', paddingLeft: 14 },
  copyAccent: { position: 'absolute', left: 0, top: 3, bottom: 3, width: 4, borderRadius: 2, backgroundColor: colors.accent },
  copy: { color: colors.ink, fontFamily: fonts.displayHeavy, fontSize: 19, lineHeight: 29, textShadowColor: 'rgba(255,255,255,0.9)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 8 },
  copySparkle: { position: 'absolute', right: -22, top: 1 }, spacer: { flex: 1, minHeight: 210, justifyContent: 'flex-end', alignItems: 'flex-end' },
  homeAvatar: { marginRight: -4, marginBottom: 6, alignItems: 'center' }, avatarLabel: { marginTop: -13, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: colors.accent, flexDirection: 'row', alignItems: 'center', gap: 3, boxShadow: glow.soft }, avatarLabelText: { fontFamily: fonts.bold, fontSize: 8, color: '#FFFFFF', letterSpacing: .7 },
  questionPill: { minHeight: 58, padding: 7, borderRadius: 29, backgroundColor: 'rgba(255,255,255,0.9)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.95)', flexDirection: 'row', alignItems: 'center', gap: 9, boxShadow: glow.pink },
  questionIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentTint },
  questionText: { flex: 1, fontFamily: fonts.bold, fontSize: 12, color: colors.ink }, arrowCircle: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  memoryCard: { marginTop: 12 }, cardHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  eyebrow: { fontFamily: fonts.display, fontSize: 10, letterSpacing: 1.7, color: colors.violet }, cardTitle: { marginTop: 2, fontFamily: fonts.displayHeavy, fontSize: 18, color: colors.ink },
  latestRow: { minHeight: 92, flexDirection: 'row', alignItems: 'center', gap: 12 }, thumb: { width: 78, height: 78, borderRadius: 16, backgroundColor: colors.track, borderWidth: 2, borderColor: '#FFFFFF' },
  latestText: { flex: 1, gap: 4 }, shrineName: { fontFamily: fonts.display, fontSize: 17, color: colors.ink }, metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 }, meta: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted },
  tag: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9, backgroundColor: colors.accentTint }, tagText: { fontFamily: fonts.bold, fontSize: 10, color: colors.accentOnTint },
  emptyRow: { minHeight: 88, flexDirection: 'row', alignItems: 'center', gap: 14 }, emptyTorii: { width: 72, height: 72, borderRadius: 18, backgroundColor: colors.accentTint, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.muted }, loadingLine: { height: 88, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.45)' },
  actions: { marginTop: 14, flexDirection: 'row', gap: 9 }, primaryAction: { flex: 1, minHeight: 48, borderRadius: 24, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, boxShadow: glow.pink },
  primaryActionText: { color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 13 }, mapAction: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.lineStrong, alignItems: 'center', justifyContent: 'center' },
});
