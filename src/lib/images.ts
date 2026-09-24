import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { randomUUID } from 'expo-crypto';

const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.7;
const DIR_NAME = 'goshuin';

function imageDir(): Directory {
  const dir = new Directory(Paths.document, DIR_NAME);
  if (!dir.exists) dir.create({ idempotent: true, intermediates: true });
  return dir;
}

// DBにはファイル名だけを持ち、表示のたびに現在のドキュメントフォルダから組み立てる
// （iOS ではアプリ更新でコンテナのパスが変わるため、絶対パスは保存しない）
export function imageUri(fileName: string): string {
  return new File(Paths.document, DIR_NAME, fileName).uri;
}

export type PickSource = 'camera' | 'library';

// 撮影または写真選択し、縮小・JPEG再圧縮した一時ファイルのURIを返す。
// 再エンコードで撮影時の位置情報などのEXIFは書き出されない
export async function pickGoshuinImage(source: PickSource): Promise<string | null> {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new PermissionDeniedError(source);
  }

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    exif: false,
    quality: 1,
  };
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || result.assets.length === 0) return null;

  const asset = result.assets[0];
  const context = ImageManipulator.manipulate(asset.uri);
  const longEdge = Math.max(asset.width, asset.height);
  if (longEdge > MAX_EDGE) {
    context.resize(asset.width >= asset.height ? { width: MAX_EDGE } : { height: MAX_EDGE });
  }
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: JPEG_QUALITY });
  return saved.uri;
}

// 下書きの一時ファイルを、アプリのドキュメントフォルダへ移して保存する
export function persistImage(tempUri: string): string {
  const fileName = `${randomUUID()}.jpg`;
  const source = new File(tempUri);
  source.copy(new File(imageDir(), fileName));
  return fileName;
}

export function deleteImage(fileName: string) {
  const file = new File(Paths.document, DIR_NAME, fileName);
  if (file.exists) file.delete();
}

export class PermissionDeniedError extends Error {
  constructor(public source: PickSource) {
    super(source === 'camera' ? 'カメラの使用が許可されていません' : '写真へのアクセスが許可されていません');
  }
}
