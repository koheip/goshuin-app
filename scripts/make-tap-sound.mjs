// ボタンを押したときの「ポチッ」という音（assets/sounds/tap.wav）を作る。
// 使い方：node scripts/make-tap-sound.mjs
// 高さが下がる短い音に、すぐ消える減衰をかけている。計算で作るので、素材の権利の心配がない

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RATE = 44100;
const SECONDS = 0.08;
const START_HZ = 420;
const END_HZ = 240;
const PEAK = 0.4;

const count = Math.round(RATE * SECONDS);
const samples = new Int16Array(count);
let phase = 0;
for (let i = 0; i < count; i++) {
  const t = i / count;
  const hz = START_HZ + (END_HZ - START_HZ) * t;
  phase += (2 * Math.PI * hz) / RATE;
  // 出だしのプツッという雑音を防ぐ短い立ち上がりと、指数的な減衰
  const attack = Math.min(1, i / (RATE * 0.002));
  const decay = Math.exp(-t * 7);
  samples[i] = Math.round(Math.sin(phase) * attack * decay * PEAK * 32767);
}

const data = Buffer.from(samples.buffer);
const header = Buffer.alloc(44);
header.write('RIFF', 0);
header.writeUInt32LE(36 + data.length, 4);
header.write('WAVE', 8);
header.write('fmt ', 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20); // PCM
header.writeUInt16LE(1, 22); // モノラル
header.writeUInt32LE(RATE, 24);
header.writeUInt32LE(RATE * 2, 28);
header.writeUInt16LE(2, 32);
header.writeUInt16LE(16, 34);
header.write('data', 36);
header.writeUInt32LE(data.length, 40);

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'sounds', 'tap.wav');
writeFileSync(out, Buffer.concat([header, data]));
console.log(`書き出しました: ${out}`);
