# Agents Guide

## Overview

This guide provides information for AI agents (including Copilot) working with the **HR Kono Handel** (Map) repository.

**Repository**: [dskibickikono-lang/Map](https://github.com/dskibickikono-lang/Map)  
**Language**: TypeScript  
**Framework**: Next.js 14 with App Router  
**Deployed At**: https://map-rosy-chi.vercel.app

---

## Purpose

The **Map** application is an interactive Next.js application that displays a map of Polish powiaty (counties) and their assignment to sales representatives (handlowcy). The primary use case is managing and visualizing HR regional sales territories.

---

## Project Structure

```
Map/
├── app/
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout component
│   └── page.tsx             # Main page component
├── components/
│   ├── MapTab.tsx           # Main map UI component
│   ├── mapLogic.ts          # Core map logic and utilities
│   └── mapLogic.test.ts     # Unit tests for map logic
├── public/
│   ├── poland-counties.geojson      # Poland powiaty GeoJSON (TERC-keyed)
│   └── poland-voivodeships.geojson  # Retained comparison GeoJSON
├── next.config.js           # Next.js configuration
├── package.json             # Dependencies and scripts
├── tailwind.config.ts       # Tailwind CSS configuration
├── tsconfig.json            # TypeScript configuration
└── vercel.json              # Vercel deployment configuration
```

---

## Key Features

1. **Preview Mode**: View current powiat assignments to sales representatives
2. **Tooltips**: Display powiat name and TERC code and assigned representative on hover/focus
3. **Edit Mode**: Assign sales representatives to powiaty via click or keyboard
4. **Password Protected Editing**: Edit mode requires password `qwer` (client-side UI lock only)
5. **Statistics Panel**: Shows count of powiaty assigned to each sales representative
6. **Session Storage**: Changes persist only within current browser session (sessionStorage)

---

## Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Testing**: Vitest
- **Mapping**: GeoJSON (client-side rendering)
- **Deployment**: Vercel

---

## Development Commands

| Command | Purpose |
|---------|---------|
| `npm install` | Install dependencies |
| `npm run dev` | Start development server (localhost:3000) |
| `npm run build` | Build production bundle |
| `npm start` | Run built production app |
| `npm test` | Run Vitest test suite |

---

## Important Notes for Agents

### Data Storage
- **Session-based**: Changes are stored in `sessionStorage` and do not persist across browser sessions
- **No backend**: The application is entirely client-side; there is no API for data persistence
- **GeoJSON source**: Powiat boundaries come from `public/poland-counties.geojson`; assignments are keyed by four-digit TERC codes

### Security Considerations
- The password `qwer` for edit mode is **client-side only** and is **not** a security mechanism
- This is a UI lock, not authentication or data protection
- No sensitive data should be stored in this application

### Edit Mode Flow
1. User enters password `qwer` to unlock edit mode
2. User clicks on powiaty, pans/zooms the map, or uses the county search with a keyboard to assign sales representatives
3. Changes are saved to `sessionStorage`
4. A reset button restores default assignments
5. Closing the browser clears all changes

### Code Organization
- **MapTab.tsx**: Contains the React component rendering the map UI
- **mapLogic.ts**: Contains pure functions for map logic (assignment, statistics calculation)
- **mapLogic.test.ts**: Unit tests for the logic layer (use Vitest)

---

## Deployment

The project uses Vercel for deployment:

1. Repository is connected to Vercel
2. `vercel.json` contains deployment configuration
3. Build command: `npm run build`
4. No environment variables required
5. Automatically deploys on main branch changes

Current deployment: https://map-rosy-chi.vercel.app

---

## Maintenance & Upgrades

### Known Issues
- **Next.js 14 EOL**: Next.js 14 is no longer supported. Before production deployment, migrate to a currently supported Next.js version.

### When Making Changes
- **TypeScript**: Ensure strict typing is maintained
- **Tests**: Add tests for new `mapLogic.ts` functions
- **Tailwind**: Use existing Tailwind classes for styling consistency
- **GeoJSON**: If updating powiat data, retain the GeoJSON format and unique `terc`/`name` properties in `public/poland-counties.geojson`

---

## Requirements

- Node.js >= 18.17.0
- npm (or equivalent package manager)

---

## Resources

- **README.md**: User-facing documentation
- **package.json**: Full dependency list
- **GitHub Issues**: Feature requests and bug reports welcome
- **Vercel Dashboard**: Deployment logs and analytics

---

## Contact & Support

- Repository: https://github.com/dskibickikono-lang/Map
- Owner: [@dskibickikono-lang](https://github.com/dskibickikono-lang)
