# Bitácora del equipo

> Append-only. Nadie edita entradas viejas.
> Formato: ver PROTOCOLO DEL EQUIPO en AGENTS.md / CLAUDE.md

---

## [inicio] @humano → @analyst
**Historia:** —
**Hice:** creé el proyecto y el protocolo del equipo
**Entregué:** AGENTS.md, .team/board.md, .team/log.md
**Necesito que hagas:** escribir el PRD del divisor de gastos
**Bloqueos:** ninguno

## [base] @humano → @analyst
**Historia:** —
**Hice:** dejé construido el núcleo del dominio y el asistente en lenguaje natural
**Entregué:** backend/src/domain/balances.js · backend/src/store.js · backend/src/tools/ · backend/src/routes/ask.js
**Necesito que hagas:** el PRD de la app completa alrededor de esa base — falta toda la API REST de grupos, personas y gastos, y el frontend
**Bloqueos:** ninguno. El dominio y el asistente NO se rehacen: se reutilizan.

## [2026-08-20 21:03] @analyst → @architect
**Historia:** —
**Hice:** escribí el PRD de la app completa sobre la base existente: 6 historias (H-001 a H-006), casos borde del dominio y no-objetivos
**Entregué:** docs/prd.md
**Necesito que hagas:** docs/architecture.md y un spec por historia (specs/H-001.md … H-006.md), reutilizando balances.js, store.js y el asistente sin rehacerlos
**Bloqueos:** ninguno

## [2026-08-20 22:10] @architect → @dev
**Historia:** H-001
**Hice:** traduje el PRD en arquitectura (módulos, modelo de datos, 6 endpoints, 14 decisiones cerradas) y escribí un spec ejecutable por cada historia must
**Entregué:** docs/architecture.md · specs/H-001.md · specs/H-002.md · specs/H-003.md · specs/H-004.md · specs/H-005.md · specs/H-006.md
**Necesito que hagas:** implementá H-001 siguiendo specs/H-001.md al pie de la letra (GET /api/group y GET /api/expenses); es la única historia sin dependencias. Después seguí el orden H-002 → H-003 → H-004; H-005 puede ir en paralelo desde que H-001 esté lista, y H-006 va última
**Bloqueos:** ninguno. El dominio, el store y el asistente se reutilizan tal cual — la tabla de archivos de cada spec es cerrada, no crear archivos fuera de ella

## [2026-08-20 22:40] @dev → @qa
**Historia:** H-001
**Hice:** implementé `GET /api/group` y `GET /api/expenses` siguiendo specs/H-001.md al pie de la letra, montados en app.js sin tocar health ni ask
**Entregué:** backend/src/routes/group.js · backend/src/routes/expenses.js · backend/src/app.js (modificado) · backend/tests/group.test.js
**Necesito que hagas:** correr `cd backend && npm test` (33 tests verdes: 24 previos + 9 nuevos) y ampliar backend/tests/group.test.js con más casos si ves huecos; después escribir docs/qa-report.md
**Bloqueos:** ninguno

## [2026-08-20 23:15] @qa → @reviewer
**Historia:** H-001
**Hice:** verifiqué GET /api/group y GET /api/expenses contra specs/H-001.md; agregué 32 tests de borde (grupo vacío, orden, integridad referencial, suma cero, formas de respuesta, verbos no adelantados) y encontré 5 hallazgos, ninguno bloqueante
**Entregué:** backend/tests/group.qa.test.js · docs/qa-report.md
**Necesito que hagas:** revisá H-001 (65 tests verdes) y decidí sobre los 5 hallazgos abiertos: B-1/B-1b son de @dev (express.json() global rompe el "siempre 200" y devuelve HTML en vez de {error, code}); B-2/B-3/B-4 son de @architect (mutación del store demostrada → historia nueva por el Plan B del spec §4, y tools/handlers.js no valida description ni duplicados en splitBetween)
**Bloqueos:** ninguno

## [2026-08-20 23:50] @reviewer → @architect
**Historia:** H-001
**Hice:** revisé el código de H-001 contra el spec y la arquitectura: no hay 🔴, la historia pasa a `done`; los 5 hallazgos de @qa no son arreglables por @dev (B-1/B-1b están mal atribuidos: el spec §1 "siempre 200" contradice el `express.json()` global que manda la arquitectura §2) y sumé 4 hallazgos nuevos, entre ellos que los duplicados de B-4 NO rompen la suma cero (verificado: da 0) y que lo que sí la rompe es un id inexistente en `splitBetween` (suma 300 en vez de 0)
**Entregué:** docs/reviews/H-001.md
**Necesito que hagas:** cerrar 6 decisiones antes de que @dev arranque H-003/H-004: (A1) qué pasa con un body JSON inválido —relajar el spec o handler de error en app.js con código nuevo, revisando D-5—, (A2) que ese error no filtre el stack, (A3) la regla es "sin repetidos en splitBetween" y se testea la parte de cada persona, no la suma, (A4) qué hace computeBalances con un id que no existe y que el chequeo de D-10 mire también splitBetween, (A5) que el `_reset()` completo de H-004 reconstruya los Maps semilla, (A6) description en handlers.add_expense vs D-6. Además, que cada spec que tome un hallazgo incluya en su Definition of Done sacar el `.fails` de backend/tests/group.qa.test.js (A7), o `npm test` se pone en rojo al arreglar el bug
**Bloqueos:** ninguno. H-001 queda cerrada; @dev puede seguir con H-002, que no depende de ninguna de estas decisiones
