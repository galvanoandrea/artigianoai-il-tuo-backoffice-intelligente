# 👷 Guida Utente: ArtigianoAI

Benvenuto in **ArtigianoAI**! Questa guida è stata scritta appositamente per te, con parole semplici e senza termini difficili. Qui scoprirai come usare l'applicazione per risparmiare ore di lavoro d'ufficio, fare preventivi in un lampo e farti pagare prima dai tuoi clienti.

---

## 📝 Come Creare un Preventivo a Mano

Se preferisci inserire i dati usando la tastiera come hai sempre fatto, segui questi semplici passaggi:

1.  Apri l'applicazione sul tuo telefono o computer e clicca sul pulsante **"Nuovo Preventivo"** nella pagina principale.
2.  **Scegli il Cliente**: Seleziona il nome del cliente dal menu a tendina. Se è un cliente nuovo, clicca su *"Aggiungi Cliente"* per inserire il suo nome, telefono ed email in pochi secondi.
3.  **Dai un Titolo**: Scrivi un titolo semplice per ricordarti di cosa si tratta (es. *"Rifacimento Bagno Rossi"* o *"Sostituzione Caldaia"*).
4.  **Aggiungi le Voci**: Clicca su *"Aggiungi Riga"*. Per ogni voce puoi scegliere se si tratta di:
    *   **Manodopera**: Per indicare le ore di lavoro (es. *"Manodopera per montaggio sanitari"*, quantità: `4` ore, prezzo: `35 €/ora`).
    *   **Materiale**: Per i pezzi e i componenti installati (es. *"Miscelatore lavabo"*, quantità: `1`, prezzo: `75 €`).
5.  **Controlla e Salva**: L'applicazione calcolerà da sola l'IVA e ti mostrerà il totale esatto. Clicca su **"Salva"** in fondo alla pagina per memorizzarlo.

---

## 🎙️ Come Creare un Preventivo con la Voce (La Magia dell'AI)

La funzione più comoda di ArtigianoAI è la possibilità di creare un preventivo semplicemente **parlando al telefono**, proprio come se stessi inviando un messaggio vocale su WhatsApp ad un tuo collega.

```mermaid
click A "http://localhost:3000" "Fai clic per aprire l'app!"
graph LR
    A[Premi il Microfono] --> B[Parla Naturalmente]
    B --> C[Lascia il Pulsante]
    C --> D[L'Intelligenza Artificiale scrive le righe per te!]
    D --> E[Tu controlli e confermi]
```

### 🗣️ Istruzioni per Parlare al Telefono:
1.  Entra nella pagina di creazione del preventivo.
2.  Tieni premuto il pulsante rotondo con il **microfono** in fondo allo schermo.
3.  **Parla con calma e naturalezza**. Descrivi quello che hai fatto o che devi fare, specificando le ore di lavoro e i materiali con i relativi prezzi.
4.  Rilascia il pulsante. Il sistema ci metterà 2 o 3 secondi ad elaborare il tuo audio e, magicamente, vedrai comparire sotto i tuoi occhi la tabella del preventivo già compilata con i prezzi, le descrizioni e i calcoli giusti!

### 💡 Esempi Pratici di Dettatura Vocale (Copia questi esempi!):

> 📢 *“Metti tre ore di manodopera a trentacinque euro all'ora. Poi aggiungi due scatole di derivazione a cinque euro l'una e una matassa di cavo da due e mezzo a ottantacinque euro.”*
>
> *(Il sistema scriverà: 3 ore di lavoro a 35€, 2 scatole a 5€, 1 matassa a 85€, e calcolerà il totale di 200€ + IVA).*

> 📢 *“Abbiamo fatto la ricerca del guasto elettrico. Inserisci due ore e mezza di lavoro a quaranta euro all'ora e tre interruttori magnetotermici a ventidue euro l'uno. Metti nelle note che il pagamento va fatto alla consegna.”*
>
> *(Il sistema capirà le "due ore e mezza" scrivendo `2.5` come quantità, imposterà i magnetotermici come materiali e compilerà automaticamente il campo delle note).*

---

## 📲 Condividere il Preventivo su WhatsApp e la Firma del Cliente

Una volta salvato il preventivo, non c'è bisogno di stamparlo o inviare noiose email che i clienti non leggono mai. Puoi mandarlo direttamente su **WhatsApp**!

1.  Apri il preventivo che hai appena salvato.
2.  Clicca sul pulsante verde **"Invia con WhatsApp"**.
3.  L'applicazione aprirà automaticamente WhatsApp con un messaggio già pronto per il tuo cliente:
    > *“Ciao Mario Rossi, ecco il preventivo per la sostituzione della caldaia. Puoi vederlo e accettarlo cliccando qui: https://artigianoai.it/p/e26eb452...”*
4.  **Cosa vede il cliente?**
    Il cliente clicca sul link dal suo telefono. Si aprirà una pagina bellissima ed elegante, con il logo della tua azienda, l'elenco dei lavori, i prezzi chiari e un grande pulsante verde **"Accetta Preventivo"** e uno rosso *"Rifiuta"*.
5.  Se il cliente clicca su **"Accetta"**, sul tuo telefono arriverà immediatamente una notifica e lo stato del preventivo diventerà verde (**Accettato**). Non ci saranno più fraintendimenti o promesse verbali dimenticate!

---

## ❓ Domande Frequenti (FAQ)

### 1. Cosa succede se l'assistente vocale sbaglia a capire una parola o un prezzo?
Niente paura! L'assistente vocale serve solo a compilare il preventivo al posto tuo per farti risparmiare tempo. Una volta terminata la dettatura, puoi cliccare su qualsiasi riga, cambiare le parole con la tastiera, correggere i prezzi o aggiungere nuovi pezzi a mano prima di salvare. Tu hai sempre l'ultima parola.

### 2. Posso usare l'applicazione se mi trovo in un seminterrato o dove non c'è internet?
Sì! Se sei offline o non c'è campo, l'applicazione ti permette comunque di scrivere a mano il preventivo e di salvarlo momentaneamente sul telefono. Non appena tornerai in ufficio o dove c'è connessione, il sistema salverà tutto automaticamente sul server senza farti perdere nessun dato.

### 3. Come fa l'applicazione a capire la mia voce se c'è rumore in cantiere?
ArtigianoAI utilizza una tecnologia avanzata di riduzione del rumore. È in grado di filtrare i rumori di sottofondo come trapani, martellate o il traffico stradale, concentrandosi solo sulla tua voce. Per un risultato perfetto, cerca comunque di parlare vicino al microfono del telefono con un tono di voce normale.

### 4. Il preventivo accettato dal cliente sul telefono ha valore legale?
Sì. Quando il cliente clicca su *"Accetta Preventivo"*, il sistema registra in modo sicuro l'accettazione associando la data, l'ora esatta ed il dispositivo utilizzato. Questo costituisce una prova scritta dell'accordo commerciale (un contratto digitale), molto più sicura e vincolante di un semplice accordo verbale a voce.

### 5. Posso inserire il logo della mia azienda sui preventivi?
Certamente! Vai nella sezione *"Impostazioni Profilo"*, clicca su *"Carica Logo"* e seleziona l'immagine del tuo logo dal telefono o computer. Da quel momento in poi, ogni preventivo che invierai ai tuoi clienti mostrerà in alto il tuo logo in modo elegante e professionale, aumentando la fiducia dei tuoi clienti.

### 6. Quanto costa usare l'applicazione?
L'utilizzo dell'applicazione per la dettatura vocale dei preventivi è completamente **gratuito** nelle sue funzioni base. Le future funzioni avanzate come la fatturazione elettronica e l'agenda automatica avranno un piccolo costo mensile, ma sarai sempre tu a decidere se attivarle o meno.
