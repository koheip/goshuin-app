/// <reference types="jest" />

import { googleMapsUrl } from '../maps';

const base = {
  name: '明治神宮',
  prefecture: '東京都',
  address: null,
  latitude: null,
  longitude: null,
  placeId: null,
};

function queryOf(url: string) {
  return new URL(url).searchParams;
}

describe('googleMapsUrl', () => {
  it('位置がないときは、神社名と都道府県で検索する', () => {
    const url = googleMapsUrl(base);
    expect(url.startsWith('https://www.google.com/maps/search/?api=1&')).toBe(true);
    expect(queryOf(url).get('query')).toBe('明治神宮 東京都');
    expect(queryOf(url).has('query_place_id')).toBe(false);
  });

  it('住所があれば、都道府県より住所を優先する', () => {
    const url = googleMapsUrl({ ...base, address: '東京都渋谷区代々木神園町1-1' });
    expect(queryOf(url).get('query')).toBe('明治神宮 東京都渋谷区代々木神園町1-1');
  });

  it('都道府県も住所もなければ、神社名だけで検索する', () => {
    const url = googleMapsUrl({ ...base, prefecture: null });
    expect(queryOf(url).get('query')).toBe('明治神宮');
  });

  it('緯度・経度があれば、座標で検索する', () => {
    const url = googleMapsUrl({ ...base, latitude: 35.6764, longitude: 139.6993 });
    expect(queryOf(url).get('query')).toBe('35.6764,139.6993');
  });

  it('緯度・経度が 0 でも座標として扱う', () => {
    const url = googleMapsUrl({ ...base, latitude: 0, longitude: 0 });
    expect(queryOf(url).get('query')).toBe('0,0');
  });

  it('Place ID があれば query_place_id に入れる', () => {
    const url = googleMapsUrl({ ...base, placeId: 'ChIJ5SZMmreMGGARcz8QSTiJyo8' });
    expect(queryOf(url).get('query_place_id')).toBe('ChIJ5SZMmreMGGARcz8QSTiJyo8');
  });

  it('& や # を含む名前も壊れずにエンコードされる', () => {
    const url = googleMapsUrl({ ...base, name: 'A&B #1', prefecture: null });
    expect(queryOf(url).get('query')).toBe('A&B #1');
  });
});
