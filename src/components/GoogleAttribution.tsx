import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { collectProviders, type PlaceCandidate } from '@/lib/places';

// Google の検索結果のそばに出す表示。Google の決まりに合わせている：
// 文字は「Google Maps」のまま（訳さない・折り返さない）、12〜16sp、色は #5E5E5E、書体は端末の標準（Roboto など）。
// アプリの書体や色に変えないこと
export function GoogleAttribution({ places, style }: { places: PlaceCandidate[]; style?: StyleProp<ViewStyle> }) {
  const providers = collectProviders(places);
  return (
    <View style={[styles.box, style]}>
      <Text numberOfLines={1} style={styles.text}>Google Maps</Text>
      {providers.length > 0 && <Text style={styles.text}>{providers.join('、')}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'flex-end', gap: 2 },
  text: { fontSize: 12, color: '#5E5E5E' },
});
