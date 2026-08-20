<!--
Sync Impact Report
- Version change: 1.0.0 → 2.0.0
- Modified principles:
  - "II. UTC Internamente, Timezone Solo en Presentación" → "III. Tiempo en UTC" (renombrado,
    regla explícita agregada: nunca comparar strings de fecha)
  - "III. Sin Base de Datos (Estado en Memoria)" → "IV. La Base de Datos es la Verdad"
    (REDEFINICIÓN INCOMPATIBLE: el proyecto pasa de "sin base de datos, todo en memoria" a
    "Postgres con constraints como garante de integridad" — cambio MAJOR)
  - "IV. Dominio Puro para Reglas de Negocio" → "II. Dominio Puro" (renombrado, alcance
    ampliado para excluir también SQL directo, no solo Express)
  - "V. Ninguna Dependencia Nueva sin Justificación Escrita en el Plan" → "VI. Sin Dependencias
    Nuevas sin Justificación" (renombrado, sin cambio de fondo)
- Added principles:
  - V. SQL Plano (sin ORM, migraciones .sql numeradas)
  - VII. Errores Útiles (mensajes de error accionables, no genéricos)
- Added sections: ninguna nueva top-level (Additional Constraints, Development Workflow,
  Governance ya existían y fueron actualizadas en contenido)
- Removed sections: ninguna eliminada estructuralmente; el contenido del antiguo Principio III
  fue reemplazado en sentido opuesto por el nuevo Principio IV
- Templates requiring updates:
  - .specify/templates/plan-template.md ⚠ pending manual check (el Constitution Check gate debe
    referenciar los 7 principios vigentes, en particular el nuevo IV y V que introducen Postgres
    y migraciones .sql)
  - .specify/templates/spec-template.md ⚠ pending manual check (sin referencias directas a
    principios; sin cambios requeridos)
  - .specify/templates/tasks-template.md ⚠ pending manual check (las fases de tasks deberían
    poder incluir tareas de migración .sql cuando el Principio IV/V aplique)
- Follow-up TODOs:
  - La implementación existente del feature 001-sistema-turnos-barberia (estado en memoria,
    sin Postgres) fue construida bajo la constitución v1.0.0 y ahora contradice los Principios
    IV y V de esta versión. Requiere re-planificación (no se modifica código desde este
    comando; ver Next Actions en la respuesta al usuario).
-->

# Turnos (Barbería) Constitution

## Core Principles

### I. Test-First (NON-NEGOTIABLE)
Ninguna función de negocio se escribe sin su test primero. El ciclo Red-Green-Refactor es
obligatorio: se escribe el test, se lo ve fallar, y solo entonces se implementa el código
mínimo para que pase. Esto aplica a toda lógica de negocio (reservas, cancelaciones,
disponibilidad, solapamientos); no aplica a configuración trivial (wiring de rutas, tipos,
constantes) que no tenga comportamiento propio.
**Rationale**: en un dominio con reglas temporales y de exclusión mutua (turnos solapados,
cancelaciones), los errores silenciosos son costosos y difíciles de detectar manualmente;
el test-first fuerza a especificar el comportamiento correcto antes de que exista la
implementación que lo pueda sesgar.

### II. Dominio Puro
Toda regla de negocio (detección de solapamientos, validación de cancelaciones, cálculo de
disponibilidad, y cualquier otra invariante del dominio) vive en un módulo de dominio puro,
sin importar ni depender de Express ni de acceso directo a SQL/Postgres. El módulo de dominio
no conoce request/response, routing, middlewares, ni el driver de base de datos; se testea sin
levantar servidor HTTP y sin conectarse a una base de datos real (usando dobles/fixtures según
corresponda).
**Rationale**: separar el dominio del framework HTTP y del acceso a datos permite testear las
reglas de negocio de forma aislada y rápida (alineado con el Principio I), y evita que
decisiones de infraestructura (Express, Postgres) se filtren hacia la lógica que define qué es
un turno válido.

### III. Tiempo en UTC
Todo instante se guarda, se compara y se calcula en UTC, tanto en el dominio como en la base de
datos. La timezone (por ejemplo, la del barbero o el cliente) es exclusivamente una
responsabilidad de la capa de presentación (API responses, UI, mensajes) y nunca de la lógica
de negocio ni del esquema de datos. Está prohibido comparar horarios mediante comparación de
strings de fecha/hora; toda comparación temporal se hace sobre valores de tiempo (instantes),
nunca sobre su representación textual.
**Rationale**: mezclar timezones o comparar strings dentro de la lógica de negocio es una
fuente clásica de bugs de solapamiento y de "off-by-one-hour"; fijar UTC como única fuente de
verdad interna y prohibir comparaciones por string elimina esa clase de errores y hace que las
comparaciones de horarios sean determinísticas.

### IV. La Base de Datos es la Verdad
Las reglas que protegen la integridad de los datos (por ejemplo, que no existan dos turnos
activos sobre el mismo slot) se garantizan mediante constraints en Postgres (constraints
`UNIQUE`, `EXCLUDE`, `CHECK`, claves foráneas, etc.), no únicamente mediante validación en
JavaScript. La validación en el dominio (Principio II) es la primera línea de defensa para dar
buenos mensajes de error (Principio VII), pero nunca la única: si la validación de aplicación
falla o es esquivada (bug, condición de carrera, acceso concurrente), la base de datos debe
seguir impidiendo el estado inválido.
**Rationale**: la validación en memoria de una única instancia de proceso no protege contra
condiciones de carrera reales ni contra múltiples procesos/conexiones; delegar la integridad
crítica a constraints de Postgres asegura que la garantía de negocio ("un turno, una reserva
activa") se cumpla siempre, independientemente de bugs en la capa de aplicación.

### V. SQL Plano
No se usa ORM. El acceso a datos se hace con SQL explícito. Los cambios de esquema se expresan
como archivos de migración `.sql` numerados secuencialmente, aplicados siempre en orden, y
registrados (en una tabla de control de migraciones) para que cada migración se aplique una
única vez.
**Rationale**: un ORM agrega una capa de abstracción e indirección sobre el SQL que dificulta
razonar sobre los constraints exactos que protegen la integridad (Principio IV); SQL plano y
migraciones numeradas mantienen el esquema explícito, auditable y reproducible entre entornos.

### VI. Sin Dependencias Nuevas sin Justificación
Antes de agregar una dependencia nueva (librería, framework, herramienta), se debe escribir en
el plan la justificación: qué problema resuelve, por qué no se puede resolver con lo que ya
está en el proyecto o con código propio simple, y qué costo de mantenimiento introduce. Sin esa
justificación, la dependencia no se agrega.
**Rationale**: cada dependencia nueva es superficie de riesgo (seguridad, mantenimiento,
tamaño) y puede tentar a mover lógica de negocio fuera del dominio puro (Principio II) o a
introducir un ORM pese al Principio V; exigir justificación escrita obliga a una decisión
consciente en lugar de una adición reflexiva.

### VII. Errores Útiles
Toda respuesta de error indica qué pasó y cómo corregirlo. Está prohibido devolver un mensaje
genérico (por ejemplo "error de validación") para un problema de validación específico: el
mensaje debe nombrar el campo o la regla involucrada y, cuando sea posible, sugerir la
corrección esperada.
**Rationale**: en un sistema con reglas temporales y de disponibilidad no triviales (horarios,
solapamientos, cancelaciones fuera de término), un mensaje de error genérico obliga al usuario
o al cliente de la API a adivinar qué salió mal; un error específico y accionable reduce
soporte y errores de integración.

## Additional Constraints

- El stack HTTP (por ejemplo Express) es una capa de adaptación, no el lugar donde vive la
  lógica de negocio (ver Principio II).
- Postgres es la única base de datos soportada; no se introducen bases de datos adicionales
  "temporales" ni almacenamiento en memoria como fuente de verdad para datos que requieren la
  garantía de integridad del Principio IV.
- Toda fecha/hora que cruce el límite dominio → presentación debe convertirse explícitamente
  (UTC → timezone local), nunca implícitamente vía comportamiento por defecto del entorno de
  ejecución (Principio III).
- Las migraciones `.sql` son append-only: una vez aplicada y registrada, una migración no se
  edita retroactivamente; los cambios posteriores se expresan como una migración nueva
  (Principio V).

## Development Workflow

- Todo PR o cambio que agregue o modifique lógica de negocio debe incluir el test
  correspondiente, agregado antes que el código de producción (Principio I).
- Las revisiones de código deben verificar que no se filtre lógica de negocio hacia la capa
  Express ni hacia SQL directo (Principio II), y que no se introduzcan manejos de tiempo fuera
  de UTC o comparaciones por string de fecha dentro del dominio (Principio III).
- Todo PR que introduzca o modifique una regla de integridad de datos debe incluir el
  constraint de Postgres correspondiente (Principio IV) y, si aplica, la migración `.sql`
  numerada que lo agrega (Principio V).
- Cualquier dependencia nueva propuesta en un PR debe señalar el plan donde fue justificada
  (Principio VI); si no existe esa justificación, el PR debe actualizarse antes de mergear.
- Las revisiones deben verificar que los mensajes de error nuevos o modificados cumplan el
  Principio VII (accionables, no genéricos) antes de aprobar el PR.

## Governance

Esta constitución prevalece sobre cualquier otra práctica o convención informal del proyecto.
Las enmiendas requieren: (1) documentar el cambio propuesto y su razón, (2) actualizar este
archivo con el nuevo número de versión según semver (MAJOR: cambios incompatibles o
eliminación/redefinición de principios; MINOR: nuevo principio o expansión material de una
sección; PATCH: aclaraciones o correcciones de redacción sin cambio de sentido), y (3)
verificar que los templates dependientes (plan, spec, tasks) sigan siendo consistentes con los
principios vigentes. Toda complejidad agregada (nueva dependencia, nueva capa, excepción a un
principio) debe justificarse explícitamente por escrito en el plan correspondiente; si no puede
justificarse, se simplifica en su lugar.

**Version**: 2.0.0 | **Ratified**: 2026-08-13 | **Last Amended**: 2026-08-17
