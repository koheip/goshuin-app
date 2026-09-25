import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';

import { Sakura } from '@/components/shrine';
import { colors, fonts, glass, glow, gradients, radius } from '@/theme';

export function GlassCard({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.glassCard, style]}>{children}</View>;
}

export function PixelWordmark() {
  return (
    <View accessibilityRole="header" accessibilityLabel="KAMI MEGU" style={styles.wordmarkRow}>
      <Text style={[styles.wordmark, { color: colors.ink }]}>KAMI</Text>
      <Text style={styles.wordmarkHeart}>♡</Text>
      <Text style={[styles.wordmark, { color: colors.accent }]}>MEGU</Text>
    </View>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  style?: ViewStyle;
};

export function Button({ label, onPress, variant = 'primary', disabled, loading, icon, style }: ButtonProps) {
  const primary = variant === 'primary';
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        primary ? styles.buttonPrimary : styles.buttonSecondary,
        pressed && !primary && { backgroundColor: colors.track },
        inactive && styles.buttonDisabled,
        style,
      ]}
    >
      {({ pressed }) => (
        <>
          {primary && (
            <LinearGradient
              colors={pressed ? gradients.primaryPressed : gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          )}
          {loading ? (
            <ActivityIndicator color={primary ? '#FFFFFF' : colors.ink} />
          ) : (
            <>
              {icon}
              <Text style={[styles.buttonLabel, { color: primary ? '#FFFFFF' : colors.ink }]}>{label}</Text>
            </>
          )}
        </>
      )}
    </Pressable>
  );
}

type ChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

export function Chip({ label, selected, onPress }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      hitSlop={4}
      style={[styles.chip, selected ? styles.chipSelected : styles.chipIdle]}
    >
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

export function ChipGroup({ children }: { children: ReactNode }) {
  return (
    <View accessibilityRole="radiogroup" style={styles.chipGroup}>
      {children}
    </View>
  );
}

type FieldProps = TextInputProps & { label: string; hint?: string };

export function Field({ label, hint, style, ...inputProps }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.placeholder}
        style={[styles.input, inputProps.multiline && styles.inputMultiline, style]}
        {...inputProps}
      />
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

export function FieldLabel({ children }: { children: string }) {
  return <Text style={styles.fieldLabel}>{children}</Text>;
}

const STEPS = ['神社・お寺', '撮影', 'メモ（任意）'];

// 記録の進み具合（1〜3）
export function Stepper({ current }: { current: 1 | 2 | 3 }) {
  return (
    <View style={styles.stepper} accessibilityLabel={`ステップ ${current} / 3：${STEPS[current - 1]}`}>
      {STEPS.map((label, i) => {
        const step = i + 1;
        const done = step <= current;
        return (
          <View key={label} style={styles.step}>
            {done ? (
              <LinearGradient
                colors={gradients.stepper}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.stepBar}
              />
            ) : (
              <View style={[styles.stepBar, { backgroundColor: colors.track }]} />
            )}
            <Text style={[styles.stepLabel, step === current && styles.stepLabelCurrent]}>
              {step} {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export function ScreenTitle({ children }: { children: string }) {
  return <Text style={styles.screenTitle}>{children}</Text>;
}

// きらきらの飾り（読み上げ対象外）
export function Sparkle({ size = 14, color = colors.accent, style }: { size?: number; color?: string; style?: TextStyle }) {
  return (
    <Text
      accessible={false}
      importantForAccessibility="no"
      style={[{ fontSize: size, lineHeight: size * 1.2, color }, style]}
    >
      ✦
    </Text>
  );
}

// パステルのグラデーションに、きらきらと桜を散らした背景
export function DreamyBackground() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={gradients.sky} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={[styles.orb, styles.orbPink]} />
      <View style={[styles.orb, styles.orbMint]} />
      <Sparkle size={18} color={colors.violet} style={{ position: 'absolute', top: '14%', right: '10%', opacity: 0.55 }} />
      <Sparkle size={12} color={colors.accent} style={{ position: 'absolute', top: '36%', left: '6%', opacity: 0.45 }} />
      <Sparkle size={10} color={colors.mint} style={{ position: 'absolute', top: '62%', right: '7%', opacity: 0.6 }} />
      <Sparkle size={14} color={colors.sky} style={{ position: 'absolute', bottom: '8%', left: '14%', opacity: 0.5 }} />
      <Sakura size={22} style={{ position: 'absolute', top: '22%', left: '4%', opacity: 0.55, transform: [{ rotate: '-15deg' }] }} />
      <Sakura size={16} style={{ position: 'absolute', top: '48%', right: '4%', opacity: 0.5, transform: [{ rotate: '20deg' }] }} />
      <Sakura size={14} style={{ position: 'absolute', bottom: '18%', right: '22%', opacity: 0.45 }} />
      <Sakura size={12} style={{ position: 'absolute', top: '6%', left: '48%', opacity: 0.4, transform: [{ rotate: '35deg' }] }} />
    </View>
  );
}

const styles = StyleSheet.create({
  glassCard: {
    padding: 16,
    borderRadius: radius.lg,
    backgroundColor: glass.fill,
    borderWidth: 1.5,
    borderColor: glass.border,
    boxShadow: glow.soft,
  },
  wordmarkRow: { flexDirection: 'row', alignItems: 'center' },
  wordmark: { fontFamily: fonts.displayHeavy, fontSize: 25, letterSpacing: 1.5 },
  wordmarkHeart: { marginHorizontal: -1, color: colors.violet, fontFamily: fonts.displayHeavy, fontSize: 27, lineHeight: 29 },
  button: {
    minHeight: 54,
    borderRadius: radius.md,
    overflow: 'hidden',
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonPrimary: { backgroundColor: colors.accent, boxShadow: glow.pink },
  buttonSecondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.lineStrong },
  buttonDisabled: { opacity: 0.45 },
  buttonLabel: { fontFamily: fonts.display, fontSize: 15, letterSpacing: 0.5 },
  chip: {
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    justifyContent: 'center',
  },
  chipIdle: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.lineStrong },
  chipSelected: { backgroundColor: colors.accentTint, borderWidth: 2, borderColor: colors.accent, boxShadow: glow.soft },
  chipLabel: { fontFamily: fonts.regular, fontSize: 14, color: colors.ink },
  chipLabelSelected: { fontFamily: fonts.bold, color: colors.accentOnTint },
  chipGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  field: { gap: 6 },
  fieldLabel: { fontFamily: fonts.bold, fontSize: 12, color: colors.inkSoft },
  fieldHint: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  input: {
    minHeight: 46,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.lineStrong,
    backgroundColor: colors.surface,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.ink,
  },
  inputMultiline: { minHeight: 96, paddingTop: 10, textAlignVertical: 'top' },
  stepper: { flexDirection: 'row', gap: 6 },
  step: { flex: 1, gap: 6 },
  stepBar: { height: 6, borderRadius: 3 },
  stepLabel: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  stepLabelCurrent: { fontFamily: fonts.bold, color: colors.accentOnTint },
  screenTitle: { fontFamily: fonts.displayHeavy, fontSize: 30, color: colors.ink, letterSpacing: 1 },
  orb: { position: 'absolute', borderRadius: 999 },
  orbPink: { width: 260, height: 260, top: -90, left: -80, backgroundColor: 'rgba(255, 143, 199, 0.22)' },
  orbMint: { width: 220, height: 220, bottom: -60, right: -70, backgroundColor: 'rgba(127, 222, 214, 0.2)' },
});
