import type { ConfigContext, ExpoConfig } from 'expo/config';

// app.json を土台に、秘密にしたい値だけを環境変数から足す。
// GOOGLE_MAPS_ANDROID_API_KEY: Android のアプリ内地図（Google Maps SDK for Android）用のキー
export default ({ config }: ConfigContext): ExpoConfig => {
  const googleMapsApiKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY;
  return {
    ...(config as ExpoConfig),
    android: {
      ...config.android,
      ...(googleMapsApiKey && {
        config: { ...config.android?.config, googleMaps: { apiKey: googleMapsApiKey } },
      }),
    },
  };
};
