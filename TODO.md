# TODO — UP-Law-AILO

Próximos pasos posibles, más allá del MVP. Ninguno es necesario para los criterios
de aceptación actuales.

## Modalidad de contratación
- [x] Modelo `contractingMode` / `appliesToModes` / `sourceScope` / `modeConfidence` / `modeRationale`.
- [x] `privacyPosture` (perfil preliminar) separado del riesgo general.
- [x] UI: modalidad y privacidad en dashboard, detalle, matriz (por modalidad/proveedor) y "Diferencias por modalidad".
- [ ] Mejorar la **detección automática** de modalidades (hoy léxica + curaduría del registro).
- [ ] **Extracción de secciones específicas por plan** dentro de un documento general (`mixed`).
- [ ] Ingerir más **documentos específicos** (Enterprise/Business/API Terms) cuando la fuente exista.
- [ ] Comparación **histórica por modalidad** (versiones en el tiempo).
- [ ] **Validación jurídica humana por modalidad** (flujo de revisión).
- [ ] **Exportación** de la matriz por modalidad (CSV/PDF).
- [ ] Normalización avanzada de planes por proveedor (mapa tier→modalidad por proveedor).

## Interfaz (rediseño tipo auditoría)
- [x] Dashboard ejecutivo, tabla principal, vista por proveedor, dossier jurídico, criterio de riesgo.
- [x] Chips reemplazados por indicadores explicativos (`src/lib/derive.ts` + `indicators.tsx`).
- [ ] Paginación de la tabla (hoy filtra/ordena todo en cliente).
- [ ] Exportación CSV de la tabla y de la matriz.
- [ ] Exportación PDF del dossier.
- [ ] Revisión legal desde la UI (cambiar `reviewStatus`, notas del revisor).
- [ ] Diff entre documentos y control de versiones por fecha.
- [ ] Mejoras de accesibilidad (foco, roles ARIA en tablas, contraste).
- [ ] Tests visuales / de render de componentes (hoy se testean las funciones puras de derivación).

## Parser y análisis
- [ ] Integrar un parser con LLM detrás de la misma firma `parseLicense()`.
- [ ] Validación estricta del JSON del LLM con reintentos y no-persistencia ante fallo.
- [ ] Clasificación jurídica más avanzada (semántica, no solo léxica).
- [ ] Heurísticas multiidioma (hoy las palabras clave son en inglés).
- [ ] Detección de diferencias entre planes dentro de un mismo documento.

## Datos y trazabilidad
- [ ] Versionado histórico de documentos (mismo proveedor/producto/plan en el tiempo).
- [ ] Comparación semántica entre versiones de un mismo documento.
- [ ] Trazabilidad consolidada por proveedor / producto / plan.

## Ingesta (estado y próximos pasos)
- [x] Registro explícito de 20 proveedores con URLs oficiales (`data/sources/providers.json`).
- [x] `sources:verify` (chequeo HTTP + dominio oficial).
- [x] `ingest:provider` / `ingest:all` (solo fuentes `verified`).
- [x] Extracción HTML→texto + puerta de validez de contenido.
- [x] Hash de contenido + dedup idempotente + variantes `-vN`.
- [ ] **Discovery asistido** (`sources:discover`): NO implementado aún para no complejizar el
      MVP. Debe listar URLs candidatas y dejarlas en `needs_manual_review`, nunca `verified`.
- [ ] Revisión manual de las URLs `needs_manual_review` (Meta privacy, IBM watsonx terms).
- [x] Render con navegador headless (`ingest:headless`) y **stealth** (`ingest:stealth`,
      Playwright + anti-detección, evasión autorizada) + carga manual (`ingest:manual`).
- [x] OpenAI (Terms/Privacy/Usage) y Midjourney obtenidos vía stealth.
- [ ] **Perplexity**: Cloudflare re-verifica en loop; ni stealth lo pasa. Probar render con
      espera por selector específico, perfil persistente más "caliente", o captura manual.
- [ ] Databricks/terms: 404 (URL equivocada) → ubicar la URL oficial correcta.
- [ ] Acotar/aislar la dependencia de Playwright (es pesada; hoy solo la usan los scripts).
- [ ] Extractor `pdf-to-text` (hoy PDF = `unsupported_format`).
- [ ] Crawling controlado on-demand por proveedor (no general).
- [ ] Alertas cuando cambia el `contentHash` de un documento.

## Flujo de revisión
- [ ] Workflow formal de revisión humana (estados, responsable, comentarios).
- [ ] Marcado de evidencia validada / refutada por un abogado.

## Exportación e integración
- [ ] Exportación a PDF.
- [ ] Exportación a CSV de la matriz comparativa.

## Escenarios de uso jurídico
- [ ] Mejorar las ponderaciones por escenario (pesos por categoría/señal afinados con casos reales).
- [ ] Revisión humana de las recomendaciones (validar/ajustar la orientación por escenario).
- [ ] Permitir editar los pesos/umbrales del motor (config, no hardcode).
- [ ] Perfiles por jurisdicción (p. ej. exigencias distintas según ley aplicable).
- [ ] Perfiles por tipo de organización (estudio, in-house, sector público, academia).
- [ ] Exportación de una recomendación por escenario (PDF/CSV con motivos, cautelas y fuentes).
- [ ] Historial de decisiones (qué escenario se consultó, con qué resultado y cuándo).
- [ ] Wizard más avanzado (preguntas encadenadas que afinen el escenario).

## Comparaciones académicas y software tradicional
- [ ] Ampliar el grupo de comparación (WhatsApp, Slack, Zoom, Dropbox, Google Drive).
- [ ] Ingerir Gmail y Android (hoy verificados pero pendientes: el GET a policies.google.com no rinde texto).
- [ ] Reintentar Apple Privacy Policy con navegador (hoy `unsupported_format`: SPA / muro de consentimiento).
- [ ] Profundizar jurisdicción y transferencia internacional de datos como categoría.
- [ ] Enfoque latinoamericano más explícito (contratación por adhesión, asimetrías proveedor global / usuario local).
- [ ] Fichas pedagógicas por categoría jurídica.
- [ ] Exportación de material académico (PDF/CSV de una comparación).
- [ ] Citas doctrinarias y glosario jurídico-tecnológico.
- [ ] Mejorar los escenarios académicos (vistas comparativas dedicadas).

## Calidad
- [ ] Tests más completos (UI, server actions, casos límite del parser).
- [ ] Tests de regresión con corpus de documentos mock más amplio.
- [ ] Linter/formatter en CI.
