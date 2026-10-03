import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { Pressable } from '@/components/Pressable';
import { Sparkle } from '@/components/ui';
import { colors, fonts, glow, gradients } from '@/theme';

// はじめてのチュートリアルのあとに出す、参拝リマインダーへの案内。
// ここでは通知の許可は求めない（許可は、リマインダーの画面で保存したときに OS が聞く）
export function ReminderInvite({ onAccept, onClose }: { onAccept: () => void; onClose: () => void }) {
  const [appear] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.spring(appear, { toValue: 1, friction: 7, tension: 70, useNativeDriver: true }).start();
  }, [appear]);

  return (
    <Animated.View accessibilityViewIsModal style={[styles.backdrop, { opacity: appear }]}>
      <Animated.View style={[styles.card, { transform: [{ scale: appear.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }]}>
        <LinearGradient colors={['#FFE1F1', '#FFFFFF', '#F1ECFF']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
        <Text style={styles.kicker}>VISIT REMINDER</Text>
        <View style={styles.iconWrap}>
          <View style={styles.halo} />
          <View style={styles.icon}>
            <Ionicons name="notifications" size={38} color="#FFFFFF" />
          </View>
          <Sparkle size={16} style={styles.sparkleOne} />
          <Sparkle size={11} color={colors.violet} style={styles.sparkleTwo} />
        </View>
        <Text style={styles.title}>お参りの日を{'\n'}お知らせしましょうか？</Text>
        <Text style={styles.body}>決めた曜日と時刻に、週に1回、神社へのお参りをそっとお知らせします。</Text>
        <View style={styles.sample}>
          <Ionicons name="notifications-outline" size={18} color={colors.accent} />
          <View style={styles.sampleCopy}>
            <Text style={styles.sampleTitle}>神さまに会いにいきませんか？ ⛩️</Text>
            <Text style={styles.sampleBody}>近くの神社へ、今週のご縁を結びにいきましょう。</Text>
          </View>
        </View>
        <Pressable accessibilityRole="button" onPress={onAccept} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
          <LinearGradient colors={gradients.primary} style={StyleSheet.absoluteFill} />
          <Text style={styles.primaryText}>リマインダーを設定する</Text>
          <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.secondary}>
          <Text style={styles.secondaryText}>あとで</Text>
        </Pressable>
        <Text style={styles.note}>あとから、設定の「参拝リマインダー」でいつでも変えられます。</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, zIndex: 1000, padding: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(49,31,86,.48)' },
  card: { width: '100%', maxWidth: 360, overflow: 'hidden', alignItems: 'center', paddingHorizontal: 22, paddingTop: 24, paddingBottom: 18, borderRadius: 32, borderWidth: 2, borderColor: 'rgba(255,255,255,.95)', backgroundColor: '#FFFFFF', boxShadow: glow.strong },
  kicker: { fontFamily: fonts.bold, fontSize: 9, letterSpacing: 2, color: colors.accent },
  iconWrap: { marginTop: 14, width: 120, height: 104, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: 104, height: 104, borderRadius: 52, backgroundColor: 'rgba(255,111,175,.16)' },
  icon: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent, borderWidth: 3, borderColor: '#FFFFFF', boxShadow: glow.pink },
  sparkleOne: { position: 'absolute', top: 4, right: 8 },
  sparkleTwo: { position: 'absolute', bottom: 10, left: 10 },
  title: { marginTop: 12, fontFamily: fonts.displayHeavy, fontSize: 19, lineHeight: 28, textAlign: 'center', color: colors.ink },
  body: { marginTop: 8, fontFamily: fonts.regular, fontSize: 12, lineHeight: 20, textAlign: 'center', color: colors.inkSoft },
  sample: { marginTop: 14, alignSelf: 'stretch', padding: 12, flexDirection: 'row', gap: 9, borderRadius: 18, backgroundColor: 'rgba(255,255,255,.8)', borderWidth: 1, borderColor: colors.line },
  sampleCopy: { flex: 1 },
  sampleTitle: { fontFamily: fonts.bold, fontSize: 11, color: colors.ink },
  sampleBody: { marginTop: 2, fontFamily: fonts.regular, fontSize: 10, lineHeight: 15, color: colors.muted },
  primary: { marginTop: 16, alignSelf: 'stretch', minHeight: 50, overflow: 'hidden', borderRadius: 25, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontFamily: fonts.bold, fontSize: 14, color: '#FFFFFF' },
  secondary: { marginTop: 6, minHeight: 40, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontFamily: fonts.bold, fontSize: 12, color: colors.muted },
  note: { marginTop: 2, fontFamily: fonts.regular, fontSize: 9, lineHeight: 15, textAlign: 'center', color: colors.muted },
  pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
});
