import React, { useEffect, useState, useMemo } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import { MapPin, MousePointer2 } from 'lucide-react';

export type Salesperson = 'dawid' | 'nikola' | 'magda' | 'unassigned';

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

export const MapTab: React.FC = () => {
  const [geoData, setGeoData] = useState<any>(null);
  const [activeBrush, setActiveBrush] = useState<Salesperson>('dawid');
  const [assignments, setAssignments] = useState<Record<string, Salesperson>>(() => {
    try {
      const stored = sessionStorage.getItem(MAP_SESSION_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    return DEFAULT_ASSIGNMENTS;
  });
  
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

  useEffect(() => {
    fetch('/poland-voivodeships.geojson')
      .then(r => r.json())
      .then(data => setGeoData(data))
      .catch(err => console.error('Błąd ładowania mapy:', err));
  }, []);

  useEffect(() => {
    sessionStorage.setItem(MAP_SESSION_KEY, JSON.stringify(assignments));
  }, [assignments]);

  const handleRegionClick = (regionName: string) => {
    setAssignments(prev => ({
      ...prev,
      [regionName]: activeBrush
    }));
  };

  const pathGenerator = useMemo(() => {
    if (!geoData) return null;
    const projection = geoMercator().fitSize([700, 700], geoData);
    return geoPath().projection(projection);
  }, [geoData]);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Panel boczny / Legenda i narzędzia */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[#232322] p-6 rounded-2xl border border-white/5 shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_8px_24px_-8px_rgba(0,0,0,0.5)]">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <MousePointer2 className="w-5 h-5 text-[#c0a068]" />
              Edycja przypisań
            </h2>
            <p className="text-sm text-[#A4A4A3] mb-6">
              Wybierz handlowca z listy poniżej, a następnie klikaj na województwa na mapie, aby zmienić ich przypisanie.
            </p>
            
            <div className="space-y-3">
              {(Object.keys(SALESPERSON_COLORS) as Salesperson[]).map(sp => (
                <button
                  key={sp}
                  onClick={() => setActiveBrush(sp)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${activeBrush === sp ? 'border-[#c0a068] bg-[#1a1a19]' : 'border-white/10 bg-[#1D1D1B] hover:border-white/30'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: SALESPERSON_COLORS[sp] }} />
                    <span className={`text-sm font-medium ${activeBrush === sp ? 'text-white' : 'text-[#A4A4A3]'}`}>
                      {SALESPERSON_NAMES[sp]}
                    </span>
                  </div>
                  {activeBrush === sp && <div className="w-2 h-2 rounded-full bg-[#c0a068]" />}
                </button>
              ))}
            </div>
          </div>
          
          <div className="bg-[#232322] p-6 rounded-2xl border border-white/5 shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_8px_24px_-8px_rgba(0,0,0,0.5)]">
            <h3 className="text-sm font-semibold text-white mb-3">Statystyki województw</h3>
            <div className="space-y-2">
              {(Object.keys(SALESPERSON_COLORS) as Salesperson[]).filter(sp => sp !== 'unassigned').map(sp => {
                const count = Object.values(assignments).filter(v => v === sp).length;
                return (
                  <div key={sp} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-[#A4A4A3]">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: SALESPERSON_COLORS[sp] }} />
                      {SALESPERSON_NAMES[sp]}
                    </div>
                    <span className="text-white font-medium">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Mapa */}
        <div className="lg:col-span-3 bg-[#232322] p-6 rounded-2xl border border-white/5 shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_8px_24px_-8px_rgba(0,0,0,0.5)] flex flex-col items-center relative min-h-[600px]">
          <h2 className="text-xl font-semibold text-white mb-2 self-start flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#c0a068]" />
            Podział Terytorialny Polski
          </h2>
          
          <div className="w-full max-w-[700px] aspect-square flex-1 mt-4 relative">
            {!geoData ? (
              <div className="absolute inset-0 flex items-center justify-center text-[#A4A4A3]">
                Ładowanie mapy...
              </div>
            ) : (
              <svg width="100%" height="100%" viewBox="0 0 700 700" className="drop-shadow-lg">
                {geoData.features.map((feature: any) => {
                  const name = feature.properties.nazwa;
                  const owner = assignments[name] || 'unassigned';
                  const fill = SALESPERSON_COLORS[owner];
                  const isHovered = hoveredRegion === name;

                  return (
                    <path
                      key={name}
                      d={pathGenerator!(feature) || ''}
                      fill={fill}
                      stroke="#161615"
                      strokeWidth={isHovered ? 3 : 1.5}
                      className="cursor-pointer transition-all duration-200 hover:brightness-110"
                      onClick={() => handleRegionClick(name)}
                      onMouseEnter={() => setHoveredRegion(name)}
                      onMouseLeave={() => setHoveredRegion(null)}
                      style={{ transformOrigin: 'center', transform: isHovered ? 'scale(1.002)' : 'scale(1)' }}
                    />
                  );
                })}
              </svg>
            )}
          </div>
          
          {/* Tooltip */}
          {hoveredRegion && (
            <div className="absolute top-8 right-8 bg-[#1D1D1B] border border-white/10 p-4 rounded-xl shadow-xl pointer-events-none z-10">
              <div className="text-white font-bold capitalize text-lg mb-1">{hoveredRegion}</div>
              <div className="flex items-center gap-2 text-sm text-[#A4A4A3]">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: SALESPERSON_COLORS[assignments[hoveredRegion] || 'unassigned'] }} />
                <span>{SALESPERSON_NAMES[assignments[hoveredRegion] || 'unassigned']}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
