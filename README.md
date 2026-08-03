# Weekly

App di time-tracking installabile come PWA (anche su iPhone). Ogni volta che
cambi attività lo segni: il blocco nuovo parte automaticamente da dove è
finito il precedente, così la giornata resta sempre coperta senza buchi
(sonno incluso).

- **Calendario** con vista Giorno (timeline a blocchi) / Settimana / Mese e navigazione avanti-indietro
- **Report** giornalieri, settimanali e mensili: classifica delle attività per tempo speso
- **Backup manuale** (esporta/importa un file `.json`) per portare i dati su un nuovo telefono
- **Notifiche locali** come promemoria giornaliero
- Nessun account richiesto: i dati vivono solo in `localStorage`, sul dispositivo

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

## Deploy su GitHub Pages

Il push su `main` attiva `.github/workflows/deploy.yml`, che builda l'app e
la pubblica su GitHub Pages. Per completare l'attivazione serve abilitare una
sola volta, sul repository:

**Settings → Pages → Source: GitHub Actions**
