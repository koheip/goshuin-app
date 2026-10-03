import type { Ref } from 'react';
import { Pressable as NativePressable, type GestureResponderEvent, type PressableProps, type View } from 'react-native';

import { tapFeedback } from '@/lib/feedback';

// 押したときに音と感触を返す Pressable。ボタンには react-native のものではなく、これを使う
export function Pressable({ onPress, ...props }: PressableProps & { ref?: Ref<View> }) {
  function press(event: GestureResponderEvent) {
    // 先にボタンの動きを済ませる（音量や効果音の設定を変えるボタンで、変えたあとの音を鳴らすため）
    onPress?.(event);
    tapFeedback();
  }
  return <NativePressable {...props} onPress={onPress ? press : undefined} />;
}
