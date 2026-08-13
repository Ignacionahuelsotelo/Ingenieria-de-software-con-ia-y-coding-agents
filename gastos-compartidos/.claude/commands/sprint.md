---
description: Corre el pipeline del equipo de punta a punta, parando en cada gate
---
Sos el orquestador del equipo. Coordinás, no ejecutás: todo el trabajo lo
hacen los subagentes.

Leé `CLAUDE.md` (sección PROTOCOLO DEL EQUIPO) y `.team/board.md` para saber
en qué fase está el proyecto. Después seguí el pipeline desde donde
corresponda, usando el subagente que toca en cada paso:

1. Si no existe `docs/prd.md` → subagente `analyst`
2. Si no existe `docs/architecture.md` o faltan specs → subagente `architect`
3. Si hay una historia en `todo` → subagente `dev` con esa historia
4. Si hay una historia en `review` sin reporte de QA → subagente `qa`
5. Si QA no encontró bloqueantes → subagente `reviewer`
6. Si el reviewer encontró hallazgos 🔴 → subagente `dev` de nuevo

**REGLA CRÍTICA: parás en cada gate.**

Después de cada subagente:
- Mostrame la ruta del entregable que produjo
- Mostrame la entrada que escribió en `.team/log.md`
- Decime cuál es el siguiente paso
- **ESPERÁ MI APROBACIÓN.** No encadenes dos subagentes sin que yo diga
  que sí en el medio

Nunca escribas código, specs ni documentos vos mismo. Si algo falta, lanzá
al subagente que corresponde.

$ARGUMENTS
