/// <reference types="jest" />

import { formatDot, formatJa, isValidIsoDate, shiftDays, toIsoDate, today } from '../dates';

describe('toIsoDate', () => {
  it('端末のタイムゾーンの年月日を、ゼロ埋めした YYYY-MM-DD にする', () => {
    expect(toIsoDate(new Date(2025, 3, 2))).toBe('2025-04-02');
    expect(toIsoDate(new Date(2025, 11, 31, 23, 59))).toBe('2025-12-31');
  });
});

describe('today', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('今日の日付を返す', () => {
    jest.useFakeTimers({ now: new Date(2026, 8, 25, 9, 0) });
    expect(today()).toBe('2026-09-25');
  });
});

describe('shiftDays', () => {
  it('月や年をまたいで日付をずらす', () => {
    expect(shiftDays('2025-03-01', -1)).toBe('2025-02-28');
    expect(shiftDays('2024-03-01', -1)).toBe('2024-02-29');
    expect(shiftDays('2025-12-31', 1)).toBe('2026-01-01');
    expect(shiftDays('2025-04-12', 0)).toBe('2025-04-12');
  });
});

describe('isValidIsoDate', () => {
  it.each(['2025-04-12', '2024-02-29', '2000-01-01'])('%s は有効', (value) => {
    expect(isValidIsoDate(value)).toBe(true);
  });

  it.each(['2025-02-29', '2025-13-01', '2025-04-31', '2025-4-12', '2025/04/12', '', 'abcd-ef-gh'])(
    '%s は無効',
    (value) => {
      expect(isValidIsoDate(value)).toBe(false);
    },
  );
});

describe('formatDot / formatJa', () => {
  it('表示用の形に変える', () => {
    expect(formatDot('2025-04-12')).toBe('2025.04.12');
    expect(formatJa('2025-04-02')).toBe('2025年4月2日');
  });
});
