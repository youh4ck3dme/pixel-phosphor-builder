
# H4CK3D v3 — "+333 % kvalita, +45 % hodnota" jednorazový upgrade

Cieľ: posunúť tri fázy zážitku — **(A) zadanie promptu**, **(B) priebeh generovania**, **(C) finálny výsledok** — z "demo level" na "produktový level", v jednej dávke.

---

## A) Zadanie promptu — z "textarea" na **Prompt Studio**

Dnes: jednoriadkový composer + rotujúci placeholder. Chýba štruktúra, kontext, history, kvalita vstupu.

Pridáme:

1. **Prompt Composer 2.0** (nahradí dnešný input na home + mini-composer v `/build`)
   - Auto-rastúci textarea (1–8 riadkov), `⌘/Ctrl+Enter` = Send, `/` = command menu.
   - **Token/char counter** + odhad ceny (flash zdarma, pro = ~X kr.) live vpravo dole.
   - **Voice input** (Web Speech API) — mic button, real-time transcript do inputu.
   - **Drag & drop image / paste** — obrázok sa pripne ako attachment chip; pri generovaní sa pošle ako `image_url` content part (gemini-2.5-pro je multimodal).

2. **Smart prompt scaffolding** ("Enhance" tlačítko vedľa Send)
   - Server fn `enhancePrompt` (gemini-2.5-flash, 1 short call) prepíše stručný nápad na 6-bodový brief: *Goal · Audience · Sections · Style · Constraints · Tech*. User vidí diff a môže prijať / odmietnuť / upraviť.
   - Cieli na +30 % kvalitu výstupu zadarmo (lepší vstup = lepší výstup, bez väčšieho modelu).

3. **Štruktúrované presety** (`/` slash menu)
   - `/landing`, `/dashboard`, `/pricing`, `/portfolio`, `/email`, `/form`, `/svg-logo` — každý vloží template promptu s premennými v `{{kučerách}}` ktoré user vyplní inline (Tab medzi nimi).
   - Pridá to konzistentnosť výstupov a redukuje "blank-page paralysis".

4. **Kontextové attachy** (chips nad inputom)
   - **Reference URL**: server fn `fetchAndExtract(url)` → vytiahne `<title>`, `<meta>`, prvých 2000 znakov textu, pošle ako kontext ("štýlovo ako tento web").
   - **Color palette chip**: 4 hex farby ako "use this palette".
   - **Previous build chip**: pripne posledný HTML build ako iteračný kontext (už máme čiastočne, urobíme to explicitne viditeľné).

5. **History & quick recall**
   - `⌘K` palette: fuzzy search posledných 50 promptov, Enter = pred-vyplní composer.
   - "Recent prompts" rail pod composerom (3 chipy, horizontal scroll).

---

## B) Sprocesovanie počas generovania — z "stream" na **Live Build Telemetry**

Dnes: phosphor stream + phased progress v `/diff`. V `/build` chýba kvalitatívny feedback.

Pridáme:

1. **Streaming s milestónmi** (parser nad token streamom)
   - Detektor `<head>`, `</head>`, `<body>`, prvý `<section>`, `</body>` → emituje milestones do timeline UI.
   - Timeline pod tabmi: `● doctype → ● head → ● styles → ● body → ● section 1/N → ● scripts → ● done` s časmi.
   - User vidí *čo* sa práve generuje, nie len "tokeny letia".

2. **Live preview počas streamu — bezpečne**
   - Debounce render iframu **iba ak HTML je validný "enough"** (uzavretý `<head>`, alebo aspoň `<body>`). Inak ukáže "Composing layout…" stav.
   - Pre-warm iframe na "skeleton page" hneď ako stream začne (žiadne biele plátno).

3. **Stop / Pause / Resume / Regenerate**
   - **Stop**: `AbortController` na fetch (server fn vie ukončiť upstream). Aktuálne build sa uloží ako "partial".
   - **Regenerate with tweak**: jedným klikom zopakuje s prepísateľným promptom (modal "what to change?").
   - **Variations**: tlačítko "Generate 3 variants" — paralelne 3 fetchy, zobrazí ako 3 thumbnaily, user vyberie jeden.

4. **Cost & rate-limit awareness**
   - Server fn vracia v hlavičkách (alebo prvom chunku) `x-tokens-in`, `x-tokens-out`, `x-cost-cents`. UI ukazuje running total.
   - Pri 402 / 429 friendly modal s CTA na top-up.

5. **Auto-fix loop** (skvelé pre kvalitu)
   - Po dokončení: lightweight validator (parse HTML cez DOMParser v browseri) — ak nájde `<script>` error pri evale, ponúkne "Auto-fix" → druhý prompt s error log ako kontextom.
   - Toggleovateľné v settings.

---

## C) Finálny výsledok — z "HTML preview" na **Production-ready artefakt**

Dnes: iframe + Copy/Download HTML, snapshots, diff. Užitočné, ale ploché.

Pridáme:

1. **Multi-viewport preview** (top bar v `/build`)
   - Mobile 390 / Tablet 768 / Desktop 1280 / Full — `<iframe>` width animovaný.
   - **Screenshot export** (`html2canvas` alebo server-side `satori`/`@vercel/og` pre OG image).

2. **Quality scorecard** (panel "Quality" vedľa Code/Preview)
   - Lighthouse-lite checks v prehliadači: A11y (alt texty, kontrast, heading hierarchy), SEO (`<title>`, meta description, OG), Perf hints (image sizes, blocking `<script>`).
   - Skóre 0–100 + zoznam fixov ako kliknuteľné chipy → každý chip = follow-up prompt ("fix all a11y issues").

3. **Sekciové editovanie** (game changer)
   - Hover nad sekciou v preview → modré obrysy + tlačítko "Edit this section". Otvorí modal: "ako zmeniť TÚTO sekciu?". Server fn dostane `prompt + outerHTML sekcie` a vráti náhradu (find/replace v zdroji).
   - Žiadne full-regen → 10× rýchlejšie iterácie, zachová zvyšok stránky.

4. **Export & deploy**
   - **Download `.zip`** (HTML + extrahované assets + README s promptom použitým na vygenerovanie).
   - **Publish to Lovable Cloud Storage** — generuje verejnú URL `/p/{slug}` (route už existuje), Share Sheet rozšírime o QR kód + copy link + Open in new tab.
   - **Embed snippet** (`<iframe src="..." />`) pre vloženie inde.

5. **Verziovanie + Diff vylepšenie**
   - Tree už máme (`BuildTree`). Pridáme **side-by-side preview diff** (2 iframy + scroll sync), nielen code diff.
   - "Promote to main" tlačítko — označí verziu ako kanonickú pre daný projekt.

6. **AI Designer pass** (one-click "Make it beautiful")
   - Server fn pošle aktuálny HTML cez `gemini-2.5-pro` s briefom "elevate visual design: typography, spacing, micro-animations, dark/light parity, brand cohesion. Keep all content & structure". Vráti upgrade.
   - Toto sám-osebe vie spraviť +100 % vnímanú kvalitu.

---

## Rýchlosť (×3.33 cieľ)

- **Edge cache** server fn `enhancePrompt` a `fetchAndExtract` na 5 min (rovnaký vstup → 0 ms).
- **Optimistic preview**: kým prvý token doletí, render "skeleton page" z prompt presetu (landing/dash/...).
- **Prefetch** `/build` route na hover Send buttonu.
- **Streaming render throttle**: 60 fps cap (requestAnimationFrame), nie každý token.
- **Code highlighting** lazy (až po `done`, nie počas streamu) — počas streamu len plain mono.
- **Iframe `loading="lazy"`** v history grid.
- **Bundle**: code-split `/diff` a `BuildTree` (už by mali byť per-route, overiť).

---

## Implementačný rozsah (1 dávka, prioritizované)

**Must-have (jadro upgrade-u):**
1. Prompt Composer 2.0 (auto-grow, ⌘+Enter, counter, voice, image attach)
2. `enhancePrompt` server fn + "Enhance" UI s accept/reject diff
3. Slash presets (`/landing`, `/dashboard`, ...)
4. Streaming milestones timeline v `/build`
5. Stop / Regenerate / 3 variants
6. Multi-viewport preview + screenshot export
7. Section edit (hover → edit modal)
8. AI Designer pass tlačítko
9. Quality scorecard (a11y/seo/perf basic)
10. Export `.zip` + QR share + embed snippet

**Nice-to-have (ak ostane priestor):**
- Reference URL extractor, palette chip
- Auto-fix loop on JS errors
- Side-by-side preview diff
- Edge cache na enhance/fetch

---

## Nové súbory (orientačne)

```text
src/components/composer/
  PromptComposer.tsx          # auto-grow, attachments, slash menu, voice
  EnhanceDiff.tsx             # accept/reject pre vylepšený prompt
  SlashMenu.tsx
  AttachmentChip.tsx
src/components/build/
  StreamTimeline.tsx          # milestones
  ViewportSwitcher.tsx
  QualityPanel.tsx
  SectionEditOverlay.tsx
  VariantsGrid.tsx
src/lib/
  prompt.presets.ts
  html.milestones.ts          # parser nad streamom
  html.quality.ts             # a11y/seo/perf checks v browseri
  html.sections.ts            # find/replace sekcií
  export.zip.ts
src/lib/
  enhance.functions.ts        # createServerFn (gemini-flash)
  extract.functions.ts        # fetchAndExtract URL
  designer.functions.ts       # AI Designer pass (gemini-pro)
  variants.functions.ts       # 3× paralelný generate
src/hooks/
  useVoiceInput.ts
  useAbortableStream.ts
```

**Upravené:** `src/routes/index.tsx` (nový composer), `src/routes/build.tsx` (timeline, viewport, quality, section edit, variants), `src/routes/api/generate.ts` (abort, cost headers), `src/components/builder/ShareSheet.tsx` (QR, embed).

**Bez nových npm balíkov** okrem: `jszip` (export), `qrcode` (share), `html2canvas` (screenshot). Všetko malé, edge-safe.

---

## Čo z toho user reálne pocíti

- Napíše 5 slov → klikne **Enhance** → vidí 6-bodový brief → Send.
- V `/build` vidí **timeline** (head → styles → hero → features → CTA → done) a živý preview ktorý sa skladá ako stránka v reále.
- Po dokončení: prepne **mobile/desktop**, vidí **quality score 82/100**, klikne chip "fix contrast" → 3s patch.
- Hover nad hero → **Edit section** → "make it more dramatic" → len hero sa regenerá.
- **Make it beautiful** → premium pass → publish → QR kód → share.

To je +333 % kvalita, +45 % hodnota — bez toho aby sme menili stack.
