# Mapa Regionów Handlowych KONO

Aplikacja Next.js prezentująca interaktywną mapę województw Polski i ich przypisanie do handlowców. Projekt korzysta z Next.js 14 oraz App Routera.

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
- Tooltip po najechaniu lub ustawieniu fokusu pokazuje województwo i przypisanego handlowca.
- Tryb edycji pozwala wybrać handlowca oraz przypisać go do województwa kliknięciem lub klawiaturą.
- Wejście do edycji wymaga hasła `qwer`; reset przywraca domyślne przypisania.
- Panel statystyk podaje liczbę województw przypisanych do każdego handlowca.
- Zmiany są przechowywane w `sessionStorage` tylko w bieżącej sesji przeglądarki.

> Hasło `qwer` jest wyłącznie klientową blokadą interfejsu. Nie stanowi uwierzytelniania ani mechanizmu ochrony danych.

## Dane mapy

GeoJSON z granicami województw jest już częścią projektu: `public/poland-voivodeships.geojson`. Nie trzeba go pobierać ani konfigurować osobno.

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
│   └── poland-voivodeships.geojson
├── next.config.js
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── vercel.json
```

## Uwaga o wersji Next.js

Next.js 14 jest przypięty zgodnie z wymaganiem projektu. Ta linia jest jednak EOL; przed publicznym wdrożeniem produkcyjnym zalecana jest migracja do wspieranej linii Next.js.
