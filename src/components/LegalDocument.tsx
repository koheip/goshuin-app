import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { LegalSection } from '@/legal/texts';
import { colors, fonts, radius } from '@/theme';

// プライバシーポリシーやライセンスのような、読むだけの文章の画面
export function LegalDocument({ header, sections }: { header?: ReactNode; sections: LegalSection[] }) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      {header}
      {sections.map((section) => (
        <View key={section.title} style={styles.card}>
          <Text style={styles.title}>{section.title}</Text>
          {section.lines.map((line, index) =>
            line.startsWith('・') ? (
              <View key={index} style={styles.bulletRow}>
                <Text style={styles.bullet}>•</Text>
                <Text style={[styles.body, styles.flex]}>{line.slice(1)}</Text>
              </View>
            ) : line.startsWith('【') ? (
              <Text key={index} style={styles.subtitle}>{line.slice(1, -1)}</Text>
            ) : (
              <Text key={index} style={styles.body}>{line}</Text>
            ),
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40, gap: 14 },
  card: {
    gap: 8,
    padding: 18,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  title: { fontFamily: fonts.display, fontSize: 16, color: colors.ink },
  subtitle: { marginTop: 4, fontFamily: fonts.bold, fontSize: 13, color: colors.accentOnTint },
  body: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 21, color: colors.inkSoft },
  bulletRow: { flexDirection: 'row', gap: 6 },
  bullet: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 21, color: colors.accent },
  flex: { flex: 1 },
});
