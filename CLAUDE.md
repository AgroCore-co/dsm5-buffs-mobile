# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Mobile app for buffalo herd management (BUFFS) — tracks lactation, reproduction, health, and pasture management. Built with React Native 0.81 / React 19. **Android only** — never run iOS commands (`pod install`, `run-ios`, etc.).

## Commands

```bash
# Start Metro with cache clear (always prefer this)
npx react-native start --reset-cache

# Run on Android
npm run android

# Lint
npm run lint

# Type check
npx tsc --noEmit

# Tests
npm test                          # all tests
npx jest --testPathPattern=<file> # single test file
```

## Architecture

### Navigation (App.tsx)

Two-level navigation:
- **Stack** (`RootStackParamList`): top-level — `Login` (unauthenticated) or `MainTab` + modal screens (`AnimalDetail`, `NfcScannerScreen`, `Notificacoes`)
- **Bottom Tab**: `Home`, `Rebanho`, `Lactação`, `Reprodução`, `Piquetes`

Auth gate lives in `AppContent` — reads `userToken` from `AuthContext` to decide which stack to render.

### Context Providers (wrapping order matters)

```
GestureHandlerRootView → SafeAreaProvider → AuthProvider → PropriedadeProvider → PortalProvider → BottomSheetModalProvider → NavigationContainer
```

- **AuthContext** (`src/context/AuthContext.tsx`): JWT auth with auto-refresh on boot. Stores `userToken`, `refreshToken`, `expiresAt`, `user` in AsyncStorage. Exposes `login`, `logout`, `user`, `loading` (boot), `authenticating` (login button).
- **PropriedadeContext** (`src/context/PropriedadeContext.tsx`): global selected farm ID (`propriedadeSelecionada`). Most data-fetching screens depend on this.

### API Layer

`src/lib/apiClient.ts` — single `apiFetch` function. Reads `API_URL` from env, automatically attaches Bearer token, and silently refreshes the access token when expired. All service files go through this.

Environment variable: `API_URL` in `.env` (loaded via `react-native-dotenv` from `@env`).

### Services (`src/services/`)

One file per domain: `bufaloService`, `lactacaoService`, `reproducaoService`, `piqueteService`, `sanitarioService`, `zootecnicoService`, `alertaService`, `propriedadeService`, `grupoService`, `authService`, `userService`.

All use `apiFetch`. Pagination follows the pattern `{ data: [...], meta: { page, limit, total, totalPages, hasNextPage, hasPrevPage } }`.

### Components

- **Bottom sheets**: use `@gorhom/bottom-sheet` (`BottomSheetModal`). Must be inside `BottomSheetModalProvider` + `PortalProvider`.
- **Forms**: `FormBufalo`, `FormLactacao`, `FormColeta`, `FormReproductionAdd/Att`, `FormSanitario`, `FormZootecnico`, `FormEstoque`
- **Modals**: `Modal`, `ModalBottomSheet`, `ModalAlertaDelete`, `ModalStatus`
- **Map**: `src/components/Mapa` — uses `react-native-maps` + geolocation

### Styling

All colors via `src/styles/colors.ts` — semantic token palette (`colors.brand.*`, `colors.text.*`, `colors.bg.*`, `colors.border.*`, `colors.status.*`, `colors.overlay.*`). Never use raw hex values inline.

### Icons

SVG icons in `src/icons/` via `react-native-svg` + `react-native-svg-transformer`. Assets in `assets/`.