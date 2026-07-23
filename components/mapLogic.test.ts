import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  POWIAT_COUNT,
  assignSalesperson,
  capitalizePolishName,
  countAssignments,
  createDefaultAssignments,
  formatPolishDate,
  hasExpectedPowiatCount,
  isRegionCollection,
  parseSessionAssignments,
  validateEditPassword,
  type Assignments,
  type RegionCollection,
} from './mapLogic';

const fallbackAssignments: Assignments = {
  '1416': 'dawid',
  '1465': 'nikola',
};

function collectionWithGeometry(geometry: unknown): unknown {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { terc: '1416', name: 'powiat ostrowski' },
        geometry,
      },
    ],
  };
}

const samplePolygon = {
  type: 'Polygon',
  coordinates: [
    [
      [21.8, 52.8],
      [22, 52.9],
      [21.8, 52.8],
    ],
  ],
};

describe('isRegionCollection', () => {
  it('accepts a representative PRG powiat Polygon', () => {
    expect(isRegionCollection(collectionWithGeometry(samplePolygon))).toBe(true);
  });

  it('accepts a MultiPolygon', () => {
    expect(
      isRegionCollection(
        collectionWithGeometry({
          type: 'MultiPolygon',
          coordinates: [samplePolygon.coordinates],
        }),
      ),
    ).toBe(true);
  });

  it.each([
    ['missing TERC', { name: 'powiat ostrowski' }],
    ['non-four-digit TERC', { terc: '141', name: 'powiat ostrowski' }],
    ['missing name', { terc: '1416' }],
  ])('rejects invalid county properties: %s', (_caseName, properties) => {
    expect(
      isRegionCollection({
        type: 'FeatureCollection',
        features: [{ type: 'Feature', properties, geometry: samplePolygon }],
      }),
    ).toBe(false);
  });
});

describe('county data', () => {
  it('contains the expected 380 unique TERC-coded powiaty', () => {
    const raw: unknown = JSON.parse(
      readFileSync(resolve(process.cwd(), 'public/poland-counties.geojson'), 'utf8'),
    );

    expect(isRegionCollection(raw)).toBe(true);
    if (!isRegionCollection(raw)) {
      return;
    }

    expect(hasExpectedPowiatCount(raw)).toBe(true);
    expect(raw.features).toHaveLength(POWIAT_COUNT);
    expect(new Set(raw.features.map((feature) => feature.properties.terc)).size).toBe(
      POWIAT_COUNT,
    );
  });
});

describe('createDefaultAssignments', () => {
  it('inherits the existing voivodeship allocation from TERC prefixes', () => {
    const regions: RegionCollection = {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', properties: { terc: '1416', name: 'powiat ostrowski' }, geometry: samplePolygon },
        { type: 'Feature', properties: { terc: '0611', name: 'powiat lubelski' }, geometry: samplePolygon },
      ],
    };

    expect(
      createDefaultAssignments(regions, { '14': 'nikola', '06': 'dawid' }),
    ).toEqual({ '1416': 'nikola', '0611': 'dawid' });
  });
});

describe('validateEditPassword', () => {
  it('accepts exactly qwer', () => {
    expect(validateEditPassword('qwer')).toBe(true);
  });

  it.each(['QWER', ' qwer', 'qwer ', 'qwe', ''])(
    'rejects another password or surrounding whitespace: %s',
    (password) => {
      expect(validateEditPassword(password)).toBe(false);
    },
  );
});

describe('assignSalesperson', () => {
  it('returns a new assignment record keyed by TERC without mutation', () => {
    const assignments: Assignments = { '1416': 'dawid' };
    const updated = assignSalesperson(assignments, '1416', 'magda');

    expect(updated).toEqual({ '1416': 'magda' });
    expect(updated).not.toBe(assignments);
    expect(assignments).toEqual({ '1416': 'dawid' });
  });
});

describe('parseSessionAssignments', () => {
  it('parses valid TERC-keyed JSON', () => {
    expect(
      parseSessionAssignments(
        '{"1416":"magda","1465":"nikola"}',
        fallbackAssignments,
      ),
    ).toEqual({ '1416': 'magda', '1465': 'nikola' });
  });

  it.each([
    ['no value', null],
    ['malformed JSON', '{'],
    ['unknown salesperson', '{"1416":"jan"}'],
  ])('returns a fallback copy for: %s', (_caseName, storedValue) => {
    const result = parseSessionAssignments(storedValue, fallbackAssignments);

    expect(result).toEqual(fallbackAssignments);
    expect(result).not.toBe(fallbackAssignments);
  });

  it('ignores IDs absent from the county fallback', () => {
    expect(
      parseSessionAssignments(
        '{"1416":"magda","1465":"nikola","9999":"dawid"}',
        fallbackAssignments,
      ),
    ).toEqual({ '1416': 'magda', '1465': 'nikola' });
  });
});

describe('formatters and statistics', () => {
  it('capitalizes Polish county names', () => {
    expect(capitalizePolishName('powiat śląski')).toBe('Powiat śląski');
  });

  it('formats Polish dates', () => {
    expect(formatPolishDate(new Date(2026, 6, 23))).toBe('23 lipca 2026');
  });

  it('counts assigned powiaty', () => {
    expect(
      countAssignments({ '1416': 'dawid', '0611': 'dawid', '1465': 'nikola' }, 'dawid'),
    ).toBe(2);
  });
});
