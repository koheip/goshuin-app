import Ionicons from '@expo/vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui';
import { BackupFormatError, exportBackup, restoreBackup } from '@/lib/backup';
import { colors, fonts, radius } from '@/theme';

export default function BackupScreen() {
  const db = useSQLiteContext();
  const [busy, setBusy] = useState<'export' | 'restore' | null>(null);

  async function runExport() {
    setBusy('export');
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('この端末では書き出せません', 'ファイルの共有に対応していません。');
        return;
      }
      const file = await exportBackup(db);
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/json',
        UTI: 'public.json',
        dialogTitle: 'バックアップの保存先を選ぶ',
      });
    } catch (e) {
      Alert.alert('書き出せませんでした', String(e));
    } finally {
      setBusy(null);
    }
  }

  function confirmRestore() {
    Alert.alert(
      'バックアップから戻しますか？',
      '今この端末にある記録と写真は、すべてバックアップの内容に置き換わります。',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '選んで戻す', style: 'destructive', onPress: runRestore },
      ],
    );
  }

  async function runRestore() {
    const picked = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/plain', '*/*'],
      copyToCacheDirectory: true,
    });
    if (picked.canceled) return;
    setBusy('restore');
    try {
      const count = await restoreBackup(db, picked.assets[0].uri);
      Alert.alert('戻しました', `御朱印 ${count}枚を読み込みました。`, [
        { text: 'OK', onPress: () => router.dismissTo('/') },
      ]);
    } catch (e) {
      const message = e instanceof BackupFormatError ? e.message : String(e);
      Alert.alert('戻せませんでした', message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>書き出す</Text>
        <Text style={styles.body}>
          記録と写真をまとめて1つのファイルにします。「ファイル」アプリやクラウドドライブ、パソコンなどに保存しておくと、機種変更やアプリを消したあとでも戻せます。
        </Text>
        <Button
          label="バックアップを書き出す"
          onPress={runExport}
          loading={busy === 'export'}
          disabled={busy !== null}
          icon={<Ionicons name="share-outline" size={20} color="#FFFFFF" />}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>戻す</Text>
        <Text style={styles.body}>
          書き出したバックアップファイルを選ぶと、その時点の記録と写真に戻ります。今ある記録は置き換わるので注意してください。
        </Text>
        <Button
          label="バックアップから戻す"
          variant="secondary"
          onPress={confirmRestore}
          loading={busy === 'restore'}
          disabled={busy !== null}
          icon={<Ionicons name="download-outline" size={20} color={colors.ink} />}
        />
      </View>

      <Text style={styles.note}>
        写真の枚数が多いと、ファイルが大きくなり、書き出しに時間がかかることがあります。
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 16 },
  card: {
    gap: 12,
    padding: 18,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  title: { fontFamily: fonts.display, fontSize: 18, color: colors.ink },
  body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 22, color: colors.inkSoft },
  note: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.muted },
});
