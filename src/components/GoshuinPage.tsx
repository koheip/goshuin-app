import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { GoshuinEntry } from '@/db/types';
import { formatDot } from '@/lib/dates';
import { imageUri } from '@/lib/images';
import { Torii } from '@/components/shrine';
import { colors, fonts, glow } from '@/theme';

type Props = {
  entry: GoshuinEntry | undefined;
  side: 'left' | 'right';
  width: number;
  height: number;
  onPress?: (entry: GoshuinEntry) => void;
};

// 見開きの片側のページ。御朱印がなければ白紙のページを描く
export function GoshuinPage({ entry, side, width, height, onPress }: Props) {
  const gutterShadow = side === 'left' ? styles.gutterLeft : styles.gutterRight;

  if (!entry) {
    return (
      <View style={[styles.page, side === 'left' ? styles.pageLeft : styles.pageRight, { width, height }]}>
        <View style={[styles.gutter, gutterShadow]} />
        <Torii size={Math.round(width * 0.36)} opacity={0.18} />
        <Text style={styles.blank}>白紙</Text>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${entry.shrineName}、${formatDot(entry.visitedOn)}の御朱印を開く`}
      onPress={() => onPress?.(entry)}
      style={[styles.page, side === 'left' ? styles.pageLeft : styles.pageRight, { width, height }]}
    >
      <Image source={{ uri: imageUri(entry.imageFile) }} style={styles.image} resizeMode="contain" />
      <View style={[styles.gutter, gutterShadow]} />
      {entry.kind === 'limited' && (
        <View style={styles.tag}>
          <Text style={styles.tagLabel}>限定</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: colors.page,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pageLeft: { borderTopLeftRadius: 10, borderBottomLeftRadius: 10 },
  pageRight: { borderTopRightRadius: 10, borderBottomRightRadius: 10 },
  image: { width: '92%', height: '94%' },
  // 綴じ目の陰影
  gutter: { position: 'absolute', top: 0, bottom: 0, width: 10 },
  gutterLeft: { right: 0, backgroundColor: 'rgba(183, 123, 255, 0.08)' },
  gutterRight: { left: 0, backgroundColor: 'rgba(183, 123, 255, 0.08)' },
  blank: {
    fontFamily: fonts.bold,
    marginTop: 10,
    fontSize: 14,
    letterSpacing: 4,
    color: colors.lineStrong,
  },
  tag: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: colors.special,
    boxShadow: glow.soft,
  },
  tagLabel: { fontFamily: fonts.display, fontSize: 10, color: '#FFFFFF', letterSpacing: 1 },
});
