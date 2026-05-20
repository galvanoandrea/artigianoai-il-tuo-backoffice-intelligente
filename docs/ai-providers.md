# 🧠 Integrazione e Abstrattività AI

Il cuore tecnologico di ArtigianoAI risiede nella sua abilità di convertire flussi vocali destrutturati in documenti fiscali precisi e formalizzati. Questa sezione descrive nel dettaglio l'architettura di elaborazione, i prompt utilizzati e la gestione dei diversi provider di Intelligenza Artificiale.

---

## 🛠️ Interfacce dei Provider Vocali e Generativi

Per evitare qualsiasi blocco tecnologico (vendor lock-in), i servizi AI sono interamente astratti dietro due interfacce TypeScript fondamentali situate all'interno di `apps/api/src/services/ai/provider.interface.ts`:

### 1. `SpeechProvider` (Trascrizione Vocale)
Converte il file audio inviato dal microfono del dispositivo mobile in una stringa di testo letterale.
```typescript
export interface SpeechProvider {
  /**
   * Converte un buffer audio binario in testo.
   * @param audioBuffer Dati binari dell'audio registrato
   * @param mimeType Formato audio (es. audio/webm, audio/mp3)
   */
  transcribe(audioBuffer: Buffer, mimeType: string): Promise<string>;
}
```

### 2. `LLMProvider` (Analisi e Parsing Semantico)
Analizza il testo della trascrizione vocale, mappa l'intento dell'utente e lo trasforma in un formato strutturato e tipizzato.
```typescript
export interface LLMProvider {
  /**
   * Analizza la trascrizione ed estrae le righe del preventivo in modo strutturato.
   * @param transcript Testo ottenuto dallo SpeechProvider
   */
  parsePreventivo(transcript: string): Promise<PreventivoParseResult>;
}
```

---

## 📝 Prompt di Sistema e Ingegneria dell'Istruzione

Il parser LLM riceve istruzioni rigidamente definite che guidano l'estrazione semantica. Di seguito viene riportato e commentato il prompt di sistema attivo `PREVENTIVO_PARSE_SYSTEM_PROMPT`:

```text
Sei un assistente per artigiani italiani. Ricevi la trascrizione
vocale di un artigiano che descrive un preventivo.
Estrai: ore di lavoro, materiali con quantità e prezzi.
Rispondi SOLO con JSON valido in questo formato:
{
  "ore_lavoro": number | null,
  "descrizione_lavoro": string | null,
  "righe": [
    {
      "descrizione": string,
      "qty": number,
      "prezzo_unitario": number,
      "tipo": "manodopera" | "materiale"
    }
  ],
  "note": string | null,
  "confidence": "high" | "medium" | "low"
}
Se un prezzo non è menzionato, usa 0. Non inventare valori.
La riga manodopera ha prezzo_unitario = tariffa oraria × ore.
```

### Analisi delle Regole di Progettazione del Prompt:
1.  **Restrizione Formale ("Rispondi SOLO con JSON valido")**: Previene la generazione di testo esplicativo o discorsivo tipico degli LLM (es. *"Ecco il tuo JSON..."*), evitando errori a livello del parser `JSON.parse()`.
2.  **Mappatura Zero-Fallback ("Se un prezzo non è menzionato, usa 0")**: Garantisce che l'applicazione non vada in errore se l'artigiano dimentica di indicare un prezzo durante la dettatura vocale, lasciando all'editor visivo il compito di evidenziare i campi da completare.
3.  **Risoluzione delle Ore di Manodopera**: La riga contrassegnata come `"tipo": "manodopera"` effettua autonomamente il calcolo combinando il costo orario specificato con le ore inserite.

---

## ⚙️ Configurazione dei Provider AI

### 1. Provider Groq (`AI_PROVIDER=groq`)
Groq è ideale in ambiente di sviluppo e nei piani gratuiti grazie alla sua velocità fulminea di inferenza basata su chip LPU.
*   **Modello Speech-to-Text**: `whisper-large-v3`
    Trascrive l'italiano con straordinaria accuratezza, filtrando in modo superbo rumori di fondo comuni (es. trapani, rumore stradale).
*   **Modello LLM**: `llama-3.3-70b-versatile`
    Modello open-source eccezionalmente flessibile, addestrato su una vasta base di lingue e codifica JSON strutturata.

### 2. Provider OpenAI (`AI_PROVIDER=openai`)
Ottimizzato per l'ambiente di produzione dove l'assoluta affidabilità strutturale dei JSON ed il supporto a formati audio insoliti sono critici.
*   **Modello Speech-to-Text**: `whisper-1`
*   **Modello LLM**: `gpt-4o` (GPT-4 Omni)

---

## 🚀 Guida Estensione: Aggiungere un nuovo Provider (es. Anthropic Claude)

L'aggiunta di un nuovo provider generativo richiede solo 4 semplici passi:

1.  **Crea il file del provider**:
    Crea `apps/api/src/services/ai/anthropic.provider.ts` implementando le due interfacce:
    ```typescript
    import { SpeechProvider, LLMProvider, PreventivoParseResult } from "./provider.interface.js";
    import Anthropic from "@anthropic-ai/sdk";

    export class AnthropicProvider implements SpeechProvider, LLMProvider {
      // Inizializza client SDK Anthropic ed implementa i metodi
    }
    ```
2.  **Aggiorna la Factory**:
    Modifica `apps/api/src/services/ai/factory.ts` per includere il nuovo caso logico:
    ```typescript
    import { AnthropicProvider } from "./anthropic.provider.js";

    // All'interno della logica di get:
    if (providerType === "anthropic") {
      const instance = new AnthropicProvider();
      return instance; // istanza condivisa
    }
    ```
3.  **Configura le Credenziali**:
    Aggiungi le chiavi d'ambiente necessarie (es. `ANTHROPIC_API_KEY`) all'interno del file `.env`.
4.  **Imposta il Provider**:
    Imposta `AI_PROVIDER=anthropic` per rendere immediatamente attivo il nuovo modello su tutto il sistema.

---

## ⚠️ Limiti e Gestione delle Ambiguità Verbali

L'elaborazione semantica è ottimizzata per comprendere il linguaggio naturale degli artigiani, gestendo in automatico le seguenti ambiguità comuni:

*   **Valori Espressi in Parole vs Numeri**: Il parser converte autonomamente locuzioni verbali quali *"dodici euro e cinquanta"* in `12.5` e *"sei ore"* in `6`.
*   **Manodopera Implicita**: Se l'artigiano dice *"Metti mezza giornata di lavoro a trenta all'ora"*, l'LLM deduce autonomamente `4` ore (assumendo una giornata standard di 8 ore) o interpreta correttamente *"mezza giornata"* mappando `4` come quantità e `30` come prezzo unitario.
*   **Nomi dei Prodotti**: Termini ed abbreviazioni gergali ed italiane (es. *"magnetotermico"*, *"scatola 503"*, *"tubo corrugato da venti"*) vengono ripulite e formattate elegantemente con le lettere maiuscole corrette per la presentazione finale del preventivo al cliente.
