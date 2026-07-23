# Mapa Regionów Handlowych KONO

Aplikacja Next.js prezentująca interaktywną mapę powiatów Polski i ich przypisanie do handlowców. Projekt korzysta z Next.js 14 oraz App Routera.

## Wymagania

- Node.js `>=18.17.0`
- npm

## Uruchomienie lokalne

```bash
npm install
npm run dev
```

Po uruchomieniu aplikacja jest dostępna pod adresem wyświetlonym przez Next.js (domyślnie `http://localhost:3000`).

Pozostałe komendy:

```bash
npm run build  # produkcyjny build Next.js
npm start      # uruchomienie zbudowanej aplikacji
npm test       # testy Vitest
```

## Funkcje

- Tryb podglądu pozwala sprawdzać aktualne przypisania regionów.
- Tooltip po najechaniu pokazuje powiat, kod TERC i przypisanego handlowca.
- Tryb edycji pozwala wybrać handlowca oraz przypisać go do powiatu kliknięciem albo przez wyszukiwarkę dostępną z klawiatury.
- Wejście do edycji wymaga hasła `qwer`; reset przywraca domyślne przypisania.
- Panel statystyk podaje liczbę powiatów przypisanych do każdego handlowca.
- Zmiany są przechowywane w `sessionStorage` tylko w bieżącej sesji przeglądarki.

> Hasło `qwer` jest wyłącznie klientową blokadą interfejsu. Nie stanowi uwierzytelniania ani mechanizmu ochrony danych.

## Dane mapy

GeoJSON z 380 granicami powiatów jest częścią projektu: `public/poland-counties.geojson`. Funkcje są kluczowane oficjalnym czterocyfrowym kodem TERC, a granice pochodzą z PRG GUGiK i zostały uproszczone do renderowania SVG. Poprzedni plik `public/poland-voivodeships.geojson` pozostaje w repozytorium jako punkt odniesienia.

## Wdrożenie na Vercel

1. Zaimportuj repozytorium do Vercel.
2. Vercel wykryje projekt Next.js na podstawie `vercel.json`.
3. Pozostaw komendę budowania `npm run build` i wdroż aplikację.

Nie są wymagane zmienne środowiskowe.

## Struktura projektu

```text
.
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── MapTab.tsx
│   ├── mapLogic.ts
│   └── mapLogic.test.ts
├── public/
│   ├── poland-counties.geojson
│   └── poland-voivodeships.geojson
├── next.config.js
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── vercel.json
```

## Uwaga o wersji Next.js

Next.js 14 jest przypięty zgodnie z wymaganiem projektu. Ta linia jest jednak EOL; przed publicznym wdrożeniem produkcyjnym zalecana jest migracja do wspieranej linii Next.js.
