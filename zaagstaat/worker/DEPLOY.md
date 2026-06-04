# Worker uitrollen — stap voor stap

## Vereisten

- Een gratis [Cloudflare-account](https://dash.cloudflare.com/sign-up)
- Wrangler CLI: `npm install -g wrangler`

---

## 1. Inloggen bij Cloudflare

```bash
wrangler login
# opent een browser — log in en geef toegang
```

---

## 2. KV namespace aanmaken

```bash
cd worker/
wrangler kv namespace create PROJECTS
```

Dit geeft iets als:

```
{ binding = "PROJECTS", id = "abc123def456..." }
```

Kopieer die `id` en plak hem in `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "PROJECTS"
id = "abc123def456..."   # ← jouw id hier
```

---

## 3. Lokaal testen

```bash
cd worker/
npm run dev
# Worker draait op http://localhost:8787
```

Test met curl:

```bash
# Opslaan
curl -X PUT http://localhost:8787/project/ATEFJ \
  -H "Content-Type: application/json" \
  -d '{"sessionCode":"ATEFJ","parts":[],"stockPanels":[]}'

# Laden
curl http://localhost:8787/project/ATEFJ
```

---

## 4. Uitrollen naar Cloudflare

```bash
cd worker/
npm run deploy
```

De Worker-URL verschijnt in de output, bijv.:
`https://zaagstaat-api.JOUW-NAAM.workers.dev`

---

## 5. Frontend koppelen

Maak een `.env.local` in de `zaagstaat/` map (staat in `.gitignore`):

```
VITE_WORKER_URL=https://zaagstaat-api.JOUW-NAAM.workers.dev
```

Rebuild de frontend:

```bash
cd zaagstaat/   # de Vite root
npm run build
```

---

## 6. CORS beperken (optioneel maar aanbevolen)

Als de frontend op een vast domein staat (bijv. `https://zaagstaat.pages.dev`),
pas dan `wrangler.toml` aan:

```toml
[vars]
ALLOWED_ORIGIN = "https://zaagstaat.pages.dev"
```

En deploy opnieuw.

---

## Free tier limieten (ruim voldoende voor klas)

| | Gratis limiet |
|---|---|
| KV writes | 1.000 / dag |
| KV reads | 100.000 / dag |
| Worker requests | 100.000 / dag |
| Opslag per waarde | 25 MB (wij gebruiken < 50 KB) |
