# DSM5 Buffs Mobile

Aplicativo mobile **offline-first** para gestão de búfalas leiteiras em propriedades rurais brasileiras. Desenvolvido em React Native (Android), permite ao fazendeiro registrar e acompanhar todas as operações do rebanho — ordenhas, reprodução, sanitário, pesagens e estoque de leite — mesmo sem internet, sincronizando com o backend quando houver conexão.

---

## Sumário

- [Fluxo Operacional](docs/fluxo-operacional.md) — como o fazendeiro usa o app no dia a dia
- [Funcionalidade Offline First](docs/offline-first.md) — arquitetura SQLite, fila de sync e limitações
- [Contexto para IAs](AGENTS.md) — guia completo para ferramentas de IA colaborarem no projeto

---

## 📱 Dispositivos e Emuladores

- **Emulador principal:** Pixel 3a (Android Studio)
- **Dispositivo para testes reais:** Poco X6

---

## ⚡ Requisitos

- Node.js >= 18
- Yarn ou npm
- React Native CLI
- Android Studio (com SDK e AVD configurados)
- Dispositivo Android ou emulador

---

## 🚀 Rodando o projeto

```bash
npx react-native start --reset-cache
```

Para rodar no Android:

```bash
npx react-native run-android
```

---

## 🧪 Testes

```bash
npx jest
```

Os testes são unitários com mocks do SQLite e da API. Não há testes de integração ou E2E.

---

## 📂 Estrutura do projeto

```
/src
  /components        # Componentes reutilizáveis (cards, bottom sheets, formulários)
  /context           # Contextos React (Auth, Propriedade)
  /database          # db.ts, schema.ts, migrations.ts
  /layouts           # Layouts base de tela
  /lib               # apiClient.ts (fetch autenticado)
  /screens           # Telas principais (Home, Rebanho, Lactação, Reprodução, ...)
  /services          # Serviços de domínio + sync
    /sync            # pushEndpoints.ts — resolve endpoint por entidade
    /__tests__       # Testes unitários dos serviços
  /styles            # Cores e estilos globais
  /utils             # Utilitários (date, normalizePayload, ...)
/__tests__
  /database          # Testes de schema e migrations
  /services          # Testes de serviços legados
```
