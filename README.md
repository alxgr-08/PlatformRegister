# PlatformRegister

Plataforma de registro de asistentes, salas, charlas y diplomas para el evento.

- Backend: Spring Boot 4 + PostgreSQL — ver [`backend/SETUP.md`](backend/SETUP.md)
- Frontend: React + Vite + Tailwind — `cd frontend && npm install && npm run dev`

---

## Puesta en marcha para el evento

### 1. Base de datos

- **Instalación nueva:** ejecuta [`backend/schema.sql`](backend/schema.sql) en Supabase.
- **Ya tenías la versión anterior:** ejecuta [`backend/migracion_v2.sql`](backend/migracion_v2.sql).
  No borra nada: agrega salas, marca, capacitador y el control de diplomas.
  El backend también hace esta migración solo al arrancar, así que es opcional.

### 2. Configuración (solo administrador)

Entra con **"Ingresar como Admin"** en la barra superior y ve a **Configuración**:

1. Crea las salas que necesites: 1, 2, 6, 8 o las que sean.
2. Dentro de cada sala, agrega sus charlas con **marca**, **capacitador**,
   fecha, horario y aforo. La marca y el capacitador salen impresos en el diploma.

El evento **no tiene tope de personas**. En **Asistentes**, solo el administrador
ve el **contador de asistentes** y puede sumar a mano a la gente que entró sin
pasar por el registro (por ejemplo, "agregar 20"). Eso es únicamente un número
para el total: esas personas no tienen DNI, no se inscriben en charlas y no les
sale diploma.

### 3. Cada dispositivo elige su sala

En **Salas / Charlas**, cada celular o tablet ve la pregunta
**"¿En qué sala estás?"** y elige con una tarjeta. No hay usuarios ni contraseña
por sala. La elección queda guardada en ese dispositivo aunque se recargue la
página, y se cambia con **"Cambiar de sala"**.

Flujo de registro en la sala:

1. Buscar el DNI. Solo acepta personas **ya registradas al evento**.
2. En la charla, presionar **"Agregar"**.
3. Presionar el **"GUARDAR"** de esa misma charla, ahí mismo. No hay que bajar
   al final de la lista: cada charla se guarda por separado, así no se pierde
   lo marcado en el celular.
4. Al guardar, el DNI de arriba queda **seleccionado**: se escribe el de la
   siguiente persona encima, sin borrar nada. La persona actual sigue cargada
   por si hay que agregarle otra charla o cambiar de sala.
5. Al terminar con esa persona, presionar **"Siguiente"** (o simplemente
   escribir el siguiente DNI).

Un mismo DNI no puede inscribirse dos veces en la misma charla ni en dos charlas
que se cruzan de horario, aunque sean de salas distintas. Cuando una charla llega
a su aforo se bloquea sola.

### 4. Diplomas

En **Diplomas** se busca por DNI y aparecen todas las charlas de la persona.
Cada charla es un diploma: si asistió a 3, se imprimen 3 hojas.

- Se puede **corregir el nombre completo** antes de imprimir: así saldrá.
- Se elige **uno, varios o todos los pendientes** (vienen preseleccionados).
- Si una charla no tiene **marca** o **capacitador**, la lista lo avisa: se
  completan en Configuración para que salgan impresos.
- Cada diploma se marca como **Pendiente**, **Impreso** o **Reimpreso**, para
  saber qué falta y poder reimprimir uno solo sin repetir los demás.

#### Calibrar el diploma (una sola vez)

El arte del diploma ya viene preimpreso en el papel: el sistema **solo imprime
los textos** encima. Por eso hay que calibrar una vez dónde cae cada texto.

1. Entra como administrador y presiona **"Calibrar"** en la pantalla de Diplomas.
2. Los cinco textos son **independientes**: nombre de la charla, marca,
   capacitador, nombre del asistente y fecha. Eliges uno en **"Campo"** y lo
   colocas donde quieras: arrastrándolo, con las **flechas** (1 mm por clic) o
   escribiendo la posición en milímetros. También se cambia el tamaño de letra,
   la alineación, negrita y mayúsculas, y se puede apagar un texto que no
   quieras imprimir.
3. Usa **"Imprimir hoja de prueba"** sobre una hoja del diploma real hasta que
   calce. **Ajuste X / Ajuste Y** corren todos los textos a la vez para
   compensar el margen de la impresora.
4. Presiona **"Guardar calibración"**. Queda guardada en la base de datos, así
   que vale para **todas las hojas y todos los dispositivos**.

> En el diálogo de impresión del navegador: márgenes en **Ninguno**, escala
> **100 %** y desactiva **"Encabezados y pies de página"**. Si no, los textos
> salen corridos.

### 5. Reportes

**Reportes** tiene tres bloques:

- **Personas por especialidad:** cuántas estaban en la base contra cuántas
  ingresaron, con faltantes y porcentaje. Cuenta DNI únicos.
- **Aforo por sala y horario:** eliges fecha y franja y ves cuántos inscritos
  tiene la charla de cada sala, cuántos cupos quedan y si está llena. Con
  "Hora anterior" y "Hora siguiente" recorres el día. Sirve para saber en el
  momento qué sala ya no admite más gente.
- **Otros reportes para descargar** en Excel: por persona (con todas sus salas
  y charlas), por sala y charla (listado de asistentes), detalle completo (una
  fila por DNI y charla, con marca, capacitador y estado del diploma) y aforos
  por horario (todas las salas y franjas del día).

**Base de Datos** (admin) mantiene lo de siempre: importar la base previa del
evento desde Excel y exportar la base completa o los inscritos de una charla.
La importación avisa antes de reemplazar la base.
