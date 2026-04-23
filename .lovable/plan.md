

# H4CK3D Builder v2 — "Lovable-killer" upgrade (+222 % na všetkom)

Z aktuálnej home obrazovky (statická demo) spravím **plne funkčnú AI builder appku**: napíšeš prompt → Lovable AI Gateway streamuje **HTML/CSS kód** → vedľa beží **živý preview v iframe**. Plus 9 vyladení existujúcich nedostatkov.

---

## 1) Hlavná nová funkcia — Prompt → Live Preview generator

**Nová route `/build`** (otvorí sa po stlačení `Send` v composeri):

```text
┌─────────────────── 100dvh ───────────────────┐
│ TopBar: ← back · "Untitled build" · ⟳ · ⤓   │  56px
├──────────────────────────────────────────────┤
│ Tabs: [ PREVIEW ]  [ CODE ]   ·  amber line  │  40px
├──────────────────────────────────────────────┤
│                                              │
│   PREVIEW: <iframe srcDoc={generatedHtml}/>  │  1fr  (sandboxed)
│   CODE:    <pre> stream tokenov, mono, line# │
│                                              │
├──────────────────────────────────────────────┤
│ Mini-composer (sticky): prompt + Send + Mic  │  auto
└──────────────────────────────────────────────┘
```

**Ako to funguje:**
- **Server function** `generate.ts` (TanStack `createServerFn`) → volá **Lovable AI Gateway** (`google/gemini-2.5-flash`, free počas promo) so system promptom: *"Si front-end AI. Vráť JEDEN samostatný HTML dokument: `<!doctype html>` + inline CSS + voliteľný `<script>`. Žiadne externé URL okrem fontov Google. Žiadne markdown fence."*
- **Streaming** odpovede cez `ReadableStream` → klient číta tokeny, append do `code` state.
- **Live preview**: `iframe` so `sandbox="allow-scripts"` a `srcDoc={code}`. Re-render priebežne (debounced 200ms počas streamu, instant po dokončení).
- **History**: každá generácia uložená v `localStorage` (key `h4ckd:builds`) — bez DB pre rýchly štart; tabuľky pridáme ako follow-up keď user povie "uložiť do cloudu".
- **Copy / Download** tlačítka: HTML do clipboardu, alebo `.html` blob download.
- **Mini-composer dole** umožňuje *iterovať*: "make hero bigger, add dark mode" → posiela aj predošlý HTML ako kontext (**diff iterácia**).

**Loading state** = phosphor zelený ASCII scanner v code paneli (CRT efekt — týchto pár pixelov robí ten "Porsche" pocit).

---

## 2) Home obrazovka — vyladenie zostávajúcich nedostatkov (×222 %)

| # | Nedostatok | Prompt na opravu | Implementácia |
|---|---|---|---|
| 1 | Hero zaberá veľa miesta keď klávesnica zatvorená | *"Hero: dynamický `font-size` cez `clamp(22px, 6.4vw, 34px)`, `line-height: 1`, max 2 riadky, ellipsis"* | Zmenšiť clamp + `line-clamp-2` |
| 2 | Composer placeholder je generický | *"Placeholder rotuje 4 promptami každé 3s s fade, napr. 'Build a SaaS landing page…', 'Generate a pricing table…' "* | `useInterval` + AnimatePresence fade |
| 3 | Send button nič nerobí | *"Send → `navigate({to:'/build', search:{ q: prompt }})` + clear inputu"* | TanStack `useNavigate` |
| 4 | KPI sparkline skoro neviditeľná | *"Sparkline: gradient stroke amber→phosphor, end-dot phosphor s glow, area fill 8 % opacity"* | Update `Sparkline.tsx` |
| 5 | Agents list nemá akciu | *"Tap na agenta → `/build` s preplneným promptom z agent.starter"* | Pridať `starter` field, navigate |
| 6 | Bottom nav `+` je bez funkcie | *"`+` otvorí `/build` s prázdnym promptom (rovnako ako Send)"* | onClick navigate |
| 7 | Žiadny haptic feedback | *"Pri tape primárnych CTA volaj `navigator.vibrate?.(8)` (best-effort)"* | helper `tap()` |
| 8 | Žiadny first-paint dojem | *"Pri prvom mounte: hero a KPI **fade+slide-up stagger** 60ms (framer)"* | `motion.div` variants |
| 9 | Suggestion chipy sú náhodné | *"3 fixné chipy podľa aktívneho `mode` (Ask/Research/…) — kontextové"* | mapa `mode → chips[]` |

---

## 3) Bonus polish (pretože "spoka za 500k")

- **Command palette `⌘K`** (mobile: long-press logo): otvorí Sheet s rýchlymi akciami (New build · Open recent · Switch model).
- **Model picker** v composeri reálne funguje: `Pro = gemini-2.5-pro`, `Flash = gemini-2.5-flash`. Preferencia uložená v localStorage.
- **Recent builds** ako 3. KPI riadok v home (mini grid 3 thumbnailov vygenerovaných z prvých 200 znakov HTML cez `<iframe scaled 0.2>`).
- **Toast systém** (sonner už máme) — copy/download/error feedback v amber hairline štýle.
- **Skeleton states** — kým streamuje, kód panel ukazuje shimmering hairline rows.

---

## 4) Technický stack & súbory

**Nové súbory:**
- `src/routes/build.tsx` — celý builder (preview/code split + mini composer)
- `src/server/generate.ts` — `createServerFn` streaming wrapper okolo Lovable AI Gateway
- `src/lib/ai.ts` — typy + system prompt + helper `streamGenerate(prompt, prevHtml?)`
- `src/lib/storage.ts` — `localStorage` helpers pre builds history
- `src/components/phosphor/CodePane.tsx` — mono code viewer s line numbers + scroll-to-bottom počas streamu
- `src/components/phosphor/PreviewFrame.tsx` — sandboxed iframe wrapper
- `src/hooks/useHaptic.ts`, `src/hooks/useRotatingPlaceholder.ts`

**Upravené súbory:**
- `src/routes/index.tsx` — Send→navigate, agent→navigate, bonus chipy, mount stagger
- `src/components/phosphor/Sparkline.tsx` — gradient + end-dot
- `src/styles.css` — `@keyframes shimmer`, `.scanlines` utility (CRT efekt)

**Backend:** Lovable Cloud + Lovable AI Gateway (auto-povolené pri prvom buildu, `LOVABLE_API_KEY` injektne sám). **Žiadne DB tabuľky** v tomto kroku — history v localStorage. DB pridáme keď user povie "chcem to mať uložené v cloude / synced".

**Deps:** všetko už máme (framer-motion, lucide-react, sonner). Bez nových npm balíkov.

---

## 5) Čo z toho user reálne uvidí

1. Otvorí appku → pekná home, animovaný mount, rotujúci placeholder.
2. Napíše: *"Postav landing pre AI startup s hero, 3 features, CTA"* → tap Send.
3. Prejde na `/build`, **CODE tab streamuje** zelený phosphor text (CRT vibe), **PREVIEW tab** sa updatuje live ako sa kód generuje.
4. Po dogenerovaní môže iterovať dole v mini-composeri: *"add pricing section, dark theme"*.
5. Tlačítkom ⤓ stiahne `.html` súbor — fungujúcu stránku.

To je presne ten "Lovable-like, ale 222 % cool" zážitok. Po schválení implementujem v jednom dávke.

