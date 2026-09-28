import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ShrineFinder } from '@/components/ShrineFinder';
import { ScreenTitle } from '@/components/ui';
import { colors, fonts } from '@/theme';

// めぐる：近くの神社・お寺を探したり、名前で探したりする
export default function MapScreen() {
  // 神社図鑑の「〇〇を探す」から、探す名前を受け取る。変わったら作り直して探し直す
  const { q } = useLocalSearchParams<{ q?: string }>();
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ShrineFinder
        key={q ?? ''}
        initialQuery={q}
        top={
          <View style={styles.title}>
            <ScreenTitle>神社を探す</ScreenTitle>
            <Text style={styles.sub}>名前や近くの場所から、新しいご縁を見つけよう</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  title: { gap: 4, marginBottom: 4 },
  sub: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
});
