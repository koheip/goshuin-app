/// <reference types="jest" />

import { distanceMeters, formatDistance, guessKind, parseNearbyPlaces, parsePlaces } from '../places';

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

describe('distanceMeters', () => {
  it('東京駅から浅草寺までおよそ4.4km', () => {
    const d = distanceMeters({ latitude: 35.68124, longitude: 139.76712 }, { latitude: 35.71477, longitude: 139.79666 });
    expect(d).toBeGreaterThan(4300);
    expect(d).toBeLessThan(4600);
  });

  it('同じ場所なら0', () => {
    expect(distanceMeters({ latitude: 35, longitude: 139 }, { latitude: 35, longitude: 139 })).toBe(0);
  });
});

describe('formatDistance', () => {
  it('1km未満は10m単位、それ以上はkm', () => {
    expect(formatDistance(3)).toBe('10m');
    expect(formatDistance(348)).toBe('350m');
    expect(formatDistance(1234)).toBe('1.2km');
    expect(formatDistance(12345)).toBe('12km');
  });
});

describe('parseNearbyPlaces', () => {
  it('位置のない候補を除き、近い順に並べる', () => {
    const center = { latitude: 35.7, longitude: 139.8 };
    const places = parseNearbyPlaces(
      {
        places: [
          { id: 'far', displayName: { text: '遠い神社' }, types: ['shinto_shrine'], location: { latitude: 35.72, longitude: 139.8 } },
          { id: 'near', displayName: { text: '近い寺' }, types: ['buddhist_temple'], location: { latitude: 35.701, longitude: 139.8 } },
          { id: 'nowhere', displayName: { text: '位置なし神社' } },
        ],
      },
      center,
    );
    expect(places.map((p) => p.placeId)).toEqual(['near', 'far']);
    expect(places[0]).toMatchObject({ name: '近い寺', kind: 'temple', latitude: 35.701, longitude: 139.8 });
    expect(Math.round(places[0].distance)).toBe(111);
  });
});
