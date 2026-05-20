# 🛠️ ArtigianoAI

> Il tuo backoffice intelligente, a portata di voce.

ArtigianoAI è un'applicazione web monorepo di livello enterprise progettata specificamente per gli artigiani italiani (elettricisti, idraulici, muratori, impiantisti). Grazie a un'interfaccia vocale avanzata basata su Intelligenza Artificiale, consente di generare preventivi dettagliati in pochi secondi parlando naturalmente al proprio smartphone o computer, gestire le anagrafiche dei clienti, organizzare il catalogo dei materiali e inviare preventivi condivisibili via WhatsApp per l'approvazione immediata e senza registrazione da parte dei clienti.

---

## 🗺️ Mappa della Documentazione

Per comprendere a fondo il sistema e contribuire al suo sviluppo, esplora la suite completa di documentazione:

*   **[Architettura di Sistema](./docs/architecture.md)**: Panoramica tecnica, flusso dei dati audio, diagramma dei pacchetti del monorepo e strategia offline.
*   **[Modello dei Dati e Database](./docs/database.md)**: Schema ERD completo di Supabase (PostgreSQL), dizionario dei dati, formato JSONB delle righe e policy RLS.
*   **[Specifiche API Backend](./docs/api.md)**: Catalogo completo degli endpoint Fastify, schemi delle richieste/risposte ed autenticazione JWT.
*   **[Integrazione e Abstrattività AI](./docs/ai-providers.md)**: Analisi di Groq e OpenAI, prompt di sistema dettagliati, compatibilità linguistica e guida all'estensione dei provider.
*   **[Frontend e Design System](./docs/frontend.md)**: Flusso dello stato Zustand, gestione di TanStack Query, ciclo di vita di `VoiceRecorder` e token visivi.
*   **[Roadmap di Sviluppo (V0 -> V3)](./docs/roadmap.md)**: Piano strategico per la gestione dei cantieri, fatturazione elettronica (SDI) ed integrazione CRM.
*   **[Guida Utente Ufficiale (Italiano)](./docs/guida-utente.md)**: Manuale d'uso completo in italiano per l'artigiano finale, con trucchi per la dettatura vocale e FAQ.

---

## 🏗️ Struttura del Monorepo

Il progetto è gestito come un monorepo strutturato tramite **pnpm workspaces**:

```text
artigianoai/
├── apps/
│   ├── api/                   # Backend Fastify + TypeScript (Node.js)
│   └── web/                   # Frontend React + Vite + TypeScript + Tailwind CSS
├── packages/
│   └── shared/                # Zod schemas, helper e calcoli monetari condivisi
├── docs/                      # Suite di documentazione tecnica e utente
├── package.json               # Configurazione degli script globali del monorepo
├── pnpm-workspace.yaml        # Definizione dei workspace pnpm
└── tsconfig.base.json         # Configurazione TypeScript di base condivisa
```

---

## ⚙️ Requisiti di Sistema e Setup del Sviluppatore

### Requisiti

*   **Node.js**: `v20.x` o superiore
*   **pnpm**: `v10.x` o superiore (gestito tramite `corepack`)
*   **Database**: Istanza di Supabase attiva (PostgreSQL)

### Installazione Rapida

1.  **Abilita Corepack e installa le dipendenze**:
    ```bash
    corepack enable
    pnpm install
    ```

2.  **Configura le variabili d'ambiente**:
    Copia i file di esempio nei rispettivi moduli e compila i valori richiesti:
    *   Backend API (`apps/api/.env`):
        ```bash
        cp apps/api/.env.example apps/api/.env
        ```
    *   Frontend Web (`apps/web/.env`):
        ```bash
        cp apps/web/.env.example apps/web/.env
        ```

3.  **Applica le migrazioni del database**:
    Importa la struttura SQL definita in `apps/api/supabase/migrations/001_initial.sql` nella console SQL di Supabase.

---

## 📝 Configurazione d'Ambiente

### Backend (`apps/api/.env`)

| Variabile | Descrizione | Valore Esempio |
| :--- | :--- | :--- |
| `SUPABASE_URL` | URL dell'istanza Supabase (progetto API) | `https://ojvhfujskvjmpmhbdhbd.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Chiave segreta di servizio per bypassare RLS nei flussi di sistema | `sb_secret_QK_Cy-YL...` |
| `PORT` | Porta su cui il server Fastify rimane in ascolto | `3001` |
| `WEB_ORIGIN` | URL del client frontend per la configurazione CORS | `http://localhost:3000` |
| `AI_PROVIDER` | Provider AI attivo per trascrizione e parsing (`groq` \| `openai`) | `groq` |
| `GROQ_API_KEY` | Chiave API di Groq (richiesta se `AI_PROVIDER=groq`) | `gsk_A2YfB...` |
| `OPENAI_API_KEY` | Chiave API di OpenAI (richiesta se `AI_PROVIDER=openai`) | `sk-proj-...` |

### Frontend (`apps/web/.env`)

| Variabile | Descrizione | Valore Esempio |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | URL pubblico dell'istanza Supabase | `https://ojvhfujskvjmpmhbdhbd.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Chiave anonima pubblica per autenticazione client-side | `eyJhbGciOiJIUzI1Ni...` |
| `VITE_API_URL` | URL del server backend Fastify | `http://localhost:3001` |

---

## 🚀 Comandi del Monorepo

Tutti i comandi possono essere eseguiti dalla radice del monorepo per orchestrare i singoli workspace:

*   **Avviare il server di sviluppo (API + Web in parallelo)**:
    ```bash
    pnpm dev
    ```
*   **Compilare l'intero progetto per la produzione**:
    ```bash
    pnpm build
    ```
*   **Eseguire il controllo statico dei tipi TypeScript in tutto il monorepo**:
    ```bash
    pnpm typecheck
    ```
*   **Eseguire i test unitari sui pacchetti condivisi**:
    ```bash
    pnpm test
    ```

---

## 📄 Licenza

Questo progetto è distribuito sotto licenza **MIT**. Consulta il file `LICENSE` per ulteriori informazioni.
