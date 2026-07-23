export type Salesperson = 'dawid' | 'nikola' | 'magda' | 'unassigned';
export type Assignments = Record<string, Salesperson>;

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

function isAssignments(value: unknown): value is Assignments {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every(isSalesperson)
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
    return isAssignments(parsed) ? { ...parsed } : { ...fallback };
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
