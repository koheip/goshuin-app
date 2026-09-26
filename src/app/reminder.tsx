import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, DreamyBackground, Sparkle } from '@/components/ui';
import { getReminderPreferences, saveReminderPreferences } from '@/db/repo';
import { cancelVisitReminder, scheduleVisitReminder } from '@/notifications/reminder';
import { colors, fonts, glow, radius } from '@/theme';

const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
const hours = [7, 8, 9, 10, 12, 18, 20];
const minutes = [0, 30];

export default function ReminderScreen() {
  const db = useSQLiteContext();
  const [enabled, setEnabled] = useState(false);
  const [weekday, setWeekday] = useState(7);
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [notificationId, setNotificationId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getReminderPreferences(db).then((value) => {
      setEnabled(value.enabled);
      setWeekday(value.weekday);
      setHour(value.hour);
      setMinute(value.minute);
      setNotificationId(value.notificationId);
    });
  }, [db]);

  async function save() {
    setSaving(true);
    try {
      await cancelVisitReminder(notificationId);
      const nextId = enabled ? await scheduleVisitReminder(weekday, hour, minute) : null;
      await saveReminderPreferences(db, { enabled, weekday, hour, minute, notificationId: nextId });
      setNotificationId(nextId);
      Alert.alert(enabled ? 'リマインダーを設定しました' : 'リマインダーをOFFにしました', enabled ? `毎週${weekdays[weekday - 1]}曜日 ${formatTime(hour, minute)}にお知らせします。` : undefined);
    } catch (error) {
      Alert.alert('設定できませんでした', error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <DreamyBackground />
      <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="戻る" onPress={() => router.back()} style={styles.back}><Ionicons name="chevron-back" size={23} color={colors.ink} /></Pressable><View style={styles.headerCopy}><Text style={styles.kicker}>VISIT REMINDER</Text><View style={styles.titleRow}><Text style={styles.title}>参拝リマインダー</Text><Sparkle size={17} /></View></View></View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <LinearGradient colors={['#FFE1F1', '#E8E0FF', '#DCF5FF']} style={styles.hero}>
          <View style={styles.bell}><Ionicons name="notifications" size={37} color="#FFFFFF" /></View>
          <Text style={styles.heroTitle}>今週も、ご縁を結びに。</Text>
          <Text style={styles.heroBody}>決めた曜日と時刻に、神社へのお参りをそっとお知らせします。</Text>
        </LinearGradient>

        <View style={styles.card}>
          <View style={styles.toggleRow}><View><Text style={styles.cardTitle}>毎週お知らせする</Text><Text style={styles.cardCaption}>{enabled ? 'リマインダーはONです' : '現在はOFFです'}</Text></View><Pressable accessibilityRole="switch" accessibilityState={{ checked: enabled }} onPress={() => setEnabled((value) => !value)} style={[styles.switch, enabled && styles.switchOn]}><View style={[styles.knob, enabled && styles.knobOn]} /></Pressable></View>
        </View>

        <View style={[styles.card, !enabled && styles.disabled]}>
          <Text style={styles.cardTitle}>曜日</Text>
          <View style={styles.weekRow}>{weekdays.map((label, index) => <Pressable key={label} disabled={!enabled} onPress={() => setWeekday(index + 1)} style={[styles.day, weekday === index + 1 && styles.dayActive]}><Text style={[styles.dayText, weekday === index + 1 && styles.dayTextActive]}>{label}</Text></Pressable>)}</View>
          <View style={styles.divider} />
          <Text style={styles.cardTitle}>時刻</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timeRow}>{hours.map((value) => <Pressable key={value} disabled={!enabled} onPress={() => setHour(value)} style={[styles.time, hour === value && styles.timeActive]}><Text style={[styles.timeText, hour === value && styles.timeTextActive]}>{formatTime(value, minute)}</Text></Pressable>)}</ScrollView>
          <View style={styles.minuteRow}>{minutes.map((value) => <Pressable key={value} disabled={!enabled} onPress={() => setMinute(value)} style={[styles.minute, minute === value && styles.minuteActive]}><Text style={[styles.minuteText, minute === value && styles.minuteTextActive]}>{value === 0 ? 'ちょうど' : '30分'}</Text></Pressable>)}</View>
        </View>

        <View style={styles.preview}><Ionicons name="notifications-outline" size={20} color={colors.accent} /><View style={styles.previewCopy}><Text style={styles.previewLabel}>通知プレビュー</Text><Text style={styles.previewTitle}>神さまに会いにいきませんか？ ⛩️</Text><Text style={styles.previewBody}>近くの神社へ、今週のご縁を結びにいきましょう。</Text></View></View>
        <Button label="設定を保存する" onPress={save} loading={saving} icon={<Ionicons name="checkmark" size={18} color="#FFFFFF" />} />
      </ScrollView>
    </SafeAreaView>
  );
}

function formatTime(hour: number, minute: number) { return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`; }

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper }, header: { paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 11 }, back: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,.8)', borderWidth: 1, borderColor: colors.line }, headerCopy: { flex: 1 }, kicker: { fontFamily: fonts.bold, fontSize: 8, letterSpacing: 1.5, color: colors.violet }, titleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 }, title: { fontFamily: fonts.displayHeavy, fontSize: 23, color: colors.ink }, content: { padding: 16, paddingBottom: 40, gap: 13 },
  hero: { minHeight: 190, borderRadius: 28, padding: 22, justifyContent: 'flex-end', overflow: 'hidden', boxShadow: glow.pink }, bell: { position: 'absolute', top: 19, right: 22, width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,111,175,.75)', borderWidth: 2, borderColor: '#FFFFFF' }, heroTitle: { fontFamily: fonts.displayHeavy, fontSize: 22, color: colors.ink }, heroBody: { width: '78%', marginTop: 7, fontFamily: fonts.regular, fontSize: 11, lineHeight: 18, color: colors.inkSoft },
  card: { padding: 17, borderRadius: radius.lg, backgroundColor: 'rgba(255,255,255,.82)', borderWidth: 1, borderColor: colors.line, boxShadow: glow.soft }, disabled: { opacity: .46 }, toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, cardTitle: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink }, cardCaption: { marginTop: 3, fontFamily: fonts.regular, fontSize: 10, color: colors.muted }, switch: { width: 52, height: 30, padding: 3, borderRadius: 15, backgroundColor: colors.track }, switchOn: { backgroundColor: colors.accent }, knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFFFFF', boxShadow: glow.soft }, knobOn: { marginLeft: 22 }, weekRow: { marginTop: 12, flexDirection: 'row', justifyContent: 'space-between' }, day: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.track }, dayActive: { backgroundColor: colors.accent }, dayText: { fontFamily: fonts.bold, fontSize: 11, color: colors.muted }, dayTextActive: { color: '#FFFFFF' }, divider: { height: 1, marginVertical: 16, backgroundColor: colors.line }, timeRow: { gap: 7, paddingVertical: 11 }, time: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 16, backgroundColor: colors.track }, timeActive: { backgroundColor: colors.violet }, timeText: { fontFamily: fonts.bold, fontSize: 10, color: colors.muted }, timeTextActive: { color: '#FFFFFF' }, minuteRow: { flexDirection: 'row', gap: 7 }, minute: { flex: 1, paddingVertical: 9, borderRadius: 15, alignItems: 'center', backgroundColor: colors.track }, minuteActive: { backgroundColor: colors.accentTint, borderWidth: 1, borderColor: colors.accent }, minuteText: { fontFamily: fonts.bold, fontSize: 10, color: colors.muted }, minuteTextActive: { color: colors.accent },
  preview: { padding: 14, flexDirection: 'row', gap: 11, borderRadius: 20, backgroundColor: 'rgba(255,255,255,.72)', borderWidth: 1, borderColor: colors.line }, previewCopy: { flex: 1 }, previewLabel: { fontFamily: fonts.bold, fontSize: 8, color: colors.violet }, previewTitle: { marginTop: 3, fontFamily: fonts.bold, fontSize: 11, color: colors.ink }, previewBody: { marginTop: 2, fontFamily: fonts.regular, fontSize: 9, color: colors.muted },
});
