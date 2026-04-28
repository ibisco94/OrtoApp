# Orto · Pianificatore

App per pianificare semine e raccolti del tuo orto, con dati calibrati per l'Emilia-Romagna. È una **PWA** (Progressive Web App): si installa sul telefono come un'app normale e funziona anche offline.

## Cosa fa

- **Oggi**: cosa fare nell'orto adesso (semine consigliate, trapianti e raccolte in arrivo)
- **Calendario**: vista mensile con tutti gli eventi delle tue piante
- **Le mie piante**: traccia ogni pianta con timeline visuale (semina → trapianto → raccolto)
- **Catalogo**: 26 ortaggi con schede dettagliate (semina, trapianto, raccolto, suolo, consociazioni, nemici)
- **Mappa**: disegna le aiuole del tuo orto e assegna cosa coltivi dove

I dati sono salvati in locale sul telefono (nessun account, nessun server).

## Come pubblicarla — passo passo

Hai già un account GitHub (`ibisco94`), perfetto. Useremo **GitHub Pages**, gratis e immediato.

### 1. Crea il repository

1. Vai su https://github.com/new
2. Nome: `orto-app` (o quello che preferisci)
3. Pubblico, senza README/license/gitignore (lasciali vuoti, ne abbiamo già)
4. Clicca **Create repository**

### 2. Carica i file

Nella pagina del repo appena creato:

1. Clicca **uploading an existing file**
2. Trascina dentro **tutti i file e cartelle** di questo progetto:
   - `index.html`, `styles.css`, `app.js`, `data.js`
   - `manifest.json`, `sw.js`, `README.md`
   - cartella `icons/` (con dentro `icon.svg`, `icon-192.png`, `icon-512.png`)
3. In fondo, scrivi un messaggio tipo "Prima versione" e clicca **Commit changes**

### 3. Attiva GitHub Pages

1. Nel repo, vai su **Settings** (in alto a destra)
2. Nel menu sinistro: **Pages**
3. Sotto "Build and deployment" → "Source", scegli **Deploy from a branch**
4. Branch: **main**, cartella: **/ (root)**, poi **Save**
5. Aspetta 1-2 minuti. In cima alla pagina Pages comparirà l'URL del tipo:

   `https://ibisco94.github.io/orto-app/`

### 4. Installala sul telefono

1. Apri quell'URL su Chrome **dal tuo telefono Android**
2. Chrome ti mostrerà un banner "Aggiungi alla schermata Home" — accettalo. Se non compare, menù `⋮` → **Installa app**
3. Fatto: hai l'icona dell'app sulla home, si apre a tutto schermo come un'app vera, funziona anche senza connessione

## Come modificarla

Quando vuoi cambiare qualcosa, due strade:

**Modifica diretta su GitHub** (più facile per piccole cose):
- Apri il file da modificare nel repo, clicca l'icona della matita, modifica, **Commit**. Tra 1-2 minuti l'app online è aggiornata.

**Locale con Claude Code**:
- Clona il repo: `git clone https://github.com/ibisco94/orto-app.git`
- Apri Claude Code nella cartella e dimmi cosa cambiare
- `git push` per pubblicare

## Aggiungere un ortaggio

Apri `data.js`, copia uno dei blocchi esistenti, modifica i campi:

```js
{
  id: 'cetriolo',          // identificativo univoco
  nome: 'Cetriolo',
  famiglia: 'Cucurbitacee',
  emoji: '🥒',
  semina: { mesi: [3,4,5], tipo: 'semenzaio o diretta', profondita: '2 cm', distanza: '60 cm' },
  trapianto: { giorniDopoSemina: 30, mesi: [5,6] },     // null se semina diretta
  raccolta: { giorniDopoTrapianto: 60, mesi: [7,8,9] }, // o giorniDopoSemina per dirette
  ...
}
```

## Idee per il futuro

Quando vuoi farla crescere, qui c'è da divertirsi:

- **Notifiche push**: avvisi quando è ora di trapiantare/raccogliere
- **Foto delle piante**: scatta foto a ogni stadio, salvale in IndexedDB
- **Diario**: note per ogni pianta (annaffiature, trattamenti, problemi)
- **Meteo**: integrazione con API meteo per consigli contestuali
- **Riconoscimento malattie**: foto della foglia → identificazione parassita/malattia (richiede backend AI)
- **Backup cloud**: esportazione/sincronizzazione dei dati

Quando ne hai voglia, dimmi quale e la integriamo.

---

Buon orto! 🌱
