import type { ConfigContext, ExpoConfig } from 'expo/config';

// app.json を土台に、プラグインを足す
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  plugins: [...(config.plugins ?? []), 'expo-audio', 'expo-asset'],
});
