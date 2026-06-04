# Zaagstaat

Gratis zaaglijst-optimalisator voor plaatmateriaal (multiplex, MDF). Gebouwd als Progressive Web App — geen account nodig, werkt offline.

## Functies

- Voer plaatmateriaal in (afmetingen, nerf)
- Voer onderdelen in (netto maten, materiaal, nerf)
- Automatische bruto maten (+overmaat per kant)
- Schoonzagen: veiligheidsrand rondom elke plaat
- Optimale indeling berekend met guillotine-algoritme
- Visuele plattegronden per plaat (SVG)
- Afdrukken als PDF inclusief sessiecode
- **Sessiecode** (bijv. `ATEFJ`): sla je project op en laad het later op elk apparaat — geldig 90 dagen

## Aan de slag (ontwikkeling)

```bash
npm install
npm run dev
```

Kopieer `.env.example` naar `.env.local` en vul `VITE_WORKER_URL` in wanneer de Cloudflare Worker is uitgerold.

## Uitrollen

### Frontend
```bash
npm run build
# deploy de `dist/` map naar Cloudflare Pages
```

### Backend (Cloudflare Worker)
Zie de `worker/` map. Vereist een Cloudflare-account en Wrangler CLI.

## Licentie

MIT
