/// <reference types="jest" />

import { guessLineage, lineageOf } from '../catalog';

describe('guessLineage', () => {
  it('名前から系統を推測する', () => {
    expect(guessLineage('於満稲荷神社', 'shrine')?.id).toBe('inari');
    expect(guessLineage('ポーラ稲荷（屋上）', 'shrine')?.id).toBe('inari');
    expect(guessLineage('芝大神宮', 'shrine')?.id).toBe('shinmei');
    expect(guessLineage('八坂神社', 'shrine')?.id).toBe('gion');
    expect(guessLineage('八雲神社', 'shrine')?.id).toBe('gion');
    expect(guessLineage('出雲大社東京分祠', 'shrine')?.id).toBe('izumo');
  });

  it('わからない名前や、お寺は推測しない', () => {
    expect(guessLineage('明治神宮', 'shrine')).toBeUndefined();
    expect(guessLineage('豊川稲荷', 'temple')).toBeUndefined();
  });
});

describe('lineageOf', () => {
  it('保存した系統を優先し、none なら系統なし、null なら名前から推測する', () => {
    expect(lineageOf({ name: '笠森稲荷', kind: 'shrine', lineage: null })?.id).toBe('inari');
    expect(lineageOf({ name: '笠森稲荷', kind: 'shrine', lineage: 'none' })).toBeUndefined();
    expect(lineageOf({ name: '地元の神社', kind: 'shrine', lineage: 'izumo' })?.id).toBe('izumo');
  });
});
