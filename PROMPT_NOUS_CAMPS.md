# Context per a Claude: Nous camps inferits al SAC

## Qui ets i quin és el projecte

Estàs treballant en una plataforma de visualització de dades del **SAC (Servei d'Atenció Ciutadana) de l'Ajuntament de Mataró**. És un dashboard Next.js 14 + Supabase + Recharts + Tailwind CSS que analitza ~3.000 missatges de ciutadans.

**Stack:** Next.js 14 · React 18 · TypeScript · Supabase (PostgreSQL) · Recharts 2 · Tailwind CSS · Leaflet · Lucide React

**Repositori:** `carduspau/SAC-Ajuntament-Matar-`

---

## Pàgines i components existents

| Ruta | Contingut |
|------|-----------|
| `/` (Inici) | 4 targetes KPI, timeline, gràfic categories, gràfic canals, panel alertes, top barris |
| `/estadistiques` | Filtres globals, timeline, histograma sentiment, categories, canals, barris, heatmap dia×hora |
| `/alertes` | Missatges crítics (sentiment < 3.5), mapa Leaflet, tabs per gravetat |
| `/mapa` | Mapa coroplètic o clúster per barris, GeoJSON de Mataró |
| `/barris` | Targetes per barri amb estadístiques expandibles |
| `/missatges` | Taula paginada de tots els missatges, exportació CSV |
| `/informes` | Generador de PDF amb seccions configurables i resum IA |

**Hooks de dades:**
- `useStats()` → `StatsResponse` (totals, per barri, per canal, per clas1, heatmap, distribució sentiment)
- `useTimeline()` → `TimelineBucket[]` (compte + avg_sentiment per interval)
- `useMessages()` → `MessagesResponse` (missatges paginats amb filtres)
- `useDateRange()` → context global de rang de dates

**Context:** Tot passa per `DateRangeContext` que gestiona el rang de dates global (per defecte: últims 30 dies).

---

## Camps originals de la taula `sac_messages`

```typescript
id, saved_id, message, data_inici, barri, canal,
ciutada, lat, lng, clas1, clas2, clas3,
sentiment,   // string "0"–"10", camp IA preexistent
situation    // string, urgència, camp IA preexistent
```

**Sentiment:** escala 0–10 → Crític (<3) · Negatiu (3–5) · Neutral (5–7) · Positiu (≥7)

---

## NOU: 7 camps afegits recentment

S'han afegit a `sac_messages` via migració SQL. Ja estan disponibles a la base de dades i al tipus `SacMessage` de `/types/index.ts`.

### Valors possibles per camp

| Camp | Tipus | Valors possibles |
|------|-------|-----------------|
| `intent` | TEXT | `queixa` · `consulta` · `suggeriment` · `agraïment` · `incidència` · `sol·licitud` |
| `department` | TEXT | `urbanisme` · `medi_ambient` · `neteja` · `mobilitat` · `seguretat` · `serveis_socials` · `cultura_esports` · `habitatge` · `tramits_administratius` · `general` |
| `action_required` | TEXT | `cap` · `informar` · `reparar` · `investigar` · `derivar` · `desplaçament_físic` |
| `location_extracted` | TEXT | Nom del barri (proxy) o NULL |
| `followup_needed` | BOOLEAN | `true` · `false` |
| `language` | TEXT | `ca` · `es` |
| `citizen_experience_signal` | TEXT | `primera_interacció` · `reincident_satisfet` · `reincident_frustrat` |

### Lògica amb la qual s'han inferit

- **`intent`**: basat en sentiment + canal (`Fotodenuncia` → sempre `incidència`; sentiment baix → `queixa`; alt → `agraïment`/`consulta`)
- **`department`**: mapeig de `clas1`/`clas2` per paraules clau
- **`action_required`**: combinació `intent × department`
- **`followup_needed`**: `true` si `intent ∈ {queixa, incidència}` o `action_required ∈ {reparar, desplaçament_físic, investigar, derivar}` o `sentiment < 4`
- **`language`**: detecció de paraules clau català/castellà en el text; default `ca`
- **`citizen_experience_signal`**: `ROW_NUMBER()` per `ciutada` ordenat per `data_inici`; sentiment mitjà del ciutadà determina si és `reincident_satisfet` o `reincident_frustrat`
- **`location_extracted`**: valor del camp `barri` com a proxy (no hi ha NLP per extreure carrers del text)

### Estadístiques reals de la migració (sobre 2.996 registres)

- `intent`, `department`, `action_required`, `language`, `citizen_experience_signal`: **2.996/2.996** (100%)
- `followup_needed = true`: **2.038/2.996** (68%)
- `location_extracted` (no NULL): **2.837/2.996** (95%)

---

## Tasca: crear noves visualitzacions i funcionalitats

Amb aquests 7 nous camps pots enriquir el dashboard. A continuació tens idees concretes per implementar, ordenades per complexitat:

### Senzilles (components nous en pàgines existents)

1. **Gràfic de distribució per `intent`** — Pie o bar chart a `/estadistiques` mostrant % de queixies, consultes, incidències, etc.

2. **Gràfic de distribució per `department`** — Bar chart horitzontal a `/estadistiques` (similar a `CategoryBarChart` existent però per departament)

3. **Targeta KPI "Seguiment pendent"** a la pàgina d'Inici — mostra `followup_needed = true` amb badge vermell

4. **Distribució d'idiomes** — Pill badges `ca`/`es` a la targeta de canals o com a mini gràfic separat

5. **Badge de `citizen_experience_signal`** a la taula de `/missatges` — columna nova amb icona/color per primera interacció vs reincident

### Intermèdies (pàgines o seccions noves)

6. **Nova pàgina `/departaments`** — per cada `department`, mostra: total missatges, % followup, sentiment mitjà, intents més freqüents, acció requerida dominant. Estructura similar a `/barris`.

7. **Matriu `intent × action_required`** — Heatmap o taula creuada mostrant quins intents generen quines accions. Útil per auditar la lògica.

8. **Filtre per `intent` i `department`** a `/missatges` i `/estadistiques` — afegir als dropdowns del `FilterPanel` existent

9. **Panel "Ciutadans reincidents frustrats"** a `/alertes` — filtra `citizen_experience_signal = 'reincident_frustrat'` i sentiment < 5. Mostra qui necessita atenció prioritària.

10. **Vista per `action_required`** a `/estadistiques` — donut chart de les 6 accions requerides, amb filtre de data

### Avançades

11. **Pàgina `/gestio`** (gestió operativa) — taula de missatges amb `followup_needed = true` no resolts, agrupats per `department` i `action_required`. Orientat a caps de servei.

12. **KPI temporal de `followup_needed`** — Timeline chart mostrant l'evolució del % de missatges que necessiten seguiment. Detecta si el servei millora o empitjora.

---

## Notes tècniques per implementar

### Com fer queries als nous camps

Els camps nous ja estan a la taula. Per usar-los en hooks existents, afegeix-los a la query de Supabase. Exemple:

```typescript
// A lib/aggregations.ts o directament a useStats()
const { data } = await supabase
  .from('sac_messages')
  .select('intent, department, action_required, followup_needed, language, citizen_experience_signal, sentiment, ...')
  .gte('data_inici', from.toISOString())
  .lte('data_inici', to.toISOString())
```

### Agregació client-side (patró existent)

```typescript
// Exemple: comptar per intent
const byIntent = messages.reduce((acc, m) => {
  const key = m.intent ?? 'desconegut'
  acc[key] = (acc[key] ?? 0) + 1
  return acc
}, {} as Record<string, number>)
```

### Estils coherents amb la plataforma

- **Colors semàntics ja definits:** usa les classes Tailwind de `sentimentBgColor()` de `lib/sentiment.ts`
- **Cards:** usa `<Card>` + `<CardHeader>` + `<CardTitle>` de `components/ui/`
- **Charts:** usa `ResponsiveContainer` de Recharts, alçada habitual 220–300px
- **Badges:** patró existent a `components/ui/Badge.tsx` amb `CanalBadge`; crea `IntentBadge`, `DepartmentBadge`, etc. seguint el mateix patró

### Mapeig de colors suggerit per `intent`

```typescript
const intentColors: Record<string, string> = {
  'queixa':      'bg-red-100 text-red-700',
  'incidència':  'bg-orange-100 text-orange-700',
  'consulta':    'bg-blue-100 text-blue-700',
  'sol·licitud': 'bg-violet-100 text-violet-700',
  'suggeriment': 'bg-yellow-100 text-yellow-700',
  'agraïment':   'bg-emerald-100 text-emerald-700',
}
```

### Mapeig de colors suggerit per `department`

```typescript
const deptColors: Record<string, string> = {
  'urbanisme':             '#6366f1',
  'medi_ambient':          '#10b981',
  'neteja':                '#f59e0b',
  'mobilitat':             '#3b82f6',
  'seguretat':             '#ef4444',
  'serveis_socials':       '#ec4899',
  'cultura_esports':       '#8b5cf6',
  'habitatge':             '#14b8a6',
  'tramits_administratius':'#64748b',
  'general':               '#94a3b8',
}
```

---

## Fitxers clau de referència

```
types/index.ts                    → Tipus SacMessage (inclou els 7 camps nous)
lib/aggregations.ts               → computeStats(), computeTimeline()
lib/sentiment.ts                  → parseSentiment(), sentimentColor(), sentimentLabel()
hooks/useStats.ts                 → Hook principal d'estadístiques
hooks/useMessages.ts              → Hook de missatges paginats
components/charts/                → Tots els gràfics Recharts existents
components/ui/Badge.tsx           → Patró per crear nous badges
app/estadistiques/page.tsx        → Pàgina de referència per afegir nous gràfics
app/barris/page.tsx               → Referència per crear /departaments
sql/migrate_ai_fields.sql         → SQL de la migració (documentació de la lògica)
```

---

## Idioma i convencions

- Tot el text visible és en **català**
- Noms de variables i funcions en anglès
- Noms de fitxers en anglès o català (mixa, segueix el patró del fitxer adjacent)
- No afegeixis comentaris al codi excepte si el WHY no és obvi
