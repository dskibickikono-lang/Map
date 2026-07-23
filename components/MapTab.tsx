'use client';

import { geoMercator, geoPath } from 'd3-geo';
import { Lock, MapPin, MousePointer2, RotateCcw, Search, Unlock, ZoomIn, ZoomOut } from 'lucide-react';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';

import {
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
  type Salesperson,
} from './mapLogic';

export type { Salesperson } from './mapLogic';

const SALESPERSON_COLORS: Record<Salesperson, string> = {
  dawid: '#4A809E',
  nikola: '#C28340',
  magda: '#5E9C57',
  unassigned: '#2A2A2A',
};

const SALESPERSON_NAMES: Record<Salesperson, string> = {
  dawid: 'Dawid (Iława)',
  nikola: 'Nikola (Iława)',
  magda: 'Magda (Oświęcim)',
  unassigned: 'Brak przypisania',
};

const DEFAULT_OWNERS_BY_VOIVODESHIP: Record<string, Salesperson> = {
  '02': 'dawid',
  '04': 'dawid',
  '06': 'nikola',
  '08': 'dawid',
  '10': 'magda',
  '12': 'magda',
  '14': 'nikola',
  '16': 'magda',
  '18': 'magda',
  '20': 'nikola',
  '22': 'dawid',
  '24': 'magda',
  '26': 'magda',
  '28': 'nikola',
  '30': 'dawid',
  '32': 'dawid',
};

// The legacy name-keyed voivodeship session schema is intentionally not read.
// County assignments use stable TERC identifiers and begin from the inherited defaults.
const MAP_SESSION_KEY = 'apt_calc_map_county_assignments_v1';

function logStorageError(operation: string, error: unknown): void {
  const errorType = error instanceof DOMException ? error.name : 'nieznany błąd';
  console.error('Nie udało się ' + operation + ' przypisań w sesji (' + errorType + ').');
}

const SALESPERSON_IDS = Object.keys(
  SALESPERSON_COLORS,
) as Salesperson[];

type BoundaryCollection = {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: RegionCollection['features'][number]['geometry'];
  }>;
};

function isBoundaryCollection(value: unknown): value is BoundaryCollection {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('type' in value) ||
    value.type !== 'FeatureCollection' ||
    !('features' in value) ||
    !Array.isArray(value.features)
  ) {
    return false;
  }

  return value.features.every(
    (feature) =>
      typeof feature === 'object' &&
      feature !== null &&
      'type' in feature &&
      feature.type === 'Feature' &&
      'geometry' in feature &&
      typeof feature.geometry === 'object' &&
      feature.geometry !== null &&
      'type' in feature.geometry &&
      (feature.geometry.type === 'Polygon' ||
        feature.geometry.type === 'MultiPolygon'),
  );
}

export const MapTab: React.FC = () => {
  const [geoData, setGeoData] = useState<RegionCollection | null>(null);
  const [voivodeshipData, setVoivodeshipData] =
    useState<BoundaryCollection | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [activeBrush, setActiveBrush] = useState<Salesperson>('dawid');
  const [assignments, setAssignments] = useState<Assignments>({});
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [storageReady, setStorageReady] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [passwordAttempt, setPasswordAttempt] = useState(0);
  const [countyQuery, setCountyQuery] = useState('');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const passwordModalRef = useRef<HTMLDivElement>(null);
  const unlockButtonRef = useRef<HTMLButtonElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const didDragRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadMap(): Promise<void> {
      try {
        const response = await fetch('/poland-counties.geojson', {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('Odpowiedź HTTP ' + response.status);
        }

        const data: unknown = await response.json();
        if (!isRegionCollection(data) || !hasExpectedPowiatCount(data)) {
          throw new Error('Nieprawidłowy format GeoJSON');
        }

        const defaults = createDefaultAssignments(
          data,
          DEFAULT_OWNERS_BY_VOIVODESHIP,
        );
        setGeoData(data);

        try {
          setAssignments(
            parseSessionAssignments(
              sessionStorage.getItem(MAP_SESSION_KEY),
              defaults,
            ),
          );
        } catch (error: unknown) {
          logStorageError('odczytać', error);
          setAssignments(defaults);
        } finally {
          setStorageReady(true);
        }
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        console.error('Nie udało się załadować mapy powiatów.', error);
        setMapError('Nie udało się załadować mapy.');
      }
    }

    void loadMap();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadVoivodeshipBoundaries(): Promise<void> {
      try {
        const response = await fetch('/poland-voivodeships.geojson', {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('Odpowiedź HTTP ' + response.status);
        }

        const data: unknown = await response.json();
        if (!isBoundaryCollection(data)) {
          throw new Error('Nieprawidłowy format GeoJSON');
        }

        setVoivodeshipData(data);
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        console.error('Nie udało się załadować granic województw.', error);
      }
    }

    void loadVoivodeshipBoundaries();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!storageReady) {
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
  const defaultAssignments = useMemo(
    () =>
      geoData === null
        ? {}
        : createDefaultAssignments(geoData, DEFAULT_OWNERS_BY_VOIVODESHIP),
    [geoData],
  );
  const hoveredFeature = useMemo(
    () =>
      geoData?.features.find(
        (feature) => feature.properties.terc === hoveredRegion,
      ) ?? null,
    [geoData, hoveredRegion],
  );
  const hoveredOwner: Salesperson =
    hoveredRegion === null
      ? 'unassigned'
      : assignments[hoveredRegion] ?? 'unassigned';
  const matchingRegions = useMemo(() => {
    const query = countyQuery.trim().toLocaleLowerCase('pl-PL');
    if (query.length === 0 || geoData === null) {
      return [];
    }

    return geoData.features
      .filter(({ properties }) =>
        (properties.name + ' ' + properties.terc)
          .toLocaleLowerCase('pl-PL')
          .includes(query),
      )
      .slice(0, 8);
  }, [countyQuery, geoData]);

  function updateRegion(regionId: string): void {
    if (!isEditMode) {
      return;
    }

    setAssignments((current) =>
      assignSalesperson(current, regionId, activeBrush),
    );
  }

  function handleRegionKeyDown(
    event: ReactKeyboardEvent<SVGPathElement>,
    regionId: string,
  ): void {
    if (!isEditMode || (event.key !== 'Enter' && event.key !== ' ')) {
      return;
    }

    event.preventDefault();
    updateRegion(regionId);
  }

  function selectRegionFromSearch(regionId: string): void {
    setHoveredRegion(regionId);
    updateRegion(regionId);
  }

  function getSvgPoint(event: ReactPointerEvent<SVGSVGElement>): {
    x: number;
    y: number;
  } {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * 700,
      y: ((event.clientY - bounds.top) / bounds.height) * 700,
    };
  }

  function handleMapPointerDown(event: ReactPointerEvent<SVGSVGElement>): void {
    if (zoom === 1) {
      return;
    }

    const point = getSvgPoint(event);
    didDragRef.current = false;
    dragStartRef.current = { x: point.x, y: point.y, panX: pan.x, panY: pan.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleMapPointerMove(event: ReactPointerEvent<SVGSVGElement>): void {
    const dragStart = dragStartRef.current;
    if (dragStart === null) {
      return;
    }

    const point = getSvgPoint(event);
    if (Math.abs(point.x - dragStart.x) > 3 || Math.abs(point.y - dragStart.y) > 3) {
      didDragRef.current = true;
    }

    const maxPan = (zoom - 1) * 350;
    setPan({
      x: Math.max(-maxPan, Math.min(maxPan, dragStart.panX + point.x - dragStart.x)),
      y: Math.max(-maxPan, Math.min(maxPan, dragStart.panY + point.y - dragStart.y)),
    });
  }

  function handleMapPointerEnd(event: ReactPointerEvent<SVGSVGElement>): void {
    dragStartRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function changeZoom(amount: number): void {
    setZoom((current) => Math.max(1, Math.min(3, current + amount)));
    if (zoom + amount <= 1) {
      setPan({ x: 0, y: 0 });
    }
  }

  function resetViewport(): void {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  function openPasswordModal(): void {
    setPasswordInput('');
    setPasswordError(false);
    setPasswordAttempt(0);
    setShowPasswordModal(true);
  }

  function closePasswordModal(): void {
    setShowPasswordModal(false);
    setPasswordInput('');
    setPasswordError(false);
    setPasswordAttempt(0);
  }

  function handlePasswordSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    if (!validateEditPassword(passwordInput)) {
      setPasswordError(true);
      setPasswordAttempt((attempt) => attempt + 1);
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

    setAssignments({ ...defaultAssignments });
  }

  useEffect(() => {
    if (!showPasswordModal) {
      return;
    }

    function handleModalKeyDown(event: globalThis.KeyboardEvent): void {
      if (event.key === 'Escape') {
        event.preventDefault();
        setShowPasswordModal(false);
        setPasswordInput('');
        setPasswordError(false);
        setPasswordAttempt(0);
        return;
      }

      if (event.key !== 'Tab' || passwordModalRef.current === null) {
        return;
      }

      const focusableElements =
        passwordModalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );

      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = focusableElements.item(0);
      const lastElement = focusableElements.item(
        focusableElements.length - 1,
      );

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener('keydown', handleModalKeyDown);
    return () => {
      document.removeEventListener('keydown', handleModalKeyDown);
      unlockButtonRef.current?.focus();
    };
  }, [showPasswordModal]);

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
                  Wybierz handlowca, a następnie kliknij powiat na mapie.
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
                  Najedź na powiat, aby sprawdzić aktualne przypisanie.
                </p>
                <button
                  ref={unlockButtonRef}
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
              Statystyki powiatów
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
                    )} powiatów`}
                  >
                    {countAssignments(assignments, salesperson)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-[#232322] p-6 shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_8px_24px_-8px_rgba(0,0,0,0.5)]">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Search className="h-4 w-4 text-[#c0a068]" aria-hidden="true" />
              Wyszukaj powiat
            </h2>
            <label htmlFor="county-search" className="sr-only">
              Nazwa lub kod TERC powiatu
            </label>
            <input
              id="county-search"
              type="search"
              value={countyQuery}
              onChange={(event) => setCountyQuery(event.target.value)}
              placeholder="Nazwa lub kod TERC..."
              className="w-full rounded-xl border border-white/10 bg-[#1D1D1B] px-3 py-2 text-sm text-white outline-none placeholder:text-[#6f6f6e] focus:border-[#c0a068] focus:ring-2 focus:ring-[#c0a068]/30"
            />
            {countyQuery.trim().length > 0 && (
              <div className="mt-3 space-y-1" aria-live="polite">
                {matchingRegions.length === 0 ? (
                  <p className="text-sm text-[#A4A4A3]">Nie znaleziono powiatu.</p>
                ) : (
                  matchingRegions.map(({ properties }) => (
                    <button
                      key={properties.terc}
                      type="button"
                      onClick={() => selectRegionFromSearch(properties.terc)}
                      onFocus={() => setHoveredRegion(properties.terc)}
                      className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left text-sm text-[#A4A4A3] transition hover:bg-white/5 hover:text-white focus:outline-none focus:ring-2 focus:ring-[#c0a068]"
                    >
                      <span className="min-w-0 truncate">{capitalizePolishName(properties.name)}</span>
                      <span className="shrink-0 text-xs text-[#c0a068]">{properties.terc}</span>
                    </button>
                  ))
                )}
              </div>
            )}
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
              <>
              <div className="absolute right-2 top-2 z-10 flex gap-2 sm:right-4 sm:top-4" aria-label="Sterowanie mapą">
                <button
                  type="button"
                  onClick={() => changeZoom(0.5)}
                  className="rounded-lg border border-white/10 bg-[#1D1D1B]/95 p-2 text-[#d1b47e] shadow-lg transition hover:border-[#c0a068] focus:outline-none focus:ring-2 focus:ring-[#c0a068]"
                  aria-label="Powiększ mapę"
                >
                  <ZoomIn className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => changeZoom(-0.5)}
                  disabled={zoom === 1}
                  className="rounded-lg border border-white/10 bg-[#1D1D1B]/95 p-2 text-[#d1b47e] shadow-lg transition hover:border-[#c0a068] focus:outline-none focus:ring-2 focus:ring-[#c0a068] disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Pomniejsz mapę"
                >
                  <ZoomOut className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={resetViewport}
                  disabled={zoom === 1 && pan.x === 0 && pan.y === 0}
                  className="rounded-lg border border-white/10 bg-[#1D1D1B]/95 px-2 text-xs font-semibold text-[#d1b47e] shadow-lg transition hover:border-[#c0a068] focus:outline-none focus:ring-2 focus:ring-[#c0a068] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Reset
                </button>
              </div>
              <svg
                width="100%"
                height="100%"
                viewBox="0 0 700 700"
                className="touch-none drop-shadow-lg"
                role="group"
                aria-label="Mapa powiatów Polski. Użyj wyszukiwarki powiatów, aby obsłużyć mapę klawiaturą."
                onPointerDown={handleMapPointerDown}
                onPointerMove={handleMapPointerMove}
                onPointerUp={handleMapPointerEnd}
                onPointerCancel={handleMapPointerEnd}
              >
                <g transform={'translate(' + pan.x + ' ' + pan.y + ') translate(350 350) scale(' + zoom + ') translate(-350 -350)'}>
                {geoData.features.map((feature) => {
                  const regionId = feature.properties.terc;
                  const regionName = feature.properties.name;
                  const owner = assignments[regionId] ?? 'unassigned';
                  const isHovered = hoveredRegion === regionId;

                  return (
                    <path
                      key={regionId}
                      d={pathGenerator(feature) ?? ''}
                      fill={SALESPERSON_COLORS[owner]}
                      stroke="#161615"
                      strokeWidth={isHovered ? 3 : 1.5}
                      tabIndex={-1}
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
                          ? () => {
                              if (!didDragRef.current) {
                                updateRegion(regionId);
                              }
                            }
                          : undefined
                      }
                      onKeyDown={
                        isEditMode
                          ? (event) =>
                              handleRegionKeyDown(event, regionId)
                          : undefined
                      }
                      onMouseEnter={() => setHoveredRegion(regionId)}
                      onMouseLeave={() => setHoveredRegion(null)}
                      onFocus={() => setHoveredRegion(regionId)}
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
                {voivodeshipData?.features.map((feature, index) => (
                  <path
                    key={'voivodeship-boundary-' + index}
                    d={pathGenerator(feature.geometry) ?? ''}
                    fill="none"
                    stroke="#c0a068"
                    strokeWidth={1.25}
                    vectorEffect="non-scaling-stroke"
                    strokeLinejoin="round"
                    pointerEvents="none"
                    aria-hidden="true"
                  />
                ))}
                </g>
              </svg>
              </>
            )}
          </div>

          {hoveredFeature !== null && (
            <div className="pointer-events-none absolute bottom-4 left-4 right-4 z-10 rounded-xl border border-white/10 bg-[#1D1D1B]/95 p-4 shadow-xl backdrop-blur sm:bottom-auto sm:left-auto sm:right-6 sm:top-16 sm:min-w-56">
              <div className="mb-1 text-base font-bold text-white sm:text-lg">
                {capitalizePolishName(hoveredFeature.properties.name)}
              </div>
              <div className="mb-2 text-xs font-medium tracking-wide text-[#c0a068]">
                TERC: {hoveredFeature.properties.terc}
              </div>
              <div className="flex items-center gap-2 text-sm text-[#A4A4A3]">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{
                    backgroundColor:
                      SALESPERSON_COLORS[hoveredOwner],
                  }}
                  aria-hidden="true"
                />
                <span>
                  {
                    SALESPERSON_NAMES[hoveredOwner]
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
            ref={passwordModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="password-modal-title"
            aria-describedby={
              passwordError ? 'password-error' : 'password-modal-description'
            }
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1D1D1B] p-6 shadow-2xl sm:p-8"
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
                key={passwordAttempt}
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
                className={`w-full rounded-xl border border-white/10 bg-[#232322] px-4 py-3 text-white outline-none transition placeholder:text-[#6f6f6e] focus:border-[#c0a068] focus:ring-2 focus:ring-[#c0a068]/30 ${
                  passwordError ? 'animate-shake' : ''
                }`}
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
