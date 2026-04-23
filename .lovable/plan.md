

# Oprava chýb na home obrazovke

Z fotky vidím **8 konkrétnych vizuálnych chýb**. Ku každej píšem presný prompt + opravu.

---

### 1. Mode tabs pretekajú mimo obrazovku
**Chyba:** `AUTOMATE` je orezaný, vznikol horizontal scroll. Plán zakazoval karusely.
**Prompt na opravu:** *"Mode tabs musia vždy zmestiť všetkých 5 položiek (Ask/Research/Analyze/Build/Automate) v jednom riadku bez scrollu — použi `justify-between`, skráť labely na fluid `clamp(9px, 2.4vw, 11px)`, ikony skry pri šírke <380px, `NEW` badge presuň ako bodku."*
**Fix:** `ul` z `flex gap-5 overflow-x-auto` → `flex justify-between gap-1`, fluid font, na <380px `hidden` ikona.

### 2. KPI karty sa prekrývajú vertikálne
**Chyba:** "SUCCESS RATE 98.2%" preteká cez "YOUR AGENTS" — karty nemajú vynútenú výšku v `1fr` zóne.
**Prompt na opravu:** *"KPI grid 2×2 musí dodržať svoju gridovú výšku. Pridaj `grid-rows-2`, `min-h-0` na všetky deti, `overflow-hidden` na karty, zmenši padding a font sparku tak aby sa všetko zmestilo do priradenej `1fr` výšky bez pretečenia."*
**Fix:** `grid-cols-2 grid-rows-2`, každá karta `overflow-hidden min-h-0`, sparkline width `48` height `14`.

### 3. Sparkline visí mimo karty
**Chyba:** Zelená čiara je nakreslená cez 2 susedné karty — SVG nemá `overflow-hidden` na rodičovi.
**Prompt na opravu:** *"Pridaj `overflow-hidden` na karty a `preserveAspectRatio='none'` so správnym `viewBox` na SVG sparkline, aby kresba bola lokálna do svojho kontajnera."*
**Fix:** Sparkline rodič `overflow-hidden`, SVG `block w-full`.

### 4. Delta badge prekrýva sekciu nižšie
**Chyba:** `+0.8%` sa premieta na "YOUR AGENTS" — flex-end footer karty preteká.
**Prompt na opravu:** *"Karta KPI = vertikálny flex s `justify-between`, footer `mt-auto`, žiadne absolútne pozície, žiadne negatívne marginy."*
**Fix:** `flex flex-col h-full justify-between`, footer s `shrink-0`.

### 5. Bottom nav má 4 položky namiesto 5
**Chyba:** Chýba "Settings", veľká dlaždica `+` zaberá 2× šírku a robí dieru uprostred.
**Prompt na opravu:** *"Bottom nav = 5 rovnomerných slotov (Home, Agents, +, Docs, Settings) v `grid-cols-5`. Centrálny `+` sa zmestí do svojho slotu (40×40), nie 48px, glow obmedz na vlastný box."*
**Fix:** `<ul>` na `grid grid-cols-5 place-items-center`, `+` button `size-10`, glow zmenšiť.

### 6. Quick suggestions horizontal scroll
**Chyba:** Texty sú orezané vpravo, scroll-bar carousel — proti dizajnovým princípom.
**Prompt na opravu:** *"Suggestions: `flex-wrap`, max 2 chips viditeľné, dlhé texty `truncate` na 22 znakov, žiadny `overflow-x-auto`."*
**Fix:** `flex flex-wrap` + `truncate max-w-[60%]`, refresh ikona vpravo.

### 7. Agent list je odrezaný spodným navom
**Chyba:** Vidno len pol riadku "Analyst" — `1.2fr` zóna nemá garantovanú minimálnu výšku a vrchné sekcie ju zožrali.
**Prompt na opravu:** *"Zmenši grid-rows: hero `auto` → kompaktnejší, composer pevne `min-content`, KPI grid `minmax(140px, 0.9fr)`, agents `minmax(120px, 1fr)`. Garantuj agents min-height aspoň 2 riadky (96px)."*
**Fix:** Prepočítané `gridTemplateRows` s konkrétnymi minimami v `px`.

### 8. Spodný nav sa stráca pod safe-area
**Chyba:** Nav padding-bottom nezohľadňuje plný `env(safe-area-inset-bottom)` na iOS, viditeľné aj v preview.
**Prompt na opravu:** *"Bottom nav `padding-bottom: max(env(safe-area-inset-bottom), 12px)` + zaisti že root grid má `paddingBottom: 0` a nav má vlastnú safe-area zónu."*
**Fix:** Nav už používa `max(env(...), 8px)` → zvýšiť na `12px` a pridať `paddingBottom: 0` na root grid container.

---

## Dodatočné mikro-opravy
- **Hero**: `<br />` spôsobuje, že na úzkych obrazovkách vznikne 3-riadkový titul. Nahradím inline span s prirodzeným wrapom.
- **Avatar `A`**: monogram 8px je príliš malý — zväčším na `text-[11px]`.
- **Mic button**: `onPointerLeave` ruší nahrávanie pri jemnom pohybe — pridám `onPointerCancel` a toleranciu.

## Súbory na úpravu
| Súbor | Zmena |
|---|---|
| `src/routes/index.tsx` | grid-template-rows recalc, ModeTabs no-scroll, KpiGrid 2×2 fix, BottomNav 5-grid, Suggestions wrap, Hero wrap |
| `src/components/phosphor/Sparkline.tsx` | `viewBox` + `preserveAspectRatio` fix |

Žiadne nové dependency, čistý surgical fix.

