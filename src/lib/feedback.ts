import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

import { getSoundVolume, isSoundEnabled, SOUND_VOLUME_MAX } from '@/db/repo';

// ボタンを押したときの「ポチッ」という音と感触。
// 音は設定の「効果音」に従う。感触は端末の設定（触覚、低電力モード）に従う

let soundEnabled = true;
let volumeLevel = 3;
let player: AudioPlayer | null = null;
let audioReady = false;

type HapticsModule = typeof import('expo-haptics');
let haptics: HapticsModule | null | undefined;

// 感触の部品が入っていないビルド（追加する前に作った開発ビルドなど）でも、アプリが止まらないようにする
function loadHaptics(): HapticsModule | null {
  if (haptics === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      haptics = require('expo-haptics') as HapticsModule;
    } catch {
      haptics = null;
    }
  }
  return haptics;
}

export function setTapSoundEnabled(enabled: boolean) {
  soundEnabled = enabled;
}

export function setSoundVolumeLevel(level: number) {
  volumeLevel = level;
}

// 設定の音量を、再生するときの音量（0〜1）にしたもの。参拝を記録したときの音に使う
export function soundVolume(): number {
  return volumeLevel / SOUND_VOLUME_MAX;
}

// 保存してある「効果音」と「音量」の設定を読み込む（起動時と、バックアップから戻したあと）
export async function loadSoundSettings(db: SQLiteDatabase): Promise<void> {
  const [enabled, level] = await Promise.all([isSoundEnabled(db), getSoundVolume(db)]);
  soundEnabled = enabled;
  volumeLevel = level;
}

function playTapSound() {
  if (!audioReady) {
    audioReady = true;
    // 音楽などを止めずに重ねて鳴らす。消音モードでは鳴らさない
    setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
  }
  player ??= createAudioPlayer(require('../../assets/sounds/tap.wav'));
  // ボタンの音は控えめに、いちばん大きくしても半分の音量まで
  player.volume = soundVolume() * 0.5;
  player
    .seekTo(0)
    .then(() => player?.play())
    .catch(() => {});
}

export function tapFeedback() {
  if (Platform.OS === 'web') return;
  try {
    loadHaptics()?.impactAsync(loadHaptics()!.ImpactFeedbackStyle.Light).catch(() => {});
    if (soundEnabled) playTapSound();
  } catch {
    // 音や感触が出せなくても、ボタンの動きは止めない
  }
}
