# MapTab - Interaktywna Mapa Polski

Komponent React do interaktywnego zarządzania przeszłością terytoriów w Polsce. Umożliwia przypisywanie województw do handlowców z wizualizacją na mapie.

## 🚀 Szybki Start

### 1. Zainstaluj wymagane biblioteki

```bash
npm install d3-geo lucide-react
npm install -D @types/d3-geo
```

### 2. Dodaj plik GeoJSON

Utwórz plik `public/poland-voivodeships.geojson` w swoim projekcie i wklej zawartość z tego linku:
- [poland-voivodeships.geojson](https://raw.githubusercontent.com/colon-sk/poland-map/main/data/voivodeships.geojson)

**Krok po kroku:**
1. Kliknij prawym przyciskiem myszy na powyższy link
2. Wybierz "Zapisz jako..." lub "Save link as..."
3. Zapisz plik w katalogu `public/` pod nazwą `poland-voivodeships.geojson`

### 3. Skopiuj komponent MapTab

Plik `components/MapTab.tsx` już znajduje się w repozytorium. Możesz go zaimportować w swoim projekcie.

## 📖 Użycie

### Podstawowy import

```tsx
import { MapTab } from '@/components/MapTab';

export default function App() {
  return (
    <div>
      <MapTab />
    </div>
  );
}
```

### Struktura komponentu

```tsx
export type Salesperson = 'dawid' | 'nikola' | 'magda' | 'unassigned';

interface Assignment {
  [voivodeship: string]: Salesperson;
}
```

## 🎨 Dostępni Handlowcy

| Imię | Kolor | Opis |
|------|-------|------|
| **Dawid** | 🔵 Niebieski (#4A809E) | Iława - Zachodnia i Północna Polska |
| **Nikola** | 🟠 Pomarańczowy (#C28340) | Iława - Wschodnia i Północno-wschodnia Polska |
| **Magda** | 🟢 Zielony (#5E9C57) | Oświęcim - Środkowa i Południowa Polska |
| **Unassigned** | ⚫ Ciemny (#2A2A2A) | Brak przypisania |

## 🛠️ Funkcjonalności

✅ **Interaktywna mapa** - Kliknij na województwo aby zmienić przypisanie  
✅ **Wybór handlowca** - Panel boczny do szybkiego wyboru  
✅ **Tooltip** - Informacje po najechaniu myszą  
✅ **Statystyki** - Liczba przypisanych województw na handlowca  
✅ **Persystencja** - Przypisania są zapisane w sessionStorage  
✅ **Responsywny design** - Dostosowuje się do rozmiaru ekranu  

## 🎯 Jak korzystać z mapy

1. **Wybierz handlowca** - Kliknij na imię handlowca w lewym panelu
2. **Kliknij na województwo** - Na mapie po prawej aby je przypisać
3. **Podgląd** - Najechaj myszą na województwo aby zobaczyć szczegóły
4. **Statystyki** - Dolny panel pokazuje ile województw przypisano każdemu handlowcy

## 📦 Struktura projektu

```
project-root/
├── components/
│   └── MapTab.tsx          # Komponent mapy
├── public/
│   └── poland-voivodeships.geojson  # Dane geograficzne
├── package.json
└── README.md
```

## 🔧 Konfiguracja

Domyślne przypisania województw znajdują się w `DEFAULT_ASSIGNMENTS`:

```tsx
const DEFAULT_ASSIGNMENTS: Record<string, Salesperson> = {
  'zachodniopomorskie': 'dawid',
  'pomorskie': 'dawid',
  // ... itd
};
```

Aby zmienić domyślne przypisania, edytuj tę zmienną w `MapTab.tsx`.

## 💾 Dane sesji

Przypisania są automatycznie zapisywane w `sessionStorage` pod kluczem `apt_calc_map_assignments`. Dane będą zachowane podczas pracy w bieżącej sesji przeglądarki.

## 🎨 Dostosowanie stylów

Komponent używa **Tailwind CSS**. Aby zmienić kolory lub style:

1. Edytuj `SALESPERSON_COLORS` aby zmienić kolory województw
2. Edytuj `SALESPERSON_NAMES` aby zmienić nazwy handlowców
3. Modyfikuj klasy Tailwind w JSX aby zmienić wygląd

## 📋 Wymagania

- React 16.8+ (z hooks)
- Next.js lub inny framework z wsparciem JSX
- Tailwind CSS
- d3-geo
- lucide-react

## 🐛 Troubleshooting

### Mapa się nie ładuje
- Sprawdź czy plik `public/poland-voivodeships.geojson` istnieje
- Sprawdź konsolę przeglądarki (F12) czy są błędy

### Brak kolorów
- Sprawdź czy Tailwind CSS jest poprawnie skonfigurowany
- Upewnij się że używasz pełnego koloru (np. `bg-[#4A809E]`)

### Przypisania się nie zapisują
- Sprawdź czy sessionStorage jest dostępny
- Może być zablokowany przez przeglądarę lub rozszerzenie

## 📄 Licencja

HR Kono Handel - 2026

## 👥 Autorzy

Komponenty opracowane dla: **Kono Handlowcy**
- Dawid (Iława)
- Nikola (Iława)
- Magda (Oświęcim)
