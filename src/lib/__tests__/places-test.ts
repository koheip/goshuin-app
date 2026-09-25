/// <reference types="jest" />

import { guessKind, parsePlaces } from '../places';

describe('guessKind', () => {
  it('Google の種別があればそれを使う', () => {
    expect(guessKind('成田山', ['buddhist_temple', 'place_of_worship'])).toBe('temple');
    expect(guessKind('〇〇寺', ['shinto_shrine'])).toBe('shrine');
  });

  it('種別がなければ名前の終わりで見分ける', () => {
    expect(guessKind('浅草寺')).toBe('temple');
    expect(guessKind('中尊寺金色堂')).toBe('temple');
    expect(guessKind('川崎大師')).toBe('temple');
    expect(guessKind('明治神宮')).toBe('shrine');
    expect(guessKind('伏見稲荷大社')).toBe('shrine');
  });
});

describe('parsePlaces', () => {
  it('候補に変換し、住所の先頭の「日本、〒」を取る', () => {
    const places = parsePlaces({
      places: [
        {
          id: 'abc',
          displayName: { text: '浅草寺' },
          formattedAddress: '日本、〒111-0032 東京都台東区浅草２丁目３−１',
          types: ['buddhist_temple'],
        },
        { id: 'no-name' },
        { displayName: { text: 'IDなし' } },
      ],
    });
    expect(places).toEqual([
      { placeId: 'abc', name: '浅草寺', address: '東京都台東区浅草２丁目３−１', kind: 'temple' },
    ]);
  });

  it('結果がなければ空にする', () => {
    expect(parsePlaces({})).toEqual([]);
  });
});
