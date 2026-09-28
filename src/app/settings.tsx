import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { router, useFocusEffect, type Href } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTutorial } from '@/components/TutorialProvider';
import { DreamyBackground, Sparkle } from '@/components/ui';
import { getReminderPreferences, isSoundEnabled, setSoundEnabled, type ReminderPreferences } from '@/db/repo';
import { colors, fonts, glow, radius } from '@/theme';

const weekdays = ['日', '月', '火', '水', '木', '金', '土'];

type IconName = keyof typeof Ionicons.glyphMap;

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const { replayTutorial } = useTutorial();
  const [reminder, setReminder] = useState<ReminderPreferences | null>(null);
  const [sound, setSound] = useState(true);

  // リマインダーの画面から戻ったときにも読み直す
  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([getReminderPreferences(db), isSoundEnabled(db)]).then(([nextReminder, nextSound]) => {
        if (!active) return;
        setReminder(nextReminder);
        setSound(nextSound);
      });
      return () => { active = false; };
    }, [db]),
  );

  function toggleSound() {
    const next = !sound;
    setSound(next);
    setSoundEnabled(db, next).catch(() => setSound(!next));
  }

  const reminderCaption = !reminder
    ? ' '
    : reminder.enabled
      ? `毎週${weekdays[reminder.weekday - 1]}曜日 ${String(reminder.hour).padStart(2, '0')}:${String(reminder.minute).padStart(2, '0')}`
      : 'オフ';

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <DreamyBackground />
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="戻る" onPress={() => router.back()} style={styles.back}>
          <Ionicons name="chevron-back" size={23} color={colors.ink} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.kicker}>SETTINGS</Text>
          <View style={styles.titleRow}>
            <Text style={styles.title}>設定</Text>
            <Sparkle size={17} />
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Section title="通知とデータ">
          <LinkRow icon="notifications" label="参拝リマインダー" caption={reminderCaption} href="/reminder" />
          <LinkRow icon="cloud-upload" label="バックアップ" caption="記録と写真を書き出す・戻す" href="/backup" />
        </Section>

        <Section title="サウンド">
          <Row icon="musical-notes" label="効果音" caption="参拝を記録したときに音を鳴らす">
            <Pressable
              accessibilityRole="switch"
              accessibilityLabel="効果音"
              accessibilityState={{ checked: sound }}
              onPress={toggleSound}
              style={[styles.switch, sound && styles.switchOn]}
            >
              <View style={[styles.knob, sound && styles.knobOn]} />
            </Pressable>
          </Row>
        </Section>

        <Section title="ヘルプ">
          <Row icon="sparkles" label="チュートリアルをもう一度見る" onPress={replayTutorial}>
            <Ionicons name="chevron-forward" size={18} color={colors.violet} />
          </Row>
        </Section>

        <Section title="アプリについて">
          <Row icon="information-circle" label="バージョン">
            <Text style={styles.value}>{Constants.expoConfig?.version ?? '—'}</Text>
          </Row>
          <LinkRow icon="shield-checkmark" label="プライバシーポリシー" href="/privacy" />
          <LinkRow icon="document-text" label="ライセンス" href="/licenses" />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Row({ icon, label, caption, onPress, children }: { icon: IconName; label: string; caption?: string; onPress?: () => void; children?: ReactNode }) {
  const content = (
    <>
      <View style={styles.iconCircle}><Ionicons name={icon} size={18} color={colors.accent} /></View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowLabel}>{label}</Text>
        {caption ? <Text style={styles.rowCaption}>{caption}</Text> : null}
      </View>
      {children}
    </>
  );
  if (!onPress) return <View style={styles.row}>{content}</View>;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

function LinkRow({ href, ...props }: { icon: IconName; label: string; caption?: string; href: Href }) {
  return (
    <Row {...props} onPress={() => router.push(href)}>
      <Ionicons name="chevron-forward" size={18} color={colors.violet} />
    </Row>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  header: { paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 11 },
  back: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,.8)', borderWidth: 1, borderColor: colors.line },
  headerCopy: { flex: 1 },
  kicker: { fontFamily: fonts.bold, fontSize: 8, letterSpacing: 1.5, color: colors.violet },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  title: { fontFamily: fonts.displayHeavy, fontSize: 23, color: colors.ink },
  content: { padding: 16, paddingBottom: 40, gap: 18 },
  section: { gap: 8 },
  sectionTitle: { marginLeft: 6, fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1, color: colors.violet },
  card: { paddingHorizontal: 6, borderRadius: radius.lg, backgroundColor: 'rgba(255,255,255,.82)', borderWidth: 1, borderColor: colors.line, boxShadow: glow.soft },
  row: { minHeight: 62, paddingHorizontal: 10, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  pressed: { opacity: 0.7 },
  iconCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentTint },
  rowCopy: { flex: 1, gap: 2 },
  rowLabel: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  rowCaption: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted },
  value: { fontFamily: fonts.bold, fontSize: 13, color: colors.muted },
  switch: { width: 52, height: 30, padding: 3, borderRadius: 15, backgroundColor: colors.track },
  switchOn: { backgroundColor: colors.accent },
  knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFFFFF', boxShadow: glow.soft },
  knobOn: { marginLeft: 22 },
});
