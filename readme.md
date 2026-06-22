# Skriblerne

Skriblerne er en minimalistisk norsk foto- og tegnelek av Ellinor og Henry. Appen viser ett fast ord per kalenderdato. Ordet gjentas på samme dato hvert år, mens bilder lagres per år og dato slik at samme dag kan sammenlignes over tid.

## Produksjon

- Primær URL: `https://henrymeen.no/skriblerne/`
- Ordgjennomgang: `https://henrymeen.no/skriblerne/ordliste.html`
- Statisk webroot på Mac mini: `/Users/henrymeen/srv/www/henrymeen/skriblerne`
- Backend-repo på Mac mini: `/Users/henrymeen/srv/apps/skriblerne/repo`
- Backend kjører bak Caddy under `/skriblerne/api/*`

## Arkitektur

Skriblerne 2.0 bruker én fast 365-dagers ordsyklus i `data/wordCycle.js`.

- 29. februar har ikke egen database-dato. På skuddår normaliseres dagens ord til 28. februar for å holde syklusen på 365 faste datoer.
- `server.js` synkroniserer ordsyklusen til MongoDB ved oppstart.
- `models/Word.js` lagrer de faste ordene med `dayOfYear`, `monthDay`, `month`, `day` og `word`.
- `models/Memory.js` lagrer bilder med unik nøkkel på `year` + `monthDay`.
- `index.html` og `js/app.js` håndterer dagens ord, årsoversikt, bildeopplasting, årsnavigasjon og sammenligning mot tidligere år.
- `ordliste.html` og `js/word-review.js` brukes til manuell gjennomgang av alle 365 ordene.
- Ordgjennomgangen kan filtreres på alle ord, uavklarte ord, ord merket `Se på` og ord med forslag.

## Funksjoner

- Dagens ord med bildeopplasting.
- Årsoversikt med 365 prikker, en for hver dato.
- Navigasjon mellom år.
- Opplasting og erstatning av bilde for valgt dato og år.
- Visning av bilder fra samme dato på tvers av år.
- Side-ved-side-sammenligning av valgt år og tidligere år.
- Eksport og import av ordgjennomgang som JSON.

## Kommandoer

```bash
npm install
npm start
npm run check
npm run review:apply -- <review.json>
```

`npm run check` kjører syntakssjekk av backend/frontend-script og validerer at ordsyklusen har 365 unike datoer og 365 unike ord.

## Miljøvariabler

```bash
MONGODB_URI=...
PORT=3024
SKRIBLERNE_EDIT_CODE=...
```

`SKRIBLERNE_EDIT_CODE` kreves for bildeopplasting. Ikke legg `.env` eller faktiske hemmeligheter i repoet.

## Ordgjennomgang

1. Åpne `ordliste.html`.
2. Marker hvert ord som `OK` eller `Se på`.
3. Bruk filteret `Uavklarte` eller `Neste uavklarte` for å jobbe videre uten å lete manuelt.
4. Fyll ut `Nytt ord` for ord som skal byttes.
5. Bruk `Eksporter gjennomgang` for å laste ned JSON.
6. Bruk `Importer gjennomgang` hvis gjennomgangen skal fortsettes i en annen browser eller på en annen maskin.

Når hele listen er gjennomgått, kan review-filen valideres uten å endre repoet:

```bash
npm run review:apply -- ~/Downloads/skriblerne-ordgjennomgang-YYYY-MM-DD.json
```

Scriptet krever at alle 365 datoer finnes i filen, at alle ord er markert, og at alle `Se på`-ord har et nytt ord. Det feiler også på duplikate sluttord.

For å lage en preview-fil:

```bash
npm run review:apply -- ~/Downloads/skriblerne-ordgjennomgang-YYYY-MM-DD.json --output /tmp/wordCycle.js
```

For å oppdatere den faste ordsyklusen i repoet etter endelig godkjenning:

```bash
npm run review:apply -- ~/Downloads/skriblerne-ordgjennomgang-YYYY-MM-DD.json --write
npm run check
```

Commit deretter endringen i `data/wordCycle.js`, push til GitHub, pull på Mac mini og deploy statiske filer hvis frontend-cacheversjoner også er endret.

## Deploy

Backend deploy:

```bash
cd /Users/henrymeen/srv/apps/skriblerne/repo
git pull --ff-only
npm run check
launchctl kickstart -k gui/$(id -u)/com.henrymeen.skriblerne
```

Frontend deploy når statiske filer er endret:

```bash
rsync -a index.html ordliste.html styles.css /Users/henrymeen/srv/www/henrymeen/skriblerne/
rsync -a js/app.js js/word-review.js /Users/henrymeen/srv/www/henrymeen/skriblerne/js/
```
