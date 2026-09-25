import * as Location from 'expo-location';

export type Coords = { latitude: number; longitude: number };

export class LocationPermissionError extends Error {
  constructor() {
    super('位置情報の使用が許可されていません');
  }
}

// 今いる場所を1回だけ取得する。位置はこの端末のDBにだけ保存する
export async function getCurrentCoords(): Promise<Coords> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) throw new LocationPermissionError();
  const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  // 神社・お寺の場所には十分な、小数5桁（約1m）に丸める
  const round = (n: number) => Math.round(n * 1e5) / 1e5;
  return { latitude: round(position.coords.latitude), longitude: round(position.coords.longitude) };
}
