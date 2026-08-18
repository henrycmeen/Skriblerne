# Skriblerne

Skriblerne viser ett ord om dagen. Nye ord legges nederst i den opprinnelige køen, slik at de 130 historiske ordene alltid beholder samme rekkefølge. Køen startet 22. juni 2026 og har 365 plasser.

## Produksjon

- Primær URL: `https://henrymeen.no/skriblerne/`
- Ordgjennomgang: `https://henrymeen.no/skriblerne/ordliste.html`
- Statisk webroot på Mac mini: `/Users/henrymeen/srv/www/henrymeen/skriblerne`
- Backend-repo på Mac mini: `/Users/henrymeen/srv/apps/skriblerne/repo`
- Backend kjører bak Caddy under `/skriblerne/api/*`

## Arkitektur

Skriblerne bruker én 365-dagers ordkø. `data/wordCycle.js` eier de 130 historiske ordene, mens nye ord lagres i de første åpne plassene i MongoDB.

- `lib/wordQueue.js` kobler dag 1 til 22. juni 2026 og bevarer den historiske rekkefølgen.
- `server.js` synkroniserer de historiske ordene til MongoDB ved oppstart uten å overskrive nye ord i åpne plasser.
- `models/Word.js` lagrer de faste ordene med `dayOfYear`, `monthDay`, `month`, `day` og `word`.
- `models/Memory.js` lagrer bilder med unik nøkkel på `year` + `monthDay` + `owner` (`henry` eller `ellinor`).
- `index.html`, `simple.css` og `js/simple-app.js` viser dagens ord, ordlisten og feltet for å legge til neste ord.
- Historikklisten for samme dato henter bare metadata og thumbnails; full `imageData` hentes først for valgt bilde via detaljendepunktet.
- `ordliste.html`, `js/word-review.js` og `js/review-progress.mjs` brukes til manuell gjennomgang av alle 365 ordene, med egen avhuking for Henry og Ellinor.
- Ordgjennomgangen kan filtreres på alle ord, uavklarte ord, ord merket `Se på` og ord med forslag.
- Ordgjennomgangen viser når eksporten er klar for `scripts/applyWordReview.js`, inkludert at begge har vurdert alle ordene.

## Funksjoner

- Ett stort ord for dagen.
- Den opprinnelige ordlisten i korrekt rekkefølge.
- Legg til neste ord nederst i køen med lagringskoden.
- Eksisterende bilde-/minnedata og ordgjennomgang er bevart i backend og kan brukes ved en senere utvidelse.

## Kommandoer

```bash
npm install
npm start
npm run check
npm run review:first-pass -- --output /tmp/skriblerne-forste-pass.json
npm run review:status
npm run review:status -- <review.json>
npm run review:apply -- <review.json>
```

`npm run check` kjører syntakssjekk av backend/frontend-script, validerer 365 unike datoer, den eksakte historiske rekkefølgen og 235 tomme plasser, og tester at review-eksporter stoppes ved manglende status, manglende Henry/Ellinor-gjennomgang, manglende nytt ord og nye duplikate sluttord.

## Miljøvariabler

```bash
MONGODB_URI=...
PORT=3024
SKRIBLERNE_EDIT_CODE=...
```

`SKRIBLERNE_EDIT_CODE` kreves for å legge til ord og for eksisterende skriveoperasjoner. Ikke legg `.env` eller faktiske hemmeligheter i repoet.

## Ordgjennomgang

1. Åpne `ordliste.html`.
2. Velg hvem du er øverst, og huk av når du har vurdert et ord.
3. Marker hvert ord som `OK` eller `Se på`.
4. Bruk filteret `Mangler meg`, `Uavklarte` eller `Neste uavklarte` for å jobbe videre uten å lete manuelt.
5. Fyll ut `Nytt ord` for ord som skal byttes.
6. Bruk `Eksporter gjennomgang` for å laste ned JSON.
7. Bruk `Lagre felles` for å lagre gjennomgangen på Mac mini med lagringskoden. Lagring fletter inn lokale endringer og bevarer avhuking/forslag som allerede ligger felles.
8. Siden henter felles gjennomgang automatisk ved åpning. Bruk `Hent felles` for å friske opp manuelt hvis dere jobber parallelt.
9. Bruk `Importer gjennomgang` / `Eksporter gjennomgang` som ekstra backup eller manuell overføring.

For å starte med en maskinlaget første-pass liste over ord som bør vurderes, trykk `Start første-pass` i `ordliste.html`.

Den samme listen kan også lages som JSON fra terminal:

```bash
npm run review:first-pass -- --output /tmp/skriblerne-forste-pass.json
```

Importer JSON-filen i `ordliste.html`, og bruk filteret `Se på` for å gå gjennom kandidatene. Dette er ikke en fasit, bare en startliste for Henry/Ellinor-gjennomgangen. Se også `docs/ordgjennomgang-forste-pass.md`.

For å se status på første-pass-listen fra terminal uten å endre repoet:

```bash
npm run review:status
```

Når hele listen er gjennomgått, kan en eksportert review-fil valideres uten å endre repoet:

```bash
npm run review:status -- ~/Downloads/skriblerne-ordgjennomgang-YYYY-MM-DD.json
```

```bash
npm run review:apply -- ~/Downloads/skriblerne-ordgjennomgang-YYYY-MM-DD.json
```

`review:status` uten argument bygger status fra første-pass kandidatlisten. Med en JSON-sti viser den fremdrift og om den eksporterte filen er klar for apply. `review:apply` krever eksplisitt JSON-sti, og krever at alle 365 datoer finnes i filen, at alle ord er markert, at både Henry og Ellinor har vurdert alle ord, og at alle `Se på`-ord har et nytt ord. Det historiske duplikatet `Solsystem` er tillatt; nye duplikate sluttord stoppes.

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
rsync -a index.html ordliste.html simple.css styles.css /Users/henrymeen/srv/www/henrymeen/skriblerne/
rsync -a js/simple-app.js js/config.js js/app.js js/history-utils.mjs js/identity-utils.mjs js/overview-utils.mjs js/review-progress.mjs js/word-review.js /Users/henrymeen/srv/www/henrymeen/skriblerne/js/
rsync -a data/wordReviewCandidates.json /Users/henrymeen/srv/www/henrymeen/skriblerne/data/
```
