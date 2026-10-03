import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Animated, Keyboard, Linking, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Pressable } from '@/components/Pressable';
import { Button, DreamyBackground, Sparkle } from '@/components/ui';
import { getReminderPreferences, saveReminderPreferences } from '@/db/repo';
import { cancelVisitReminder, NotificationPermissionError, scheduleVisitReminder } from '@/notifications/reminder';
import { colors, fonts, glow, gradients, radius } from '@/theme';

const weekdays = ['日', '月', '火', '水', '木', '金', '土'];

// 保存したあとに出す結果。null なら出さない
type SavedResult =
  | { kind: 'on'; weekday: number; hour: number; minute: number }
  | { kind: 'off' }
  // 通知が許可されていない。端末の設定アプリへ案内する
  | { kind: 'denied' }
  | { kind: 'error'; title: string; message: string };

export default function ReminderScreen() {
  const db = useSQLiteContext();
  const [enabled, setEnabled] = useState(false);
  const [weekday, setWeekday] = useState(7);
  // 時刻は入力中の文字のまま持ち、保存するときに数字として確かめる
  const [hourText, setHourText] = useState('09');
  const [minuteText, setMinuteText] = useState('00');
  const [notificationId, setNotificationId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<SavedResult | null>(null);

  useEffect(() => {
    getReminderPreferences(db).then((value) => {
      setEnabled(value.enabled);
      setWeekday(value.weekday);
      setHourText(pad(value.hour));
      setMinuteText(pad(value.minute));
      setNotificationId(value.notificationId);
    });
  }, [db]);

  const hour = parsePart(hourText, 23);
  const minute = parsePart(minuteText, 59);

  async function save() {
    if (enabled && (hour === null || minute === null)) {
      Keyboard.dismiss();
      setResult({ kind: 'error', title: '時刻を確かめてください', message: '時は 0〜23、分は 0〜59 の数字で入力してください。' });
      return;
    }
    // オフにするときは、入力が途中でも保存できるようにする
    const h = hour ?? 9;
    const m = minute ?? 0;
    setSaving(true);
    try {
      // 新しい予約ができてから古い予約を消す（通知が許可されず失敗したとき、今の予約を残すため）
      const nextId = enabled ? await scheduleVisitReminder(weekday, h, m) : null;
      await cancelVisitReminder(notificationId);
      await saveReminderPreferences(db, { enabled, weekday, hour: h, minute: m, notificationId: nextId });
      setNotificationId(nextId);
      Keyboard.dismiss();
      setResult(enabled ? { kind: 'on', weekday, hour: h, minute: m } : { kind: 'off' });
    } catch (error) {
      Keyboard.dismiss();
      setResult(
        error instanceof NotificationPermissionError
          ? { kind: 'denied' }
          : { kind: 'error', title: '設定できませんでした', message: error instanceof Error ? error.message : String(error) },
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <DreamyBackground />
      <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="戻る" onPress={() => router.back()} style={styles.back}><Ionicons name="chevron-back" size={23} color={colors.ink} /></Pressable><View style={styles.headerCopy}><Text style={styles.kicker}>VISIT REMINDER</Text><View style={styles.titleRow}><Text style={styles.title}>参拝リマインダー</Text><Sparkle size={17} /></View></View></View>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.content}>
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
          <View style={styles.timeInputs}>
            <TextInput
              accessibilityLabel="時"
              value={hourText}
              onChangeText={(text) => setHourText(digits(text))}
              onBlur={() => hour !== null && setHourText(pad(hour))}
              editable={enabled}
              keyboardType="number-pad"
              maxLength={2}
              selectTextOnFocus
              style={[styles.timeInput, hour === null && styles.timeInputError]}
            />
            <Text style={styles.timeColon}>:</Text>
            <TextInput
              accessibilityLabel="分"
              value={minuteText}
              onChangeText={(text) => setMinuteText(digits(text))}
              onBlur={() => minute !== null && setMinuteText(pad(minute))}
              editable={enabled}
              keyboardType="number-pad"
              maxLength={2}
              selectTextOnFocus
              style={[styles.timeInput, minute === null && styles.timeInputError]}
            />
          </View>
          <Text style={styles.timeHint}>24時間表記で入力します（例：9時30分は 09:30、夜8時は 20:00）</Text>
        </View>

        <View style={styles.preview}><Ionicons name="notifications-outline" size={20} color={colors.accent} /><View style={styles.previewCopy}><Text style={styles.previewLabel}>通知プレビュー</Text><Text style={styles.previewTitle}>神さまに会いにいきませんか？ ⛩️</Text><Text style={styles.previewBody}>近くの神社へ、今週のご縁を結びにいきましょう。</Text></View></View>
        <Button label="設定を保存する" onPress={save} loading={saving} icon={<Ionicons name="checkmark" size={18} color="#FFFFFF" />} />
      </ScrollView>
      {result && <SavedCard result={result} onClose={() => setResult(null)} />}
    </SafeAreaView>
  );
}

// 保存した結果を伝えるカード。画面の上に重ねて出す（iOS で Modal が表示されない不具合があったので、Modal は使わない）
function SavedCard({ result, onClose }: { result: SavedResult; onClose: () => void }) {
  const [appear] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.spring(appear, { toValue: 1, friction: 7, tension: 70, useNativeDriver: true }).start();
  }, [appear]);

  const on = result.kind === 'on';
  const failed = result.kind === 'denied' || result.kind === 'error';
  const look = {
    on: { kicker: 'REMINDER SET', icon: 'notifications', title: 'リマインダーを設定しました', body: 'この時刻に、神社へのお参りをそっとお知らせします。' },
    off: { kicker: 'REMINDER OFF', icon: 'notifications-off', title: 'リマインダーをオフにしました', body: 'お知らせは届きません。\nまた会いにいきたくなったら、いつでも設定できます。' },
    denied: { kicker: 'NOTIFICATION OFF', icon: 'notifications-off', title: '通知が許可されていません', body: 'このままではお知らせを届けられません。\n設定アプリで「カミめぐ」の通知を許可してから、もう一度保存してください。' },
    error: { kicker: 'NOT SAVED', icon: 'alert', title: result.kind === 'error' ? result.title : '', body: result.kind === 'error' ? result.message : '' },
  } as const;
  const { kicker, icon, title, body } = look[result.kind];

  function openSettings() {
    onClose();
    Linking.openSettings().catch(() => {});
  }

  return (
    <Animated.View accessibilityViewIsModal style={[styles.resultBackdrop, { opacity: appear }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="閉じる" onPress={onClose} style={StyleSheet.absoluteFill} />
      <Animated.View style={[styles.resultCard, { transform: [{ scale: appear.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }]}>
        <LinearGradient colors={on ? ['#FFE1F1', '#FFFFFF', '#F1ECFF'] : failed ? ['#FFF1DC', '#FFFFFF', '#FFF6EC'] : ['#F1EEF8', '#FFFFFF', '#F6F3FB']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
        <Text style={[styles.resultKicker, !on && styles.resultKickerOff, failed && styles.resultKickerFailed]}>{kicker}</Text>
        <View style={styles.resultIconWrap}>
          {on && <View style={styles.resultHalo} />}
          {failed && <View style={[styles.resultHalo, styles.resultHaloFailed]} />}
          <View style={[styles.resultIcon, !on && styles.resultIconOff, failed && styles.resultIconFailed]}>
            <Ionicons name={icon} size={38} color="#FFFFFF" />
          </View>
          {on && <Sparkle size={16} style={styles.resultSparkleOne} />}
          {on && <Sparkle size={11} color={colors.violet} style={styles.resultSparkleTwo} />}
        </View>
        <Text style={styles.resultTitle}>{title}</Text>
        {result.kind === 'on' ? (
          <View style={styles.resultWhen}>
            <Text style={styles.resultWeekday}>毎週 {weekdays[result.weekday - 1]}曜日</Text>
            <Text style={styles.resultTime}>{pad(result.hour)}:{pad(result.minute)}</Text>
          </View>
        ) : null}
        <Text style={styles.resultBody}>{body}</Text>
        {result.kind === 'denied' ? (
          <>
            <Pressable accessibilityRole="button" onPress={openSettings} style={({ pressed }) => [styles.resultButton, pressed && styles.resultPressed]}>
              <LinearGradient colors={gradients.primary} style={StyleSheet.absoluteFill} />
              <Ionicons name="settings-outline" size={17} color="#FFFFFF" />
              <Text style={styles.resultButtonText}>設定を開く</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.resultSecondary}>
              <Text style={styles.resultSecondaryText}>あとで</Text>
            </Pressable>
          </>
        ) : (
          <Pressable accessibilityRole="button" onPress={onClose} style={({ pressed }) => [styles.resultButton, !on && styles.resultButtonOff, pressed && styles.resultPressed]}>
            {on && <LinearGradient colors={gradients.primary} style={StyleSheet.absoluteFill} />}
            <Text style={[styles.resultButtonText, !on && styles.resultButtonTextOff]}>OK</Text>
          </Pressable>
        )}
      </Animated.View>
    </Animated.View>
  );
}

function pad(value: number) { return String(value).padStart(2, '0'); }
function digits(text: string) { return text.replace(/[^0-9]/g, ''); }
// 入力が 0〜max の数字ならその値、そうでなければ null
function parsePart(text: string, max: number): number | null {
  if (text === '') return null;
  const value = Number(text);
  return value <= max ? value : null;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper }, header: { paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 11 }, back: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,.8)', borderWidth: 1, borderColor: colors.line }, headerCopy: { flex: 1 }, kicker: { fontFamily: fonts.bold, fontSize: 8, letterSpacing: 1.5, color: colors.violet }, titleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 }, title: { fontFamily: fonts.displayHeavy, fontSize: 23, color: colors.ink }, content: { padding: 16, paddingBottom: 40, gap: 13 },
  hero: { minHeight: 190, borderRadius: 28, padding: 22, justifyContent: 'flex-end', overflow: 'hidden', boxShadow: glow.pink }, bell: { position: 'absolute', top: 19, right: 22, width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,111,175,.75)', borderWidth: 2, borderColor: '#FFFFFF' }, heroTitle: { fontFamily: fonts.displayHeavy, fontSize: 22, color: colors.ink }, heroBody: { width: '78%', marginTop: 7, fontFamily: fonts.regular, fontSize: 11, lineHeight: 18, color: colors.inkSoft },
  card: { padding: 17, borderRadius: radius.lg, backgroundColor: 'rgba(255,255,255,.82)', borderWidth: 1, borderColor: colors.line, boxShadow: glow.soft }, disabled: { opacity: .46 }, toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, cardTitle: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink }, cardCaption: { marginTop: 3, fontFamily: fonts.regular, fontSize: 10, color: colors.muted }, switch: { width: 52, height: 30, padding: 3, borderRadius: 15, backgroundColor: colors.track }, switchOn: { backgroundColor: colors.accent }, knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFFFFF', boxShadow: glow.soft }, knobOn: { marginLeft: 22 }, weekRow: { marginTop: 12, flexDirection: 'row', justifyContent: 'space-between' }, day: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.track }, dayActive: { backgroundColor: colors.accent }, dayText: { fontFamily: fonts.bold, fontSize: 11, color: colors.muted }, dayTextActive: { color: '#FFFFFF' }, divider: { height: 1, marginVertical: 16, backgroundColor: colors.line }, timeInputs: { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }, timeInput: { width: 84, height: 64, borderRadius: 18, textAlign: 'center', fontFamily: fonts.displayHeavy, fontSize: 30, color: colors.ink, backgroundColor: colors.track, borderWidth: 1.5, borderColor: 'transparent' }, timeInputError: { borderColor: colors.accent }, timeColon: { fontFamily: fonts.displayHeavy, fontSize: 28, color: colors.inkSoft }, timeHint: { marginTop: 10, textAlign: 'center', fontFamily: fonts.regular, fontSize: 10, color: colors.muted },
  resultBackdrop: { position: 'absolute', inset: 0, zIndex: 100, padding: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(49,31,86,.48)' },
  resultCard: { width: '100%', maxWidth: 360, overflow: 'hidden', alignItems: 'center', paddingHorizontal: 22, paddingTop: 24, paddingBottom: 20, borderRadius: 32, borderWidth: 2, borderColor: 'rgba(255,255,255,.95)', backgroundColor: '#FFFFFF', boxShadow: glow.strong },
  resultKicker: { fontFamily: fonts.bold, fontSize: 9, letterSpacing: 2, color: colors.accent }, resultKickerOff: { color: colors.muted }, resultKickerFailed: { color: '#C77A1F' },
  resultIconWrap: { marginTop: 14, width: 120, height: 104, alignItems: 'center', justifyContent: 'center' },
  resultHalo: { position: 'absolute', width: 104, height: 104, borderRadius: 52, backgroundColor: 'rgba(255,111,175,.16)' },
  resultIcon: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent, borderWidth: 3, borderColor: '#FFFFFF', boxShadow: glow.pink },
  resultIconOff: { backgroundColor: colors.muted, boxShadow: glow.soft },
  resultIconFailed: { backgroundColor: '#F2A23A' }, resultHaloFailed: { backgroundColor: 'rgba(242,162,58,.18)' },
  resultSparkleOne: { position: 'absolute', top: 4, right: 8 }, resultSparkleTwo: { position: 'absolute', bottom: 10, left: 10 },
  resultTitle: { marginTop: 12, fontFamily: fonts.displayHeavy, fontSize: 19, textAlign: 'center', color: colors.ink },
  resultWhen: { marginTop: 14, alignSelf: 'stretch', alignItems: 'center', paddingVertical: 12, borderRadius: 20, backgroundColor: 'rgba(255,255,255,.8)', borderWidth: 1, borderColor: colors.line },
  resultWeekday: { fontFamily: fonts.bold, fontSize: 12, color: colors.violet },
  resultTime: { marginTop: 2, fontFamily: fonts.displayHeavy, fontSize: 34, color: colors.ink },
  resultBody: { marginTop: 12, fontFamily: fonts.regular, fontSize: 12, lineHeight: 20, textAlign: 'center', color: colors.inkSoft },
  resultButton: { marginTop: 18, alignSelf: 'stretch', minHeight: 50, overflow: 'hidden', borderRadius: 25, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center' },
  resultSecondary: { marginTop: 6, minHeight: 40, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' }, resultSecondaryText: { fontFamily: fonts.bold, fontSize: 12, color: colors.muted },
  resultButtonOff: { backgroundColor: colors.track },
  resultButtonText: { fontFamily: fonts.bold, fontSize: 14, color: '#FFFFFF' }, resultButtonTextOff: { color: colors.ink },
  resultPressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
  preview: { padding: 14, flexDirection: 'row', gap: 11, borderRadius: 20, backgroundColor: 'rgba(255,255,255,.72)', borderWidth: 1, borderColor: colors.line }, previewCopy: { flex: 1 }, previewLabel: { fontFamily: fonts.bold, fontSize: 8, color: colors.violet }, previewTitle: { marginTop: 3, fontFamily: fonts.bold, fontSize: 11, color: colors.ink }, previewBody: { marginTop: 2, fontFamily: fonts.regular, fontSize: 9, color: colors.muted },
});
