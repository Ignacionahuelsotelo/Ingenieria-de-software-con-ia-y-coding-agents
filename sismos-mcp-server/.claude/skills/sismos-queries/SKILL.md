---
name: sismos-queries
description: Cómo consultar bien el MCP de sismos — ids de región, escala de magnitud, ventanas de tiempo y errores típicos. Usar SIEMPRE que se llame una tool mcp__sismos__* o se interprete su respuesta.
---

# Consultar el MCP de sismos

## Ids de región

El servidor solo entiende estos ids. No inventes otros — devuelve error.

`chile` · `argentina` · `mexico` · `japon` · `california` · `indonesia` ·
`turquia` · `italia` · `nepal` · `islandia`

Acepta también el nombre con acento (`México`, `Japón`). Ante la duda,
`sismo_listar_regiones` te devuelve el catálogo con coordenadas y radio.

**El radio importa.** Cada región es un círculo alrededor de un punto, no una
frontera política: buscar en `chile` con radio 1800km trae eventos de Bolivia,
Perú y el norte argentino. Si el usuario pregunta por un país específico,
aclaralo en la respuesta en vez de afirmar que el sismo fue en Chile.

## Magnitud

| Rango | Qué significa |
|---|---|
| < 3.0 | No se siente. Miles por día en el mundo |
| 3.0 – 4.9 | Se siente, no daña |
| 5.0 – 5.9 | Daños menores en construcción precaria |
| 6.0 – 6.9 | Daños serios en zonas pobladas |
| ≥ 7.0 | Terremoto mayor |

**Sin `magnitudMinima` traés ruido.** Para "¿hubo sismos?" usá 4.0 como piso.
Para "¿hubo algo importante?", 5.5.

La escala es logarítmica: un M6 libera ~32 veces más energía que un M5. Nunca
promedies magnitudes — no significa nada.

## Ventanas de tiempo

`dias` por defecto es 7. Rangos que suelen funcionar:

- "¿qué pasó hoy?" → `dias: 1`
- "esta semana" → `dias: 7`
- "¿es normal?" → `dias: 90` (necesitás base de comparación)

Ventanas grandes con magnitud baja pueden traer cientos de eventos. Subí
`magnitudMinima` antes que el `limite`.

## Profundidad

Viene en `profundidadKm`. Un sismo superficial (<70km) se siente mucho más
que uno profundo de la misma magnitud. Si el usuario pregunta por qué algo
"se sintió fuerte", mirá la profundidad antes de responder.

## Errores típicos

| Mensaje | Causa |
|---|---|
| `Región 'X' desconocida` | id fuera del catálogo → `sismo_listar_regiones` |
| `USGS respondió 400` | rango de fechas inválido o límite > 200 |
| `El modelo respondió 404` | Ollama no está corriendo o falta el modelo |
| `La watchlist está vacía` | `informe_watchlist` sin regiones cargadas |

## Cuál tool para qué

Las `sismo_*` pegan a la **API del USGS** (datos en vivo, pueden tardar).
Las `watchlist_*` y `nota_*` pegan a la **base local** (instantáneas).
`sismo_explicar` e `informe_watchlist` además llaman a un **LLM abierto** —
tardan varios segundos y consumen cuota. No las uses cuando alcanza con datos.
