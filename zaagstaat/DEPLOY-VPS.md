# Zaagstaat uitrollen op Hetzner

De huidige productieopzet van Zaagstaat bestaat uit twee losse delen:

- **Frontend:** statische Vite-build op `zaagstaat.studiokroos.nl`, geüpload via SFTP naar de documentroot van het subdomein.
- **Projectopslag:** Cloudflare Worker met KV-opslag, ingesteld via `VITE_WORKER_URL`.

Het subdomein wordt door de bestaande Hetzner-webserver/control-panelconfiguratie
geserveerd. De Caddy-installatie op dezelfde VPS wordt voor andere diensten gebruikt en
hoeft voor Zaagstaat niet aangepast of herstart te worden.

## Vereisten

- Node.js en npm op de lokale ontwikkelmachine.
- SFTP-toegang tot de documentroot van `zaagstaat.studiokroos.nl`.
- Een lokale `.env.local` met de bestaande Cloudflare Worker-URL:

```env
VITE_WORKER_URL=https://jouw-worker.workers.dev
```

`.env.local` bevat lokale configuratie en wordt niet naar Git of de webserver geüpload.

## 1. Release lokaal controleren

Voer vanuit de map `zaagstaat/` uit:

```bash
npm install
npm test
npm run lint
npm run build
```

De productieversie staat daarna in `dist/`.

## 2. Frontend uploaden via SFTP

1. Open de bestaande SFTP-verbinding met Hetzner.
2. Open de documentroot die in het Hetzner-control-panel aan het subdomein is gekoppeld.
3. Maak bij voorkeur eerst een backup van de huidige bestanden.
4. Upload **de inhoud van `dist/`**, niet de map `dist` zelf.
5. Overschrijf de oude assets en `index.html`.
6. Controleer dat ook het verborgen bestand `.htaccess` is geüpload.

Oude bestanden met gehashte namen in `assets/` mogen worden verwijderd nadat de nieuwe
versie werkt. Ze zijn niet meer nodig, maar tijdelijk laten staan is onschadelijk.

## 3. `.htaccess`

Vite kopieert `public/.htaccess` automatisch naar `dist/.htaccess`. Dit bestand regelt:

- SPA-routes zoals `/ATEFJ`, zodat ze via `index.html` worden geopend;
- Content Security Policy;
- bescherming tegen iframe-inbedding en MIME-sniffing;
- HTTPS/HSTS-, referrer- en browserrechtenbeleid.

De headerregels staan binnen `<IfModule mod_headers.c>`. Daardoor blijft de site werken
als de hostinglaag `mod_headers` niet beschikbaar heeft; in dat geval moeten de headers
via het Hetzner-control-panel of de centrale webserverconfiguratie worden ingesteld.

## 4. Na de upload controleren

Open achtereenvolgens:

- `https://zaagstaat.studiokroos.nl/`
- een bestaand project via `https://zaagstaat.studiokroos.nl/CODE`
- de browserconsole om CSP- of netwerkfouten uit te sluiten;
- een testproject om opslaan en opnieuw laden via de Cloudflare Worker te controleren.

Gebruik een harde refresh of leeg de PWA-cache als nog een oudere versie verschijnt.

## 5. Cloudflare Worker uitrollen

Alleen nodig wanneer bestanden onder `worker/` zijn gewijzigd:

```bash
cd worker
npm install
npm run deploy
```

Controleer daarna opnieuw of een project kan worden opgeslagen en geladen. De frontend
en Worker zijn afzonderlijke deployments; alleen de frontend via SFTP uploaden werkt de
Worker dus niet bij.

## Samenvatting

| Wijziging | Actie |
|---|---|
| Alleen frontend | `npm run build`, daarna inhoud van `dist/` via SFTP uploaden |
| Worker/API | `cd worker && npm run deploy` |
| Frontend én Worker | Beide acties uitvoeren |
| Caddy | Geen actie voor Zaagstaat |
