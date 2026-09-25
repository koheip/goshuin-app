import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui';
import { getCurrentCoords, LocationPermissionError, type Coords } from '@/lib/location';
import { colors, fonts } from '@/theme';

type Props = {
  value: Coords | null;
  onChange: (coords: Coords | null) => void;
  // 記録済みの位置を取り消せるか（登録前のフォームだけ）
  clearable?: boolean;
};

// 今いる場所を神社・お寺の位置として記録するボタン
export function LocationButton({ value, onChange, clearable = false }: Props) {
  const [busy, setBusy] = useState(false);

  async function capture() {
    setBusy(true);
    try {
      onChange(await getCurrentCoords());
    } catch (e) {
      if (e instanceof LocationPermissionError) {
        Alert.alert(e.message, '設定アプリから許可すると、今いる場所を記録できるようになります。', [
          { text: 'キャンセル', style: 'cancel' },
          { text: '設定を開く', onPress: () => Linking.openSettings() },
        ]);
      } else {
        Alert.alert('現在地を取得できませんでした', '屋外や電波の届く場所で、もう一度お試しください。');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <Button
        label={value ? '今いる場所で記録し直す' : '今いる場所を記録'}
        variant="secondary"
        onPress={capture}
        loading={busy}
        icon={<Ionicons name="location-outline" size={18} color={colors.ink} />}
      />
      {value && (
        <View style={styles.status}>
          <Ionicons name="checkmark-circle" size={16} color={colors.accent} />
          <Text style={styles.statusText}>位置を記録済み（地図に表示されます）</Text>
          {clearable && (
            <Pressable accessibilityRole="button" hitSlop={8} onPress={() => onChange(null)}>
              <Text style={styles.clear}>取り消す</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusText: { flex: 1, fontFamily: fonts.regular, fontSize: 12, color: colors.inkSoft },
  clear: { fontFamily: fonts.regular, fontSize: 12, color: colors.accent },
});
