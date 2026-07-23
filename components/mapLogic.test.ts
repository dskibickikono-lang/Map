import { describe, expect, it } from 'vitest';

import {
  assignSalesperson,
  capitalizePolishName,
  countAssignments,
  formatPolishDate,
  isRegionCollection,
  parseSessionAssignments,
  validateEditPassword,
  type Assignments,
} from './mapLogic';

const fallbackAssignments: Assignments = {
  pomorskie: 'dawid',
  mazowieckie: 'nikola',
};

function collectionWithGeometry(geometry: unknown): unknown {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { nazwa: 'pomorskie' },
        geometry,
      },
    ],
  };
}

describe('isRegionCollection', () => {
  it('akceptuje poprawny Polygon', () => {
    expect(
      isRegionCollection(
        collectionWithGeometry({
          type: 'Polygon',
          coordinates: [
            [
              [18.1, 54.1],
              [18.7, 54.2],
              [18.1, 54.1],
            ],
          ],
        }),
      ),
    ).toBe(true);
  });

  it('akceptuje poprawny MultiPolygon', () => {
    expect(
      isRegionCollection(
        collectionWithGeometry({
          type: 'MultiPolygon',
          coordinates: [
            [
              [
                [18.1, 54.1],
                [18.7, 54.2],
                [18.1, 54.1],
              ],
            ],
          ],
        }),
      ),
    ).toBe(true);
  });

  it.each([
    [
      'wartość tekstowa',
      {
        type: 'Polygon',
        coordinates: [[[18.1, '54.1']]],
      },
    ],
    [
      'NaN',
      {
        type: 'Polygon',
        coordinates: [[[18.1, Number.NaN]]],
      },
    ],
    [
      'pozycja krótsza niż dwie współrzędne',
      {
        type: 'Polygon',
        coordinates: [[[18.1]]],
      },
    ],
  ])('odrzuca niepoprawne współrzędne: %s', (_caseName, geometry) => {
    expect(isRegionCollection(collectionWithGeometry(geometry))).toBe(false);
  });
});

describe('validateEditPassword', () => {
  it('akceptuje dokładnie hasło qwer', () => {
    expect(validateEditPassword('qwer')).toBe(true);
  });

  it.each(['QWER', ' qwer', 'qwer ', 'qwe', ''])(
    'odrzuca inne hasło lub dodatkowe białe znaki: %s',
    (password) => {
      expect(validateEditPassword(password)).toBe(false);
    },
  );
});

describe('assignSalesperson', () => {
  it('zwraca nowe przypisania bez mutowania wejścia', () => {
    const assignments: Assignments = { pomorskie: 'dawid' };

    const updated = assignSalesperson(assignments, 'pomorskie', 'magda');

    expect(updated).toEqual({ pomorskie: 'magda' });
    expect(updated).not.toBe(assignments);
    expect(assignments).toEqual({ pomorskie: 'dawid' });
  });
});

describe('parseSessionAssignments', () => {
  it('parsuje poprawne przypisania zapisane jako JSON', () => {
    expect(
      parseSessionAssignments(
        '{"pomorskie":"magda","mazowieckie":"nikola"}',
        fallbackAssignments,
      ),
    ).toEqual({ pomorskie: 'magda', mazowieckie: 'nikola' });
  });

  it.each([
    ['brak wartości', null],
    ['uszkodzony JSON', '{'],
    ['nieznany handlowiec', '{"pomorskie":"jan"}'],
  ])('zwraca kopię fallbacku dla: %s', (_caseName, storedValue) => {
    const result = parseSessionAssignments(storedValue, fallbackAssignments);

    expect(result).toEqual(fallbackAssignments);
    expect(result).not.toBe(fallbackAssignments);
  });

  it('ignoruje klucze spoza fallbacku', () => {
    expect(
      parseSessionAssignments(
        '{"pomorskie":"magda","mazowieckie":"nikola","fikcyjne":"dawid"}',
        fallbackAssignments,
      ),
    ).toEqual({
      pomorskie: 'magda',
      mazowieckie: 'nikola',
    });
  });

  it('uzupełnia brakujący klucz wartością z fallbacku', () => {
    expect(
      parseSessionAssignments(
        '{"pomorskie":"magda"}',
        fallbackAssignments,
      ),
    ).toEqual({
      pomorskie: 'magda',
      mazowieckie: 'nikola',
    });
  });
});

describe('capitalizePolishName', () => {
  it('kapitalizuje pierwszą literę polskiej nazwy', () => {
    expect(capitalizePolishName('śląskie')).toBe('Śląskie');
  });
});

describe('formatPolishDate', () => {
  it('formatuje datę z polską nazwą miesiąca', () => {
    expect(formatPolishDate(new Date(2026, 6, 23))).toBe('23 lipca 2026');
  });
});

describe('countAssignments', () => {
  it('liczy województwa przypisane do wskazanego handlowca', () => {
    const assignments: Assignments = {
      pomorskie: 'dawid',
      lubuskie: 'dawid',
      mazowieckie: 'nikola',
    };

    expect(countAssignments(assignments, 'dawid')).toBe(2);
  });
});
