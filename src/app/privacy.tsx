import { StyleSheet, Text, View } from 'react-native';

import { LegalDocument } from '@/components/LegalDocument';
import { PRIVACY_INTRO, PRIVACY_SECTIONS, PRIVACY_UPDATED_ON } from '@/legal/texts';
import { colors, fonts } from '@/theme';

export default function PrivacyScreen() {
  return (
    <LegalDocument
      sections={PRIVACY_SECTIONS}
      header={
        <View style={styles.intro}>
          <Text style={styles.updated}>最終更新日：{PRIVACY_UPDATED_ON}</Text>
          <Text style={styles.body}>{PRIVACY_INTRO}</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  intro: { gap: 6, paddingHorizontal: 4 },
  updated: { fontFamily: fonts.bold, fontSize: 11, color: colors.muted },
  body: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 21, color: colors.inkSoft },
});
