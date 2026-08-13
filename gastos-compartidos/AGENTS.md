# Gastos Compartidos

## Qué es

API + frontend mínimo para dividir gastos entre amigos (estilo Splitwise):
crear un grupo, agregar personas, cargar gastos indicando quién pagó y entre
quiénes se divide, ver los balances, y obtener la lista mínima de
transferencias para saldar todo.

Stack: Node + Express (ESM) en `/backend`, tests con Vitest en
`/backend/tests`. Frontend mínimo en `/frontend` (HTML + JS vanilla, sin
framework, sin build step). Los datos viven en memoria (`Map`), no hay base
de datos.

---

# PROTOCOLO DEL EQUIPO

Este proyecto lo construye un equipo de agentes. **Ningún agente trabaja
solo: todos se comunican por el tablero compartido.**

## Los dos archivos compartidos

| Archivo | Qué es | Cómo se toca |
|---|---|---|
| `.team/board.md` | Estado actual de cada historia | Se **edita** (tu fila) |
| `.team/log.md` | Bitácora de mensajes entre agentes | Solo se **agrega al final** |

## Las tres reglas, obligatorias para todos

### 1. Antes de empezar, leé

Siempre, sin excepción:

- `.team/board.md` completo
- Las últimas 20 líneas de `.team/log.md`

Si el tablero dice que tu historia está `blocked` o `in-progress` con otro
dueño, **no la toques**. Anotá en el log que la encontraste ocupada y parás.

### 2. Al terminar, actualizá el tablero

Cambiá el estado y el dueño de **tu** fila. No toques las filas de otros.

### 3. Al terminar, escribí en el log

Una entrada, siempre con este formato exacto:

```
## [YYYY-MM-DD HH:MM] @tu-rol → @rol-destino
**Historia:** H-00N
**Hice:** una línea
**Entregué:** ruta del archivo que produjiste
**Necesito que hagas:** una línea, concreta
**Bloqueos:** ninguno, o qué te frenó
```

El `→ @rol-destino` es el handoff. **Si no nombrás a quién le pasás la posta,
la posta se pierde.**

---

## Los roles

| Rol | Dueño de | No puede |
|---|---|---|
| `analyst` | `docs/prd.md` | decidir stack ni diseño técnico |
| `architect` | `docs/architecture.md`, `specs/*.md` | escribir código |
| `dev` | `backend/`, `frontend/` | cambiar specs ni arquitectura |
| `qa` | `backend/tests/`, `docs/qa-report.md` | arreglar código de producción |
| `reviewer` | `docs/reviews/*.md` | escribir código |

**Regla de propiedad:** si necesitás cambiar algo que no es tuyo, no lo
cambiás. Lo anotás en el log con `→ @dueño` y parás.

Esa regla es lo único que separa a un equipo de cinco agentes peleándose por
los mismos archivos.

## El flujo

```
idea
 └→ @analyst    → docs/prd.md
     └→ @architect → docs/architecture.md + specs/H-001.md, H-002.md ...
         └→ @dev      → código de UNA historia
             └→ @qa       → tests + docs/qa-report.md
                 └→ @reviewer → docs/reviews/
                     └→ @dev (si hay hallazgos)   o   done
```

## Estados del tablero

`todo` → `in-progress` → `review` → `done`
Más `blocked`, con el motivo siempre en el log.

---

## Convenciones de código

- Backend: Express, ESM, sin ORM. Estado en memoria con `Map`.
- **El dinero se maneja en centavos, como enteros.** Nunca floats.
- Toda ruta en `backend/src/routes/` necesita su test en `backend/tests/`.
- Frontend: HTML + JS vanilla, sin framework ni build step.
- Nada de dependencias nuevas que no estén en `docs/architecture.md`.
