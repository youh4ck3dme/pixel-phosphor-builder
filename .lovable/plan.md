

# H4CK3D Builder — "Phosphor Noir"
**Porsche × Apple × Vercel** · mobile-first AI agent builder

Postavím presnú reinkarnáciu obrazovky z fotky (mobilný AI builder s Ask/Research/Analyze/Build/Automate, hero promptom, KPI dlaždicami, zoznamom agentov, bottom navom) — ale v úplne novom vizuálnom jazyku.

---

## 1) Vizuálny jazyk — "Phosphor Noir"

**Paleta (Vercel-style tokens, OKLCH):**
- `--bg` čistá čierna `#000000` + `--surface` `#0A0A0A` + `--surface-2` `#111111`
- `--border` `#1F1F1F` (hairline 1px, max radius **5px** všade)
- `--amber` `#FFB000` (jantárový CRT — primárny akcent, hero text, primary CTA)
- `--phosphor` `#39FF85` (LED zelená — stavy "live", success, ringy, mikro-grafy)
- `--text` `#EDEDED` / `--muted` `#8A8A8A`
- Mono akcenty: **Geist Mono** pre čísla/labely, **Geist Sans** pre UI, **Inter Tight** pre hero

**Princípy:**
- Ostré hrany, **radius max 5px** (žiadne pill-shapes okrem mic/avatar)
- 1px hairline bordery, žiadne tiene — len **vnútorný glow** amber/phosphor pri active state
- Grid 8pt, monumentálne whitespace (Porsche typographic restraint)
- Hero typo: tight tracking `-0.04em`, weight 500, amber slovo ako jediný farebný akcent
- **Žiadne karusely.** KPI a Agents = statické gridy, prípadne vertikálny zoznam.

---

## 2) Mikro-interakcie & parallax (jemné, presné)

- **Pointer parallax**: hero, KPI dlaždice a agent ikony reagujú na pohyb prsta/myši posunom 2–6px (transform3d, spring, žiadny lag).
- **Magnetic buttons**: primárny send button + bottom-nav `+` mierne pritahuje pointer (3px radius vplyvu).
- **Mic dýchanie**: pri hold-to-record zelený phosphor ring pulzuje s reálnou amplitúdou (Web Audio API → `AnalyserNode`).
- **Tab indikátor**: amber underline 2px s `view-transition` morph medzi tabmi.
- **Number tickers**: KPI čísla sa pri prvom view animujú count-up (cubic-bezier `.22,1,.36,1`).
- **Scroll-linked**: hero KPI majú jemný 3D tilt podľa scrollu (max 4°).

---

## 3) Štruktúra obrazoviek (TanStack routes)

| Route | Účel |
|---|---|
| `/` | Builder home — presne podľa fotky, ale Phosphor Noir |
| `/agents/$id` | Detail agenta + jeho run history |
| `/runs/$id` | Live stream priebehu agenta (terminál-štýl, phosphor zelený) |
| `/automations` | Vizuálny node-editor (drag wire, snap grid 8px) |
| `/integrations` | Pripojené appky (Notion, Slack, Drive…) |
| `/settings` | Profil, model preferencie, API kľúče |

---

## 4) Komponenty na home obrazovke (mapované 1:1 na fotku, redesignované)

1. **Top bar** — menu icon · monogram **H** (amber, ostrý) · notif (phosphor dot) · avatar (1px amber ring)
2. **Mode tabs** — Ask · Research · Analyze · Build · Automate `[NEW]` — mono labely, amber underline pre aktívny
3. **Hero greeting** — `Good morning, Alex` + `How can I help you today?` (slovo *today* v amber)
4. **Prompt composer** — veľká plocha, 1px amber border keď focus, vnútorný amber glow 8% opacity, mono caret, attach `+`, model chip `Pro ▾`, mode chip `Research ▾`, mic (phosphor pulse), send (amber solid, 5px radius)
5. **Quick suggestions** — 2–3 chipy + refresh icon (žiadny scroll carousel — wrap)
6. **KPI grid 2×2** — Tasks completed · Hours saved · Success rate · Connected apps. Veľké mono čísla, mini sparkline / donut v phosphor zelenej, delta v amber. Parallax tilt.
7. **Agents list** — vertikálny zoznam (Researcher, Analyst, Planner, Writer) s ikonou, popisom a phosphor progress ringom vpravo. Hover/tap → detail.
8. **Bottom nav** — Home · Grid · `+` (centrálny amber, 5px radius, magnetic) · Docs · Settings. Hairline top border, žiadny shadow.

---

## 5) Funkcie (využijem AI Gateway + Lovable Cloud naplno)

- **Reálne AI odpovede** cez Lovable AI Gateway (default `google/gemini-3-flash-preview`, voľba Pro)
- **Streaming** odpovedí token-by-token do composeru (phosphor caret blink)
- **Hlasový vstup** — Web Speech API + vizualizácia amplitúdy
- **Agent runs** — ukladané v Lovable Cloud (DB tabuľky `agents`, `runs`, `messages`, `integrations`) s RLS
- **Auth** — email magic link, profil + `user_roles` (admin/user) v separátnej tabuľke
- **KPI** — počítané z `runs` tabuľky (tasks, success rate, hours saved odhad)
- **Integrations stub** — UI pre Notion/Slack/Drive (OAuth príde neskôr, teraz mock + connect CTA)
- **PWA** — installable, offline shell, tmavý theme-color `#000`
- **A11y** — focus rings amber 2px, kontrast AAA na čiernej, redukcia parallaxu pri `prefers-reduced-motion`

---

## 6) Čo robí toto "999% viac" než screenshot

- **CRT phosphor estetika** — jediný builder, ktorý vyzerá ako oscilátor v Porsche kokpite
- **Žiadne karusely** — všetko statické, čitateľné na prvý pohľad
- **Magnetic + parallax mikrointerakcie** na úrovni Apple keynote dema
- **Vercel dizajn tokeny** — konzistentný systém, dark-first, OKLCH
- **Ostré 5px hrany** všade — vizuálna disciplína = pocit prémie
- **Live agent stream** (terminál-štýl) ako bonus, ktorý referenčný UI nemá

---

**Stack:** TanStack Start · Tailwind v4 · Lovable Cloud (DB + Auth) · Lovable AI Gateway · Geist + Inter Tight · framer-motion (parallax/magnetic) · Web Speech + Web Audio API.

Po schválení rozbalím `H4CK3D_labs.zip`, vytiahnem z neho najlepšie použiteľné assety/komponenty a integrujem ich do tejto stavby.

