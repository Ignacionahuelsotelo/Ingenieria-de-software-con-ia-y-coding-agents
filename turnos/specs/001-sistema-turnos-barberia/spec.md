# Feature Specification: Sistema de Turnos para Barbería

**Feature Branch**: `001-sistema-turnos-barberia`

**Created**: 2026-08-13

**Status**: Draft

**Input**: User description: "Un sistema de turnos para una barbería. El dueño configura sus horarios de atención y la duración de los turnos. Los clientes reservan un turno disponible, ven los suyos, y pueden cancelarlos."

## Clarifications

### Session 2026-08-13

- Q: ¿Cómo debe identificarse un cliente al consultar o cancelar sus turnos — alcanza con el mismo email/teléfono usado al reservar, o el sistema debe generar además un código de confirmación/token propio de esa reserva? → A: Solo con el dato de contacto (email/teléfono) usado al reservar, sin código de confirmación adicional.
- Q: ¿El dueño necesita alguna forma de ver o gestionar las reservas de los clientes, o su rol se limita a configurar horarios y duración de turno? → A: El dueño puede ver la lista de todos los turnos reservados (solo lectura), pero no puede cancelarlos en nombre del cliente.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - El dueño configura horarios y duración de turnos (Priority: P1)

El dueño de la barbería define los días y horarios en los que atiende (por ejemplo, de lunes a
viernes de 9 a 18hs) y la duración estándar de cada turno (por ejemplo, 30 minutos). Esta
configuración determina qué turnos estarán disponibles para que los clientes reserven.

**Why this priority**: Sin horarios configurados no existe ningún turno disponible para
reservar; es el prerrequisito de todo el resto del sistema.

**Independent Test**: Puede probarse configurando un horario de atención y una duración de
turno, y verificando que el sistema genera correctamente la grilla de turnos disponibles
resultante, sin necesidad de que exista todavía ninguna reserva.

**Acceptance Scenarios**:

1. **Given** que el dueño no configuró ningún horario, **When** configura un horario de
   atención (días y franjas horarias) y una duración de turno, **Then** el sistema calcula y
   expone los turnos disponibles correspondientes a esa configuración.
2. **Given** que el dueño ya tiene un horario configurado, **When** lo modifica (cambia
   franjas horarias o duración de turno), **Then** los turnos futuros aún no reservados se
   recalculan según la nueva configuración, y los turnos futuros ya reservados por clientes se
   mantienen sin cambios.
3. **Given** que el dueño intenta configurar un horario inválido (por ejemplo, hora de fin
   anterior a la hora de inicio, o duración de turno menor o igual a cero), **When** intenta
   guardar la configuración, **Then** el sistema rechaza la configuración y muestra un error
   claro.

---

### User Story 2 - El cliente reserva un turno disponible (Priority: P1)

Un cliente consulta los turnos disponibles según el horario configurado por el dueño y
reserva uno de ellos, dejando sus datos de contacto para poder identificar su reserva más
adelante.

**Why this priority**: Es la funcionalidad central del sistema: sin reservas, el sistema no
cumple su propósito de negocio.

**Independent Test**: Puede probarse, con un horario ya configurado, listando los turnos
disponibles y reservando uno; se verifica que ese turno deja de estar disponible para otros
clientes y queda asociado a los datos del cliente que lo reservó.

**Acceptance Scenarios**:

1. **Given** que existen turnos disponibles, **When** el cliente selecciona uno y confirma la
   reserva con sus datos de contacto, **Then** el turno queda reservado a su nombre y deja de
   aparecer como disponible para otros clientes.
2. **Given** que dos clientes intentan reservar el mismo turno casi simultáneamente, **When**
   ambos confirman, **Then** solo uno de los dos obtiene la reserva y el otro recibe un error
   indicando que el turno ya no está disponible.
3. **Given** que un cliente intenta reservar un turno fuera del horario de atención
   configurado, o un turno que ya pasó, **When** intenta confirmar la reserva, **Then** el
   sistema rechaza la reserva con un error claro.

---

### User Story 3 - El cliente ve sus turnos reservados (Priority: P2)

Un cliente consulta la lista de turnos que tiene reservados.

**Why this priority**: Necesario para que el cliente pueda gestionar sus reservas (incluida la
cancelación), pero depende de que ya existan reservas (User Story 2).

**Independent Test**: Puede probarse reservando uno o más turnos con los datos de un cliente y
verificando que al consultar "mis turnos" con esos mismos datos aparecen exactamente esos
turnos y ningún turno de otro cliente.

**Acceptance Scenarios**:

1. **Given** que un cliente tiene turnos reservados, **When** consulta sus turnos, **Then** ve
   la lista completa de sus turnos (pasados y futuros) con fecha, hora y estado.
2. **Given** que un cliente no tiene turnos reservados, **When** consulta sus turnos, **Then**
   ve una lista vacía con un mensaje claro, no un error.

---

### User Story 4 - El cliente cancela un turno (Priority: P2)

Un cliente cancela uno de sus turnos reservados, liberándolo para que otros clientes puedan
reservarlo.

**Why this priority**: Completa el ciclo de vida de la reserva y libera turnos, pero depende de
que existan turnos reservados (User Story 2) y de poder identificarlos (User Story 3).

**Independent Test**: Puede probarse reservando un turno y luego cancelándolo; se verifica que
el turno cambia de estado y vuelve a aparecer como disponible para otros clientes.

**Acceptance Scenarios**:

1. **Given** que un cliente tiene un turno futuro reservado, **When** lo cancela, **Then** el
   turno pasa a estado "cancelado", deja de aparecer en la lista de turnos activos del cliente,
   y vuelve a estar disponible para que otro cliente lo reserve.
2. **Given** que un cliente intenta cancelar un turno que ya pasó, **When** solicita la
   cancelación, **Then** el sistema rechaza la operación indicando que no se pueden cancelar
   turnos pasados.
3. **Given** que un cliente intenta cancelar un turno que no le pertenece, **When** solicita la
   cancelación, **Then** el sistema rechaza la operación.

---

### User Story 5 - El dueño ve todos los turnos reservados (Priority: P3)

El dueño consulta la lista completa de turnos reservados por los clientes (con fecha, hora y
datos de contacto del cliente) para poder organizar su día de trabajo.

**Why this priority**: Es una capacidad de solo lectura que facilita operar el negocio, pero el
sistema es funcionalmente completo para clientes sin ella; se prioriza después de las
capacidades de reserva y cancelación (User Stories 1-4).

**Independent Test**: Puede probarse reservando turnos con distintos clientes y verificando
que el dueño, al consultar la lista de turnos reservados, ve todas esas reservas con sus datos
correctos, incluidas las de todos los clientes (no solo uno).

**Acceptance Scenarios**:

1. **Given** que existen turnos reservados por distintos clientes, **When** el dueño consulta
   la lista de turnos, **Then** ve todos los turnos reservados (pasados y futuros) con fecha,
   hora y datos de contacto del cliente correspondiente.
2. **Given** que no hay ningún turno reservado, **When** el dueño consulta la lista, **Then**
   ve una lista vacía con un mensaje claro, no un error.

---

### Edge Cases

- ¿Qué sucede si el dueño reduce el horario de atención y quedan turnos ya reservados fuera del
  nuevo horario? El sistema conserva esos turnos ya reservados sin cancelarlos automáticamente.
- ¿Qué sucede si el dueño cambia la duración de los turnos mientras existen turnos futuros ya
  reservados con la duración anterior? Los turnos ya reservados conservan su duración original;
  solo los turnos aún no generados/reservados usan la nueva duración.
- ¿Qué pasa si un cliente intenta reservar dos turnos que se solapan en el tiempo? El sistema
  no lo impide explícitamente en el alcance de esta funcionalidad (no hay límite de turnos
  simultáneos por cliente), pero un mismo turno no puede tener más de una reserva activa.
- ¿Cómo se comporta el sistema ante un turno cuyo horario ya pasó pero nunca fue reservado?
  Deja de listarse como disponible automáticamente al pasar su horario de inicio.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE permitir al dueño definir uno o más rangos de horario de
  atención por día de la semana (día, hora de inicio, hora de fin).
- **FR-002**: El sistema DEBE permitir al dueño definir la duración estándar de cada turno (en
  minutos), aplicable a los turnos generados a partir del horario de atención.
- **FR-003**: El sistema DEBE validar que la configuración de horarios sea coherente
  (hora de fin posterior a hora de inicio, duración de turno mayor a cero) y rechazar
  configuraciones inválidas con un mensaje de error claro.
- **FR-004**: El sistema DEBE calcular automáticamente la grilla de turnos disponibles a partir
  del horario de atención y la duración configurada, sin que el dueño tenga que crear cada
  turno manualmente.
- **FR-005**: El sistema DEBE permitir a los clientes consultar los turnos disponibles (no
  reservados, no cancelados, con horario futuro).
- **FR-006**: El sistema DEBE permitir a un cliente reservar un turno disponible, capturando
  los datos de contacto del cliente (nombre y un identificador de contacto) necesarios para
  luego identificar y gestionar esa reserva.
- **FR-007**: El sistema DEBE impedir que dos reservas activas ocupen el mismo turno
  (exclusión mutua): si dos solicitudes concurrentes intentan reservar el mismo turno, solo una
  debe tener éxito.
- **FR-008**: El sistema DEBE impedir reservar turnos fuera del horario de atención vigente o
  con horario de inicio en el pasado.
- **FR-009**: El sistema DEBE permitir a un cliente consultar la lista de turnos asociados a su
  identificador de contacto, incluyendo su estado (reservado, cancelado).
- **FR-010**: El sistema DEBE permitir a un cliente cancelar un turno propio que aún no haya
  comenzado, liberándolo para que vuelva a estar disponible.
- **FR-011**: El sistema DEBE impedir cancelar turnos que ya comenzaron o finalizaron, y
  turnos que no pertenecen al cliente que solicita la cancelación.
- **FR-012**: El sistema DEBE identificar a un cliente ante consultas de "mis turnos" y
  cancelaciones únicamente mediante el mismo identificador de contacto (por ejemplo, email o
  teléfono) que proveyó al reservar, sin requerir una cuenta de usuario, contraseña, ni código
  de confirmación adicional.
- **FR-013**: El sistema DEBE soportar un único barbero/prestador por barbería en esta versión
  (un solo horario de atención y una sola grilla de turnos compartida por todos los clientes).
- **FR-014**: El sistema DEBE permitir al dueño consultar la lista completa de turnos
  reservados por todos los clientes (fecha, hora, y datos de contacto del cliente), en modo
  solo lectura; el dueño no puede cancelar reservas en nombre de un cliente en esta versión.

### Key Entities

- **Horario de Atención (Schedule)**: Configuración del dueño que define, por día de la
  semana, las franjas horarias en las que la barbería atiende, y la duración estándar de cada
  turno derivado de esas franjas.
- **Turno (Appointment Slot)**: Un bloque de tiempo concreto (fecha, hora de inicio, hora de
  fin) generado a partir del Horario de Atención vigente. Tiene un estado: disponible,
  reservado o cancelado.
- **Reserva (Booking)**: La asociación entre un Turno y un Cliente, con los datos de contacto
  del cliente y la fecha en que se realizó la reserva.
- **Cliente (Customer)**: Persona identificada por nombre y un dato de contacto (email o
  teléfono), sin cuenta de usuario, que reserva y cancela turnos.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un cliente puede encontrar y reservar un turno disponible en menos de 1 minuto
  desde que consulta la disponibilidad.
- **SC-002**: El sistema nunca permite que un mismo turno quede asociado a más de una reserva
  activa simultáneamente, incluso bajo solicitudes concurrentes.
- **SC-003**: El 100% de los turnos generados respetan el horario de atención y la duración de
  turno configurados por el dueño en el momento en que el turno fue generado.
- **SC-004**: Un cliente puede ver la lista completa y correcta de sus propios turnos (y
  ningún turno ajeno) en una sola consulta, usando únicamente su dato de contacto.
- **SC-005**: Un cliente puede cancelar un turno propio futuro en menos de 30 segundos, y el
  turno queda disponible para otros clientes inmediatamente después.
- **SC-006**: El dueño puede ver, en una sola consulta, el 100% de los turnos reservados por
  todos los clientes, sin necesidad de identificar previamente a cada cliente.

## Assumptions

- Esta primera versión soporta un único barbero/prestador por barbería (un solo horario de
  atención compartido), no múltiples barberos con agendas independientes.
- No existe sistema de cuentas de usuario ni autenticación con contraseña; el cliente se
  identifica ante el sistema mediante el dato de contacto (email o teléfono) que ingresó al
  reservar.
- No hay límite en la cantidad de turnos simultáneos que un mismo cliente puede reservar.
- Los turnos se pueden cancelar en cualquier momento antes de que comiencen, sin una
  anticipación mínima obligatoria (sin política de "no-show" ni penalización en esta versión).
- El listado de turnos disponibles excluye automáticamente los turnos cuyo horario de inicio
  ya pasó, sin necesidad de una acción manual del dueño.
- No hay notificaciones (email/SMS) de confirmación o recordatorio en esta versión; la
  confirmación es la respuesta inmediata al reservar/cancelar.
