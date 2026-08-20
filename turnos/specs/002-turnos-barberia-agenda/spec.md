# Feature Specification: Turnos de Barbería con Código de Reserva y Agenda del Dueño

**Feature Branch**: `002-turnos-barberia-agenda`

**Created**: 2026-08-17

**Status**: Draft

**Input**: User description: "Sistema de turnos para una barbería. El dueño configura sus horarios de atención por día de la semana y la duración de los turnos. Puede bloquear franjas puntuales (vacaciones, un día que cierra antes). El cliente entra, ve los horarios disponibles de los próximos días, reserva uno dejando su nombre y teléfono, y recibe un código de reserva. Con ese código puede ver su turno y cancelarlo. El dueño tiene una vista de agenda donde ve todos los turnos del día, puede marcar uno como cumplido o ausente, y puede cancelar turnos. No hay login ni usuarios registrados: el cliente se identifica con su código de reserva, y el dueño con una clave simple configurada por variable de entorno."

## Clarifications

### Session 2026-08-17

- Q: ¿Cuántos días hacia adelante deben verse/reservarse como "próximos días" disponibles para
  el cliente? → A: 14 días.
- Q: Cuando el dueño crea un bloqueo puntual que se superpone con turnos ya reservados, ¿qué
  pasa con esas reservas existentes? → A: Se cancelan automáticamente al crear el bloqueo.
- Q: ¿Hasta cuándo puede un cliente cancelar su propio turno usando su código? → A: Con una
  antelación mínima de 2 horas antes del inicio del turno; dentro de esa ventana el cliente ya
  no puede autocancelar (el dueño sí puede cancelarlo desde la agenda en cualquier momento).
- Q: ¿Qué timezone debe usar el sistema para determinar los días calendario, la ventana de
  "próximos 14 días" y el corte de cancelación de 2 horas? → A: La timezone local del servidor
  donde corre el sistema, sin configuración explícita adicional.
- Q: ¿Qué formato debe tener el código de reserva? → A: Código alfanumérico de 8 caracteres
  (mayúsculas + dígitos, alfabeto sin caracteres ambiguos como O/0 o I/1).
- Q: ¿Debe el sistema aplicar rate limiting a los intentos repetidos de consulta/cancelación por
  código de reserva? → A: Sí, aplicar rate limiting básico (por ejemplo, por IP) sobre los
  intentos de consulta/cancelación por código.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - El dueño configura horarios y bloquea franjas (Priority: P1)

El dueño define, para cada día de la semana, el horario de atención (por ejemplo, lunes a
viernes de 9 a 18hs, sábados de 9 a 13hs) y la duración estándar de cada turno (por ejemplo, 30
minutos). Además puede bloquear franjas puntuales dentro de ese horario habitual — un rango de
vacaciones de varios días, o un cierre anticipado un día específico — para que esos horarios
dejen de estar disponibles para reserva sin tener que rehacer la configuración semanal completa.

**Why this priority**: Sin horario configurado no hay ningún turno disponible para reservar; es
el prerrequisito de todo el resto del sistema. Los bloqueos puntuales son la forma en que el
dueño maneja excepciones sin destruir su configuración base.

**Independent Test**: Puede probarse configurando un horario semanal y una duración de turno, y
verificando que el sistema genera la grilla de turnos disponibles correspondiente; luego
agregando un bloqueo puntual y verificando que los turnos dentro de esa franja dejan de
ofrecerse, sin necesidad de que exista todavía ninguna reserva de cliente.

**Acceptance Scenarios**:

1. **Given** que el dueño no configuró ningún horario, **When** configura un horario de
   atención por día de la semana y una duración de turno, **Then** el sistema calcula y expone
   los turnos disponibles correspondientes a esa configuración para los próximos días.
2. **Given** que el dueño ya tiene un horario configurado, **When** lo modifica (cambia franjas
   horarias de un día o la duración de turno), **Then** los turnos futuros aún no reservados se
   recalculan según la nueva configuración.
3. **Given** que el dueño intenta configurar un horario inválido (por ejemplo, hora de fin
   anterior a la hora de inicio, o duración de turno menor o igual a cero), **When** intenta
   guardar la configuración, **Then** el sistema rechaza la configuración y muestra un error
   claro indicando qué corregir.
4. **Given** un horario semanal ya configurado, **When** el dueño define un bloqueo puntual
   (rango de fechas/horas, por ejemplo unas vacaciones o un cierre anticipado), **Then** los
   turnos dentro de esa franja dejan de aparecer como disponibles para los clientes.
5. **Given** que el dueño intenta bloquear una franja con formato inválido (por ejemplo, fin
   anterior a inicio), **When** intenta guardarla, **Then** el sistema rechaza el bloqueo y
   muestra un error claro.

---

### User Story 2 - El cliente reserva un turno y recibe un código (Priority: P1)

Un cliente, sin necesidad de crear una cuenta, entra al sistema, ve los turnos disponibles de
los próximos días según el horario configurado por el dueño, elige uno, deja su nombre y
teléfono de contacto, y confirma la reserva. El sistema le entrega un código de reserva único
que el cliente debe guardar para consultar o cancelar su turno más adelante.

**Why this priority**: Es la función central del negocio: permitir que un cliente reserve un
turno sin intervención del dueño. Sin esto, el sistema no cumple su propósito principal.

**Independent Test**: Puede probarse de punta a punta con un horario ya configurado: un cliente
ve la disponibilidad, reserva un turno con nombre y teléfono, y recibe un código de reserva que
identifica unívocamente esa reserva.

**Acceptance Scenarios**:

1. **Given** que existen turnos disponibles, **When** el cliente entra al sistema, **Then** ve
   los horarios disponibles de los próximos días, agrupados de forma que pueda elegir fácilmente
   un día y una hora.
2. **Given** que el cliente eligió un turno disponible, **When** completa su nombre y teléfono y
   confirma la reserva, **Then** el sistema crea la reserva, la marca como no disponible para
   otros clientes, y le muestra al cliente un código de reserva único.
3. **Given** que dos clientes intentan reservar el mismo turno casi al mismo tiempo, **When** el
   segundo confirma después de que el primero ya reservó ese turno, **Then** el sistema rechaza
   la segunda reserva indicando que el turno ya no está disponible y le ofrece elegir otro.
4. **Given** que el cliente intenta reservar sin completar nombre o teléfono, **When** intenta
   confirmar, **Then** el sistema rechaza la reserva y muestra un error claro indicando el campo
   faltante.
5. **Given** que el cliente intenta reservar un turno que ya pasó o que fue bloqueado por el
   dueño, **When** intenta confirmar, **Then** el sistema rechaza la reserva indicando que ese
   turno ya no está disponible.

---

### User Story 3 - El cliente consulta y cancela su turno con el código (Priority: P2)

Con el código de reserva recibido, el cliente puede volver al sistema en cualquier momento,
ingresar el código, ver los detalles de su turno (día, hora, estado) y, si lo desea, cancelarlo.

**Why this priority**: Da autonomía al cliente para liberar el turno si no puede asistir, sin
necesitar login ni contactar al dueño, y libera el horario para que otro cliente lo reserve.

**Independent Test**: Puede probarse reservando un turno, tomando el código recibido,
consultándolo de vuelta en el sistema, y cancelándolo; luego verificando que ese turno vuelve a
aparecer como disponible.

**Acceptance Scenarios**:

1. **Given** un código de reserva válido, **When** el cliente lo ingresa, **Then** el sistema
   muestra el día, la hora y el estado del turno asociado.
2. **Given** un código de reserva inexistente o mal escrito, **When** el cliente lo ingresa,
   **Then** el sistema muestra un mensaje claro indicando que el código no es válido, sin revelar
   información de otras reservas.
3. **Given** un turno activo consultado con su código, cuya hora de inicio está a más de 2 horas
   de distancia, **When** el cliente confirma la cancelación, **Then** el sistema marca el turno
   como cancelado, libera el horario para nuevas reservas, y el código deja de mostrar la opción
   de cancelar nuevamente.
4. **Given** un turno que ya fue marcado como cumplido, ausente, o ya fue cancelado
   previamente, **When** el cliente intenta cancelarlo con su código, **Then** el sistema
   rechaza la operación indicando el estado actual del turno.
5. **Given** un turno activo cuya hora de inicio está a menos de 2 horas de distancia, **When**
   el cliente intenta cancelarlo con su código, **Then** el sistema rechaza la cancelación
   indicando que ya no está dentro del plazo permitido, y sugiere contactar al dueño
   directamente.

---

### User Story 4 - El dueño gestiona la agenda del día (Priority: P2)

El dueño, autenticado con su clave, accede a una vista de agenda que lista todos los turnos de
un día (nombre y teléfono del cliente, hora, estado). Desde ahí puede marcar un turno como
cumplido (el cliente vino) o ausente (el cliente no vino), y puede cancelar turnos.

**Why this priority**: Le da al dueño control operativo del día a día: saber quién viene, llevar
registro de asistencia, y liberar turnos si un cliente cancela por otra vía (llamada,
WhatsApp) sin usar su código.

**Independent Test**: Puede probarse con turnos ya reservados: el dueño se autentica, ve la
agenda de un día con esos turnos, marca uno como cumplido, otro como ausente, y cancela un
tercero, verificando que cada cambio de estado se refleja correctamente.

**Acceptance Scenarios**:

1. **Given** que el dueño se autentica con la clave correcta, **When** accede a la vista de
   agenda de un día, **Then** ve todos los turnos de ese día con nombre, teléfono, hora y estado.
2. **Given** que el dueño se autentica con una clave incorrecta, **When** intenta acceder a la
   agenda, **Then** el sistema rechaza el acceso y no muestra ningún dato de turnos.
3. **Given** un turno activo en la agenda del día, **When** el dueño lo marca como cumplido,
   **Then** el turno pasa a estado "cumplido" y queda registrado como tal.
4. **Given** un turno activo en la agenda del día, **When** el dueño lo marca como ausente,
   **Then** el turno pasa a estado "ausente" y queda registrado como tal.
5. **Given** un turno activo en la agenda del día, **When** el dueño lo cancela, **Then** el
   turno pasa a estado "cancelado" y el horario vuelve a estar disponible para nuevas reservas.
6. **Given** un turno ya cumplido, ausente o cancelado, **When** el dueño intenta cambiarlo a
   otro estado, **Then** el sistema indica claramente el estado actual y qué transiciones son
   válidas desde ahí.

---

### Edge Cases

- ¿Qué pasa si el dueño reduce o elimina el horario de un día que ya tiene turnos reservados
  dentro de la franja eliminada? Esos turnos ya reservados se mantienen sin cambios (ver
  Assumptions); a diferencia de un bloqueo puntual, reducir el horario semanal no cancela
  reservas existentes automáticamente.
- ¿Qué pasa si el dueño bloquea una franja puntual que ya tiene turnos reservados dentro? Esas
  reservas se cancelan automáticamente al crear el bloqueo (ver Clarifications).
- ¿Qué pasa si un cliente reserva un turno para el mismo día, muy cerca de la hora actual (por
  ejemplo, en 10 minutos)? El sistema debe seguir aceptando la reserva si el turno todavía no
  comenzó.
- ¿Qué pasa si el cliente pierde su código de reserva? No hay mecanismo de recuperación
  automático (ver Assumptions); el dueño puede identificar el turno manualmente desde la agenda
  por nombre/teléfono.
- ¿Qué pasa con turnos de días pasados en la agenda del dueño? Deben seguir siendo visibles
  (por ejemplo, para revisar cuántos clientes vinieron), no desaparecer.
- ¿Qué pasa si se intenta reservar un turno que cae exactamente en un límite entre dos bloqueos,
  o parcialmente dentro de una franja bloqueada? El turno completo debe considerarse bloqueado
  si se superpone parcialmente con la franja bloqueada.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST permitir al dueño configurar, para cada día de la semana, si
  atiende y en qué franja horaria (hora de inicio y hora de fin).
- **FR-002**: El sistema MUST permitir al dueño configurar la duración estándar de cada turno,
  aplicada a todos los días de atención.
- **FR-003**: El sistema MUST rechazar configuraciones de horario inválidas (hora de fin anterior
  o igual a hora de inicio, duración de turno menor o igual a cero) con un mensaje que indique
  el campo y la corrección esperada.
- **FR-004**: El sistema MUST permitir al dueño crear bloqueos puntuales de franjas horarias
  (con fecha/hora de inicio y fin) que anulan la disponibilidad de turnos dentro de esa franja,
  sin alterar la configuración semanal base.
- **FR-005**: El sistema MUST permitir al dueño eliminar un bloqueo puntual, restaurando la
  disponibilidad de los turnos correspondientes (excepto los que ya estén reservados,
  cumplidos, ausentes o cancelados por otro motivo).
- **FR-006**: El sistema MUST calcular y mostrar a los clientes los turnos disponibles de los
  próximos días, a partir del horario semanal, la duración de turno configurada, los bloqueos
  puntuales activos, y las reservas ya existentes.
- **FR-007**: El sistema MUST permitir a cualquier cliente, sin autenticarse, reservar un turno
  disponible proporcionando nombre y teléfono de contacto.
- **FR-008**: El sistema MUST rechazar una reserva si falta el nombre o el teléfono, indicando
  el campo faltante.
- **FR-009**: El sistema MUST garantizar que un turno solo pueda tener una reserva activa a la
  vez, incluso ante intentos de reserva simultáneos sobre el mismo turno.
- **FR-010**: El sistema MUST generar, al confirmar una reserva, un código de reserva único que
  se muestra al cliente y que sirve como único medio de identificación para consultar o cancelar
  esa reserva.
- **FR-011**: El sistema MUST permitir a cualquier persona con un código de reserva válido
  consultar el día, la hora y el estado del turno asociado a ese código.
- **FR-012**: El sistema MUST mostrar un mensaje de error genérico ante un código de reserva
  inexistente o inválido, sin revelar si el código "casi" coincide con una reserva real ni
  ningún dato de otras reservas.
- **FR-013**: El sistema MUST permitir a quien tenga un código de reserva válido cancelar el
  turno asociado, siempre que el turno esté en estado activo (no cumplido, ausente, ni ya
  cancelado).
- **FR-014**: El sistema MUST liberar el horario correspondiente para nuevas reservas
  inmediatamente después de que un turno sea cancelado (por el cliente o por el dueño).
- **FR-015**: El sistema MUST requerir que el dueño se autentique con una clave (configurada por
  variable de entorno) antes de acceder a la vista de agenda o a cualquier acción de gestión de
  turnos.
- **FR-016**: El sistema MUST rechazar el acceso a la agenda y a las acciones de gestión cuando
  la clave provista por el dueño sea incorrecta, sin exponer ningún dato de turnos.
- **FR-017**: El sistema MUST mostrar al dueño autenticado, en la vista de agenda de un día
  seleccionado, todos los turnos de ese día con nombre del cliente, teléfono, hora y estado.
- **FR-018**: El sistema MUST permitir al dueño marcar un turno activo como "cumplido" o como
  "ausente".
- **FR-019**: El sistema MUST permitir al dueño cancelar cualquier turno activo desde la agenda.
- **FR-020**: El sistema MUST rechazar cambios de estado sobre un turno que ya no está activo
  (ya cumplido, ausente o cancelado), indicando el estado actual del turno.
- **FR-021**: El sistema MUST considerar un turno como no disponible para reserva si se superpone,
  total o parcialmente, con una franja bloqueada por el dueño.
- **FR-022**: El sistema MUST conservar el historial de turnos pasados (incluyendo su estado
  final) visible en la agenda del dueño, sin eliminarlos automáticamente.

- **FR-023**: El sistema MUST mostrar a los clientes turnos disponibles dentro de una ventana de
  los próximos 14 días desde el momento de la consulta.
- **FR-024**: Cuando el dueño crea un bloqueo puntual que se superpone con turnos ya reservados,
  el sistema MUST cancelar automáticamente esas reservas al crear el bloqueo, y reflejar el
  cambio inmediatamente en la agenda del dueño.
- **FR-025**: El sistema MUST permitir al cliente cancelar su turno con su código únicamente
  hasta 2 horas antes del inicio del turno; dentro de esa ventana de 2 horas, el sistema MUST
  rechazar la autocancelación e indicar al cliente que contacte al dueño directamente (el dueño
  conserva la capacidad de cancelar el turno desde la agenda en cualquier momento, incluso
  dentro de esa ventana).
- **FR-026**: El sistema MUST determinar los días calendario, la ventana de "próximos 14 días" y
  el corte de cancelación de 2 horas usando la timezone local del servidor donde corre el
  sistema, sin requerir configuración explícita de timezone por parte del dueño.
- **FR-027**: El sistema MUST generar códigos de reserva de 8 caracteres alfanuméricos
  (mayúsculas y dígitos), usando un alfabeto sin caracteres ambiguos (excluyendo por ejemplo
  O/0 e I/1), y MUST garantizar que cada código generado sea único entre las reservas
  existentes.
- **FR-028**: El sistema MUST aplicar rate limiting básico (por ejemplo, por dirección IP) sobre
  los intentos de consulta o cancelación de una reserva por código, para dificultar intentos de
  adivinar códigos válidos por fuerza bruta.

### Key Entities

- **Horario Semanal (Configuración de Atención)**: Representa, por día de la semana, si el
  dueño atiende y su franja horaria (inicio y fin), más la duración estándar de turno aplicada
  globalmente. Es la base a partir de la cual se calculan los turnos disponibles.
- **Bloqueo Puntual**: Representa una franja de fecha/hora específica (inicio y fin) en la que
  el dueño no atiende, superpuesta como excepción sobre el horario semanal (por ejemplo,
  vacaciones o un cierre anticipado un día particular).
- **Turno**: Una franja de tiempo concreta (día y hora de inicio/fin, según la duración
  configurada) que puede estar disponible, reservada, cumplida, ausente, cancelada o bloqueada.
- **Reserva**: Vincula un Turno con los datos de contacto de un cliente (nombre, teléfono) y un
  código de reserva único. Tiene un estado (activa, cumplida, ausente, cancelada) que refleja el
  estado operativo del turno asociado.
- **Código de Reserva**: Identificador único de 8 caracteres alfanuméricos (mayúsculas y
  dígitos, con alfabeto sin caracteres ambiguos como O/0 o I/1), entregado al cliente al
  confirmar una reserva, que actúa como único medio de autenticación para consultar o cancelar
  esa reserva específica.
- **Dueño**: El único rol administrativo del sistema, sin cuenta de usuario propia, autenticado
  mediante una clave compartida configurada por variable de entorno.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un cliente nuevo puede completar una reserva (desde ver la disponibilidad hasta
  recibir su código) en menos de 2 minutos sin ninguna ayuda externa.
- **SC-002**: El 100% de los intentos de reserva sobre un turno ya ocupado son rechazados, sin
  que jamás existan dos reservas activas sobre el mismo turno.
- **SC-003**: Un cliente puede consultar el estado de su turno o cancelarlo usando únicamente su
  código de reserva, en menos de 30 segundos, sin necesitar login ni contacto con el dueño.
- **SC-004**: El dueño puede ver la agenda completa de cualquier día y actualizar el estado de un
  turno (cumplido, ausente o cancelado) en menos de 15 segundos por turno.
- **SC-005**: El 100% de los intentos de acceso a la agenda con una clave incorrecta son
  rechazados sin exponer ningún dato de turnos o clientes.
- **SC-006**: Después de que el dueño configura un bloqueo puntual (vacaciones, cierre
  anticipado), el 100% de los turnos dentro de esa franja dejan de ofrecerse a los clientes de
  forma inmediata, y cualquier reserva previa dentro de esa franja queda cancelada
  automáticamente.
- **SC-007**: El 100% de los intentos de autocancelación dentro de las 2 horas previas al inicio
  del turno son rechazados, indicando al cliente que debe contactar al dueño.

## Assumptions

- El código de reserva es el único mecanismo de identificación del cliente: no hay recuperación
  automática de código perdido (por ejemplo, por SMS o email), ya que el sistema no verifica ni
  almacena un canal de contacto validado. Si un cliente pierde su código, el dueño puede
  ubicar su reserva manualmente desde la agenda usando nombre o teléfono.
- El nombre y el teléfono provistos por el cliente no se validan ni se verifican (no hay
  confirmación por SMS ni llamada); se aceptan tal como los ingresa el cliente, siguiendo el
  criterio de "honor system" típico de reservas de negocios de barrio sin login.
- La clave del dueño es única y compartida (no hay múltiples cuentas de dueño ni roles
  adicionales), configurada como variable de entorno del sistema. No hay sesión: cada request
  se autentica de forma independiente enviando la clave del dueño. No existe expiración ni
  estado de sesión.
- El horario semanal aplica de forma recurrente hacia el futuro indefinidamente hasta que el
  dueño lo modifique; los bloqueos puntuales son la única forma de excepción sobre fechas
  específicas.
- Cuando el dueño reduce el horario de un día (por ejemplo, acorta la franja) de forma que deja
  fuera turnos ya reservados, esos turnos ya reservados se mantienen sin cambios (no se cancelan
  automáticamente), de forma consistente con cómo ya se maneja el caso análogo en la
  configuración del horario semanal.
- No hay notificaciones automáticas (SMS, email, WhatsApp) al cliente ante cancelación por parte
  del dueño o por bloqueo de franja; queda fuera de alcance de esta funcionalidad.
- No hay límite explícito de reservas activas por cliente/teléfono; cualquier persona puede
  reservar más de un turno.
