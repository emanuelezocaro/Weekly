# Weekly

Habit tracker installabile come PWA (anche su iPhone) per tracciare ogni
giorno le tue attività ricorrenti: lettura, sport, inglese, LinkedIn e altro.

- **Calendario** con vista Giorno / Settimana / Mese e navigazione avanti-indietro
- **Report** giornalieri, settimanali e mensili con percentuali di completamento e streak
- **Sincronizzazione su Google Sheet**, così i dati sopravvivono a un cambio di telefono
- **Notifiche locali** come promemoria giornaliero
- Nessun account richiesto: i dati vivono in `localStorage` e (opzionalmente) sul tuo Google Sheet

## Sviluppo

```bash
npm install
npm run dev
```

## Build & anteprima

```bash
npm run build
npm run preview
```

## Sincronizzazione con Google Sheet

Vedi [`google-apps-script/README.md`](./google-apps-script/README.md) per le
istruzioni passo passo su come pubblicare il piccolo backend gratuito su
Google Apps Script e collegarlo dall'app (scheda Impostazioni).

## Deploy su GitHub Pages

Il push su `main` attiva `.github/workflows/deploy.yml`, che builda l'app e
la pubblica su GitHub Pages. Per completare l'attivazione serve abilitare una
sola volta, sul repository:

**Settings → Pages → Source: GitHub Actions**
