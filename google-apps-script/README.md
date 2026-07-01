# Sincronizzazione con Google Sheet

Weekly può salvare attività e storico su un tuo Google Sheet, così i dati sono
al sicuro e disponibili anche se cambi telefono. Non serve creare credenziali
OAuth: basta pubblicare un piccolo script sul tuo account Google (5 minuti,
una tantum).

## 1. Crea il foglio

1. Vai su [sheets.google.com](https://sheets.google.com) e crea un nuovo foglio.
2. Chiamalo ad esempio "Weekly Data".

## 2. Pubblica lo script

1. Nel foglio: **Estensioni → Apps Script**.
2. Cancella tutto il contenuto del file `Code.gs` che si apre e incolla il
   contenuto di [`Code.gs`](./Code.gs) da questo repository.
3. Nella riga `var TOKEN = 'CHANGE_ME'`, sostituisci `CHANGE_ME` con una
   password a tua scelta (es. `var TOKEN = 'una-frase-segreta-123'`).
4. Salva il progetto (icona del floppy in alto).
5. Clicca **Distribuisci → Nuova implementazione**.
6. Come tipo scegli **App web**.
7. Imposta:
   - **Esegui come**: Me (il tuo account)
   - **Chi ha accesso**: Chiunque
8. Clicca **Distribuisci**. La prima volta Google chiederà di autorizzare lo
   script: è normale che compaia l'avviso "Google non ha verificato questa
   app" — è il tuo script personale, quindi clicca **Avanzate → Vai al
   progetto (non sicuro)** e conferma i permessi.
9. Copia l'**URL dell'app web** generato (finisce con `/exec`).

## 3. Collega l'app Weekly

1. Apri Weekly → scheda **Impostazioni** → sezione "Sincronizzazione Google Sheet".
2. Incolla l'URL copiato nel campo **URL Web App**.
3. Inserisci nel campo **Token** la stessa password scelta al punto 2.3.
4. Premi **Salva**: da questo momento l'app sincronizza automaticamente
   all'apertura, dopo ogni modifica e periodicamente in background, oltre al
   pulsante "Sincronizza ora".

## Note

- I dati sono salvati come un unico blob JSON nella cella `A1` del foglio
  `WeeklyData`: non modificarla manualmente, verrebbe sovrascritta al sync
  successivo.
- Chiunque conosca l'URL e il token può leggere/scrivere i tuoi dati: non
  condividerli.
- Se in futuro vuoi revocare l'accesso, vai su **Distribuisci → Gestisci
  implementazioni** e archivia l'implementazione.
