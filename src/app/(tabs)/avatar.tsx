import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BLESSINGS, type BlessingId, type EquipmentId } from '@/avatar/catalog';
import { PixelAvatar } from '@/components/AvatarPreview';
import { KamiLoadingScreen } from '@/components/KamiLoadingScreen';
import { DreamyBackground, Sparkle } from '@/components/ui';
import { getAvatarPreferences, getJourneyStats, saveAvatarPreferences } from '@/db/repo';
import { colors, fonts, glow, gradients } from '@/theme';

export default function AvatarScreen() {
  const db = useSQLiteContext();
  const [visits, setVisits] = useState<number | null>(null);
  const [selected, setSelected] = useState<BlessingId>('amaterasu');
  const [equipment, setEquipment] = useState<EquipmentId[]>([]);
  const [saving, setSaving] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    Promise.all([getAvatarPreferences(db), getJourneyStats(db)]).then(([preferences, stats]) => {
      if (!active) return;
      if (BLESSINGS.some((item) => item.id === preferences.blessing)) setSelected(preferences.blessing as BlessingId);
      setEquipment(preferences.equipment as EquipmentId[]);
      setVisits(stats.visitCount);
    });
    return () => { active = false; };
  }, [db]));

  const guide = BLESSINGS.find((item) => item.id === selected) ?? BLESSINGS[0];
  async function save() {
    setSaving(true);
    try {
      await saveAvatarPreferences(db, { blessing: selected, equipment });
      setConfirmed(true);
    } catch (e) {
      Alert.alert('保存できませんでした', String(e));
    } finally { setSaving(false); }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <DreamyBackground />
      {visits === null && <KamiLoadingScreen variant="loading" message="神さまとのご縁をたどっています…" />}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topbar}>
          <Pressable accessibilityRole="button" accessibilityLabel="図鑑へ戻る" onPress={() => router.back()} style={styles.back}><Ionicons name="chevron-back" size={23} color={colors.ink} /></Pressable>
          <Text style={styles.topTitle}>おともを選ぶ</Text><View style={styles.back} />
        </View>
        <View style={styles.hero}>
          <Text style={styles.kicker}>YOUR KAMI GUIDE</Text>
          <View style={styles.titleRow}><Text style={styles.title}>{guide.invocation}</Text><Sparkle size={18} /></View>
          <Text style={styles.subtitle}>獲得した神さまから、旅のおともをひとり選べます。</Text>
          <PixelAvatar blessing={guide} equipment={[]} size={154} />
          <Text style={styles.deity}>{guide.deity}</Text>
        </View>
        <View style={styles.list}>
          {BLESSINGS.map((item) => {
            const unlocked = (visits ?? 0) >= item.threshold;
            const active = selected === item.id;
            return <Pressable key={item.id} disabled={!unlocked} accessibilityRole="radio" accessibilityState={{ selected: active, disabled: !unlocked }} onPress={() => setSelected(item.id)} style={[styles.option, active && styles.optionActive, !unlocked && styles.optionLocked]}>
              {unlocked ? <PixelAvatar blessing={item} equipment={[]} size={68} /> : <View style={styles.hiddenGuide}><Ionicons name="lock-closed" size={22} color={colors.muted} /></View>}
              <View style={styles.optionCopy}><Text style={styles.optionName}>{unlocked ? item.invocation : 'まだ見ぬ神さま'}</Text><Text style={styles.optionMeta}>{unlocked ? item.deity : `あと${item.threshold - (visits ?? 0)}回の参拝`}</Text></View>
              <Ionicons name={active ? 'checkmark-circle' : unlocked ? 'ellipse-outline' : 'lock-closed'} size={22} color={active ? colors.accent : colors.muted} />
            </Pressable>;
          })}
        </View>
        <Pressable accessibilityRole="button" disabled={saving} onPress={save} style={({ pressed }) => [styles.save, pressed && styles.pressed]}>
          <LinearGradient colors={gradients.primary} style={StyleSheet.absoluteFill} /><Ionicons name="sparkles" size={18} color="#FFFFFF" /><Text style={styles.saveText}>{saving ? '保存中…' : 'この神さまと一緒にめぐる'}</Text>
        </Pressable>
      </ScrollView>
      <Modal visible={confirmed} transparent animationType="fade" onRequestClose={() => setConfirmed(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable accessibilityRole="button" accessibilityLabel="閉じる" onPress={() => setConfirmed(false)} style={StyleSheet.absoluteFill} />
          <View style={styles.confirmCard}>
            <LinearGradient colors={[guide.pale, '#FFFFFF', '#FFF1FA']} locations={[0, .48, 1]} style={StyleSheet.absoluteFill} />
            <View style={[styles.orbit, styles.orbitOne, { borderColor: guide.color }]} />
            <View style={[styles.orbit, styles.orbitTwo, { borderColor: guide.color }]} />
            <Text style={styles.confirmKicker}>KAMI GUIDE CONNECTED</Text>
            <View style={styles.confirmTitleRow}><Sparkle size={15} color={guide.color} /><Text style={styles.confirmTitle}>おともを選びました</Text><Sparkle size={15} color={guide.color} /></View>
            <View style={[styles.guideStage, { backgroundColor: `${guide.color}18` }]}>
              <View style={[styles.pixelGlow, { backgroundColor: guide.color }]} />
              <PixelAvatar blessing={guide} equipment={[]} size={176} />
              <View style={[styles.connectedBadge, { backgroundColor: guide.deep }]}><Ionicons name="sparkles" size={12} color="#FFFFFF" /><Text style={styles.connectedText}>ご縁がつながりました</Text></View>
            </View>
            <Text style={styles.confirmName}>{guide.invocation}</Text>
            <Text style={[styles.confirmDeity, { color: guide.deep }]}>{guide.deity}</Text>
            <Text style={styles.confirmMessage}>{guide.story}{'\n'}これからの神社めぐりを一緒に歩みます。</Text>
            <Pressable accessibilityRole="button" onPress={() => { setConfirmed(false); router.replace('/'); }} style={({ pressed }) => [styles.confirmPrimary, pressed && styles.pressed]}>
              <LinearGradient colors={gradients.primary} style={StyleSheet.absoluteFill} /><Ionicons name="home" size={17} color="#FFFFFF" /><Text style={styles.confirmPrimaryText}>ホームで会う</Text><Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => setConfirmed(false)} style={styles.confirmSecondary}><Text style={styles.confirmSecondaryText}>ほかの神さまも見る</Text></Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper }, content: { padding: 18, paddingBottom: 44, gap: 14 },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, back: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,.82)', borderWidth: 1, borderColor: colors.line }, topTitle: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  hero: { alignItems: 'center', padding: 20, borderRadius: 28, backgroundColor: 'rgba(255,255,255,.78)', borderWidth: 1, borderColor: colors.line, boxShadow: glow.soft }, kicker: { fontFamily: fonts.bold, fontSize: 9, letterSpacing: 1.8, color: colors.violet }, titleRow: { marginTop: 3, flexDirection: 'row', alignItems: 'center', gap: 5 }, title: { fontFamily: fonts.displayHeavy, fontSize: 27, color: colors.ink }, subtitle: { marginTop: 5, marginBottom: 2, fontFamily: fonts.regular, fontSize: 11, color: colors.muted, textAlign: 'center' }, deity: { marginTop: -8, fontFamily: fonts.bold, fontSize: 11, color: colors.accentOnTint },
  list: { gap: 8 }, option: { minHeight: 84, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 21, backgroundColor: 'rgba(255,255,255,.78)', borderWidth: 1.5, borderColor: colors.line }, optionActive: { borderColor: colors.accent, backgroundColor: colors.accentTint }, optionLocked: { backgroundColor: 'rgba(255,255,255,.55)' }, hiddenGuide: { width: 68, height: 68, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.track, borderWidth: 1, borderColor: colors.lineStrong }, optionCopy: { flex: 1 }, optionName: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink }, optionMeta: { marginTop: 3, fontFamily: fonts.regular, fontSize: 10, color: colors.muted },
  save: { minHeight: 52, overflow: 'hidden', borderRadius: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, boxShadow: glow.pink }, saveText: { fontFamily: fonts.bold, fontSize: 13, color: '#FFFFFF' }, pressed: { opacity: .82, transform: [{ scale: .98 }] },
  modalBackdrop: { flex: 1, padding: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(49,31,86,.48)' },
  confirmCard: { width: '100%', maxWidth: 390, overflow: 'hidden', alignItems: 'center', padding: 22, paddingTop: 26, borderRadius: 32, borderWidth: 2, borderColor: 'rgba(255,255,255,.95)', boxShadow: glow.strong },
  orbit: { position: 'absolute', borderWidth: 1, opacity: .22, transform: [{ rotate: '-14deg' }] }, orbitOne: { width: 280, height: 92, top: 145, borderRadius: 140 }, orbitTwo: { width: 230, height: 72, top: 160, borderRadius: 115, transform: [{ rotate: '18deg' }] },
  confirmKicker: { fontFamily: fonts.bold, fontSize: 8, letterSpacing: 1.8, color: colors.violet }, confirmTitleRow: { marginTop: 7, flexDirection: 'row', alignItems: 'center', gap: 7 }, confirmTitle: { fontFamily: fonts.displayHeavy, fontSize: 22, color: colors.ink },
  guideStage: { width: 210, height: 194, marginTop: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 105, borderWidth: 1.5, borderColor: 'rgba(255,255,255,.9)' }, pixelGlow: { position: 'absolute', width: 116, height: 48, bottom: 18, borderRadius: 58, opacity: .22, boxShadow: '0px 0px 28px rgba(232,70,143,.48)' }, connectedBadge: { position: 'absolute', bottom: -3, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, borderWidth: 2, borderColor: '#FFFFFF' }, connectedText: { fontFamily: fonts.bold, fontSize: 9, color: '#FFFFFF' },
  confirmName: { marginTop: 15, fontFamily: fonts.displayHeavy, fontSize: 24, color: colors.ink }, confirmDeity: { marginTop: 1, fontFamily: fonts.bold, fontSize: 11 }, confirmMessage: { marginTop: 9, fontFamily: fonts.regular, fontSize: 11, lineHeight: 19, color: colors.inkSoft, textAlign: 'center' },
  confirmPrimary: { width: '100%', minHeight: 52, marginTop: 18, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 26, boxShadow: glow.pink }, confirmPrimaryText: { flex: 1, fontFamily: fonts.bold, fontSize: 13, color: '#FFFFFF', textAlign: 'center', marginLeft: 17 }, confirmSecondary: { minHeight: 42, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' }, confirmSecondaryText: { fontFamily: fonts.bold, fontSize: 11, color: colors.muted },
});
