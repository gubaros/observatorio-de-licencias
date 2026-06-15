# Arquitectura — UP-Law-AILO

## Visión general

UP-Law-AILO es una aplicación **local y simple**. No hay backend separado, base de
datos ni infraestructura distribuida. Es una app Next.js (App Router) donde el
**filesystem es la fuente de verdad**.

```
Documento (texto pegado)
        │  Server Action (createAnalysisAction)
        ▼
  data/raw/<id>.txt        (texto original)
        │  parseLicense()  (parser determinístico local)
        ▼
  LicenseAnalysis (objeto)
        │  Zod (LicenseAnalysisSchema.parse)
        ▼
  data/licenses/<id>.json  (fuente de verdad)
        │  loadAllLicenseAnalyses() / loadLicenseAnalysis()
        ▼
  Vistas web (panel, detalle, matriz)
```

## Por qué no hay base de datos

El flujo es manual/semiautomático: se ingresa un documento, se procesa **una vez** y
se guarda. No hay concurrencia, ni multiusuario, ni necesidad de queries complejas.
Un archivo JSON por análisis es:

- **Legible y auditable** (revisable en un PR de Git).
- **Versionable** (el historial lo da Git, no una tabla).
- **Portable** (no requiere servicios).
- **Suficiente** para el volumen esperado.

Introducir PostgreSQL/Prisma/Redis/colas/workers sería complejidad innecesaria.

## JSON en disco como fuente de verdad

- `data/licenses/<id>.json`: un análisis validado por Zod.
- `data/raw/<id>.txt`: el texto original, para trazabilidad.

El `id` es estable y determinístico (`src/lib/id.ts`), derivado de
proveedor + producto + plan + tipo de documento + fecha. Reprocesar el mismo
documento sobrescribe de forma idempotente.

## Estructura de datos

Definida en `src/lib/schema.ts` (Zod) — los tipos TS se infieren del schema:

- `LicenseAnalysis`: metadatos del documento + `overall` + `categories` + `metadata`.
- `categories`: registro indexado por clave de categoría (`src/lib/categories.ts`),
  cada una con `status` (`found | not_found | unclear`), `riskLevel`
  (`low | medium | high | unknown`), resúmenes claro/jurídico, `evidence[]` y `notes`.
- `metadata.isMock` existe en el schema pero el observatorio **no** sirve datos mock:
  solo se muestran documentos reales ingeridos (si no hay, no se presenta nada).
- `metadata.sourceVerified` distingue, en la UI, fuente verificada vs. sin verificar.

`src/lib/categories.ts` es la **única fuente de verdad** de las categorías: parser,
schema y UI derivan de allí. Agregar una categoría = editar ese archivo.

## Flujo de carga y parseo

1. `UploadOrPasteForm` (cliente) envía el formulario a `createAnalysisAction`
   (Server Action, `src/app/actions.ts`).
2. La action valida con `AnalysisInputSchema`, guarda el `.txt`, ejecuta
   `parseLicense()`, valida con `LicenseAnalysisSchema`, escribe el `.json` y redirige.

## Flujo de lectura y visualización

- `src/lib/storage.ts` (server-only) lee/valida los JSON.
- Las páginas son **Server Components** con `dynamic = "force-dynamic"` (leen el disco
  en cada request; nada se "hornea" en build time).
- El modo de lenguaje (claro/jurídico) es estado **de cliente** compartido vía
  `ModeProvider` (Context + `localStorage`). Los datos se cargan una vez en el server
  y los componentes cliente eligen qué texto mostrar; no hay refetch al alternar.

## Capas

| Capa | Archivos |
|------|----------|
| Dominio / parser | `src/lib/categories.ts`, `src/lib/parser.ts`, `src/lib/id.ts` |
| Schema / tipos | `src/lib/schema.ts`, `src/lib/types.ts` |
| Persistencia | `src/lib/storage.ts` (server-only) |
| Acciones | `src/app/actions.ts` (server action) |
| UI (rutas) | `src/app/page.tsx`, `upload/`, `compare/`, `analysis/[id]/` |
| UI (componentes) | `src/components/*` |

## Cómo reemplazar el parser por uno más avanzado

`parseLicense(params: ParseLicenseParams): LicenseAnalysis` es el contrato. Para
migrar a un parser con LLM:

1. Crear `parseLicenseLLM()` con la **misma firma**.
2. Que el LLM devuelva JSON estricto; **validarlo** con `LicenseAnalysisSchema`.
3. Si la validación falla, registrar el error y **no** persistir.
4. Mantener la regla: todo `found` debe traer `evidence`.

El resto de la app (storage, UI, schema) no cambia.

## Ingesta de datos reales

Pipeline manual por comando, sin base de datos, sin crawler general:

```
data/sources/providers.json   (registro: proveedor → producto → documento → URL + estado)
        │  sources:verify  (GET real; verified solo si 2xx + dominio oficial)
        ▼
   sourceStatus actualizado en providers.json
        │  ingest:* (solo documentos 'verified')
        ▼
  fetch ──► data/fetched/<id>.<ext>      (documento original; evidencia de fuente)
        │  extract (html→text, sin deps)
        ▼
  puerta de validez de contenido  ──(falla)──► unsupported_format, NO se escribe análisis
        │ (pasa: ≥800 chars y ≥3 marcadores legales)
        ▼
  data/extracted/<id>.txt               (texto plano)
        │  parser determinístico (el mismo del MVP)
        ▼
  data/licenses/<id>.json               (isMock:false + metadata de ingesta)
        +  data/logs/ingest-<ts>.json
```

### Cuatro artefactos distintos (no confundirlos)

1. **Fuente** (`providers.json`): la URL declarada y su estado de verificación.
2. **Documento descargado** (`data/fetched`): los bytes originales (HTML/PDF).
3. **Texto extraído** (`data/extracted`): texto plano legible, derivado del documento.
4. **Análisis** (`data/licenses`): el JSON estructurado, fuente de verdad de la app.

### Honestidad de la fuente

El sistema nunca marca `verified` por su cuenta. El registro se publica con todo en
`needs_manual_review`; `sources:verify` es el único que asciende a `verified`, y solo
tras un chequeo HTTP real cuyo host final cae en `officialDomains`. `ingest:*` procesa
únicamente `verified`. Así, una URL adivinada que responde 404/403 o redirige fuera de
dominio jamás se convierte en "análisis real".

### Puerta de validez de contenido

HTTP 200 + dominio correcto **no** garantizan que la URL sea el documento correcto: puede
ser un soft-404, un muro de consentimiento o el cascarón de una SPA. Tras extraer, si el
texto no supera un umbral de longitud y de marcadores legales, se marca `unsupported_format`
y **no** se genera análisis (el parser nunca "analiza" un no-documento).

### Hash y trazabilidad

`contentHash` es el SHA-256 del **texto extraído** (no de los bytes crudos: el HTML trae
tokens por request que cambian en cada descarga). Reingerir el mismo día con texto idéntico
es idempotente; si el texto cambió, se crea una variante `-vN`. Cada análisis real guarda
`sourceUrl`, `finalUrl`, `retrievedAt`, `contentHash`, `fetcherVersion`, `parserVersion`,
`sourceStatus`, `sourceVerified`, `extractionMethod`, `fetchedPath` y `extractedTextPath`.

### Reemplazar el fetcher/extractor en el futuro

- Para sitios protegidos (Cloudflare/SPA): **ya implementado** como `ingest:headless`
  (`src/lib/headlessFetcher.ts`), que renderiza con un navegador real (gstack browse)
  detrás de la misma forma `FetchResult` de `fetchUrl`, hace polling hasta que aparece
  el contenido y detecta pantallas de desafío. Limitación honesta: los desafíos
  **interactivos** de Cloudflare (OpenAI, Perplexity, Midjourney) no se superan sin
  evasión agresiva (fingerprint spoofing, proxies residenciales, CAPTCHA), que está
  fuera de alcance. Esos quedan `failed_fetch` para captura manual.
- **Evasión anti-bot autorizada:** `ingest:stealth` (`src/lib/stealthFetcher.ts`, Playwright +
  plugin stealth, import dinámico para no entrar al bundle web) supera Cloudflare y obtuvo
  OpenAI y Midjourney. Cruza el límite "sin scraping agresivo"; se usa solo con autorización
  explícita. El host final se valida contra `officialDomains` y se marca `fetcherVersion:
  stealth-*`. Existe además `ingest:manual` para cargar un archivo local guardado del navegador.
- Para PDFs: un extractor `pdf-to-text` que complete `ExtractionMethod`.
- Para scraping periódico: un scheduler externo que invoque `ingest:all` (no incluido).

## Modelo de modalidad de contratación

Relación: un **proveedor** tiene **productos**; cada producto tiene **documentos** (en el
registro); cada documento ingerido produce un **análisis** asociado a una **modalidad**.

Tres campos, deliberadamente distintos:

| Campo | Qué es | Origen |
|-------|--------|--------|
| `productTier` | Etiqueta del proveedor (Free, Plus, Enterprise…) | El proveedor |
| `contractingMode` | Modalidad **normalizada** de UP-Law-AILO | Registro (curado) + parser |
| `appliesToModes` | A qué modalidades aplica el documento | Registro (curado) |

- La **autoridad** de la modalidad es el registro (`data/sources/providers.json`): cada documento
  declara `contractingMode`, `appliesToModes`, `sourceScope`. Es una decisión curada por humano,
  no una inferencia del parser.
- El **parser corrobora** desde el texto: detecta menciones de modalidades (free/paid/team/
  enterprise/api/…), refina `sourceScope` a `mixed` si un documento general diferencia ≥2
  modalidades, calcula `modeConfidence`/`modeRationale`, y anota cada categoría con
  `appliesToModes`/`modeSpecificity`/`modeEvidence`.
- `parse:all` es además el **migrador**: mapea cada análisis a su documento del registro por el
  "stem" exacto del id (id sin la fecha) e inyecta la modalidad; si no hay match (carga manual),
  **preserva** la modalidad ya presente.

### Cómo se calcula `privacyPosture`

`computePrivacy()` deriva **señales con evidencia** de las categorías y del texto:
`no_training_commitment`, `broad_training_use`, `enterprise_dpa`, `retention_controls`,
`deletion_control`/`unclear_deletion`, `confidentiality_commitment`, `broad_license`. La detección
de "no entrenamiento" es **por oración**, exige sujeto-proveedor y que la negación se ligue a la
finalidad de entrenamiento (evita el falso positivo "you may not … train" y "does not contain
personal data … to train"). La postura se decide de forma conservadora; `strong` requiere múltiples
señales. Es **independiente** de `overallRiskLevel` (un enterprise puede tener buena privacidad y
aun así límites de responsabilidad/arbitraje altos).

### Cómo se evita inferir más allá de la fuente

- La modalidad surge del registro o de evidencia textual; si no, `unknown`/`unclear`.
- `all` solo cuando el texto no diferencia (se verifica: 22/34 documentos generales resultaron
  `mixed` porque sí diferencian; los que no, quedan `general`).
- Las condiciones de una modalidad no se propagan a otra.
- Toda señal de privacidad y toda categoría conserva su evidencia textual.

## Modelo de visualización

Cinco entidades distintas, que la UI no debe confundir:

- **Documento** (fuente en el registro) → **Análisis** (JSON en `data/licenses`, la unidad de
  la tabla) → pertenece a un **Proveedor** y un **Producto**, aplica a una **Modalidad** y
  contiene **Categorías jurídicas**.

Decisiones:

- **La tabla es la vista principal.** Un observatorio se lee como un registro/expediente, no
  como una grilla de tarjetas. La tabla (`AnalysisTable`) es densa, filtrable y ordenable, y
  escala a cientos de filas; la grilla de cards anterior no comunicaba criterio ni jerarquía.
- **El dossier individual agrupa trazabilidad, riesgo, privacidad y evidencia** en bloques
  separados (no mezclados en chips): cada bloque tiene título y fundamento, de modo que el
  riesgo contractual, la privacidad, la fuente y la revisión humana queden claramente
  distinguidos entre sí.
- **Los chips se reemplazaron por indicadores explicativos.** Las cápsulas de color eran
  categóricas y competían visualmente. Los nuevos indicadores ponen el significado en el
  texto y usan el color solo como refuerzo (un punto). La capa de derivación (`src/lib/derive.ts`)
  calcula, a partir de datos ya existentes, el fundamento de riesgo (atado a las categorías
  realmente detectadas, sin inventar), las métricas y los filtros.
- **Presentación, no lógica.** Este rediseño no tocó el parser, la ingesta ni el schema: solo
  expone mejor lo que ya existía.

## Capa de escenarios de uso jurídico

Capa de **decisión** sobre el análisis documental, en `src/domain/`. No toca parser, ingesta
ni schema: lee los análisis existentes y los reordena según el "para qué".

- **`legalUseScenarios.ts`** — catálogo de escenarios (`personal_data`, `client_confidential_information`,
  `attorney_client_privilege`, `enterprise_api_use`, etc.). Cada escenario declara, en términos de
  los campos reales del análisis: `priorityCategories` (claves de `categories.ts`),
  `positiveSignals`/`negativeSignals` (claves reales de `privacy.signals`), `preferredModes`,
  `sensitivity` y una advertencia. Hay escenarios `kind: "navigation"` (atajos a `/compare` o
  `/analyses`) que no pasan por el motor.
- **`evaluateScenario.ts`** — `evaluateScenario(scenarioId, analyses): ScenarioResult[]`.
  Función **pura, determinística, sin LLM y sin red**.

### Cómo evalúa (y por qué así)

- **Por documento, no por proveedor.** Cada análisis se evalúa solo con su propia evidencia.
  **No se agregan señales entre documentos** de un mismo proveedor. Esto evita la *fuga de
  evidencia enterprise*: un DPA o una cláusula de confidencialidad que vive en el documento
  comercial NO mejora el perfil del documento general/gratuito. La presencia de
  `enterprise_dpa` en un documento general se trata como **cautela**, no como mejora.
- **Reglas explícitas por sensibilidad.** Crítico (secreto profesional) exige documento
  `mode_specific`/business/enterprise/API con compromisos claros; si no, `no recomendado sin
  enterprise`. Alto exige evidencia enterprise del propio documento. Bajo/medio usan un puntaje
  transparente (señales a favor − señales en contra + cobertura de categorías ± postura ± riesgo).
- **No hay recomendación fuerte sin evidencia.** `preferred_with_conditions` exige al menos una
  señal a favor o cobertura sustantiva de categorías; sin evidencia → `insufficient_information`.

### Relación escenario → análisis → recomendación → evidencia

`LegalUseScenario` (qué priorizar) + `LicenseAnalysis[]` (evidencia documental) → `evaluateScenario`
→ `ScenarioResult[]`. Cada resultado lleva `reasons`, `cautions`, `missingEvidence` (cada string
nombra el campo real que lo disparó) y `sourceAnalysisIds`, que enlaza de vuelta al dossier
(`/analysis/[id]`), al texto fuente (`/analysis/[id]/source`) y a la matriz (`/compare`).

### Limitaciones de la capa de escenarios

- Los pesos y umbrales son heurísticos y fijos (no editables todavía).
- Hereda los límites del parser léxico: si una cláusula no fue detectada, el escenario no la cuenta.
- No modela jurisdicciones ni tipos de organización específicos.
- Las recomendaciones son **preliminares**: priorizan revisión legal humana, no la reemplazan.

## Límites del MVP

- Heurística léxica (no semántica): falsos positivos/negativos posibles.
- Palabras clave en inglés.
- Descarga sin navegador: sitios Cloudflare/SPA pueden no rendir texto (quedan sin ingerir).
- PDF no soportado (se marca `unsupported_format`).
- Sin versionado histórico entre fechas, scraping periódico, exportación ni auth.
- Concurrencia de escritura no gestionada (uso local de un solo operador).
