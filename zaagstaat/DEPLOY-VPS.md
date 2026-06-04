# Zaagstaat uitrollen op Hetzner VPS

De architectuur is simpel:
- **Frontend** (statische bestanden) → jouw Hetzner VPS via Caddy
- **Backend** (sessieopslag) → Cloudflare Worker, al live op `zaagstaat-api.zaagstaat-api.workers.dev`

---

## Vereisten

- Hetzner VPS met Ubuntu 22.04+ (Cloud of dedicated)
- Een domeinnaam, bijv. `zaagstaat.jouwdomein.nl`
- DNS A-record van dat domein → IP-adres van jouw VPS

---

## 1. Server inrichten (eenmalig)

SSH in op je VPS:

```bash
ssh root@JOUW-VPS-IP
```

### Caddy installeren (webserver + automatisch HTTPS)

```bash
apt update && apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install -y caddy
```

### Map aanmaken voor de site

```bash
mkdir -p /var/www/zaagstaat
chown caddy:caddy /var/www/zaagstaat
```

---

## 2. Caddy configureren

Maak `/etc/caddy/Caddyfile` aan:

```bash
nano /etc/caddy/Caddyfile
```

Inhoud (vervang het domein):

```
zaagstaat.jouwdomein.nl {
    root * /var/www/zaagstaat
    encode gzip
    file_server
    # SPA: stuur alle routes naar index.html
    try_files {path} /index.html
}
```

Herstart Caddy:

```bash
systemctl reload caddy
```

Caddy regelt automatisch een Let's Encrypt SSL-certificaat zodra het domein klopt.

---

## 3. Frontend bouwen en uploaden

Doe dit op **jouw eigen Mac**, vanuit de `zaagstaat/` map:

```bash
cd "/Users/steven/Desktop/CLAUDE/cutlist optimizer/zaagstaat"
npm run build
```

Upload de `dist/` map naar de VPS:

```bash
rsync -avz --delete dist/ root@JOUW-VPS-IP:/var/www/zaagstaat/
```

Klaar. Open `https://zaagstaat.jouwdomein.nl` in de browser.

---

## 4. CORS instellen op de Worker

Nu de frontend op een eigen domein staat, beperk je CORS tot dat domein.

Pas `worker/wrangler.toml` aan:

```toml
[vars]
ALLOWED_ORIGIN = "https://zaagstaat.jouwdomein.nl"
```

Deploy de Worker opnieuw:

```bash
cd worker/
npm run deploy
```

---

## 5. Updaten na wijzigingen

Elke keer dat je nieuwe code wilt uitrollen:

```bash
cd "/Users/steven/Desktop/CLAUDE/cutlist optimizer/zaagstaat"
npm run build
rsync -avz --delete dist/ root@JOUW-VPS-IP:/var/www/zaagstaat/
```

Optioneel: maak hier een shellscriptje van (`deploy.sh`):

```bash
#!/bin/bash
set -e
echo "Bouwen..."
npm run build
echo "Uploaden..."
rsync -avz --delete dist/ root@JOUW-VPS-IP:/var/www/zaagstaat/
echo "✓ Live op https://zaagstaat.jouwdomein.nl"
```

```bash
chmod +x deploy.sh
./deploy.sh
```

---

## Samenvatting

| Stap | Eenmalig / herhalend |
|---|---|
| Caddy installeren + Caddyfile | Eenmalig |
| DNS A-record instellen | Eenmalig |
| `npm run build` + `rsync` | Bij elke update |
| Worker deploy (bij Worker-wijzigingen) | Zelden |

De Worker op Cloudflare blijft gratis draaien en hoeft niet naar de VPS.
