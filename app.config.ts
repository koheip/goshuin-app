import type { ConfigContext, ExpoConfig } from 'expo/config';

// app.json を土台に、プラグインを足す
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  plugins: [
    ...(config.plugins ?? []),
    // 効果音を鳴らすだけなので、マイクとバックグラウンド再生の権限は付けない
    ['expo-audio', { microphonePermission: false, recordAudioAndroid: false, enableBackgroundPlayback: false }],
    'expo-asset',
  ],
});
