# Refatoração Mobile Completa — Buffs Mobile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar o app React Native de gerenciamento bubalino em um produto profissional, escalável e consistente — com novo módulo de Piquetes/Lotes/Grupos, Home redesenhada como dashboard, Design System estruturado e camada de dados com TanStack Query.

**Architecture:** O plano está dividido em 5 fases progressivas. Cada fase produz software funcional e testável independentemente. A Fase 1 (infraestrutura) deve ser concluída antes das demais pois todas dependem do cliente de dados e do sistema de formulários. As Fases 2–5 podem ser executadas em paralelo após a Fase 1.

**Tech Stack:** React Native 0.81, TypeScript, @gorhom/bottom-sheet v5, react-native-webview (Leaflet), AsyncStorage → MMKV (migração), + TanStack Query, React Hook Form, Zod, Lucide React Native, FlashList

---

## Diagnóstico Técnico (Contexto para o Executor)

Antes de começar, leia este diagnóstico. Ele explica o **por quê** de cada task.

### Problemas Críticos

**1. Scroll aninhado perigoso em VisualizarPiqueteSheet:**
`BottomSheet > BottomSheetScrollView > FlatList (RefreshControl) > WebView(height=690)`
Este é o pior padrão do projeto — múltiplos containers de scroll competindo por gestos, com um WebView de 690px fixo dentro de um FlatList dentro de um BottomSheet. Causa crashes e congelamento garantidos em dispositivos lentos.

**2. PiquetesScreen usa FlatList com fake data:**
```tsx
data={[{ key: 'map' }]} // fake data
renderItem={() => <MapLeaflet ... />}
```
O FlatList existe apenas para ter o `RefreshControl`. O mapa tem `height: 690` fixo e a tela exibe APENAS o mapa. Não há lista de piquetes, cards, grupos nem qualquer informação operacional.

**3. MapLeaflet reconstrói o HTML inteiro a cada mudança:**
O `useMemo` em MapLeaflet depende de `[piquetes]`, então qualquer mudança nos piquetes causa rebuild completo do HTML → reload do WebView → flash visual. A solução é separar o HTML estático do conteúdo dinâmico via `injectJavaScript`.

**4. GPS watch ativo em múltiplas telas simultaneamente:**
`useGpsLocation` é instanciado em PiquetesScreen, DemarcacaoPiqueteSheet e VisualizarPiqueteSheet. Cada instância abre um `watchPosition` independente — drenando bateria e causando conflitos.

**5. Estado global sem persistência:**
`PropriedadeContext` usa `useState` puro. Ao fechar/reabrir o app, a propriedade selecionada é perdida e o usuário precisa selecionar novamente.

**6. Fetching manual com race conditions:**
HomeScreen tem `useEffect → loadInitialData → fetchPropriedades() → fetchDashboard()` sequencial sem cancelamento, sem cache, sem deduplicação. O `fetchDashboard` só é chamado se `propriedadeSelecionada` existe, mas pode ser chamado antes da seleção ter sido resolvida.

**7. Formulários com 10+ useState:**
`CadastrarBufaloForm` tem `nome, brinco, microchip, dtNascimento, sexo, nivelMaturidade, idRaca, brincoPai, brincoMae, isSaving, racas, showDatePicker, openSexo, openMaturidade, openRaca` — 15 estados separados sem validação estruturada.

**8. Módulo de Piquetes incompleto:**
A API suporta: CRUD de lotes, CRUD de grupos, movimentação entre lotes (`/mov-lote`), histórico de movimentações, status atual do grupo. O mobile implementa apenas: criar lote (via mapa), visualizar lotes (via mapa). **Não existe**: listagem de grupos, movimentação de grupos, histórico, capacidade/ocupação, status.

**9. Tipagem fraca generalizada:**
`prop?: any[]`, `dashboard: any`, `selectedZootec: any`, `user: any | null`. Nenhum DTO tipado compartilhado com a API.

**10. `axios` instalado mas não usado:**
O projeto usa `apiFetch` (fetch nativo) mas mantém `axios` no package.json como peso morto.

### Problemas Médios

- `useEffect` com dependência `[propriedadeSelecionada]` na HomeScreen chama tanto `fetchPropriedades` quanto `fetchDashboard` mesmo quando só o dashboard precisa recarregar
- `VisualizarPiqueteSheet` tem título errado: "Demarcação de Nova Área/Piquete" (cópia do DemarcacaoSheet)
- Ícones inconsistentes: `sex.tsx` é `GlobeIcon` usado na aba "Reprodução", `agroCore.tsx` é um logo usado como ícone de filtro
- `react-native-dropdown-picker` instalado mas sendo substituído pelo `SelectBottomSheet` próprio — ambos coexistem
- Paginação na RebanhoScreen usa botões "Anterior/Próxima" em vez de infinite scroll
- Propriedade selecionada não é repassada ao `useEffect` de PiquetesScreen: `useEffect(() => { fetchPiquetes(); }, [])` — array de deps vazio ignora mudança de propriedade

### Problemas Leves

- `colors.bg.screen` (`#f8fcfa`) não é usado — telas usam `backgroundColor: colors.text.heading` (`#111827`) como container
- `MainLayout` importa `useDimensions` mas não usa `hp`
- `loadingContainer` duplicado em HomeScreen e PiquetesScreen com estilos idênticos
- `// z` e comentários sem sentido no código
- Nomes misturados: `YellowButton` exportado de `Button/index.tsx`

---

## Estrutura de Arquivos Proposta

```
src/
├── components/
│   ├── ui/                          # Design System primitivos
│   │   ├── Button/index.tsx
│   │   ├── Input/index.tsx
│   │   ├── Select/index.tsx
│   │   ├── Card/index.tsx
│   │   ├── Badge/index.tsx
│   │   ├── EmptyState/index.tsx
│   │   └── LoadingSpinner/index.tsx
│   ├── layout/
│   │   ├── ScreenHeader/index.tsx   # Header padrão reutilizável
│   │   └── MainLayout/index.tsx
│   └── domain/                      # Componentes de negócio
│       ├── animals/
│       ├── piquetes/
│       │   ├── LoteCard/index.tsx
│       │   ├── GrupoCard/index.tsx
│       │   └── MovimentacaoItem/index.tsx
│       └── home/
│           ├── KpiCard/index.tsx
│           └── AlertaBanner/index.tsx
├── screens/
│   ├── Home/HomeScreen.tsx
│   ├── Rebanho/RebanhoScreen.tsx
│   ├── Piquetes/
│   │   ├── PiquetesScreen.tsx       # Dashboard (lista de lotes/grupos)
│   │   ├── MapaScreen.tsx           # Mapa isolado (tab secundária)
│   │   └── DetalheGrupoScreen.tsx   # Detalhe + histórico
│   └── ...
├── services/
│   ├── api/
│   │   ├── client.ts                # apiFetch (atual apiClient.ts)
│   │   ├── lote.api.ts
│   │   ├── grupo.api.ts
│   │   └── movLote.api.ts
│   └── queries/                     # TanStack Query hooks
│       ├── useLotes.ts
│       ├── useGrupos.ts
│       └── useMovLote.ts
├── types/
│   ├── lote.types.ts
│   ├── grupo.types.ts
│   └── movLote.types.ts
└── styles/
    ├── colors.ts                    # Já existe, manter
    ├── typography.ts                # NOVO
    └── spacing.ts                   # NOVO
```

---

## FASE 1 — Infraestrutura e Fundação

### Task 1: Instalar e configurar TanStack Query

**Files:**
- Create: `src/lib/queryClient.ts`
- Modify: `App.tsx`
- Modify: `package.json`

- [ ] **Step 1: Instalar dependências**

```bash
cd "/home/v1nisouza/Área de trabalho/PASTA PI/dsm5-buffs-mobile"
npm install @tanstack/react-query
```

- [ ] **Step 2: Criar QueryClient**

Criar `src/lib/queryClient.ts`:

```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});
```

- [ ] **Step 3: Envolver App com QueryClientProvider**

Em `App.tsx`, adicionar import e wrapper:

```typescript
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './src/lib/queryClient';
```

No JSX, adicionar dentro de `GestureHandlerRootView`, antes de `SafeAreaProvider`:

```tsx
<QueryClientProvider client={queryClient}>
  <SafeAreaProvider>
    ...
  </SafeAreaProvider>
</QueryClientProvider>
```

- [ ] **Step 4: Verificar que o app compila**

```bash
npx react-native start --reset-cache
```

Esperar: Metro bundler inicia sem erros de import.

- [ ] **Step 5: Commit**

```bash
git add src/lib/queryClient.ts App.tsx package.json package-lock.json
git commit -m "feat: instala e configura TanStack Query"
```

---

### Task 2: Criar hooks de query para Propriedade e Dashboard

**Files:**
- Create: `src/services/queries/usePropriedades.ts`
- Create: `src/services/queries/useDashboard.ts`
- Modify: `src/screens/HomeScreen.tsx`

- [ ] **Step 1: Criar hook usePropriedades**

Criar `src/services/queries/usePropriedades.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import propriedadeService from '../propriedadeService';

export const PROPRIEDADES_KEY = ['propriedades'] as const;

export function usePropriedades() {
  return useQuery({
    queryKey: PROPRIEDADES_KEY,
    queryFn: () => propriedadeService.getPropriedades().then(r => r.propriedades),
  });
}
```

- [ ] **Step 2: Criar hook useDashboard**

Criar `src/services/queries/useDashboard.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import propriedadeService from '../propriedadeService';

export const DASHBOARD_KEY = (propriedadeId: string | null) =>
  ['dashboard', propriedadeId] as const;

export function useDashboard(propriedadeId: string | null) {
  return useQuery({
    queryKey: DASHBOARD_KEY(propriedadeId),
    queryFn: () =>
      propriedadeService
        .getDashboardPropriedade(propriedadeId!)
        .then(r => r.dashboard),
    enabled: !!propriedadeId,
  });
}
```

- [ ] **Step 3: Refatorar HomeScreen para usar os hooks**

Substituir o conteúdo de `src/screens/HomeScreen.tsx`:

```typescript
import React from "react";
import { View, FlatList, StyleSheet, RefreshControl } from "react-native";
import Propriedades from "../components/SelectPropriedade";
import DashPropriedade from "../components/DashPropriedade";
import { colors } from "../styles/colors";
import BuffsLogo from '../../assets/images/logoBuffs.svg';
import { MainLayout } from "../layouts/MainLayout";
import { UserMenu } from "../components/UserMenu";
import BuffaloLoader from "../components/BufaloLoader";
import { usePropriedade } from "../context/PropriedadeContext";
import { NotificacoesButton } from "../components/NotificacoesButton";
import { usePropriedades } from "../services/queries/usePropriedades";
import { useDashboard } from "../services/queries/useDashboard";

export const HomeScreen = () => {
  const { propriedadeSelecionada } = usePropriedade();
  const { data: propriedades = [] } = usePropriedades();
  const {
    data: dashboard,
    isLoading,
    refetch,
    isRefetching,
  } = useDashboard(propriedadeSelecionada);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ alignItems: 'center', top: -5 }}>
          <BuffsLogo width={100} height={100} />
        </View>
        <View style={{ position: 'absolute', right: 60, top: 10 }}>
          <UserMenu />
        </View>
        <View style={{ position: 'absolute', left: 70, top: -20 }}>
          <NotificacoesButton />
        </View>
      </View>
      <MainLayout>
        <FlatList
          data={[{}]}
          keyExtractor={(_, index) => index.toString()}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
          ListHeaderComponent={
            <>
              <Propriedades prop={propriedades} />
              {isLoading || !dashboard ? (
                <View style={styles.loading}>
                  <BuffaloLoader />
                </View>
              ) : (
                <DashPropriedade
                  total={dashboard.bufalosAtivos ?? 0}
                  machos={dashboard.machos ?? 0}
                  femeas={dashboard.femeas ?? 0}
                  bezerros={dashboard.bezerros ?? 0}
                  novilhas={dashboard.novilhas ?? 0}
                  vacas={dashboard.vacas ?? 0}
                  touros={dashboard.touros ?? 0}
                />
              )}
            </>
          }
          renderItem={null}
        />
      </MainLayout>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.text.heading },
  header: {
    height: 60,
    backgroundColor: colors.brand.primary,
    justifyContent: 'center',
    paddingLeft: 16,
    paddingTop: 20,
  },
  loading: { marginTop: 40, alignItems: "center", justifyContent: "center" },
});
```

- [ ] **Step 4: Verificar que HomeScreen funciona igual ao anterior**

Rodar o app, entrar na Home, confirmar que dados carregam e pull-to-refresh funciona.

- [ ] **Step 5: Commit**

```bash
git add src/services/queries/ src/screens/HomeScreen.tsx
git commit -m "refactor(home): migra fetching para TanStack Query"
```

---

### Task 3: Criar hooks de query para Lotes e Grupos

**Files:**
- Create: `src/services/queries/useLotes.ts`
- Create: `src/services/queries/useGrupos.ts`
- Create: `src/services/queries/useMovLote.ts`
- Create: `src/services/grupoService.ts` (atualizar com funções faltantes)
- Create: `src/services/movLoteService.ts`
- Create: `src/types/lote.types.ts`
- Create: `src/types/grupo.types.ts`
- Create: `src/types/movLote.types.ts`

- [ ] **Step 1: Criar tipos tipados**

Criar `src/types/lote.types.ts`:

```typescript
export interface Lote {
  idLote: string;
  nomeLote: string;
  tipoLote?: string;
  status: 'ativo' | 'inativo' | 'manutencao';
  descricao?: string;
  qtdMax?: number;
  areaM2?: number;
  geoMapa?: GeoJSON.Polygon;
  idGrupo?: string;
  grupo?: { idGrupo: string; nomeGrupo: string; color: string } | null;
  coords: { latitude: number; longitude: number }[];
  grupoCor: string;
  grupoNome: string;
}

export interface CreateLoteInput {
  nomeLote: string;
  idPropriedade: string;
  idGrupo?: string;
  tipoLote?: string;
  status?: string;
  descricao?: string;
  qtdMax?: number;
  areaM2?: number;
  geoMapa: GeoJSON.Polygon;
}
```

Criar `src/types/grupo.types.ts`:

```typescript
export interface Grupo {
  idGrupo: string;
  nomeGrupo: string;
  color: string;
  qtdAnimais?: number;
  loteAtual?: { idLote: string; nomeLote: string } | null;
}

export interface CreateGrupoInput {
  nomeGrupo: string;
  idPropriedade: string;
  color?: string;
}
```

Criar `src/types/movLote.types.ts`:

```typescript
export interface MovLote {
  idMovLote: string;
  idGrupo: string;
  idLoteAnterior?: string;
  idLoteAtual: string;
  dtEntrada: string;
  dtSaida?: string;
  loteAtual?: { idLote: string; nomeLote: string };
  loteAnterior?: { idLote: string; nomeLote: string };
}

export interface CreateMovLoteInput {
  idPropriedade: string;
  idGrupo: string;
  idLoteAnterior?: string;
  idLoteAtual: string;
  dtEntrada: string;
  dtSaida?: string;
}
```

- [ ] **Step 2: Criar movLoteService**

Criar `src/services/movLoteService.ts`:

```typescript
import { apiFetch } from '../lib/apiClient';
import type { MovLote, CreateMovLoteInput } from '../types/movLote.types';

export const movLoteService = {
  async getAllByPropriedade(idPropriedade: string, page = 1, limit = 20): Promise<{ data: MovLote[]; meta: any }> {
    return apiFetch(`/mov-lote/propriedade/${idPropriedade}?page=${page}&limit=${limit}`);
  },

  async getHistoricoGrupo(idGrupo: string): Promise<MovLote[]> {
    return apiFetch(`/mov-lote/historico/grupo/${idGrupo}`);
  },

  async getStatusAtualGrupo(idGrupo: string): Promise<MovLote | null> {
    return apiFetch(`/mov-lote/status/grupo/${idGrupo}`);
  },

  async create(input: CreateMovLoteInput): Promise<MovLote> {
    return apiFetch('/mov-lote', { method: 'POST', body: input });
  },
};
```

- [ ] **Step 3: Criar hooks de query**

Criar `src/services/queries/useLotes.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { piqueteService } from '../piqueteService';
import type { CreateLoteInput } from '../../types/lote.types';

export const LOTES_KEY = (propriedadeId: string | null) =>
  ['lotes', propriedadeId] as const;

export function useLotes(propriedadeId: string | null) {
  return useQuery({
    queryKey: LOTES_KEY(propriedadeId),
    queryFn: () => piqueteService.getAll(propriedadeId!),
    enabled: !!propriedadeId,
  });
}

export function useCreateLote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLoteInput) => piqueteService.create(input as any),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lotes', variables.idPropriedade] });
    },
  });
}
```

Criar `src/services/queries/useGrupos.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import { grupoService } from '../grupoService';

export const GRUPOS_KEY = (propriedadeId: string | null) =>
  ['grupos', propriedadeId] as const;

export function useGrupos(propriedadeId: string | null) {
  return useQuery({
    queryKey: GRUPOS_KEY(propriedadeId),
    queryFn: () => grupoService.getAllByPropriedade(propriedadeId!),
    enabled: !!propriedadeId,
  });
}
```

Criar `src/services/queries/useMovLote.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { movLoteService } from '../movLoteService';
import type { CreateMovLoteInput } from '../../types/movLote.types';

export const MOV_LOTE_KEY = (propriedadeId: string | null) =>
  ['mov-lote', propriedadeId] as const;

export const HISTORICO_GRUPO_KEY = (grupoId: string) =>
  ['historico-grupo', grupoId] as const;

export function useMovLoteByPropriedade(propriedadeId: string | null) {
  return useQuery({
    queryKey: MOV_LOTE_KEY(propriedadeId),
    queryFn: () => movLoteService.getAllByPropriedade(propriedadeId!),
    enabled: !!propriedadeId,
    select: (r) => r.data,
  });
}

export function useHistoricoGrupo(grupoId: string) {
  return useQuery({
    queryKey: HISTORICO_GRUPO_KEY(grupoId),
    queryFn: () => movLoteService.getHistoricoGrupo(grupoId),
    enabled: !!grupoId,
  });
}

export function useCreateMovLote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMovLoteInput) => movLoteService.create(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['mov-lote', variables.idPropriedade] });
      queryClient.invalidateQueries({ queryKey: ['lotes', variables.idPropriedade] });
      queryClient.invalidateQueries({ queryKey: ['historico-grupo', variables.idGrupo] });
    },
  });
}
```

- [ ] **Step 4: Commit**

```bash
git add src/types/ src/services/movLoteService.ts src/services/queries/
git commit -m "feat: cria tipos, movLoteService e hooks TanStack Query para lotes/grupos/movimentações"
```

---

### Task 4: Adicionar React Hook Form + Zod

**Files:**
- Modify: `package.json`
- Create: `src/components/ui/FormField/index.tsx`

- [ ] **Step 1: Instalar dependências**

```bash
npm install react-hook-form zod @hookform/resolvers
```

- [ ] **Step 2: Criar componente FormField utilitário**

Criar `src/components/ui/FormField/index.tsx`:

```typescript
import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { Control, Controller, FieldValues, Path } from 'react-hook-form';
import { colors } from '../../../styles/colors';

interface FormFieldProps<T extends FieldValues> extends TextInputProps {
  control: Control<T>;
  name: Path<T>;
  label: string;
  error?: string;
}

export function FormField<T extends FieldValues>({
  control,
  name,
  label,
  error,
  ...inputProps
}: FormFieldProps<T>) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={[styles.input, error ? styles.inputError : null]}
            onBlur={onBlur}
            onChangeText={onChange}
            value={value?.toString() ?? ''}
            {...inputProps}
          />
        )}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 12 },
  label: { fontSize: 14, color: colors.text.secondary, fontWeight: '600', marginBottom: 4 },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    borderColor: colors.border.default,
    paddingHorizontal: 12,
    fontSize: 16,
    color: colors.text.heading,
    backgroundColor: colors.bg.card,
  },
  inputError: { borderColor: colors.status.error },
  error: { fontSize: 12, color: colors.status.error, marginTop: 4 },
});
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/FormField/ package.json package-lock.json
git commit -m "feat: instala React Hook Form + Zod, cria FormField component"
```

---

### Task 5: Persistir propriedade selecionada com AsyncStorage

**Files:**
- Modify: `src/context/PropriedadeContext.tsx`

O problema atual: ao fechar e reabrir o app, a propriedade selecionada é perdida porque usa `useState` puro.

- [ ] **Step 1: Atualizar PropriedadeContext para persistir seleção**

Substituir `src/context/PropriedadeContext.tsx`:

```typescript
import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@buffs:propriedade_selecionada";

interface PropriedadeContextProps {
  propriedadeSelecionada: string | null;
  setPropriedadeSelecionada: (id: string | null) => void;
}

const PropriedadeContext = createContext<PropriedadeContextProps | undefined>(undefined);

export const PropriedadeProvider = ({ children }: { children: ReactNode }) => {
  const [propriedadeSelecionada, _setPropSelecionada] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(id => {
      if (id) _setPropSelecionada(id);
    });
  }, []);

  const setPropriedadeSelecionada = (id: string | null) => {
    _setPropSelecionada(id);
    if (id) {
      AsyncStorage.setItem(STORAGE_KEY, id);
    } else {
      AsyncStorage.removeItem(STORAGE_KEY);
    }
  };

  return (
    <PropriedadeContext.Provider value={{ propriedadeSelecionada, setPropriedadeSelecionada }}>
      {children}
    </PropriedadeContext.Provider>
  );
};

export const usePropriedade = () => {
  const context = useContext(PropriedadeContext);
  if (!context) throw new Error("usePropriedade deve ser usado dentro de um PropriedadeProvider");
  return context;
};
```

- [ ] **Step 2: Testar que seleção persiste após fechar app**

Selecionar uma propriedade → forçar reload do Metro (cmd+R no emulador) → verificar que propriedade continua selecionada.

- [ ] **Step 3: Commit**

```bash
git add src/context/PropriedadeContext.tsx
git commit -m "fix: persiste propriedade selecionada no AsyncStorage"
```

---

### Task 6: GPS global — singleton hook

**Files:**
- Modify: `src/hooks/useLocation.ts`
- Create: `src/context/LocationContext.tsx`

O problema: `useGpsLocation` cria um `watchPosition` separado em cada componente que o chama.

- [ ] **Step 1: Criar LocationContext com GPS singleton**

Criar `src/context/LocationContext.tsx`:

```typescript
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import Geolocation from 'react-native-geolocation-service';
import { Platform, PermissionsAndroid } from 'react-native';

interface Coords { latitude: number; longitude: number; }
interface LocationContextProps {
  location: Coords | null;
  error: string | null;
  loading: boolean;
}

const LocationContext = createContext<LocationContextProps>({
  location: null, error: null, loading: true,
});

const requestPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Permissão de Localização',
        message: 'Precisamos da sua localização para demarcar piquetes.',
        buttonNeutral: 'Perguntar Depois',
        buttonNegative: 'Cancelar',
        buttonPositive: 'OK',
      }
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }
  const status = await Geolocation.requestAuthorization('whenInUse');
  return status === 'granted';
};

export const LocationProvider = ({ children }: { children: ReactNode }) => {
  const [location, setLocation] = useState<Coords | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let watchId: number;
    requestPermission().then(granted => {
      if (!granted) {
        setError('Permissão de localização negada.');
        setLoading(false);
        return;
      }
      Geolocation.getCurrentPosition(
        pos => { setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }); setLoading(false); },
        () => { setLoading(false); },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 10000 }
      );
      watchId = Geolocation.watchPosition(
        pos => { setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }); setError(null); },
        () => { setError('Não foi possível obter a localização.'); },
        { enableHighAccuracy: true, distanceFilter: 5, interval: 3000, fastestInterval: 1000 }
      );
    });
    return () => { if (watchId !== undefined) Geolocation.clearWatch(watchId); };
  }, []);

  return (
    <LocationContext.Provider value={{ location, error, loading }}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => useContext(LocationContext);
```

- [ ] **Step 2: Adicionar LocationProvider no App.tsx**

Em `App.tsx`, importar `LocationProvider` e envolver `AppContent`:

```tsx
import { LocationProvider } from './src/context/LocationContext';
// ...
<LocationProvider>
  <NavigationContainer>
    <AppContent />
  </NavigationContainer>
</LocationProvider>
```

- [ ] **Step 3: Substituir useGpsLocation por useLocation nos componentes**

Em `DemarcacaoPiqueteSheet/index.tsx`:
```tsx
// Remover: import { useGpsLocation } from "../../hooks/useLocation";
// Remover: const { location: currentLocation, loading: gpsLoading, error: gpsError } = useGpsLocation();
// Adicionar:
import { useLocation } from "../../context/LocationContext";
const { location: currentLocation, loading: gpsLoading, error: gpsError } = useLocation();
```

Repetir para `PiquetesScreen.tsx` e `VisualizarPiqueteSheet/index.tsx`.

- [ ] **Step 4: Verificar que GPS funciona com um único watch**

Abrir PiquetesScreen → verificar localização funciona. Abrir DemarcacaoPiqueteSheet → verificar localização disponível instantaneamente (sem esperar o watch iniciar novamente).

- [ ] **Step 5: Commit**

```bash
git add src/context/LocationContext.tsx App.tsx src/components/DemarcacaoPiqueteSheet/index.tsx src/screens/PiquetesScreen.tsx src/components/VisualizarPiqueteSheet/index.tsx
git commit -m "fix: GPS singleton via LocationContext — elimina múltiplos watchPosition"
```

---

## FASE 2 — Módulo de Piquetes/Lotes/Grupos (Mais Importante)

### Task 7: Refatorar PiquetesScreen — Dashboard como tela principal

A tela atual mostra apenas o mapa. A nova tela mostrará um dashboard operacional com grupos, lotes e movimentações recentes. O mapa passa a ser uma aba/modal secundário.

**Files:**
- Modify: `src/screens/PiquetesScreen.tsx` — refatoração completa
- Create: `src/components/domain/piquetes/GrupoCard/index.tsx`
- Create: `src/components/domain/piquetes/LoteCard/index.tsx`

- [ ] **Step 1: Criar GrupoCard component**

Criar `src/components/domain/piquetes/GrupoCard/index.tsx`:

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../../../../styles/colors';
import type { Grupo } from '../../../../types/grupo.types';

interface GrupoCardProps {
  grupo: Grupo;
  onPress?: () => void;
}

export function GrupoCard({ grupo, onPress }: GrupoCardProps) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.card} activeOpacity={0.7}>
      <View style={[styles.colorDot, { backgroundColor: grupo.color || colors.text.muted }]} />
      <View style={styles.info}>
        <Text style={styles.nome}>{grupo.nomeGrupo}</Text>
        {grupo.loteAtual ? (
          <Text style={styles.lote}>Em: {grupo.loteAtual.nomeLote}</Text>
        ) : (
          <Text style={styles.semLote}>Sem lote atribuído</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border.default,
    elevation: 1,
  },
  colorDot: { width: 14, height: 14, borderRadius: 7, marginRight: 12 },
  info: { flex: 1 },
  nome: { fontSize: 15, fontWeight: '600', color: colors.text.heading },
  lote: { fontSize: 13, color: colors.text.muted, marginTop: 2 },
  semLote: { fontSize: 13, color: colors.status.warningText, marginTop: 2 },
});
```

- [ ] **Step 2: Criar LoteCard component**

Criar `src/components/domain/piquetes/LoteCard/index.tsx`:

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../../../../styles/colors';
import type { Lote } from '../../../../types/lote.types';

interface LoteCardProps {
  lote: Lote;
  onPress?: () => void;
}

export function LoteCard({ lote, onPress }: LoteCardProps) {
  const statusColor = lote.status === 'ativo'
    ? colors.status.success
    : lote.status === 'inativo'
    ? colors.status.error
    : colors.status.warningText;

  return (
    <TouchableOpacity onPress={onPress} style={styles.card} activeOpacity={0.7}>
      <View style={[styles.statusBar, { backgroundColor: statusColor }]} />
      <View style={styles.content}>
        <View style={styles.row}>
          <Text style={styles.nome}>{lote.nomeLote}</Text>
          <View style={[styles.badge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.badgeText, { color: statusColor }]}>{lote.status}</Text>
          </View>
        </View>
        <View style={styles.meta}>
          {lote.grupoNome ? (
            <Text style={styles.grupo}>Grupo: {lote.grupoNome}</Text>
          ) : (
            <Text style={styles.vazio}>Sem grupo</Text>
          )}
          {lote.qtdMax ? (
            <Text style={styles.capacidade}>Capacidade: {lote.qtdMax} animais</Text>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.bg.card,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border.default,
    overflow: 'hidden',
    elevation: 1,
  },
  statusBar: { width: 4 },
  content: { flex: 1, padding: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nome: { fontSize: 15, fontWeight: '600', color: colors.text.heading, flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginLeft: 8 },
  badgeText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  meta: { marginTop: 6, gap: 2 },
  grupo: { fontSize: 13, color: colors.text.muted },
  vazio: { fontSize: 13, color: colors.status.warningText },
  capacidade: { fontSize: 12, color: colors.text.placeholder },
});
```

- [ ] **Step 3: Refatorar PiquetesScreen**

Substituir conteúdo de `src/screens/PiquetesScreen.tsx`:

```typescript
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  RefreshControl, SectionList, ActivityIndicator
} from 'react-native';
import { MainLayout } from '../layouts/MainLayout';
import { colors } from '../styles/colors';
import { usePropriedade } from '../context/PropriedadeContext';
import { useLotes } from '../services/queries/useLotes';
import { useGrupos } from '../services/queries/useGrupos';
import { DemarcacaoPiqueteSheet } from '../components/DemarcacaoPiqueteSheet';
import { MovimentacaoSheet } from '../components/domain/piquetes/MovimentacaoSheet';
import { LoteCard } from '../components/domain/piquetes/LoteCard';
import { GrupoCard } from '../components/domain/piquetes/GrupoCard';

export const PiquetesScreen = () => {
  const { propriedadeSelecionada } = usePropriedade();
  const [showNovoLote, setShowNovoLote] = useState(false);
  const [showMovimentacao, setShowMovimentacao] = useState(false);
  const [showMapa, setShowMapa] = useState(false);

  const {
    data: lotes = [],
    isLoading: loadingLotes,
    refetch: refetchLotes,
    isRefetching: refetchingLotes,
  } = useLotes(propriedadeSelecionada);

  const {
    data: grupos = [],
    isLoading: loadingGrupos,
    refetch: refetchGrupos,
    isRefetching: refetchingGrupos,
  } = useGrupos(propriedadeSelecionada);

  const isLoading = loadingLotes || loadingGrupos;
  const isRefreshing = refetchingLotes || refetchingGrupos;

  const onRefresh = () => {
    refetchLotes();
    refetchGrupos();
  };

  const sections = [
    {
      title: `Grupos (${grupos.length})`,
      data: grupos,
      type: 'grupo' as const,
    },
    {
      title: `Lotes (${lotes.length})`,
      data: lotes,
      type: 'lote' as const,
    },
  ];

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.brand.primary} />
        <Text style={styles.loadingText}>Carregando piquetes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>PIQUETES</Text>
        <TouchableOpacity style={styles.mapaButton} onPress={() => setShowMapa(true)}>
          <Text style={styles.mapaButtonText}>Ver Mapa</Text>
        </TouchableOpacity>
      </View>

      <MainLayout>
        <SectionList
          sections={sections}
          keyExtractor={(item: any) => item.idLote || item.idGrupo}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[colors.brand.primary]} />
          }
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionTitle}>{section.title}</Text>
          )}
          renderItem={({ item, section }) => {
            if (section.type === 'grupo') {
              return <GrupoCard grupo={item as any} />;
            }
            return <LoteCard lote={item as any} />;
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Nenhum piquete cadastrado</Text>
              <Text style={styles.emptySubtitle}>Adicione seu primeiro piquete usando o botão abaixo.</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 100 }}
          stickySectionHeadersEnabled={false}
        />

        <View style={styles.fabRow}>
          <TouchableOpacity style={[styles.fab, styles.fabSecondary]} onPress={() => setShowMovimentacao(true)}>
            <Text style={styles.fabSecondaryText}>Mover Grupo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.fab} onPress={() => setShowNovoLote(true)}>
            <Text style={styles.fabText}>+ Novo Piquete</Text>
          </TouchableOpacity>
        </View>

        {showNovoLote && propriedadeSelecionada && (
          <DemarcacaoPiqueteSheet
            onClose={() => { setShowNovoLote(false); refetchLotes(); }}
            propriedadeId={propriedadeSelecionada}
          />
        )}

        {showMovimentacao && propriedadeSelecionada && (
          <MovimentacaoSheet
            lotes={lotes as any}
            grupos={grupos as any}
            propriedadeId={propriedadeSelecionada}
            onClose={() => { setShowMovimentacao(false); refetchLotes(); refetchGrupos(); }}
          />
        )}
      </MainLayout>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: colors.text.muted, fontSize: 14 },
  header: {
    height: 60,
    backgroundColor: colors.brand.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 10,
    paddingHorizontal: 16,
  },
  headerTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    color: colors.text.accent,
  },
  mapaButton: {
    position: 'absolute',
    right: 16,
    top: 18,
    backgroundColor: colors.text.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  mapaButtonText: { color: colors.brand.primary, fontWeight: '700', fontSize: 12 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  emptyState: { alignItems: 'center', marginTop: 60, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.text.heading, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: colors.text.muted, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  fabRow: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  fab: {
    backgroundColor: colors.brand.primary,
    borderRadius: 20,
    paddingHorizontal: 20,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  fabSecondary: {
    backgroundColor: colors.text.accent,
  },
  fabText: { color: colors.text.accent, fontWeight: '700', fontSize: 13 },
  fabSecondaryText: { color: colors.brand.primary, fontWeight: '700', fontSize: 13 },
});
```

- [ ] **Step 4: Verificar que a nova PiquetesScreen exibe lotes e grupos**

Navegar para aba Piquetes → confirmar que grupos e lotes aparecem em seções separadas → confirmar pull-to-refresh funciona.

- [ ] **Step 5: Commit**

```bash
git add src/screens/PiquetesScreen.tsx src/components/domain/piquetes/
git commit -m "feat(piquetes): refatora tela principal para dashboard com lotes e grupos"
```

---

### Task 8: Criar MovimentacaoSheet — mover grupo entre lotes

**Files:**
- Create: `src/components/domain/piquetes/MovimentacaoSheet/index.tsx`

A API suporta mover um grupo inteiro de um lote para outro via `POST /mov-lote`.

- [ ] **Step 1: Criar schema Zod para validação**

Criar `src/components/domain/piquetes/MovimentacaoSheet/index.tsx`:

```typescript
import React, { useMemo, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { colors } from '../../../../styles/colors';
import SelectBottomSheet from '../../../SelectBottomSheet';
import Button from '../../../Button';
import { useCreateMovLote } from '../../../../services/queries/useMovLote';
import type { Lote } from '../../../../types/lote.types';
import type { Grupo } from '../../../../types/grupo.types';

const schema = z.object({
  idGrupo: z.string().uuid('Selecione um grupo'),
  idLoteAtual: z.string().uuid('Selecione o lote de destino'),
});

type FormValues = z.infer<typeof schema>;

interface MovimentacaoSheetProps {
  lotes: Lote[];
  grupos: Grupo[];
  propriedadeId: string;
  onClose: () => void;
}

export function MovimentacaoSheet({ lotes, grupos, propriedadeId, onClose }: MovimentacaoSheetProps) {
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['50%', '80%'], []);
  const { mutateAsync: createMovLote, isPending } = useCreateMovLote();

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const grupoItems = grupos.map(g => ({ label: g.nomeGrupo, value: g.idGrupo }));
  const loteItems = lotes.map(l => ({ label: l.nomeLote, value: l.idLote }));

  const selectedGrupo = watch('idGrupo');
  const selectedLote = watch('idLoteAtual');

  const onSubmit = async (values: FormValues) => {
    try {
      await createMovLote({
        idPropriedade: propriedadeId,
        idGrupo: values.idGrupo,
        idLoteAtual: values.idLoteAtual,
        dtEntrada: new Date().toISOString(),
      });
      Alert.alert('Sucesso', 'Grupo movido com sucesso!');
      onClose();
    } catch {
      Alert.alert('Erro', 'Não foi possível registrar a movimentação.');
    }
  };

  const handleChange = useCallback((index: number) => {
    if (index === -1) onClose();
  }, [onClose]);

  return (
    <BottomSheet
      ref={sheetRef}
      index={0}
      snapPoints={snapPoints}
      onChange={handleChange}
      backgroundStyle={{ backgroundColor: colors.bg.sheet, borderRadius: 24 }}
      handleIndicatorStyle={{ backgroundColor: colors.border.light, height: 4, width: 36 }}
      enablePanDownToClose
      enableContentPanningGesture={false}
      backdropComponent={props => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} pressBehavior="close" />
      )}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Mover Grupo</Text>
      </View>
      <BottomSheetScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>Grupo a mover</Text>
        <SelectBottomSheet
          items={grupoItems}
          value={selectedGrupo}
          onChange={val => setValue('idGrupo', val)}
          title="Selecione o Grupo"
          placeholder="Selecione um grupo"
        />
        {errors.idGrupo && <Text style={styles.error}>{errors.idGrupo.message}</Text>}

        <Text style={[styles.label, { marginTop: 16 }]}>Lote de destino</Text>
        <SelectBottomSheet
          items={loteItems}
          value={selectedLote}
          onChange={val => setValue('idLoteAtual', val)}
          title="Selecione o Lote"
          placeholder="Selecione um lote"
        />
        {errors.idLoteAtual && <Text style={styles.error}>{errors.idLoteAtual.message}</Text>}

        <View style={{ marginTop: 24 }}>
          <Button title={isPending ? 'Movendo...' : 'Confirmar Movimentação'} onPress={handleSubmit(onSubmit)} loading={isPending} />
        </View>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border.default },
  title: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', color: colors.text.heading },
  content: { padding: 20, paddingBottom: 40 },
  label: { fontSize: 14, color: colors.text.secondary, fontWeight: '600', marginBottom: 8 },
  error: { fontSize: 12, color: colors.status.error, marginTop: 4 },
});
```

- [ ] **Step 2: Verificar que MovimentacaoSheet abre corretamente**

Na PiquetesScreen, pressionar "Mover Grupo" → BottomSheet abre → selecionar grupo e lote → confirmar → Alert de sucesso aparece → lista recarrega.

- [ ] **Step 3: Commit**

```bash
git add src/components/domain/piquetes/MovimentacaoSheet/
git commit -m "feat(piquetes): adiciona MovimentacaoSheet para mover grupos entre lotes"
```

---

### Task 9: Corrigir DemarcacaoPiqueteSheet — scroll aninhado e performance do MapLeaflet

**Files:**
- Modify: `src/components/DemarcacaoPiqueteSheet/index.tsx`
- Modify: `src/components/Mapa/index.tsx`

- [ ] **Step 1: Corrigir MapLeaflet para não reconstruir HTML a cada render**

O problema: `useMemo(() => htmlContent, [piquetes])` reconstrói o HTML inteiro quando piquetes mudam.
A solução: separar o HTML inicial (estático) do conteúdo dinâmico (injetado via `injectJavaScript`).

Substituir `src/components/Mapa/index.tsx`:

```typescript
import React, { useEffect, useRef, useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

interface Coords { latitude: number; longitude: number; }
interface Piquete {
  nome: string; id: string;
  coords: Coords[];
  color: string;
}

interface MapLeafletProps {
  piquetes: Piquete[];
  currentLocation: Coords | null;
  onMapMessage?: (data: any) => void;
}

const STATIC_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; }
    .piquete-label { color: #fff; font-weight: 800; font-size: 9px; text-align: center; text-shadow: 2px 2px 3px rgba(0,0,0,0.8); }
  </style>
</head>
<body>
<div id="map"></div>
<script>
  const map = L.map('map', { zoomControl: true }).setView([-15, -48], 4);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

  let polygonLayers = [];
  let previewPolyline = null;
  let pendingCenter = null;

  window.drawPiquetes = function(piquetes) {
    polygonLayers.forEach(l => map.removeLayer(l));
    polygonLayers = [];

    const bounds = [];
    piquetes.forEach((p, idx) => {
      if (!p.coords || p.coords.length < 3) return;
      const latlngs = p.coords.map(c => [c.latitude, c.longitude]);
      const poly = L.polygon(latlngs, { color: p.color, fillOpacity: 0.3, weight: 2 }).addTo(map);
      polygonLayers.push(poly);

      const center = latlngs.reduce((acc, c) => [acc[0] + c[0], acc[1] + c[1]], [0,0]).map(v => v / latlngs.length);
      const label = L.marker(center, {
        icon: L.divIcon({ className: 'piquete-label', html: p.nome || ('P' + (idx+1)), iconSize: [50, 24] })
      }).addTo(map);
      polygonLayers.push(label);
      latlngs.forEach(c => bounds.push(c));
    });

    if (bounds.length > 0) {
      try { map.fitBounds(L.latLngBounds(bounds), { padding: [30, 30] }); } catch(e) {}
    }
  };

  window.updatePolyline = function(coords, previewPoint) {
    if (previewPolyline) { map.removeLayer(previewPolyline); previewPolyline = null; }
    const full = [...coords];
    if (previewPoint) full.push(previewPoint);
    if (full.length > 1) {
      previewPolyline = L.polyline(full.map(c => [c.latitude, c.longitude]), { color: '#2563EB', dashArray: '5,5', weight: 2 }).addTo(map);
    }
  };

  window.setCenter = function(lat, lng, zoom) {
    map.setView([lat, lng], zoom || map.getZoom());
  };

  window.getCenter = function() {
    const c = map.getCenter();
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'CENTER', data: { latitude: c.lat, longitude: c.lng } }));
  };

  map.on('move', function() {
    const c = map.getCenter();
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MOVE', data: { latitude: c.lat, longitude: c.lng } }));
  });

  map.whenReady(function() {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_READY' }));
  });
</script>
</body>
</html>
`;

export const MapLeaflet = React.forwardRef<WebView, MapLeafletProps>(
  ({ piquetes, currentLocation, onMapMessage }, ref) => {
    const internalRef = useRef<WebView>(null);
    const webviewRef = (ref as any) || internalRef;
    const mapReady = useRef(false);
    const pendingPiquetes = useRef<Piquete[]>(piquetes);

    const inject = useCallback((js: string) => {
      webviewRef.current?.injectJavaScript(js + '; true;');
    }, []);

    useEffect(() => {
      pendingPiquetes.current = piquetes;
      if (mapReady.current) {
        inject(`window.drawPiquetes(${JSON.stringify(piquetes)})`);
      }
    }, [piquetes]);

    useEffect(() => {
      if (currentLocation && mapReady.current) {
        inject(`window.setCenter(${currentLocation.latitude}, ${currentLocation.longitude}, 16)`);
      }
    }, [currentLocation]);

    const handleMessage = useCallback((event: any) => {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'MAP_READY') {
        mapReady.current = true;
        inject(`window.drawPiquetes(${JSON.stringify(pendingPiquetes.current)})`);
        if (currentLocation) {
          inject(`window.setCenter(${currentLocation.latitude}, ${currentLocation.longitude}, 16)`);
        }
      }
      onMapMessage?.(data);
    }, [onMapMessage, currentLocation]);

    return (
      <WebView
        ref={webviewRef}
        originWhitelist={['*']}
        source={{ html: STATIC_HTML }}
        onMessage={handleMessage}
        nestedScrollEnabled
        style={styles.map}
        javaScriptEnabled
        domStorageEnabled
      />
    );
  }
);

const styles = StyleSheet.create({
  map: { flex: 1, minHeight: 300 },
});
```

- [ ] **Step 2: Verificar que o mapa não recarrega mais ao adicionar pontos**

Abrir DemarcacaoPiqueteSheet → adicionar pontos → verificar que o mapa NÃO pisca/recarrega entre cliques.

- [ ] **Step 3: Corrigir scroll aninhado em DemarcacaoPiqueteSheet**

O BottomSheet tem `enableContentPanningGesture={false}` que está correto para permitir scroll interno. Mas o `BottomSheetScrollView` não precisa de estrutura extra. Garantir que o mapContainer usa `height` fixo (não dentro de ScrollView com `flex: 1`).

No `DemarcacaoPiqueteSheet/index.tsx`, verificar que `mapContainer` está assim:
```tsx
// CORRETO — altura fixa, não flex
<View style={{ height: 280, marginBottom: 16, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: colors.border.default }}>
  <MapLeaflet ref={webviewRef} piquetes={mapData.piquetes} currentLocation={mapData.location} onMapMessage={handleMapMessage} />
  {/* crosshair */}
</View>
```

- [ ] **Step 4: Remover VisualizarPiqueteSheet's scroll aninhado crítico**

Em `src/components/VisualizarPiqueteSheet/index.tsx`, remover o `FlatList` com `RefreshControl` dentro do `BottomSheetScrollView`. O RefreshControl dentro de um BottomSheet não faz sentido. Substituir por:

```tsx
<BottomSheetScrollView contentContainerStyle={styles.scrollContent}>
  <View style={styles.mapContainer}>
    <MapLeaflet
      piquetes={piquetes.map(p => ({ ...p, color: p.grupoCor }))}
      currentLocation={currentLocation}
    />
  </View>
</BottomSheetScrollView>
```

- [ ] **Step 5: Commit**

```bash
git add src/components/Mapa/index.tsx src/components/DemarcacaoPiqueteSheet/index.tsx src/components/VisualizarPiqueteSheet/index.tsx
git commit -m "fix(mapa): MapLeaflet estático + elimina scroll aninhado crítico em BottomSheets"
```

---

## FASE 3 — Home Redesenhada como Dashboard

### Task 10: Home Dashboard com KPI Cards e Alertas

**Files:**
- Create: `src/components/domain/home/KpiCard/index.tsx`
- Modify: `src/screens/HomeScreen.tsx`
- Create: `src/services/queries/useAlertas.ts`

- [ ] **Step 1: Criar KpiCard component**

Criar `src/components/domain/home/KpiCard/index.tsx`:

```typescript
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../../../../styles/colors';

interface KpiCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  accentColor?: string;
  onPress?: () => void;
}

export function KpiCard({ label, value, subtitle, accentColor = colors.brand.primary, onPress }: KpiCardProps) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper onPress={onPress} style={styles.card} activeOpacity={0.7}>
      <View style={[styles.accent, { backgroundColor: accentColor }]} />
      <View style={styles.content}>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.label}>{label}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.bg.card,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.default,
    elevation: 1,
    minHeight: 80,
    flexDirection: 'row',
  },
  accent: { width: 4 },
  content: { flex: 1, padding: 14, justifyContent: 'center' },
  value: { fontSize: 24, fontWeight: '800', color: colors.text.heading },
  label: { fontSize: 12, color: colors.text.muted, marginTop: 2, fontWeight: '500' },
  subtitle: { fontSize: 11, color: colors.text.placeholder, marginTop: 2 },
});
```

- [ ] **Step 2: Criar hook useAlertas**

Criar `src/services/queries/useAlertas.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import alertaService from '../alertaService';

export const ALERTAS_KEY = (propriedadeId: string | null) =>
  ['alertas', propriedadeId] as const;

export function useAlertas(propriedadeId: string | null) {
  return useQuery({
    queryKey: ALERTAS_KEY(propriedadeId),
    queryFn: () => alertaService.getAlertas(propriedadeId!),
    enabled: !!propriedadeId,
    staleTime: 1000 * 60 * 5,
  });
}
```

- [ ] **Step 3: Atualizar HomeScreen com KPI grid e estrutura de dashboard**

Atualizar `src/screens/HomeScreen.tsx` para incluir KPI cards em grid 2x2:

```typescript
// Substituir o bloco do DashPropriedade por um layout de dashboard:
// No lugar de:
// <DashPropriedade total=... machos=... ... />
// Usar:

{dashboard && (
  <View style={styles.kpiSection}>
    <Text style={styles.sectionTitle}>Resumo do Rebanho</Text>
    <View style={styles.kpiRow}>
      <KpiCard
        label="Total Ativos"
        value={dashboard.bufalosAtivos ?? 0}
        accentColor={colors.brand.primary}
      />
      <KpiCard
        label="Machos"
        value={dashboard.machos ?? 0}
        accentColor={colors.status.success}
      />
    </View>
    <View style={styles.kpiRow}>
      <KpiCard
        label="Fêmeas"
        value={dashboard.femeas ?? 0}
        accentColor="#EC4899"
      />
      <KpiCard
        label="Bezerros"
        value={dashboard.bezerros ?? 0}
        accentColor={colors.brand.dark}
      />
    </View>
    <View style={styles.kpiRow}>
      <KpiCard label="Novilhas" value={dashboard.novilhas ?? 0} />
      <KpiCard label="Vacas" value={dashboard.vacas ?? 0} />
    </View>
  </View>
)}
```

Adicionar `kpiSection`, `kpiRow` aos estilos:
```typescript
kpiSection: { marginTop: 16 },
sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text.heading, marginBottom: 12 },
kpiRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
```

- [ ] **Step 4: Commit**

```bash
git add src/components/domain/home/ src/screens/HomeScreen.tsx src/services/queries/useAlertas.ts
git commit -m "feat(home): redesenha dashboard com KPI cards em grid"
```

---

## FASE 4 — Correções de Performance e Qualidade

### Task 11: Corrigir race condition e deps de useEffect na RebanhoScreen

**Files:**
- Modify: `src/screens/RebanhoScreen.tsx`

- [ ] **Step 1: Criar hook useBufalos**

Criar `src/services/queries/useBufalos.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import bufaloService from '../bufaloService';

interface FiltrosBufalo {
  brinco?: string;
  sexo?: 'M' | 'F';
  nivel_maturidade?: string;
  status?: boolean;
  id_raca?: string;
}

export const BUFALOS_KEY = (propriedadeId: string | null, filtros: FiltrosBufalo, page: number) =>
  ['bufalos', propriedadeId, filtros, page] as const;

export function useBufalos(propriedadeId: string | null, filtros: FiltrosBufalo = {}, page = 1) {
  return useQuery({
    queryKey: BUFALOS_KEY(propriedadeId, filtros, page),
    queryFn: () => bufaloService.filtrarBufalos(propriedadeId!, filtros, page),
    enabled: !!propriedadeId,
    placeholderData: (prev) => prev,
  });
}
```

- [ ] **Step 2: Simplificar RebanhoScreen usando o hook**

Em `src/screens/RebanhoScreen.tsx`, remover os `useState` de `animais, animaisFiltrados, refreshing, initialLoading, listLoading, paginaAtual, totalPaginas` e substituir por:

```typescript
const [filtros, setFiltros] = useState<FiltrosBufalo>({});
const [page, setPage] = useState(1);
const { propriedadeSelecionada } = usePropriedade();

const { data, isLoading, isFetching, refetch } = useBufalos(propriedadeSelecionada, filtros, page);
const animais = data?.bufalos ?? [];
const meta = data?.meta;
```

Remover os 3 `useEffect` de fetch e substituir por um único `useEffect` para reset de página ao mudar filtros:

```typescript
useEffect(() => { setPage(1); }, [filtros]);
```

- [ ] **Step 3: Commit**

```bash
git add src/services/queries/useBufalos.ts src/screens/RebanhoScreen.tsx
git commit -m "refactor(rebanho): migra fetching para TanStack Query, elimina race conditions"
```

---

### Task 12: Corrigir dependência faltante em PiquetesScreen useEffect

**Files:**
- Modify: `src/screens/PiquetesScreen.tsx`

O bug: `useEffect(() => { fetchPiquetes(); }, [])` não reage à mudança de `propriedadeSelecionada`.
Após a Task 7, a tela usa `useLotes` que já inclui `propriedadeId` na queryKey, então isso está corrigido automaticamente.

- [ ] **Step 1: Verificar que troca de propriedade recarrega dados**

Na Home, trocar de propriedade → ir para Piquetes → confirmar que lotes e grupos são da nova propriedade.

- [ ] **Step 2: Commit (se houver ajuste manual)**

```bash
git add src/screens/PiquetesScreen.tsx
git commit -m "fix(piquetes): recarrega dados ao trocar propriedade selecionada"
```

---

### Task 13: Remover dependências não utilizadas

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Identificar e remover axios e react-native-dropdown-picker**

```bash
npm uninstall axios react-native-dropdown-picker
```

- [ ] **Step 2: Verificar que nenhum arquivo importa essas libs**

```bash
grep -r "import axios" src/ --include="*.ts" --include="*.tsx"
grep -r "react-native-dropdown-picker" src/ --include="*.ts" --include="*.tsx"
```

Esperado: nenhum resultado. Se encontrar, remover o import e substituir pelo `SelectBottomSheet` já existente.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: remove axios e react-native-dropdown-picker não utilizados"
```

---

## FASE 5 — Design System e Padronização

### Task 14: Criar tokens de tipografia e espaçamento

**Files:**
- Create: `src/styles/typography.ts`
- Create: `src/styles/spacing.ts`

- [ ] **Step 1: Criar typography.ts**

Criar `src/styles/typography.ts`:

```typescript
import { StyleSheet } from 'react-native';
import { colors } from './colors';

export const typography = StyleSheet.create({
  h1: { fontSize: 28, fontWeight: '800', color: colors.text.heading, lineHeight: 34 },
  h2: { fontSize: 22, fontWeight: '700', color: colors.text.heading, lineHeight: 28 },
  h3: { fontSize: 18, fontWeight: '700', color: colors.text.heading, lineHeight: 24 },
  body: { fontSize: 15, fontWeight: '400', color: colors.text.body, lineHeight: 22 },
  bodySmall: { fontSize: 13, fontWeight: '400', color: colors.text.muted, lineHeight: 18 },
  label: { fontSize: 13, fontWeight: '600', color: colors.text.secondary },
  caption: { fontSize: 11, fontWeight: '400', color: colors.text.placeholder },
  buttonText: { fontSize: 14, fontWeight: '700' },
});
```

- [ ] **Step 2: Criar spacing.ts**

Criar `src/styles/spacing.ts`:

```typescript
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 999,
} as const;
```

- [ ] **Step 3: Commit**

```bash
git add src/styles/typography.ts src/styles/spacing.ts
git commit -m "feat(design-system): adiciona tokens de tipografia e espaçamento"
```

---

### Task 15: Padronizar componente Button com variantes

**Files:**
- Modify: `src/components/Button/index.tsx`

O Button atual só tem uma variante (amarelo). Precisamos de: primary, secondary, danger, outline.

- [ ] **Step 1: Refatorar Button para suportar variantes**

Substituir `src/components/Button/index.tsx`:

```typescript
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { colors } from '../../styles/colors';

type Variant = 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';

interface ButtonProps {
  title?: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: Variant;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

const variantStyles: Record<Variant, { bg: string; text: string; border?: string }> = {
  primary: { bg: colors.brand.primary, text: colors.text.accent },
  secondary: { bg: colors.text.accent, text: colors.brand.primary },
  danger: { bg: colors.status.error, text: colors.white },
  outline: { bg: 'transparent', text: colors.text.heading, border: colors.border.default },
  ghost: { bg: 'transparent', text: colors.text.secondary },
};

export default function Button({ title, onPress, disabled, loading, variant = 'primary', style, textStyle, fullWidth }: ButtonProps) {
  const isDisabled = disabled || loading;
  const vs = variantStyles[variant];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.base,
        { backgroundColor: vs.bg, borderColor: vs.border || 'transparent', borderWidth: vs.border ? 1 : 0 },
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
      activeOpacity={0.75}
    >
      {loading ? (
        <ActivityIndicator color={vs.text} />
      ) : (
        <Text style={[styles.text, { color: vs.text }, textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  fullWidth: { width: '100%' },
  text: { fontWeight: '700', fontSize: 14, textAlign: 'center' },
  disabled: { opacity: 0.5 },
});
```

- [ ] **Step 2: Verificar que todos os usos existentes de Button ainda funcionam**

```bash
grep -r "from.*Button" src/ --include="*.tsx" | head -20
```

Verificar que nenhum arquivo usa props removidas. Como `YellowButtonProps` era o tipo anterior, verificar se algum arquivo importava esse tipo — não havia exportação de tipo, apenas `YellowButton` (que agora é `Button`).

- [ ] **Step 3: Commit**

```bash
git add src/components/Button/index.tsx
git commit -m "feat(button): refatora com variantes primary/secondary/danger/outline/ghost"
```

---

## Roadmap Resumido

### Quick Wins (Fase 1 — 1-2 dias)
| Task | Prioridade | Impacto |
|------|-----------|---------|
| Task 1: TanStack Query | Alta | Elimina race conditions, cache automático |
| Task 2: HomeScreen com Query | Alta | Home para de ter múltiplos useState de fetch |
| Task 5: Persistir propriedade | Alta | UX imediata: não perde seleção ao reabrir |
| Task 6: GPS singleton | Alta | Bateria, conflitos eliminados |

### Médio Prazo (Fases 2-3 — 3-5 dias)
| Task | Prioridade | Impacto |
|------|-----------|---------|
| Task 7: PiquetesScreen dashboard | Alta | Maior mudança de UX do app |
| Task 8: MovimentacaoSheet | Alta | Funcionalidade nova crítica (mob só) |
| Task 9: MapLeaflet fixo | Alta | Elimina flash/reload do mapa |
| Task 10: Home KPI grid | Média | Visual moderno |

### Refatorações Grandes (Fases 4-5 — 1 semana)
| Task | Prioridade | Impacto |
|------|-----------|---------|
| Task 11: Rebanho com Query | Média | Elimina race conditions |
| Task 12: Dep faltante Piquetes | Alta | Bug (já corrigido na Task 7) |
| Task 13: Deps não usadas | Baixa | Bundle menor |
| Task 14: Tokens typography | Média | Consistência visual |
| Task 15: Button variants | Média | Design system |

---

## Tasks Detalhadas — Formato Completo

| ID | Título | Complexidade | Prioridade | Depende de |
|----|--------|-------------|-----------|------------|
| T1 | Instalar TanStack Query | Baixa | Crítica | — |
| T2 | Hooks query Propriedade/Dashboard | Baixa | Crítica | T1 |
| T3 | Hooks query Lotes/Grupos/MovLote + tipos | Média | Alta | T1 |
| T4 | React Hook Form + Zod + FormField | Baixa | Alta | — |
| T5 | Persistência PropriedadeContext | Baixa | Alta | — |
| T6 | GPS singleton LocationContext | Média | Alta | — |
| T7 | PiquetesScreen como dashboard | Alta | Crítica | T3 |
| T8 | MovimentacaoSheet | Média | Alta | T3, T4 |
| T9 | MapLeaflet estático + fix scroll aninhado | Alta | Crítica | — |
| T10 | Home KPI grid + KpiCard | Média | Média | T2 |
| T11 | RebanhoScreen com TanStack Query | Média | Média | T1 |
| T12 | Fix dep useEffect PiquetesScreen | Baixa | Alta | T7 |
| T13 | Remover deps não usadas | Baixa | Baixa | — |
| T14 | Tokens tipografia e espaçamento | Baixa | Média | — |
| T15 | Button com variantes | Baixa | Média | — |

### Critérios de Aceite Globais

- [ ] App compila e roda sem crash em Android
- [ ] Troca de propriedade recarrega todas as telas automaticamente
- [ ] Piquetes exibe lista de lotes e grupos (não só mapa)
- [ ] Movimentação entre lotes funciona end-to-end
- [ ] Mapa não pisca ao adicionar pontos
- [ ] GPS não cria múltiplos watchers
- [ ] Home exibe KPI cards no layout grid
- [ ] Propriedade selecionada persiste entre sessions
