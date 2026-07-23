'use client';

import { geoMercator, geoPath } from 'd3-geo';
import type {
  Feature,
  FeatureCollection,
  GeoJsonProperties,
  Geometry,
} from 'geojson';
import { Lock, MapPin, MousePointer2, RotateCcw, Unlock } from 'lucide-react';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';

import {
  assignSalesperson,
  capitalizePolishName,
  countAssignments,
  formatPolishDate,
  parseSessionAssignments,
  validateEditPassword,
  type Assignments,
  type Salesperson,
} from './mapLogic';

export type { Salesperson } from './mapLogic';

const SALESPERSON_COLORS: Record<Salesperson, string> = {
  dawid: '#4A809E',    // Niebieski (Dopasowany do dark mode)
  nikola: '#C28340',   // Pomarańczowy
  magda: '#5E9C57',    // Zielony
  unassigned: '#2A2A2A' 
};

const SALESPERSON_NAMES: Record<Salesperson, string> = {
  dawid: 'Dawid (Iława)',
  nikola: 'Nikola (Iława)',
  magda: 'Magda (Oświęcim)',
  unassigned: 'Brak przypisania'
};

const DEFAULT_ASSIGNMENTS: Record<string, Salesperson> = {
  'zachodniopomorskie': 'dawid',
  'pomorskie': 'dawid',
  'lubuskie': 'dawid',
  'wielkopolskie': 'dawid',
  'dolnośląskie': 'dawid',
  'kujawsko-pomorskie': 'dawid',
  
  'warmińsko-mazurskie': 'nikola',
  'podlaskie': 'nikola',
  'mazowieckie': 'nikola',
  'lubelskie': 'nikola',

  'łódzkie': 'magda',
  'świętokrzyskie': 'magda',
  'opolskie': 'magda',
  'śląskie': 'magda',
  'małopolskie': 'magda',
  'podkarpackie': 'magda'
};

const MAP_SESSION_KEY = 'apt_calc_map_assignments';

type RegionProperties = GeoJsonProperties & {
  nazwa: string;
};

type RegionFeature = Feature<Geometry, RegionProperties>;
type RegionCollection = FeatureCollection<Geometry, RegionProperties>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRegionFeature(value: unknown): value is RegionFeature {
  if (!isRecord(value) || value.type !== 'Feature') {
    return false;
  }

  const { geometry, properties } = value;
  return (
    isRecord(geometry) &&
    (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') &&
    Array.isArray(geometry.coordinates) &&
    isRecord(properties) &&
    typeof properties.nazwa === 'string' &&
    properties.nazwa.length > 0
  );
}

function isRegionCollection(value: unknown): value is RegionCollection {
  return (
    isRecord(value) &&
    value.type === 'FeatureCollection' &&
    Array.isArray(value.features) &&
    value.features.length > 0 &&
    value.features.every(isRegionFeature)
  );
}

function logStorageError(operation: string, error: unknown): void {
  const errorType = error instanceof DOMException ? error.name : 'nieznany błąd';
  console.error(`Nie udało się ${operation} przypisań w sesji (${errorType}).`);
}

const SALESPERSON_IDS = Object.keys(
  SALESPERSON_COLORS,
) as Salesperson[];

export const MapTab: React.FC = () => {
  const [geoData, setGeoData] = useState<RegionCollection | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [activeBrush, setActiveBrush] = useState<Salesperson>('dawid');
  const [assignments, setAssignments] = useState<Assignments>({
    ...DEFAULT_ASSIGNMENTS,
  });
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [storageReady, setStorageReady] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const skipNextSaveRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadMap(): Promise<void> {
      try {
        const response = await fetch('/poland-voivodeships.geojson', {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Odpowiedź HTTP ${response.status}`);
        }

        const data: unknown = await response.json();
        if (!isRegionCollection(data)) {
          throw new Error('Nieprawidłowy format GeoJSON');
        }

        setGeoData(data);
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        console.error('Nie udało się załadować mapy województw.');
        setMapError('Nie udało się załadować mapy.');
      }
    }

    void loadMap();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    try {
      const storedValue = sessionStorage.getItem(MAP_SESSION_KEY);
      setAssignments(
        parseSessionAssignments(storedValue, DEFAULT_ASSIGNMENTS),
      );
    } catch (error: unknown) {
      logStorageError('odczytać', error);
      setAssignments({ ...DEFAULT_ASSIGNMENTS });
    } finally {
      setStorageReady(true);
    }
  }, []);

  useEffect(() => {
    if (!storageReady) {
      return;
    }

    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }

    try {
      sessionStorage.setItem(MAP_SESSION_KEY, JSON.stringify(assignments));
    } catch (error: unknown) {
      logStorageError('zapisać', error);
    }
  }, [assignments, storageReady]);

  const pathGenerator = useMemo(() => {
    if (geoData === null) {
      return null;
    }

    const projection = geoMercator().fitSize([700, 700], geoData);
    return geoPath().projection(projection);
  }, [geoData]);

  const currentDate = formatPolishDate(new Date());

  function updateRegion(regionName: string): void {
    if (!isEditMode) {
      return;
    }

    setAssignments((current) =>
      assignSalesperson(current, regionName, activeBrush),
    );
  }

  function handleRegionKeyDown(
    event: KeyboardEvent<SVGPathElement>,
    regionName: string,
  ): void {
    if (!isEditMode || (event.key !== 'Enter' && event.key !== ' ')) {
      return;
    }

    event.preventDefault();
    updateRegion(regionName);
  }

  function openPasswordModal(): void {
    setPasswordInput('');
    setPasswordError(false);
    setShowPasswordModal(true);
  }

  function closePasswordModal(): void {
    setShowPasswordModal(false);
    setPasswordInput('');
    setPasswordError(false);
  }

  function handlePasswordSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    if (!validateEditPassword(passwordInput)) {
      setPasswordError(true);
      return;
    }

    setIsEditMode(true);
    closePasswordModal();
  }

  function resetAssignments(): void {
    if (
      !window.confirm(
        'Czy na pewno chcesz zresetować wszystkie przypisania?',
      )
    ) {
      return;
    }

    skipNextSaveRef.current = true;
    setAssignments({ ...DEFAULT_ASSIGNMENTS });

    try {
      sessionStorage.removeItem(MAP_SESSION_KEY);
    } catch (error: unknown) {
      logStorageError('usunąć', error);
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 text-white md:px-8 md:py-10">
      <header className="mb-8 flex flex-col gap-3 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-sm font-bold tracking-[0.32em] text-[#c0a068]">
            KONO
          </div>
          <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">
            Mapa Regionów Handlowych
          </h1>
        </div>
        <time
          className="text-sm text-[#A4A4A3]"
          dateTime={new Date().toISOString()}
          suppressHydrationWarning
        >
          {currentDate}
        </time>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4 lg:gap-8">
        <aside className="space-y-6 lg:col-span-1" aria-label="Panel mapy">
          <div className="rounded-2xl border border-white/5 bg-[#232322] p-6 shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_8px_24px_-8px_rgba(0,0,0,0.5)]">
            {isEditMode ? (
              <>
                <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
                  <MousePointer2
                    className="h-5 w-5 text-[#c0a068]"
                    aria-hidden="true"
                  />
                  Edycja przypisań
                </h2>
                <p className="mb-6 text-sm leading-relaxed text-[#A4A4A3]">
                  Wybierz handlowca, a następnie kliknij województwo na mapie.
                </p>

                <div className="space-y-3" aria-label="Wybór handlowca">
                  {SALESPERSON_IDS.map((salesperson) => {
                    const isActive = activeBrush === salesperson;
                    return (
                      <button
                        key={salesperson}
                        type="button"
                        onClick={() => setActiveBrush(salesperson)}
                        aria-pressed={isActive}
                        aria-label={`Wybierz: ${SALESPERSON_NAMES[salesperson]}`}
                        className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition-all focus:outline-none focus:ring-2 focus:ring-[#c0a068] focus:ring-offset-2 focus:ring-offset-[#232322] ${
                          isActive
                            ? 'border-[#c0a068] bg-[#1a1a19]'
                            : 'border-white/10 bg-[#1D1D1B] hover:border-white/30'
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <span
                            className="h-4 w-4 rounded-full"
                            style={{
                              backgroundColor:
                                SALESPERSON_COLORS[salesperson],
                            }}
                            aria-hidden="true"
                          />
                          <span
                            className={`text-sm font-medium ${
                              isActive ? 'text-white' : 'text-[#A4A4A3]'
                            }`}
                          >
                            {SALESPERSON_NAMES[salesperson]}
                          </span>
                        </span>
                        {isActive && (
                          <span
                            className="h-2 w-2 rounded-full bg-[#c0a068]"
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6 space-y-3">
                  <button
                    type="button"
                    onClick={() => setIsEditMode(false)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#c0a068] px-4 py-3 text-sm font-semibold text-[#161615] transition hover:bg-[#d1b47e] focus:outline-none focus:ring-2 focus:ring-white"
                    aria-label="Zakończ tryb edycji"
                  >
                    <Unlock className="h-4 w-4" aria-hidden="true" />
                    🔓 Zakończ edycję
                  </button>
                  <button
                    type="button"
                    onClick={resetAssignments}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-medium text-[#A4A4A3] transition hover:border-[#ef4444]/60 hover:text-[#ef4444] focus:outline-none focus:ring-2 focus:ring-[#ef4444]"
                    aria-label="Zresetuj wszystkie przypisania"
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    Resetuj przypisania
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="mb-3 flex items-center gap-2 text-xl font-semibold">
                  <MapPin
                    className="h-5 w-5 text-[#c0a068]"
                    aria-hidden="true"
                  />
                  Podział regionów
                </h2>
                <p className="mb-6 text-sm leading-relaxed text-[#A4A4A3]">
                  Najedź na województwo, aby sprawdzić aktualne przypisanie.
                </p>
                <button
                  type="button"
                  onClick={openPasswordModal}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#c0a068] px-4 py-3 text-sm font-semibold text-[#161615] transition hover:bg-[#d1b47e] focus:outline-none focus:ring-2 focus:ring-white"
                  aria-label="Otwórz autoryzację trybu edycji"
                >
                  <Lock className="h-4 w-4" aria-hidden="true" />
                  🔒 Tryb edycji
                </button>
              </>
            )}
          </div>

          <div className="rounded-2xl border border-white/5 bg-[#232322] p-6 shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_8px_24px_-8px_rgba(0,0,0,0.5)]">
            <h2 className="mb-3 text-sm font-semibold">
              Statystyki województw
            </h2>
            <div className="space-y-2">
              {SALESPERSON_IDS.filter(
                (salesperson) => salesperson !== 'unassigned',
              ).map((salesperson) => (
                <div
                  key={salesperson}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="flex min-w-0 items-center gap-2 text-[#A4A4A3]">
                    <span
                      className="h-3 w-3 shrink-0 rounded-sm"
                      style={{
                        backgroundColor: SALESPERSON_COLORS[salesperson],
                      }}
                      aria-hidden="true"
                    />
                    <span className="truncate">
                      {SALESPERSON_NAMES[salesperson]}
                    </span>
                  </span>
                  <span
                    className="font-medium text-white"
                    aria-label={`${countAssignments(
                      assignments,
                      salesperson,
                    )} województw`}
                  >
                    {countAssignments(assignments, salesperson)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className="relative flex min-h-[440px] w-full flex-col items-center rounded-2xl border border-white/5 bg-[#232322] p-4 shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_8px_24px_-8px_rgba(0,0,0,0.5)] sm:min-h-[600px] sm:p-6 lg:col-span-3">
          <div className="flex w-full flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold sm:text-xl">
              <MapPin
                className="h-5 w-5 text-[#c0a068]"
                aria-hidden="true"
              />
              Podział Terytorialny Polski
            </h2>
            {isEditMode && (
              <span className="rounded-full border border-[#c0a068]/50 bg-[#c0a068]/10 px-3 py-1 text-xs font-semibold text-[#d1b47e]">
                Tryb edycji aktywny
              </span>
            )}
          </div>

          <div className="relative mt-4 aspect-square w-full max-w-[700px] flex-1">
            {mapError !== null ? (
              <div
                className="absolute inset-0 flex items-center justify-center text-center text-sm text-[#ef4444]"
                role="alert"
              >
                {mapError}
              </div>
            ) : geoData === null || pathGenerator === null ? (
              <div
                className="absolute inset-0 flex items-center justify-center text-[#A4A4A3]"
                role="status"
              >
                Ładowanie mapy...
              </div>
            ) : (
              <svg
                width="100%"
                height="100%"
                viewBox="0 0 700 700"
                className="drop-shadow-lg"
                role="group"
                aria-label="Mapa województw Polski"
              >
                {geoData.features.map((feature) => {
                  const regionName = feature.properties.nazwa;
                  const owner = assignments[regionName] ?? 'unassigned';
                  const isHovered = hoveredRegion === regionName;

                  return (
                    <path
                      key={regionName}
                      d={pathGenerator(feature) ?? ''}
                      fill={SALESPERSON_COLORS[owner]}
                      stroke="#161615"
                      strokeWidth={isHovered ? 3 : 1.5}
                      tabIndex={0}
                      role={isEditMode ? 'button' : 'img'}
                      aria-label={`${capitalizePolishName(
                        regionName,
                      )}: ${SALESPERSON_NAMES[owner]}${
                        isEditMode
                          ? `. Naciśnij Enter, aby przypisać: ${SALESPERSON_NAMES[activeBrush]}`
                          : ''
                      }`}
                      className={`transition-all duration-200 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#c0a068] ${
                        isEditMode ? 'cursor-pointer' : 'cursor-default'
                      }`}
                      onClick={
                        isEditMode
                          ? () => updateRegion(regionName)
                          : undefined
                      }
                      onKeyDown={
                        isEditMode
                          ? (event) =>
                              handleRegionKeyDown(event, regionName)
                          : undefined
                      }
                      onMouseEnter={() => setHoveredRegion(regionName)}
                      onMouseLeave={() => setHoveredRegion(null)}
                      onFocus={() => setHoveredRegion(regionName)}
                      onBlur={() => setHoveredRegion(null)}
                      style={{
                        transformOrigin: 'center',
                        transform: isHovered
                          ? 'scale(1.002)'
                          : 'scale(1)',
                      }}
                    />
                  );
                })}
              </svg>
            )}
          </div>

          {hoveredRegion !== null && (
            <div className="pointer-events-none absolute bottom-4 left-4 right-4 z-10 rounded-xl border border-white/10 bg-[#1D1D1B]/95 p-4 shadow-xl backdrop-blur sm:bottom-auto sm:left-auto sm:right-6 sm:top-16 sm:min-w-56">
              <div className="mb-1 text-base font-bold text-white sm:text-lg">
                {capitalizePolishName(hoveredRegion)}
              </div>
              <div className="flex items-center gap-2 text-sm text-[#A4A4A3]">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{
                    backgroundColor:
                      SALESPERSON_COLORS[
                        assignments[hoveredRegion] ?? 'unassigned'
                      ],
                  }}
                  aria-hidden="true"
                />
                <span>
                  {
                    SALESPERSON_NAMES[
                      assignments[hoveredRegion] ?? 'unassigned'
                    ]
                  }
                </span>
              </div>
            </div>
          )}
        </section>
      </div>

      {showPasswordModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="password-modal-title"
            aria-describedby={
              passwordError ? 'password-error' : 'password-modal-description'
            }
            className={`w-full max-w-md rounded-2xl border border-white/10 bg-[#1D1D1B] p-6 shadow-2xl sm:p-8 ${
              passwordError ? 'animate-shake' : ''
            }`}
          >
            <h2
              id="password-modal-title"
              className="text-xl font-semibold text-white"
            >
              Autoryzacja edycji
            </h2>
            <p
              id="password-modal-description"
              className="mt-2 text-sm text-[#A4A4A3]"
            >
              Podaj hasło, aby odblokować zmianę przypisań.
            </p>

            <form className="mt-6" onSubmit={handlePasswordSubmit}>
              <label
                htmlFor="map-edit-password"
                className="mb-2 block text-sm font-medium text-white"
              >
                Hasło
              </label>
              <input
                id="map-edit-password"
                type="password"
                value={passwordInput}
                onChange={(event) => {
                  setPasswordInput(event.target.value);
                  setPasswordError(false);
                }}
                placeholder="Podaj hasło..."
                autoComplete="current-password"
                autoFocus
                aria-invalid={passwordError}
                aria-describedby={
                  passwordError ? 'password-error' : undefined
                }
                className="w-full rounded-xl border border-white/10 bg-[#232322] px-4 py-3 text-white outline-none transition placeholder:text-[#6f6f6e] focus:border-[#c0a068] focus:ring-2 focus:ring-[#c0a068]/30"
              />

              <div className="mt-2 min-h-5" aria-live="polite">
                {passwordError && (
                  <p
                    id="password-error"
                    className="text-sm font-medium text-[#ef4444]"
                    role="alert"
                  >
                    Nieprawidłowe hasło
                  </p>
                )}
              </div>

              <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closePasswordModal}
                  className="rounded-xl border border-white/10 px-5 py-3 text-sm font-medium text-[#A4A4A3] transition hover:border-white/30 hover:text-white focus:outline-none focus:ring-2 focus:ring-white"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#c0a068] px-5 py-3 text-sm font-semibold text-[#161615] transition hover:bg-[#d1b47e] focus:outline-none focus:ring-2 focus:ring-white"
                >
                  Odblokuj
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
