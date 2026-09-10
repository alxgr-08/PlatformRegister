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

En **Asistentes** puedes fijar el **aforo del evento** (0 = sin límite). Si el
evento se llena, se amplía desde ahí sin tocar nada más.

### 3. Cada dispositivo elige su sala

En **Salas / Charlas**, cada celular o tablet ve la pregunta
**"¿En qué sala estás?"** y elige con una tarjeta. No hay usuarios ni contraseña
por sala. La elección queda guardada en ese dispositivo aunque se recargue la
página, y se cambia con **"Cambiar de sala"**.

Flujo de registro en la sala:

1. Buscar el DNI. Solo acepta personas **ya registradas al evento**.
2. Marcar charlas con **"Agregar"**.
3. Presionar **"Guardar"**. La pantalla **no se reinicia**: se puede cambiar de
   sala y seguir agregándole charlas a la misma persona.
4. Al terminar con esa persona, presionar **"Siguiente"**.

Un mismo DNI no puede inscribirse dos veces en la misma charla, y cuando una
charla llega a su aforo se bloquea sola.

### 4. Diplomas

En **Diplomas** se busca por DNI y aparecen todas las charlas de la persona.
Cada charla es un diploma: si asistió a 3, se imprimen 3 hojas.

- Se puede **corregir el nombre completo** antes de imprimir: así saldrá.
- Se elige **uno, varios o todos los pendientes** (vienen preseleccionados).
- Cada diploma se marca como **Pendiente**, **Impreso** o **Reimpreso**, para
  saber qué falta y poder reimprimir uno solo sin repetir los demás.

#### Calibrar el diploma (una sola vez)

El arte del diploma ya viene preimpreso en el papel: el sistema **solo imprime
los textos** encima. Por eso hay que calibrar una vez dónde cae cada texto.

1. Entra como administrador y presiona **"Calibrar"** en la pantalla de Diplomas.
2. Arrastra cada texto (charla, marca, capacitador, nombre, fecha) hasta su
   lugar, o ajusta los milímetros a mano. También se cambia el tamaño de letra,
   la alineación, negrita y mayúsculas.
3. Usa **"Imprimir hoja de prueba"** sobre una hoja del diploma real hasta que
   calce. **Ajuste X / Ajuste Y** corren todos los textos a la vez para
   compensar el margen de la impresora.
4. Presiona **"Guardar calibración"**. Queda guardada en la base de datos, así
   que vale para **todas las hojas y todos los dispositivos**.

> En el diálogo de impresión del navegador: márgenes en **Ninguno**, escala
> **100 %** y desactiva **"Encabezados y pies de página"**. Si no, los textos
> salen corridos.

### 5. Reportes

**Reportes** compara, por especialidad, cuántas personas estaban en la base
contra cuántas ingresaron, con faltantes y porcentaje de asistencia. Cuenta DNI
únicos y se exporta a Excel.

**Base de Datos** (admin) mantiene lo de siempre: importar la base previa del
evento desde Excel y exportar la base completa o los inscritos de una charla.
La importación avisa antes de reemplazar la base.
