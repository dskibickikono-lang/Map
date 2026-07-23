import { describe, expect, it } from 'vitest';

import {
  assignSalesperson,
  capitalizePolishName,
  countAssignments,
  formatPolishDate,
  parseSessionAssignments,
  validateEditPassword,
  type Assignments,
} from './mapLogic';

const fallbackAssignments: Assignments = {
  pomorskie: 'dawid',
  mazowieckie: 'nikola',
};

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
