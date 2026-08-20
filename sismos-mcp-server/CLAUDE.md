# sismos-mcp-server

Servidor MCP de monitoreo sísmico. Existe para mostrar **las tres primitivas
de MCP y las tres fuentes de datos** en un solo servidor.

## Las tres primitivas

| Primitiva | Quién la dispara | Acá son |
|---|---|---|
| **Tools** | El modelo, cuando decide | 10 tools |
| **Resources** | La aplicación cliente, por URI | `sismos://watchlist`, `sismos://regiones`, `sismos://region/{id}` |
| **Prompts** | El usuario, eligiéndolos | `informe-diario`, `analizar-region`, `comparar-regiones` |

## Las tres fuentes

Cada tool declara de dónde saca los datos, y el log lo muestra en la terminal:

| Fuente | Tools | Qué es |
|---|---|---|
| `[API · USGS]` | `sismo_buscar`, `sismo_detalle` | API pública, sin key |
| `[DB · sqlite]` | `watchlist_*`, `nota_*` | Base local (`node:sqlite`, sin deps nativas) |
| `[LLM · abierto]` | `sismo_explicar`, `informe_watchlist` | Modelo abierto vía endpoint OpenAI-compatible |

`informe_watchlist` encadena las tres en una sola llamada: lee la base, consulta
la API por cada región, y resume con el modelo.

## El cliente propio

Además del servidor, el repo trae su **propio cliente MCP** en `src/cliente/`.
La entrada es lenguaje natural y **un modelo abierto decide qué tool activar**
— no hay Claude en ese camino.

```
src/cliente/
  mcp.ts        conecta al servidor y traduce sus tools a formato OpenAI
  agente.ts     loop de tool use contra gpt-oss: elige tool, ejecuta, repite
  cli.ts        terminal interactiva
```

`npm run ask` lo levanta en la terminal; `npm run web` abre el visualizador
de tres columnas en http://localhost:8788 (cliente | protocolo | servidor),
alimentado por dos streams SSE — uno por proceso. El servidor sigue siendo un MCP estándar, así que
Claude Code también puede consumirlo — sirve para comparar clientes.

## Estructura

```
src/
  index.ts          entrypoint — Express + Streamable HTTP
  constants.ts      catálogo de regiones, config por entorno
  log.ts            logging con colores + notificaciones MCP
  db.ts             node:sqlite
  services/
    usgs.ts         cliente de la API pública
    llm.ts          cliente del modelo abierto
  tools/
    registrar.ts    envoltorio único: cronometra, loguea, atrapa errores
    sismos.ts       tools contra la API
    watchlist.ts    tools contra la base
    analisis.ts     tools contra el LLM
  recursos.ts       resources
  prompts.ts        prompts
  web/
    servidor.ts     backend del visualizador — sirve la UI y emite SSE
    public/         la UI (un solo HTML, sin build)
```

**Puertos:** 8787 el servidor MCP, 8788 el visualizador. Se eligieron pegados y
lejos de los rangos de Vite (5173/5174), que suelen estar ocupados.

## Convenciones

- TypeScript ESM. `npm run dev` usa tsx (sin build); `npm run build` compila.
- **Toda tool nueva se registra con `registrarTool`**, nunca con
  `server.registerTool` directo — si no, pierde el logging y el manejo de errores.
- Toda tool declara su `fuente` (`API` | `DB` | `LLM` | `MCP`). Es lo que hace
  legible el log.
- Los errores se **devuelven** como resultado con `isError`, no se lanzan: así
  el modelo puede recuperarse en vez de que se corte la conversación.
- Las descripciones de tools dicen **cuándo** usarlas, no solo qué hacen. Es lo
  que más influye en que el modelo elija bien.
- Transporte HTTP a propósito, no stdio: queremos que el servidor sea un proceso
  visible con sus logs a la vista.

## Comandos

```bash
npm run dev       # levantar con recarga
npm run build     # compilar a dist/
npm run inspect   # MCP Inspector (UI para probar tools a mano)
curl -s localhost:8787/health
```

Antes de tocar código que llame tools `mcp__sismos__*`, usar la skill
`sismos-queries`. Para depurar el servidor, `mcp-server-ops`.
