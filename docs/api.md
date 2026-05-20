# 🔌 Specifiche API Backend

Il backend di ArtigianoAI è un'applicazione REST sviluppata in Node.js utilizzando il framework **Fastify** con supporto completo a TypeScript. Fornisce l'orchestrazione per l'autenticazione, la gestione delle anagrafiche, la trascrizione ed il parsing guidato dall'intelligenza artificiale, nonché la generazione dei PDF pronti all'invio.

---

## 🔐 Autenticazione ed Identificazione dell'Utente

Tutte le rotte protette richiedono l'autenticazione tramite un token **JWT (JSON Web Token)** valido emesso da Supabase Auth.

*   Il client deve includere il token all'interno dell'header HTTP delle richieste:
    `Authorization: Bearer <JWT_TOKEN>`
*   Il plugin di backend `requireAuth` intercetta e valida il token. Se valido, popola l'utente all'interno della richiesta (`getAuthUser(request)`). Il `sub` del JWT viene mappato direttamente sul campo `users.id` nel database.

---

## 🗺️ Mappa Completa degli Endpoint

### 1. Servizi Vocali ed Intelligenza Artificiale

#### `POST /api/preventivi/voice/transcribe`
Trascrive un file audio dettato dall'artigiano ed estrae automaticamente in formato JSON strutturato l'elenco dei materiali, delle ore di lavoro e delle note del preventivo.
*   **Autenticazione richiesta**: Sì (JWT)
*   **Content-Type**: `multipart/form-data`
*   **Request Body**:
    *   `audio`: File binario (supporta formati `.mp3`, `.wav`, `.m4a`, `.webm`). Dimensione massima consentita: **25 MB**.
*   **Risposta di Successo (200 OK)**:
    ```json
    {
      "transcript": "Ho fatto tre ore di manodopera a trentacinque euro all'ora e ho installato due prese bticino a dodici euro l'una più una scatola di derivazione a cinque euro.",
      "parsed": {
        "ore_lavoro": 3,
        "descrizione_lavoro": "Ricerca guasto e installazione prese",
        "righe": [
          {
            "tipo": "manodopera",
            "descrizione": "Manodopera specializzata",
            "qty": 3,
            "prezzo_unitario": 35.00
          },
          {
            "tipo": "materiale",
            "descrizione": "Presa elettrica Bticino",
            "qty": 2,
            "prezzo_unitario": 12.00
          },
          {
            "tipo": "materiale",
            "descrizione": "Scatola di derivazione",
            "qty": 1,
            "prezzo_unitario": 5.00
          }
        ],
        "note": "Intervento di ripristino linea prese",
        "confidence": "high"
      }
    }
    ```
*   **Codici di Errore Specifici**:
    *   `400 Bad Request`: File audio mancante o non inviato sotto il campo `audio`.
    *   `422 Unprocessable Entity`: La trascrizione o l'estrazione LLM ha fallito (es. rumore di fondo incomprensibile). Ritorna `{ "error": "transcription_failed" }` o `{ "error": "parsing_failed", "transcript": "..." }`.

---

### 2. Gestione Preventivi (`/api/preventivi`)

Tutti i prezzi e gli importi imponibili/ivati sono calcolati automaticamente lato backend prima del salvataggio nel database tramite le formule deterministiche di `@artigianoai/shared`.

#### `POST /api/preventivi`
Crea un nuovo preventivo per un determinato cliente.
*   **Autenticazione richiesta**: Sì (JWT)
*   **Request Body (`CreatePreventivoSchema`)**:
    ```json
    {
      "cliente_id": "8f8303f9-715a-4e2b-bb4f-82ff5d4b3df3",
      "titolo": "Rifacimento impianto cucina",
      "descrizione": "Fornitura e posa in opera di punti luce e prese",
      "righe": [
        {
          "tipo": "manodopera",
          "descrizione": "Installazione tubazioni sotto traccia",
          "qty": 8,
          "prezzo_unitario": 35.00
        }
      ],
      "iva_percentuale": 22,
      "stato": "bozza",
      "note": "Pagamento 50% inizio lavori, 50% alla consegna.",
      "validita_giorni": 30
    }
    ```
*   **Risposta di Successo (201 Created)**: Ritorna l'oggetto `Preventivo` completo valorizzato con l'identificativo univoco, il `numero_progressivo` incrementale automatico per quell'utente, i totali imponibili/ivati calcolati e il `public_token` univoco.

#### `GET /api/preventivi`
Elenca tutti i preventivi dell'artigiano autenticato (esclude quelli eliminati).
*   **Autenticazione richiesta**: Sì (JWT)
*   **Query Parameters**:
    *   `cliente_id` (opzionale): Filtra i preventivi emessi solo per un determinato cliente.
*   **Risposta di Successo (200 OK)**: Array JSON contenente i preventivi ordinati dal più recente.

#### `GET /api/preventivi/:id`
Recupera le specifiche complete di un singolo preventivo.
*   **Autenticazione richiesta**: Sì (JWT)
*   **Risposta di Successo (200 OK)**: Oggetto `Preventivo` comprensivo dell'anagrafica cliente correlata.

#### `PATCH /api/preventivi/:id`
Aggiorna parzialmente un preventivo esistente. Ricalcola automaticamente i totali se le `righe` o l'aliquota `iva_percentuale` vengono modificate.
*   **Autenticazione richiesta**: Sì (JWT)
*   **Request Body (`UpdatePreventivoSchema`)**: Oggetto parziale (es. `{ "stato": "inviato" }` o modifica righe).
*   **Risposta di Successo (200 OK)**: Il preventivo aggiornato.

#### `DELETE /api/preventivi/:id`
Esegue una cancellazione logica del preventivo (Soft Delete) impostando la colonna `deleted_at` alla data corrente.
*   **Autenticazione richiesta**: Sì (JWT)
*   **Risposta di Successo (200 OK)**: `{ "success": true }`.

---

### 3. Flusso Pubblico Cliente (`/api/preventivi/public`)

Questi endpoint sono **pubblici (non protetti da JWT)** e consentono al cliente finale dell'artigiano di visionare e interagire con il preventivo a lui intestato semplicemente conoscendo il token segreto univoco.

#### `GET /api/preventivi/public/:token`
Recupera il preventivo ed i dettagli aziendali dell'artigiano emittente.
*   **Autenticazione richiesta**: No
*   **Risposta di Successo (200 OK)**:
    ```json
    {
      "preventivo": {
        "id": "e26eb452-fcd9-4c59-86f3-34e8d356deaa",
        "numero_progressivo": 4,
        "titolo": "Sostituzione Caldaia a Condensazione",
        "righe": [...],
        "totale_imponibile": 1850.00,
        "iva_percentuale": 10,
        "totale_ivato": 2035.00,
        "stato": "inviato"
      },
      "cliente": {
        "nome": "Mario Rossi",
        "telefono": "+39 347 1234567"
      },
      "azienda": {
        "nome_azienda": "Termoidraulica di Andrea Galvano",
        "partita_iva": "01234567890",
        "indirizzo": "Via Roma 45, Milano",
        "logo_url": "https://.../logo.png"
      }
    }
    ```

#### `POST /api/preventivi/public/:token/accetta`
Il cliente finale accetta formalmente il preventivo.
*   **Autenticazione richiesta**: No
*   **Risposta di Successo (200 OK)**:
    ```json
    {
      "id": "e26eb452-fcd9-4c59-86f3-34e8d356deaa",
      "stato": "accettato"
    }
    ```

#### `POST /api/preventivi/public/:token/rifiuta`
Il cliente finale rifiuta il preventivo.
*   **Autenticazione richiesta**: No
*   **Risposta di Successo (200 OK)**:
    ```json
    {
      "id": "e26eb452-fcd9-4c59-86f3-34e8d356deaa",
      "stato": "rifiutato"
    }
    ```

---

### 4. Gestione Clienti (`/api/clienti`)

#### `POST /api/clienti`
Crea una nuova anagrafica cliente.
*   **Autenticazione richiesta**: Sì (JWT)
*   **Request Body (`CreateClienteSchema`)**:
    ```json
    {
      "nome": "Giuseppe Verdi",
      "indirizzo": "Via Dante 12, Torino",
      "telefono": "339 9988776",
      "email": "giuseppe.verdi@example.com",
      "note": "Proprietario immobile secondo piano"
    }
    ```
*   **Risposta di Successo (201 Created)**: Ritorna l'oggetto `Cliente` inserito valorizzato con l'identificativo univoco del record.

#### `GET /api/clienti`
Elenca i clienti gestiti dall'artigiano autenticato.
*   **Autenticazione richiesta**: Sì (JWT)
*   **Risposta di Successo (200 OK)**: Array di oggetti cliente.

#### `PATCH /api/clienti/:id`
Aggiorna i dettagli anagrafici del cliente.
*   **Autenticazione richiesta**: Sì (JWT)
*   **Request Body**: Oggetto parziale contenente i campi da modificare.
*   **Risposta di Successo (200 OK)**: Record aggiornato.

---

### 5. Gestione Catalogo Materiali (`/api/catalogo/materiali`)

#### `GET /api/catalogo/materiali`
Elenca l'elenco dei materiali preferiti o registrati dall'utente.
*   **Autenticazione richiesta**: Sì (JWT)
*   **Risposta di Successo (200 OK)**: Array ordinato alfabeticamente per `nome`.

#### `POST /api/catalogo/materiali`
Crea una nuova voce a catalogo.
*   **Autenticazione richiesta**: Sì (JWT)
*   **Request Body (`CreateMaterialeCatalogoSchema`)**:
    ```json
    {
      "nome": "Presa Unel Bticino Livinglight",
      "prezzo_unitario": 8.40,
      "unita_misura": "pz"
    }
    ```
*   **Risposta di Successo (201 Created)**: Ritorna il materiale registrato.
