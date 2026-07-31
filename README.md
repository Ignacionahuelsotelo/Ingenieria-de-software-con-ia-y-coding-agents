# Fork de Zerón

# Ingeniería de Software con IA y Coding Agents

> Introducción al curso — fundamentos de IA, LLMs, coding agents y flujos de trabajo de "vibecoding" con foco en el ecosistema Claude.
> Precios y datos de mercado actualizados a **julio de 2026**.

## Índice

1. [¿Qué es un LLM? Fundamentos de IA](#1-qué-es-un-llm-fundamentos-de-ia)
2. [Coding agents más usados en 2026](#2-coding-agents-más-usados-en-2026)
3. [CLI vs. apps de escritorio vs. plugins de IDE](#3-cli-vs-apps-de-escritorio-vs-plugins-de-ide)
4. [Diferencia entre modelo y API](#4-diferencia-entre-modelo-y-api)
5. [Modelos de pricing](#5-modelos-de-pricing)
6. [¿Qué es RAG?](#6-qué-es-rag)
7. [Tools (herramientas): qué son y cómo funcionan](#7-tools-herramientas-qué-son-y-cómo-funcionan)
8. [¿Qué es MCP?](#8-qué-es-mcp)
9. [Claude para vibecoding: herramientas y ecosistema](#9-claude-para-vibecoding-herramientas-y-ecosistema)

---

## 1. ¿Qué es un LLM? Fundamentos de IA

### 1.1. Definición

Un **LLM (Large Language Model / Modelo de Lenguaje de Gran Escala)** es una red neuronal entrenada con enormes cantidades de texto (y hoy también imágenes, audio y código) para predecir cuál es la próxima "pieza de texto" más probable dada una secuencia anterior. Toda la magia aparente de estos modelos —responder preguntas, escribir código, razonar— emerge de repetir ese mecanismo de predicción millones de veces, entrenado a escala masiva.

No "saben" cosas como una base de datos: son funciones estadísticas gigantes que comprimen patrones del lenguaje (y del conocimiento expresado en lenguaje) en miles de millones de parámetros numéricos.

### 1.2. Tokens

Los modelos no procesan letras ni palabras completas: procesan **tokens**. Un token es una unidad de texto (puede ser una palabra completa, una parte de una palabra, un signo de puntuación o incluso un espacio) definida por un algoritmo de tokenización (por ejemplo, BPE — *Byte Pair Encoding*).

- En inglés, 1 token ≈ 4 caracteres ≈ ¾ de palabra.
- En español y otros idiomas con más acentos/conjugaciones, la proporción suele ser peor (más tokens por palabra).
- El **contexto** (context window) de un modelo se mide en tokens: cuántos tokens puede "ver" simultáneamente entre el prompt, el historial de conversación y la respuesta.
- Todo se factura en tokens: tanto lo que vos enviás (**input/prompt tokens**) como lo que el modelo genera (**output/completion tokens**).

### 1.3. Embeddings

Un **embedding** es la representación numérica de un token, palabra, frase o documento como un vector (una lista de números, típicamente de cientos a miles de dimensiones) en un "espacio semántico". La propiedad clave: elementos con significado similar quedan **cerca** en ese espacio vectorial.

- "Rey" y "reina" están cerca entre sí, y ambos lejos de "bicicleta".
- Los embeddings permiten hacer búsqueda semántica (buscar por significado, no por coincidencia exacta de palabras) y son la base técnica de **RAG** (ver sección 6).
- Dentro del propio LLM, cada token de entrada se convierte primero en un embedding antes de que el modelo empiece a procesarlo.

### 1.4. Cómo funciona un LLM "por atrás" (arquitectura Transformer)

Casi todos los LLMs modernos se basan en la arquitectura **Transformer** (papel "Attention Is All You Need", Google, 2017). El flujo simplificado es:

1. **Tokenización**: el texto de entrada se parte en tokens.
2. **Embedding**: cada token se convierte en un vector numérico.
3. **Positional encoding**: se le suma información de "posición" a cada vector, porque el Transformer no procesa en orden secuencial como lo hacía una RNN — necesita saber qué token va primero, segundo, etc.
4. **Self-attention**: el mecanismo central. Para cada token, el modelo calcula qué tan "relevante" es cada otro token del contexto para interpretarlo correctamente. Esto es lo que le permite, por ejemplo, resolver que en "el banco cerró temprano porque no tenía empleados", "banco" se refiere a una entidad financiera y no al asiento, usando el resto de la oración como contexto.
5. **Capas apiladas (layers)**: este proceso de atención + una red neuronal densa se repite en decenas o cientos de capas, refinando progresivamente la representación.
6. **Predicción del siguiente token**: en la capa final, el modelo produce una distribución de probabilidad sobre todo su vocabulario (decenas de miles de tokens posibles) y elige (o samplea) el siguiente token.
7. **Generación autoregresiva**: ese token elegido se agrega a la secuencia y todo el proceso se repite para generar el siguiente, uno por uno, hasta terminar la respuesta.

**Entrenamiento**, a muy alto nivel, tiene generalmente 2-3 etapas:

- **Pre-entrenamiento (pretraining)**: el modelo aprende a predecir texto a partir de billones de tokens de internet, libros, código, etc. Acá se forma el "conocimiento general" y la comprensión del lenguaje. Es la etapa más cara (miles de GPUs, semanas o meses).
- **Fine-tuning / Instruction tuning**: se ajusta el modelo con ejemplos de instrucción→respuesta para que sea útil como asistente (no solo "completar texto" sino "responder lo que se le pide").
- **RLHF / RLAIF (Reinforcement Learning from Human/AI Feedback)**: se refina el comportamiento del modelo usando feedback (humano o de otro modelo) sobre qué respuestas son mejores, para alinearlo con lo que el usuario espera y con políticas de seguridad.

**"Thinking" / razonamiento extendido**: los modelos más recientes (Claude, GPT, Gemini en sus variantes "reasoning") pueden generar una cadena de razonamiento intermedia antes de la respuesta final (a veces visible, a veces resumida u oculta), lo que mejora el desempeño en tareas complejas a costa de más tokens y latencia.

### 1.5. Tipos de LLM

| Tipo | Descripción | Ejemplos |
|---|---|---|
| **Base model** | Solo entrenado para predecir texto; no está afinado para seguir instrucciones. Raramente se usa directo hoy. | GPT-4 base, Llama base |
| **Instruct / Chat model** | Afinado con RLHF para seguir instrucciones y mantener conversación | Claude, ChatGPT, Gemini |
| **Reasoning model** | Optimizado para razonar paso a paso antes de responder (más lento, mejor en matemática/lógica/código complejo) | Claude con "extended thinking", OpenAI o3/GPT-5.x thinking, Gemini con "thinking" |
| **Multimodal** | Acepta y/o genera más de un tipo de dato: texto, imagen, audio, video | Claude (visión), GPT-4o/5.x, Gemini (nativo multimodal) |
| **MoE (Mixture of Experts)** | En vez de activar todos los parámetros en cada inferencia, activa solo un subconjunto de "expertos" — más eficiente en cómputo | Muchos modelos frontier usan esta arquitectura internamente (no siempre pública) |
| **Modelos abiertos (open weight)** | Los pesos del modelo son descargables y se pueden correr localmente | Llama (Meta), Mistral, DeepSeek, Qwen |
| **Modelos cerrados (closed / API-only)** | Solo se accede vía API, los pesos no se publican | Claude, GPT, Gemini |
| **SLM (Small Language Model)** | Versión chica, rápida y barata, para tareas simples o correr on-device | Claude Haiku, GPT-5 mini/nano, Gemini Flash |

### 1.6. Conceptos clave adicionales

- **Ventana de contexto (context window)**: cantidad máxima de tokens que el modelo puede "tener en cuenta" en una sola llamada (prompt + historial + salida). En 2026 los modelos frontier (Claude, GPT, Gemini) manejan habitualmente ventanas de **1 millón de tokens**.
- **Alucinación**: cuando el modelo genera información que suena plausible pero es falsa, porque su naturaleza es estadística (predice lo "probable", no consulta una fuente de verdad).
- **Temperatura / sampling**: parámetros que controlan cuán "determinista" o "creativa" es la generación (más alto = más variado, más aleatorio).
- **Fine-tuning vs. prompting vs. RAG**: tres formas distintas de adaptar un LLM a un caso de uso específico, de más a menos costoso/permanente (fine-tuning modifica los pesos; RAG inyecta contexto externo en tiempo de consulta; prompting solo cambia las instrucciones).
- **Ventaja competitiva de cada laboratorio**: Anthropic (Claude) apuesta fuerte a *safety* y a tareas agentic/coding de largo horizonte; OpenAI (GPT) a un ecosistema de producto amplio (ChatGPT, Codex); Google (Gemini) a integración nativa multimodal y contexto largo.

---

## 2. Coding agents más usados en 2026

Un **coding agent** es un LLM al que se le da acceso a herramientas (leer/escribir archivos, ejecutar comandos de terminal, buscar en la web, usar Git, etc.) para que pueda completar tareas de desarrollo de forma más autónoma que un simple autocompletado o chat. En vez de "te sugiero este código", el agente puede explorar el repo, escribir el archivo, correr los tests, ver el error y corregirlo — todo en un loop, con supervisión humana en distintos grados.

Los cinco jugadores dominantes en 2026:

| Herramienta | Empresa | Modelo(s) por defecto | Forma principal | Fortaleza destacada |
|---|---|---|---|---|
| **Claude Code** | Anthropic | Claude Opus 5 / Sonnet 5 | CLI (terminal) + extensión IDE + SDK | Tareas de largo horizonte, refactors multi-archivo, control fino por subagente, integración MCP y Skills |
| **Codex CLI** | OpenAI | GPT-5.6 (familia Sol/Terra/Luna) | CLI + integrado en ChatGPT | Muy competitivo en benchmarks tipo Terminal-Bench, salida rápida y concisa |
| **Gemini CLI** | Google | Gemini 3.x | CLI open source | Ventana de contexto más grande del mercado, gratis con límites generosos |
| **GitHub Copilot** | GitHub / Microsoft | Multi-modelo (GPT, Claude, Gemini seleccionables) | Plugin de IDE + Agent Mode + CLI | Integración nativa con GitHub (PRs, issues, code review), el más instalado por volumen de usuarios |
| **Cursor** | Cursor / Anysphere | Multi-modelo (Claude, GPT, Gemini seleccionables) | IDE propio (fork de VS Code) | Mejor experiencia de "IDE-first" con agente integrado, muy popular para vibecoding |

Otros relevantes: **Windsurf** (IDE competidor directo de Cursor, con sistema de cuotas), **Cline** (extensión open source para VS Code, agnóstica de modelo), **Aider** (CLI open source, muy usado por poder elegir cualquier modelo vía API propia).

**Cómo elegir en 2026** (regla general, no dogma):
- Si querés el agente de terminal más capaz y con mejor manejo de tareas largas → **Claude Code** o **Codex CLI**.
- Si preferís quedarte en un editor con UI → **Cursor** o **GitHub Copilot Agent Mode**.
- Si el presupuesto es cero y no te importa alternar de herramienta → **Gemini CLI** (tiene tier gratuito muy generoso).
- Si tu organización ya vive en GitHub → **Copilot** por la integración nativa con PRs/Issues/Actions.

---

## 3. CLI vs. apps de escritorio vs. plugins de IDE

Todos los proveedores ofrecen (en general) tres superficies distintas para interactuar con su coding agent, y **no son intercambiables** — cada una tiene un propósito.

### 3.1. CLI (Command Line Interface / terminal)

Ejemplos: `claude` (Claude Code), `codex` (Codex CLI), `gemini` (Gemini CLI).

- Corre directamente en tu terminal, dentro del directorio de tu proyecto.
- Generalmente el más **potente y flexible**: acceso directo a bash, git, scripts, pipelines de CI, subagentes en paralelo.
- Pensado para desarrolladores que ya trabajan cómodos en terminal.
- Es scriptable: se puede invocar desde otros programas, hooks de Git, pipelines de automatización.
- Suele ser la superficie donde primero aparecen las features más nuevas (subagentes, skills, permisos granulares).

### 3.2. App de escritorio

Ejemplos: Claude Desktop, ChatGPT Desktop, apps standalone de Cursor/Windsurf (que en rigor son IDEs completos, no solo "apps de chat").

- Interfaz gráfica nativa (ventanas, menús, configuración visual).
- Suele integrar MCP servers de forma más amigable (conectar Google Drive, Slack, bases de datos) vía UI en vez de configuración manual.
- Mejor para usuarios no-técnicos o para tareas que combinan chat + archivos + búsqueda web, sin necesidad de tocar una terminal.
- Generalmente **menos potente** para tareas de código puro que la CLI equivalente (menos control granular de permisos y herramientas).

### 3.3. Plugin / extensión de IDE

Ejemplos: Claude Code en VS Code/JetBrains, GitHub Copilot (extensión), Cline.

- Vive **dentro** del editor donde ya estás escribiendo código: ves el diff inline, aceptás/rechazás cambios línea por línea.
- La ventaja es la fricción cero: no cambiás de ventana ni de contexto mental.
- Suele ofrecer autocompletado en tiempo real (inline completions) además del modo agente — algo que ni la CLI ni la app de escritorio hacen tan bien.
- La contra: menos control sobre el "loop" completo del agente comparado con la CLI (ejecución de comandos, permisos, paralelismo).

**En resumen**: la CLI es la herramienta de máximo poder y control para devs; la app de escritorio es la más accesible y mejor para tareas generales/no-código; el plugin de IDE es el mejor equilibrio para programar con asistencia continua sin salir del editor. Muchos desarrolladores hoy combinan las tres según la tarea.

---

## 4. Diferencia entre modelo y API

Esta es una confusión muy común para quien recién arranca, así que vale la pena remarcarla:

### 4.1. El modelo

El **modelo** es el artefacto de IA en sí: los pesos entrenados (por ejemplo, "Claude Opus 5" o "GPT-5.6"). Es lo que efectivamente "piensa" y genera texto. Un modelo por sí solo no tiene interfaz — es matemática pura corriendo en GPUs/TPUs.

### 4.2. La API

La **API (Application Programming Interface)** es la puerta de entrada programática para *usar* ese modelo desde tu propio código. Es un contrato: vos mandás una petición HTTP con un formato específico (por ejemplo, `POST /v1/messages` con un JSON que incluye tu prompt, el modelo elegido, parámetros como `max_tokens`) y el servidor te devuelve una respuesta en otro JSON.

La API es la manera en la que un **desarrollador** integra el modelo dentro de una aplicación propia (un chatbot, un agente, una feature de producto). No es lo mismo que usar ChatGPT o Claude.ai desde el navegador — eso es un **producto de consumo** construido *sobre* la API (o sobre acceso interno directo al modelo), con una interfaz de chat, historial, memoria, etc. ya armada para vos.

### 4.3. Tabla comparativa

| | Modelo | API | Producto de consumo (ChatGPT / Claude.ai) |
|---|---|---|---|
| ¿Qué es? | Los pesos entrenados de la red neuronal | Interfaz programática (HTTP/SDK) para invocar al modelo | Aplicación web/app con UI de chat lista para usar |
| ¿Quién lo usa? | Investigadores, infraestructura interna del proveedor | Desarrolladores que construyen software | Usuarios finales, sin código |
| ¿Cómo se paga? | No se "compra" directamente | Por token consumido (pay-as-you-go) | Suscripción mensual (o gratis con límites) |
| Ejemplo | `claude-opus-5` | `client.messages.create(model="claude-opus-5", ...)` | Escribir un mensaje en claude.ai |
| Control | Ninguno (a menos que seas el proveedor) | Alto: elegís modelo, parámetros, herramientas, streaming, etc. | Bajo: la app ya decide casi todo por vos |

Un dato relevante para el curso: **Claude Code, Codex CLI y Gemini CLI usan la API por debajo**, aunque se sientan como "productos". Cuando se paga por suscripción (Claude Pro/Max, ChatGPT Plus/Pro), en general esa suscripción incluye uso de estas herramientas con límites de uso (no ilimitados, aunque se sientan como tal); si excedés esos límites, algunos planes ofrecen pasar a pagar por token vía tarifas de API.

---

## 5. Modelos de pricing

Hay dos grandes maneras de pagar por IA generativa: **suscripción** (acceso a un producto, con límites de uso) y **pago por uso vía API** (por token consumido). Muchas herramientas de coding agents combinan ambas: una suscripción que cubre uso "normal" + la opción de pasar a tarifas de API cuando te quedás sin cuota.

### 5.1. Suscripciones — productos de consumo y coding agents (julio 2026)

| Producto | Plan gratuito | Plan(es) individual(es) | Plan Team/Business | Notas |
|---|---|---|---|---|
| **Claude (Anthropic)** | Sí, limitado | Pro **US$20/mes** (US$17/mes anual) · Max 5x **US$100/mes** · Max 20x **US$200/mes** | Team desde **US$25/usuario/mes** (US$150/mes para seat premium con Claude Code) | "Extra usage": al agotar la cuota podés seguir pagando a tarifa de API con tope configurable |
| **ChatGPT (OpenAI)** | Sí | Go **US$8/mes** · Plus **US$20/mes** · Pro **US$100–200/mes** | Business **US$20–25/usuario/mes** | Incluye acceso a Codex según el plan |
| **Gemini (Google)** | Sí | Similar a Claude/ChatGPT en tiers Plus/Pro/Ultra (varía por región y bundle con Google One) | Vertex AI / Workspace para empresas | Gemini CLI tiene un tier gratuito muy amplio |
| **GitHub Copilot** | Sí, limitado | Pro **US$10/mes** · Pro+ **US$39/mes** · Max **US$100/mes** | Business **US$19/usuario/mes** · Enterprise **US$39/seat** | Desde junio 2026 pasó a **billing basado en uso** (créditos de IA); autocompletado inline sigue gratis en planes pagos, solo chat/agente/code review consumen créditos |
| **Cursor** | Hobby (gratis, limitado) | Pro **US$20/mes** · Pro+ **US$60/mes** · Ultra **US$200/mes** | Teams **US$40/usuario/mes** | Modelo de créditos: cada plan trae un pool de crédito equivalente a su precio para requests premium |
| **Windsurf** | Free (gratis, limitado) | Pro **US$20/mes** · Max **US$200/mes** | Teams **US$40/usuario/mes** | Desde marzo 2026 pasó de créditos a sistema de **cuotas** diarias/semanales por modelo |

> Todos estos planes suelen ofrecer descuento por facturación anual (típicamente 15-20%).

### 5.2. Pricing por request/token vía API (julio 2026)

El pricing de API se cotiza casi siempre como **USD por millón de tokens (MTok)**, separado en tokens de **entrada (input)** y de **salida (output)** — el output siempre cuesta más porque es más costoso computacionalmente de generar que de leer.

#### Anthropic (Claude)

| Modelo | Input / MTok | Output / MTok | Contexto | Notas |
|---|---|---|---|---|
| Claude Fable 5 / Mythos 5 | $10.00 | $50.00 | 1M | El más capaz; pensamiento siempre activo |
| Claude Opus 5 | $5.00 | $25.00 | 1M | Recomendado por defecto para tareas agentic/coding complejas |
| Claude Opus 4.8 / 4.7 / 4.6 | $5.00 | $25.00 | 1M | Generación anterior de Opus |
| Claude Sonnet 5 | $3.00 ($2.00 intro hasta 31/08/2026) | $15.00 ($10.00 intro) | 1M | Mejor relación costo/calidad para uso agentic de volumen |
| Claude Sonnet 4.6 | $3.00 | $15.00 | 1M | |
| Claude Haiku 4.5 | $1.00 | $5.00 | 200K | El más rápido y barato, para tareas simples |

Caching de prompts puede reducir el costo de tokens repetidos hasta ~90% (lecturas de caché cuestan ~10% del precio base).

#### OpenAI (GPT)

| Modelo | Input / MTok | Output / MTok | Notas |
|---|---|---|---|
| GPT-5.6 Sol (frontier) | $5.00 | $30.00 | Sube a $10/$45 en contextos >272K tokens |
| GPT-5.6 Terra (balanceado) | $2.50 | $15.00 | Sube a $5/$22.50 en contexto largo |
| GPT-5.6 Luna (económico) | $1.00 | $6.00 | Sube a $2/$9 en contexto largo |
| GPT-5.5 | $5.00 (caché: $0.50) | $30.00 | Generación previa |

#### Google (Gemini)

| Modelo | Input / MTok | Output / MTok | Notas |
|---|---|---|---|
| Gemini 3 Pro | $2.00 (hasta 200K ctx) / $4.00 (>200K) | $12.00 / $18.00 | Precio escalonado por tamaño de contexto |
| Gemini 3.6 Flash | $1.50 | $7.50 | Lanzado 21/07/2026 |
| Gemini 3.5 Flash | $1.50 | $9.00 | |
| Gemini 3 Flash Preview | $0.25 | $1.50 | La opción más económica |

Google ofrece además **Batch API con 50% de descuento** en input y output para procesamiento asíncrono no urgente (Anthropic y OpenAI tienen equivalentes: Message Batches al 50%).

> **Importante sobre estas tablas**: los precios de API cambian con frecuencia (nuevos modelos, ajustes de mercado). Estos valores reflejan julio de 2026, pero para un proyecto real siempre conviene verificar el pricing vigente en la documentación oficial de cada proveedor antes de presupuestar.

### 5.3. ¿Suscripción o API? ¿Cuándo conviene cada una?

- **Suscripción**: ideal para uso personal/individual con volumen moderado y predecible — pagás un monto fijo mensual y no pensás en tokens.
- **API (pago por uso)**: ideal para integrar IA dentro de un producto propio, para automatizaciones a escala, o cuando el volumen de uso es muy variable/alto y calculás que sale más barato que una suscripción con tope.
- Los **coding agents** (Claude Code, Codex, Cursor) generalmente funcionan sobre una suscripción que "envuelve" el costo de API por vos, con límites de uso — por eso al escalar mucho terminás necesitando pasar a facturación directa por API o a planes Team/Enterprise.

---

## 6. ¿Qué es RAG?

**RAG (Retrieval-Augmented Generation / Generación Aumentada por Recuperación)** es una técnica para darle a un LLM acceso a información específica y actualizada que **no está** en sus pesos entrenados (por ejemplo: la documentación interna de tu empresa, un manual técnico, tickets de soporte), sin necesidad de reentrenar el modelo.

### 6.1. Cómo funciona (flujo típico)

1. **Indexación (offline, una vez)**:
   - Se toman los documentos fuente (PDFs, wikis, código, tickets, etc.) y se dividen en fragmentos manejables (*chunks*).
   - Cada chunk se convierte en un **embedding** (vector numérico, ver sección 1.3) usando un modelo de embeddings.
   - Esos vectores se guardan en una **base de datos vectorial** (Pinecone, Weaviate, pgvector, Chroma, etc.), junto con el texto original.

2. **Recuperación (retrieval, en tiempo real)**:
   - Cuando el usuario hace una pregunta, esa pregunta también se convierte en un embedding.
   - Se busca en la base vectorial cuáles son los chunks **más cercanos semánticamente** a esa pregunta (búsqueda por similitud, no por palabras clave exactas).
   - Se recuperan los N chunks más relevantes.

3. **Generación aumentada**:
   - Esos chunks recuperados se inyectan como contexto dentro del prompt que se le manda al LLM, junto con la pregunta original: *"Con base en la siguiente información: [chunks recuperados], respondé: [pregunta del usuario]"*.
   - El LLM genera la respuesta usando esa información fresca en vez de (o además de) su conocimiento entrenado.

### 6.2. ¿Por qué usar RAG en vez de simplemente meter todo en el contexto?

Con ventanas de contexto de 1M de tokens en 2026, a veces sí alcanza con "meter todo el documento" en el prompt. Pero RAG sigue siendo valioso cuando:

- El corpus de información es **demasiado grande** para caber en cualquier ventana de contexto (millones de documentos).
- Se necesita **actualizar la fuente de información constantemente** sin re-procesar todo el contexto en cada llamada (más barato: solo indexás lo nuevo).
- Se busca **reducir costo y latencia**: mandar solo los 3-5 fragmentos relevantes es mucho más barato que mandar 500 páginas enteras en cada request.
- Se necesita **trazabilidad**: poder decir "esta respuesta se basó en estos documentos específicos" (citas/fuentes).

### 6.3. RAG y coding agents

En el contexto de este curso, es útil pensar en el propio comportamiento de un coding agent como una forma de RAG: cuando Claude Code hace `grep`/`glob`/lee archivos de tu repositorio antes de responder, está haciendo una forma de recuperación dinámica de contexto relevante (aunque no siempre vía embeddings — a veces es búsqueda léxica directa), en vez de tener "memorizado" tu código.

---

## 7. Tools (herramientas): qué son y cómo funcionan

Un LLM, por sí solo, únicamente puede **generar texto**. No puede consultar el clima real, correr una query SQL, leer un archivo de tu disco ni ejecutar un comando de terminal — solo predice qué texto vendría a continuación (ver sección 1). **Tool use** (también llamado *function calling*) es el mecanismo que le permite a un LLM **pedirle a tu programa que ejecute una acción concreta** en su nombre, y recibir el resultado de vuelta para seguir razonando con él.

Es, en definitiva, la pieza que convierte a un LLM de "chatbot que solo escribe texto" en un **agente** que puede actuar sobre el mundo real (leer y escribir archivos, correr código, navegar la web, llamar APIs). Coding agents como Claude Code, MCP (sección 8) y prácticamente todo lo "agentic" que existe en 2026 está construido sobre esta base.

### 7.1. La idea clave: el modelo nunca ejecuta nada

Esto es lo que más confunde al arrancar: **el LLM no ejecuta código ni tiene acceso directo a nada**. Lo único que hace es, dentro de su respuesta, decir *"quiero llamar a la herramienta X con estos parámetros"*. Quien efectivamente ejecuta esa acción es **tu aplicación** (el código que vos escribiste, o el harness de un producto como Claude Code). El modelo pide, tu programa hace, y le devolvés el resultado al modelo para que continúe.

Esta separación es intencional y es también un límite de seguridad: vos decidís qué herramientas existen, qué pueden hacer realmente, y podés interceptar/validar/bloquear cualquier llamada antes de ejecutarla.

### 7.2. Anatomía de una tool

Una herramienta se define, básicamente, con tres cosas:

- **Nombre**: un identificador corto (ej. `get_weather`, `run_sql_query`, `send_email`).
- **Descripción**: texto en lenguaje natural que le explica al modelo **qué hace** la herramienta y, crucialmente, **cuándo conviene usarla**. El modelo decide si llamarla o no basándose casi exclusivamente en esta descripción — una descripción vaga produce llamadas erráticas (la usa de más o de menos).
- **Schema de parámetros** (típicamente JSON Schema): qué inputs necesita la herramienta y de qué tipo son.

Ejemplo conceptual:

```json
{
  "name": "get_weather",
  "description": "Obtiene el clima actual de una ciudad. Usar cuando el usuario pregunte por clima o temperatura actual.",
  "input_schema": {
    "type": "object",
    "properties": {
      "location": { "type": "string", "description": "Ciudad, ej: Buenos Aires" },
      "unit": { "type": "string", "enum": ["celsius", "fahrenheit"] }
    },
    "required": ["location"]
  }
}
```

### 7.3. El loop de tool use, paso a paso

1. Le mandás al modelo tu pregunta **junto con la lista de tools disponibles** (sus definiciones, no su código).
2. El modelo analiza la pregunta. Si decide que necesita una herramienta, en vez de (o además de) responder en texto, devuelve un bloque especial de tipo **`tool_use`**: el nombre de la tool elegida y los parámetros con los que quiere invocarla (generados por el propio modelo, en base al schema).
3. **Tu código** —no el modelo— recibe ese `tool_use`, ejecuta la función real correspondiente (llama a la API del clima, corre la query, lee el archivo) y obtiene un resultado.
4. Le mandás ese resultado de vuelta al modelo como un bloque **`tool_result`**, dentro de la misma conversación.
5. El modelo continúa razonando **ya con el resultado real en su contexto**, y decide si responde al usuario, o si necesita llamar a otra herramienta más (por ejemplo, encadenar "buscar el archivo" → "leerlo" → "editarlo" → "correr los tests").
6. Este ciclo se repite las veces que haga falta hasta que el modelo considera que ya puede dar una respuesta final (`stop_reason: "end_turn"`), en vez de seguir pidiendo herramientas (`stop_reason: "tool_use"`).

Este ciclo repetido de "el modelo decide → tu código ejecuta → el modelo re-evalúa con el resultado" es, en esencia, lo que hace que un coding agent pueda explorar un repositorio entero, corregir un bug y verificar que el fix funciona, todo en una sola tarea: no es magia distinta, es este mismo loop corriendo muchas veces seguidas.

### 7.4. Tools del lado del cliente vs. del lado del servidor

| Tipo | ¿Quién ejecuta? | Ejemplos | Notas |
|---|---|---|---|
| **Client-side (cliente)** | Tu propia aplicación / el harness del agente | Leer/escribir archivos, correr bash, tools custom que vos definís (consultar tu base de datos, mandar un email) | El proveedor del modelo define el "contrato" (nombre, schema) pero **vos** implementás la ejecución real |
| **Server-side (servidor)** | La infraestructura del proveedor del modelo (ej. Anthropic) | Búsqueda web, ejecución de código en sandbox, fetch de una URL | No escribís código de ejecución: solo declarás la tool y el proveedor la corre por vos, devolviendo el resultado directamente |

En un coding agent como Claude Code, herramientas como `bash`, `read`, `write`, `edit` o `grep` son client-side (las ejecuta el propio Claude Code en tu máquina, con permisos que vos controlás), mientras que `web_search` es un ejemplo típico de tool server-side.

### 7.5. Tool choice: ¿cuándo usa el modelo una herramienta?

Por defecto, el modelo decide libremente si usar una tool o responder directo (modo `auto`). Pero se puede forzar el comportamiento:

- **`auto`**: el modelo decide (default).
- **`any`**: el modelo está obligado a usar *alguna* herramienta.
- **`tool: <nombre>`**: el modelo está obligado a usar una herramienta específica.
- **`none`**: el modelo no puede usar herramientas, aunque estén declaradas.

También se pueden pedir **múltiples llamadas a herramientas en paralelo** dentro de una misma respuesta (por ejemplo, leer 5 archivos independientes de una sola vez), lo cual acelera mucho tareas que son paralelizables.

### 7.6. ¿Por qué esto es tan central para todo el curso?

- Es la base técnica de **RAG dinámico**: en vez de recuperar contexto solo una vez al principio, un agente puede usar una tool de búsqueda cuantas veces necesite, sobre la marcha.
- Es la base técnica de **MCP** (sección 8): MCP es, en el fondo, un protocolo para **empaquetar y distribuir tools** de forma estandarizada entre distintas aplicaciones, en vez de reinventar la integración cada vez.
- Es la base técnica de **todos los coding agents**: Claude Code, Codex CLI, Cursor, Copilot Agent Mode — todos son, en esencia, un LLM con un set de tools bien diseñado (archivos, terminal, git, búsqueda) corriendo este mismo loop una y otra vez hasta completar la tarea.

---

## 8. ¿Qué es MCP?

**MCP (Model Context Protocol)** es un protocolo abierto creado por Anthropic (y hoy adoptado por la industria, incluyendo OpenAI y Google) que estandariza **cómo un LLM/agente se conecta a herramientas y fuentes de datos externas** — bases de datos, APIs de terceros (Slack, GitHub, Notion, Google Drive), sistemas de archivos, etc.

### 7.1. El problema que resuelve

Antes de MCP, si querías que un asistente de IA pudiera leer tu Google Drive, escribir en Slack y consultar tu base de datos, tenías que escribir integraciones custom para cada combinación de (modelo × herramienta). Esto se conoce como el problema "M×N": M modelos distintos necesitando conectarse a N herramientas distintas, cada combinación con su propio código de integración.

MCP estandariza esa conexión: cualquier cliente compatible con MCP (Claude Code, Claude Desktop, Cursor, VS Code, etc.) puede hablar con cualquier **servidor MCP** (una integración con Slack, GitHub, una base de datos, etc.) usando el mismo protocolo. Se reduce el problema M×N a M+N: cada herramienta implementa un servidor MCP una sola vez, y cualquier cliente que hable MCP puede usarlo.

### 7.2. Arquitectura básica

- **MCP Host**: la aplicación de IA que el usuario usa (Claude Code, Claude Desktop, Cursor, un IDE).
- **MCP Client**: el componente dentro del host que mantiene la conexión con un servidor MCP específico.
- **MCP Server**: expone un set de capacidades a través del protocolo. Puede exponer:
  - **Tools** (herramientas): funciones que el modelo puede invocar (ej: "buscar un ticket en Jira", "correr una query SQL").
  - **Resources** (recursos): datos que el modelo puede leer como contexto (ej: el contenido de un archivo, una fila de base de datos).
  - **Prompts**: plantillas de prompt reutilizables que el servidor expone.

Un servidor MCP puede correr localmente (por ejemplo, un servidor que le da acceso al sistema de archivos de tu computadora) o remotamente vía HTTP (por ejemplo, el servidor MCP oficial de GitHub, que expone repos, PRs e issues).

### 7.3. Ejemplo práctico

Si configurás un servidor MCP de Postgres en Claude Code, el agente puede:
1. Listar las tablas disponibles (vía un `resource` o `tool` que expone el servidor).
2. Ejecutar una consulta SQL de solo lectura (vía un `tool`) para responder tu pregunta sobre los datos.
3. Todo esto sin que vos hayas escrito ningún código de integración — solo instalaste y configuraste el servidor MCP de Postgres una vez.

### 7.4. MCP vs. "function calling" tradicional

El *tool use* / *function calling* que ya soportan las APIs de LLM (definís un JSON schema de una función y el modelo decide cuándo llamarla) sigue siendo la base técnica. MCP no lo reemplaza: lo **estandariza y empaqueta** para que esas integraciones sean reutilizables entre distintas aplicaciones y proveedores de modelo, en vez de tener que reimplementar la integración con Slack (por ejemplo) para cada asistente de IA distinto que uses.

---

## 9. Claude para vibecoding: herramientas y ecosistema

"**Vibecoding**" es el término informal para describir el flujo de trabajo donde delegás gran parte de la escritura de código a un agente de IA, describiendo intención de alto nivel y supervisando/iterando sobre el resultado, en vez de escribir cada línea manualmente. Claude Code es, junto con Cursor y Codex, una de las herramientas de referencia para este flujo. Esta sección cubre el ecosistema completo de Claude para este propósito.

### 8.1. Claude Code — el agente de terminal

Es la CLI de Anthropic para trabajar de forma agentic sobre un repositorio real. Corre en tu terminal, dentro del directorio de tu proyecto, con acceso a:

- **Bash**: ejecutar comandos de shell, tests, builds, git.
- **Herramientas de archivo**: leer, escribir, editar, buscar (`grep`/`glob`) dentro del repo.
- **Web search / web fetch**: buscar información actualizada o documentación en internet.
- Todo esto sujeto a un **sistema de permisos** que le pedís confirmación (o no, según cómo lo configures) antes de acciones potencialmente riesgosas.

### 8.2. `CLAUDE.md` — memoria persistente del proyecto

Es un archivo Markdown (por convención, en la raíz del repo, o en subcarpetas para reglas más específicas) que Claude Code lee automáticamente al arrancar. Sirve para darle contexto persistente sobre el proyecto sin tener que repetirlo en cada sesión: convenciones de código, comandos de build/test, arquitectura, cosas a evitar, estilo del equipo, etc.

Es, en esencia, el "onboarding doc" que le das a un desarrollador nuevo — pero para el agente. Se puede generar automáticamente explorando el repo (comando `/init`).

### 8.3. Skills

Los **Skills** son carpetas con un archivo `SKILL.md` que empaquetan conocimiento específico de una tarea (workflows, mejores prácticas, contexto de dominio) que Claude **carga solo cuando es relevante** — no ocupan contexto todo el tiempo, solo cuando la tarea lo amerita. Ejemplos: un skill para generar archivos `.pptx`, otro para manejar hojas de cálculo `.xlsx`, otro con las convenciones específicas de despliegue de tu empresa.

La ventaja frente a poner todo en `CLAUDE.md`: mantenés el contexto "base" liviano y cargás detalle bajo demanda (*progressive disclosure*), evitando saturar la ventana de contexto con instrucciones que no aplican a la tarea actual.

### 8.4. Subagentes y ejecución en paralelo

Claude Code puede delegar partes de una tarea a **subagentes**: instancias del propio modelo con su propio contexto aislado, que trabajan en paralelo sobre subtareas independientes y después reportan sus resultados al agente principal (el "coordinador").

- Útil para tareas paralelizables: revisar 10 archivos independientes, correr investigaciones en paralelo, o tener un subagente "verificador" que audite el trabajo del agente principal con contexto fresco (sin el sesgo de haber escrito el código él mismo).
- Cada subagente puede tener su propio modelo asignado (por ejemplo, usar un modelo más barato/rápido como Haiku para subtareas simples y reservar Opus para el trabajo de mayor complejidad).
- Este mismo patrón, llevado a producción y con Anthropic gestionando la infraestructura (contenedores, orquestación), es lo que se conoce como **Managed Agents / Claude Agent SDK**: agentes de larga duración que corren de forma autónoma, con sesiones, entornos y flujos de eventos gestionados por la plataforma en vez de por vos localmente.

### 8.5. Hooks

Los **hooks** son puntos de extensión que ejecutan comandos de shell automáticamente en respuesta a eventos del ciclo de vida de Claude Code — por ejemplo: "antes de que se ejecute cualquier tool", "después de que Claude termine de responder", "cuando se intenta escribir un archivo". Se configuran en `settings.json`.

Casos de uso típicos: correr un linter automáticamente después de cada edición, bloquear la ejecución de comandos peligrosos con una allowlist propia, enviar una notificación cuando el agente termina una tarea larga, o inyectar contexto adicional antes de cada prompt.

### 8.6. MCP en Claude

Claude Code y Claude Desktop son, junto con Cursor y VS Code, de los clientes MCP más maduros del mercado (ver sección 8). Se configuran servidores MCP para darle a Claude acceso a Slack, bases de datos, GitHub, Figma, Google Drive, y prácticamente cualquier sistema que tenga (o pueda tener) un servidor MCP.

### 8.7. Slash commands y modo Plan

- **Slash commands** (`/init`, `/review`, comandos custom definidos por el usuario): atajos reutilizables para flujos de trabajo repetitivos, definidos como archivos Markdown con instrucciones predefinidas.
- **Plan mode**: un modo en el que Claude explora el problema y propone un plan de acción **antes** de tocar ningún archivo, permitiendo revisar y aprobar la estrategia antes de la ejecución — clave quirúrgico para tareas grandes o riesgosas.

### 8.8. Sistema de permisos y modos de autonomía

Claude Code permite configurar distintos niveles de autonomía: desde pedir confirmación para cada acción (más seguro, más lento) hasta modos más autónomos donde el agente puede editar archivos y correr comandos permitidos sin interrupciones (más rápido, requiere más confianza en el setup). Esto se controla vía `settings.json`/`settings.local.json` y reglas de permisos por herramienta.

### 8.9. Claude Agent SDK

Para quienes quieran ir un paso más allá de usar Claude Code como producto y **construir su propio agente** (con su propia UI, sus propias herramientas, su propio harness), Anthropic expone el **Claude Agent SDK** (`claude-agent-sdk`): empaqueta el mismo motor que corre por detrás de Claude Code — el loop del agente, herramientas built-in (leer/escribir archivos, bash, grep, web search), gestión de contexto, hooks, subagentes y permisos — como una librería para integrar en software propio. Es distinto de simplemente llamar a la API de Claude: acá heredás toda la infraestructura de agente ya construida, en vez de programar el loop desde cero.

---

## Cierre

Este documento es un punto de partida. A lo largo del curso vamos a profundizar en cada una de estas piezas con ejercicios prácticos: escribir prompts efectivos, configurar un `CLAUDE.md` real, montar un servidor MCP propio, comparar el comportamiento de distintos coding agents sobre el mismo problema, y entender cuándo conviene resolver algo con prompting simple, cuándo con RAG, y cuándo con un agente completo.
