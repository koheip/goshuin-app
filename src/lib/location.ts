import * as Location from 'expo-location';

export type Coords = { latitude: number; longitude: number };

export class LocationPermissionError extends Error {
  constructor() {
    super('位置情報の使用が許可されていません');
  }
}

let pending: Promise<Coords> | null = null;

// 今いる場所を1回だけ取得する。位置はこの端末のDBにだけ保存する。
// 許可の確認を同時に2回呼ぶと Android で返ってこないことがあるので、同時の呼び出しは1回にまとめる
export function getCurrentCoords(): Promise<Coords> {
  pending ??= fetchCoords().finally(() => {
    pending = null;
  });
  return pending;
}

async function fetchCoords(): Promise<Coords> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) throw new LocationPermissionError();
  let position: Location.LocationObject | null = null;
  try {
    // 屋内やエミュレーターでは、位置がわかるまでいつまでも待つことがあるので打ち切る
    position = await withTimeout(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }), 10000);
  } catch (error) {
    // Android Emulator は現在地を返さないことがあるので最後の位置を試す。
    // それもない場合、開発ビルドだけ東京駅をテスト地点として使う。
    position = await Location.getLastKnownPositionAsync();
    if (!position) {
      if (__DEV__) return { latitude: 35.68124, longitude: 139.76713 };
      throw error;
    }
  }
  // 神社・お寺の場所には十分な、小数5桁（約1m）に丸める
  const round = (n: number) => Math.round(n * 1e5) / 1e5;
  return { latitude: round(position.coords.latitude), longitude: round(position.coords.longitude) };
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('現在地を取得できませんでした')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
