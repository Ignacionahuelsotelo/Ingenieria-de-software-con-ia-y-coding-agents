# PRD — Gastos Compartidos

**Autor:** @analyst · **Fecha:** 2026-08-20 · **Estado:** listo para @architect

---

## 1. Problema

Cuando un grupo de amigos comparte gastos —un viaje, una casa, una salida
larga— cada uno paga lo que le toca pagar en el momento, y al final nadie sabe
quién quedó debiéndole a quién. Hoy eso se resuelve con capturas de pantalla,
un grupo de chat y una hoja de cálculo que alguien mantiene de memoria, con lo
cual las cuentas se cierran tarde, mal o directamente no se cierran. El
resultado es plata que no vuelve y roce entre gente que se quiere.

## 2. Usuarios

- **El organizador** (Ana). Es quien arma el viaje, pone la mayoría de la plata
  adelantada y termina siendo el cajero del grupo. Hoy lleva una planilla o una
  nota en el celular y hace las cuentas a mano. Es quien más quiere esto.
- **El participante** (Beto, Caro). Pagó una o dos cosas y quiere saber dos
  cosas nada más: cuánto debe y a quién se lo transfiere. No quiere aprender a
  usar una herramienta.

Ambos usan el mismo grupo y ven la misma información. No hay cuentas, ni login,
ni roles distintos en esta versión.

## 3. Alcance

**Lo que ya existe y se reutiliza tal cual** (no es parte del alcance a
construir): el cálculo de balances, el reparto de centavos sin pérdida, la
simplificación de deudas, el estado en memoria con datos sembrados, y el
asistente en lenguaje natural con sus herramientas.

**Lo que falta y define este PRD:** la API sobre la que se opera el grupo
(personas y gastos), la lectura de balances y transferencias, y una pantalla
mínima donde todo eso se pueda usar sin curl.

**Decisión de alcance:** la app trabaja sobre **un único grupo activo**. Se lo
puede ver y renombrar, pero no hay creación ni listado de varios grupos en esta
versión. Un grupo alcanza para el 100% de los casos reales de un viaje, y
multi-grupo obliga a repensar todo el modelo. Queda anotado como no-objetivo,
no como olvido.

**No-objetivos:** múltiples grupos, usuarios/login, monedas distintas de una
sola, divisiones por porcentaje o por peso, gastos recurrentes, persistencia en
disco, notificaciones, adjuntar comprobantes.

---

## 4. Historias

### H-001 — Ver el estado del grupo · `must`

> Como participante quiero ver el grupo con sus personas y todos sus gastos
> para entender de un vistazo qué se cargó hasta ahora.

**Criterios de aceptación**
- Consultando el grupo se obtiene su nombre y la lista de personas, cada una
  con su identificador y su nombre visible.
- Consultando los gastos se obtienen todos, cada uno con: identificador,
  descripción, monto, quién pagó y entre quiénes se divide.
- Los montos se reciben siempre como cantidad entera de centavos; ninguna
  respuesta expone un número con decimales.
- Con el grupo sembrado de ejemplo, se ven 3 personas y 3 gastos.
- Un grupo sin gastos devuelve una lista vacía, no un error.

### H-002 — Agregar una persona al grupo · `must`

> Como organizador quiero agregar personas al grupo para poder repartir gastos
> entre todos los que participan.

**Criterios de aceptación**
- Agregar una persona con nombre no vacío la incorpora al grupo y devuelve su
  identificador; a partir de ahí aparece al listar personas.
- El identificador es único y estable: no cambia nunca y no se reutiliza.
- Nombre vacío, ausente o solo espacios se rechaza con un error explicativo, y
  el grupo queda igual que antes.
- Se permiten dos personas con el mismo nombre visible (dos Juanes existen);
  siguen distinguiéndose por identificador.
- Agregar una persona no altera ningún gasto ya cargado ni los balances
  previos: la persona nueva entra con balance cero.

### H-003 — Cargar un gasto · `must`

> Como participante quiero cargar un gasto diciendo quién lo pagó y entre
> quiénes se divide para que quede reflejado en las cuentas del grupo.

**Criterios de aceptación**
- Un gasto se carga con descripción, monto, quién pagó y la lista de entre
  quiénes se divide; queda visible al listar gastos y afecta los balances de
  inmediato.
- Quien pagó puede o no estar en la lista de quienes se lo reparten: los dos
  casos son válidos y se calculan distinto.
- Se rechaza, sin modificar nada: monto cero o negativo, monto no entero,
  descripción vacía, lista de reparto vacía, o cualquier persona (pagador o
  participante) que no exista en el grupo. El error dice cuál fue el problema.
- Un gasto que no divide exacto no pierde ni inventa un centavo: la suma de las
  partes es igual al monto total.
- Cargar el mismo gasto dos veces produce dos gastos: la app no adivina
  duplicados.

### H-004 — Corregir el grupo: editar y borrar gastos, sacar personas · `must`

> Como organizador quiero poder borrar un gasto mal cargado y sacar del grupo a
> alguien que al final no vino para que las cuentas reflejen la realidad.

**Criterios de aceptación**
- Borrar un gasto existente lo saca del listado y los balances se recalculan
  como si nunca hubiera existido.
- Borrar un gasto inexistente devuelve un error claro y no rompe nada.
- Sacar a una persona que **no** aparece en ningún gasto (ni como pagador ni en
  ningún reparto) la elimina del grupo.
- Sacar a una persona que **sí** participa de algún gasto se rechaza con un
  mensaje que explica por qué: borrarla dejaría gastos huérfanos y balances que
  no suman cero. La app no borra plata en silencio.
- Después de cualquier borrado, la suma de todos los balances sigue siendo
  exactamente cero.

### H-005 — Ver balances y cómo saldar · `must`

> Como participante quiero ver cuánto debo o me deben y la lista mínima de
> transferencias para saldar todo, así cierro las cuentas de una vez.

**Criterios de aceptación**
- Se obtiene el balance de cada persona del grupo, incluidas las que están en
  cero; el signo distingue con claridad "le deben" de "debe".
- La suma de todos los balances es siempre exactamente cero.
- Se obtiene una lista de transferencias que dice quién le paga a quién y
  cuánto; aplicarlas todas deja a todos en cero.
- Nadie aparece pagando y cobrando a la vez en el mismo conjunto de
  transferencias.
- Si todos están en cero, la lista de transferencias viene vacía y la app lo
  comunica como "están a mano", no como un error.

### H-006 — Pantalla única para usar todo esto · `must`

> Como participante quiero una pantalla donde ver el grupo, cargar un gasto y
> ver a quién le transfiero, para no depender de que alguien me pase la
> planilla.

**Criterios de aceptación**
- Una sola pantalla muestra, al abrirla: nombre del grupo, personas, gastos,
  balances y transferencias para saldar.
- Desde ahí se puede agregar una persona y cargar un gasto eligiendo pagador y
  participantes; al confirmar, lo que se ve en pantalla se actualiza sin que el
  usuario tenga que recargar a mano.
- Los montos se muestran en pesos con dos decimales (48500 se ve como
  `$485,00`); el usuario los escribe también en pesos, nunca en centavos.
- Un intento inválido (monto en cero, sin participantes, nombre vacío) muestra
  un mensaje entendible al lado del formulario y no deja el grupo a medio
  modificar.
- La pantalla es usable en un celular: es el dispositivo donde se cargan los
  gastos, en el momento, mientras se paga.

---

## 5. Casos borde del dominio

Estos no son detalles: son el producto. Si se resuelven mal, la app miente.

1. **La plata no divide exacto.** $100 entre 3 no da 33,33 cada uno: da 33,34 /
   33,33 / 33,33. El sobrante se reparte de a un centavo y siempre en el mismo
   orden, para que el resultado sea reproducible. Nunca se redondea hacia
   afuera: la suma de las partes tiene que dar el total exacto, siempre.
2. **Alguien paga por gente que no lo incluye.** Ana paga el asado del que no
   comió. Es válido: paga el total y no le toca ninguna parte, así que el grupo
   entero le queda debiendo. El formulario no debe forzar a que el pagador esté
   entre los participantes.
3. **Alguien participa de un gasto que no pagó nadie del grupo.** No se
   contempla: todo gasto tiene exactamente un pagador y tiene que ser alguien
   del grupo.
4. **Alguien se va del grupo.** Si nunca participó de un gasto, se lo saca sin
   consecuencias. Si ya participó, no se lo puede sacar: primero hay que borrar
   o corregir esos gastos. Sacarlo de una implicaría que la plata desaparezca o
   que los balances dejen de sumar cero, y ninguna de las dos es aceptable.
5. **Alguien se suma tarde.** La persona nueva no hereda gastos anteriores:
   entra en cero y solo participa de lo que se cargue de ahí en adelante. Si el
   grupo quiere que participe de algo viejo, tiene que editar ese gasto.
6. **Un gasto se carga dos veces.** La app no detecta duplicados. Se resuelve
   borrando el repetido (H-004), y por eso borrar tiene que existir desde el
   día uno.
7. **Todos quedan en cero.** Es un estado válido y frecuente al final del
   viaje. Se comunica explícitamente ("están a mano"), no como una lista vacía
   sin explicación.
8. **Deudas circulares.** Ana le debe a Beto, Beto a Caro, Caro a Ana. La lista
   de transferencias tiene que cancelarlas en vez de hacer que tres personas se
   transfieran plata en círculo. Es el valor central del producto.
9. **Un solo participante en un gasto.** Alguien paga algo que consumió solo y
   lo carga igual, para dejar registro. Es válido: su balance no cambia.
10. **El asistente en lenguaje natural puede querer escribir.** Preguntar nunca
    debe modificar el grupo. Cargar un gasto por chat solo puede pasar si el
    usuario lo pidió explícitamente y la app lo habilitó; en modo consulta se
    rechaza. Ya está resuelto en la base, pero la pantalla no debe romper esa
    garantía.

---

## 6. Preguntas abiertas

- ¿Hay que poder **editar** un gasto ya cargado, o alcanza con borrar y volver
  a cargar? Este PRD asume que alcanza con borrar (H-004). Si aparece la
  necesidad real de editar, entra como historia nueva.
- ¿El asistente en lenguaje natural tiene que estar visible en la pantalla de
  H-006? Está fuera del alcance de esta versión; se decide después de tener el
  flujo básico funcionando.
