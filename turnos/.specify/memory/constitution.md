<!--
Sync Impact Report
- Version change: (template) → 1.0.0
- Modified principles: n/a (initial ratification)
- Added sections:
  - I. Test-First (NON-NEGOTIABLE)
  - II. UTC Internamente, Timezone Solo en Presentación
  - III. Sin Base de Datos (Estado en Memoria)
  - IV. Dominio Puro para Reglas de Negocio
  - V. Sin Dependencias Nuevas sin Justificación
  - Additional Constraints (stack y alcance)
  - Development Workflow (calidad y revisión)
  - Governance
- Removed sections: none (first concrete draft from template)
- Templates requiring updates:
  - .specify/templates/plan-template.md ⚠ pending manual check (Constitution Check gate should
    reference these 5 principles explicitly)
  - .specify/templates/spec-template.md ⚠ pending manual check (no direct principle references
    found; no changes required unless a future amendment adds testable gates there)
  - .specify/templates/tasks-template.md ⚠ pending manual check (task ordering should already
    imply tests-before-implementation; verify against Principle I)
- Follow-up TODOs: none
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

### II. UTC Internamente, Timezone Solo en Presentación
Todo tiempo se almacena, se compara y se calcula en UTC dentro del dominio y la capa de
datos en memoria. La conversión a timezone local (por ejemplo, la del barbero o el cliente)
ocurre únicamente en la capa de presentación (API responses, UI, mensajes), nunca dentro de
la lógica de negocio.
**Rationale**: mezclar timezones dentro de la lógica de negocio es una fuente clásica de bugs
de solapamiento y de "off-by-one-hour"; fijar UTC como única fuente de verdad interna elimina
esa clase de errores y hace que las comparaciones de horarios sean determinísticas.

### III. Sin Base de Datos (Estado en Memoria)
El sistema no depende de una base de datos externa. Todo el estado (turnos, barberos,
clientes, disponibilidad) vive en estructuras en memoria del proceso. El proyecto debe poder
clonarse y ejecutarse sin levantar infraestructura adicional (sin Docker, sin servicios
externos, sin migraciones).
**Rationale**: mantener el proyecto ejecutable sin infraestructura reduce la fricción para
desarrollo, pruebas y demostraciones, y evita que la complejidad de persistencia contamine el
diseño del dominio en esta etapa del proyecto.

### IV. Dominio Puro para Reglas de Negocio
Toda regla de negocio (detección de solapamientos, validación de cancelaciones, cálculo de
disponibilidad, y cualquier otra invariante del dominio) vive en un módulo de dominio puro,
sin importar ni depender de Express (ni de ningún framework HTTP). El módulo de dominio no
conoce request/response, routing, ni middlewares; se comunica mediante funciones y tipos
propios que la capa HTTP invoca.
**Rationale**: separar el dominio del framework permite testear las reglas de negocio de forma
aislada y rápida (alineado con el Principio I), y evita que decisiones de la capa web
(Express) se filtren hacia la lógica que define qué es un turno válido.

### V. Ninguna Dependencia Nueva sin Justificación Escrita en el Plan
Antes de agregar una dependencia nueva (librería, framework, herramienta), se debe escribir en
el plan la justificación: qué problema resuelve, por qué no se puede resolver con lo que ya
está en el proyecto o con código propio simple, y qué costo de mantenimiento introduce. Sin
esa justificación, la dependencia no se agrega.
**Rationale**: cada dependencia nueva es superficie de riesgo (seguridad, mantenimiento,
tamaño) y puede tentar a mover lógica de negocio fuera del dominio puro (Principio IV); exigir
justificación escrita obliga a una decisión consciente en lugar de una adición reflexiva.

## Additional Constraints

- El stack HTTP (por ejemplo Express) es una capa de adaptación, no el lugar donde vive la
  lógica de negocio (ver Principio IV).
- La persistencia en memoria puede perderse al reiniciar el proceso; esto es aceptado como
  consecuencia directa del Principio III y no debe compensarse agregando una base de datos
  "temporal" o un mecanismo de serialización a disco sin pasar por el Principio V.
- Toda fecha/hora que cruce el límite dominio → presentación debe convertirse explícitamente
  (UTC → timezone local), nunca implícitamente vía comportamiento por defecto del entorno de
  ejecución.

## Development Workflow

- Todo PR o cambio que agregue o modifique lógica de negocio debe incluir el test
  correspondiente, agregado antes que el código de producción (Principio I).
- Las revisiones de código deben verificar que no se filtre lógica de negocio hacia la capa
  Express (Principio IV) y que no se introduzcan manejos de tiempo fuera de UTC dentro del
  dominio (Principio II).
- Cualquier dependencia nueva propuesta en un PR debe señalar el plan donde fue justificada
  (Principio V); si no existe esa justificación, el PR debe actualizarse antes de mergear.

## Governance

Esta constitución prevalece sobre cualquier otra práctica o convención informal del proyecto.
Las enmiendas requieren: (1) documentar el cambio propuesto y su razón, (2) actualizar este
archivo con el nuevo número de versión según semver (MAJOR: cambios incompatibles o
eliminación/redefinición de principios; MINOR: nuevo principio o expansión material de una
sección; PATCH: aclaraciones o correcciones de redacción sin cambio de sentido), y (3)
verificar que los templates dependientes (plan, spec, tasks) sigan siendo consistentes con los
principios vigentes. Toda complejidad agregada (nueva dependencia, nueva capa, excepción a un
principio) debe justificarse explícitamente por escrito en el plan correspondiente; si no
puede justificarse, se simplifica en su lugar.

**Version**: 1.0.0 | **Ratified**: 2026-08-13 | **Last Amended**: 2026-08-13
