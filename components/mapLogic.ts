export type Salesperson = 'dawid' | 'nikola' | 'magda' | 'unassigned';
export type Assignments = Record<string, Salesperson>;

export type Position = [number, number, ...number[]];

export type PolygonGeometry = {
  type: 'Polygon';
  coordinates: Position[][];
};

export type MultiPolygonGeometry = {
  type: 'MultiPolygon';
  coordinates: Position[][][];
};

export type RegionProperties = {
  nazwa: string;
};

export type RegionFeature = {
  type: 'Feature';
  geometry: PolygonGeometry | MultiPolygonGeometry;
  properties: RegionProperties;
};

export type RegionCollection = {
  type: 'FeatureCollection';
  features: RegionFeature[];
};

const EDIT_PASSWORD = 'qwer';
const SALESPERSONS: readonly Salesperson[] = [
  'dawid',
  'nikola',
  'magda',
  'unassigned',
];

export function validateEditPassword(password: string): boolean {
  return password === EDIT_PASSWORD;
}

export function assignSalesperson(
  assignments: Assignments,
  regionName: string,
  salesperson: Salesperson,
): Assignments {
  return {
    ...assignments,
    [regionName]: salesperson,
  };
}

function isSalesperson(value: unknown): value is Salesperson {
  return (
    typeof value === 'string' &&
    SALESPERSONS.some((salesperson) => salesperson === value)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPosition(value: unknown): value is Position {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    value.every(
      (coordinate) =>
        typeof coordinate === 'number' && Number.isFinite(coordinate),
    )
  );
}

function isLinearRing(value: unknown): value is Position[] {
  return Array.isArray(value) && value.length > 0 && value.every(isPosition);
}

function isPolygonCoordinates(value: unknown): value is Position[][] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(isLinearRing)
  );
}

function isMultiPolygonCoordinates(value: unknown): value is Position[][][] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(isPolygonCoordinates)
  );
}

function isRegionFeature(value: unknown): value is RegionFeature {
  if (!isRecord(value) || value.type !== 'Feature') {
    return false;
  }

  const { geometry, properties } = value;
  if (
    !isRecord(properties) ||
    typeof properties.nazwa !== 'string' ||
    properties.nazwa.length === 0 ||
    !isRecord(geometry)
  ) {
    return false;
  }

  return (
    (geometry.type === 'Polygon' &&
      isPolygonCoordinates(geometry.coordinates)) ||
    (geometry.type === 'MultiPolygon' &&
      isMultiPolygonCoordinates(geometry.coordinates))
  );
}

export function isRegionCollection(
  value: unknown,
): value is RegionCollection {
  return (
    isRecord(value) &&
    value.type === 'FeatureCollection' &&
    Array.isArray(value.features) &&
    value.features.length > 0 &&
    value.features.every(isRegionFeature)
  );
}

function normalizeAssignments(
  parsed: Record<string, unknown>,
  fallback: Assignments,
): Assignments {
  return Object.fromEntries(
    Object.entries(fallback).map(([regionName, fallbackOwner]) => {
      const storedOwner = parsed[regionName];
      return [
        regionName,
        isSalesperson(storedOwner) ? storedOwner : fallbackOwner,
      ];
    }),
  );
}

export function parseSessionAssignments(
  storedValue: string | null,
  fallback: Assignments,
): Assignments {
  if (storedValue === null) {
    return { ...fallback };
  }

  try {
    const parsed: unknown = JSON.parse(storedValue);
    return isRecord(parsed)
      ? normalizeAssignments(parsed, fallback)
      : { ...fallback };
  } catch (error: unknown) {
    if (error instanceof SyntaxError) {
      return { ...fallback };
    }

    throw error;
  }
}

export function capitalizePolishName(name: string): string {
  if (name.length === 0) {
    return name;
  }

  return `${name.charAt(0).toLocaleUpperCase('pl-PL')}${name.slice(1)}`;
}

export function formatPolishDate(date: Date): string {
  return new Intl.DateTimeFormat('pl-PL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Warsaw',
  }).format(date);
}

export function countAssignments(
  assignments: Assignments,
  salesperson: Salesperson,
): number {
  return Object.values(assignments).filter((owner) => owner === salesperson)
    .length;
}
