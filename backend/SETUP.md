# Backend - Sistema de Registro de Evento, Charlas y Diplomas

API REST con **Spring Boot 4 + PostgreSQL**. Modulos: Asistentes, Salas, Charlas,
Diplomas, Reportes, Configuracion y Carga.

---

## 1. Base de datos recomendada: Supabase

**Supabase** es la mejor opcion para este proyecto:

- Es **PostgreSQL gestionado** (encaja directo con este backend, que ya usa el driver de PostgreSQL).
- **Plan gratuito**: 500 MB de base de datos -> suficiente para ~500 000 asistentes (cada fila ocupa muy poco).
- Incluye **Realtime** integrado: el frontend puede recibir en vivo los cambios de aforo sin recargar.
- Si en el futuro se necesita mas, el plan Pro cuesta **USD 25/mes** (8 GB, sin pausas).

**Alternativas** (tambien PostgreSQL, todas con plan gratuito): *Neon* (escala a cero, muy economico) o *Railway*.
Se recomienda Supabase por traer Realtime sin configuracion extra.

> Para 500 000 registros PostgreSQL no tiene problema: las busquedas por DNI usan indice unico y son instantaneas.

### Pasos en Supabase

1. Crea una cuenta y un proyecto en https://supabase.com
2. **SQL Editor -> New query** -> pega el contenido de [`schema.sql`](schema.sql) y presiona **Run**.
   Esto crea las tablas, indices y constraints.

   > **Si ya tenias la version anterior funcionando**, ejecuta en su lugar
   > [`migracion_v2.sql`](migracion_v2.sql): agrega las salas, los campos de marca y
   > capacitador y el control de diplomas **sin borrar nada**. El backend tambien
   > hace esta migracion solo al arrancar, asi que ejecutarlo es opcional.
3. **Project Settings -> Database -> Connection** -> copia los datos del **"Session pooler"**
   (host, puerto `5432`, usuario `postgres.xxxx`, contrasena).

> Usa el **Session pooler** o la **conexion directa** (puerto 5432). Evita el *Transaction pooler*
> (puerto 6543), que no funciona bien con las consultas preparadas de Hibernate.

---

## 2. Configurar credenciales

Las credenciales van en **`backend/application-local.properties`** (ese archivo
ya existe y esta ignorado por git). **NUNCA** las escribas en `application.properties`,
porque ese si se sube al repositorio.

Edita `application-local.properties` con los datos reales de tu proyecto:

```properties
spring.datasource.url=jdbc:postgresql://aws-0-<REGION>.pooler.supabase.com:5432/postgres
spring.datasource.username=postgres.<PROJECT-REF>
spring.datasource.password=tu_password
app.admin-key=una-clave-secreta-para-administracion
app.cors.allowed-origins=http://localhost:5173
```

`<REGION>` y `<PROJECT-REF>` salen del connection string que da Supabase en
**Project Settings -> Database -> Connection -> "Session pooler"**.
`application.properties` importa este archivo automaticamente, ya sea que ejecutes
desde la carpeta `backend/` o desde la raiz del repositorio.

---

## 3. Ejecutar el backend

Requiere **JDK 21**. Desde la carpeta `backend/`:

```bash
./mvnw spring-boot:run
```

La API queda en `http://localhost:8080`. Las tablas se crean/validan automaticamente
(`spring.jpa.hibernate.ddl-auto=update`).

---

## 4. Seguridad de administracion

Exigen la cabecera `X-Admin-Key: <valor de ADMIN_KEY>`:

- crear / editar / eliminar **salas** y **charlas** (incluye aforos),
- cambiar el **aforo del evento** y la **calibracion del diploma**,
- **todo** el modulo de carga (importar y exportar la base).

Quedan **abiertos**, porque los usa el personal de puerta y de salas desde el celular
sin usuario ni contrasena:

- cualquier lectura (GET) fuera del modulo de carga,
- el registro al evento,
- la inscripcion de asistentes en charlas y el ocultar / mostrar una charla,
- el modulo de diplomas (buscar por DNI, imprimir y marcar impresos).

---

## 5. Endpoints

Base URL: `http://localhost:8080`

### Modulo Asistentes (registro al evento)

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET    | `/api/asistentes/buscar?dni={dni}` | Busca por DNI -> `{encontrado, asistente}` |
| GET    | `/api/asistentes/{dni}` | Obtiene un asistente |
| GET    | `/api/asistentes?pagina=0&tamano=50` | Lista paginada |
| GET    | `/api/asistentes/estadisticas` | Totales, desglose pre-registrados / nuevos con porcentajes y aforo |
| GET    | `/api/asistentes/{dni}/charlas` | Charlas en las que ya esta inscrito |
| POST   | `/api/asistentes` | Crea asistente ("NUEVO REGISTRADO") |
| PUT    | `/api/asistentes/{dni}` | Corrige nombre, celular, correo y especialidad |
| POST   | `/api/asistentes/{dni}/ingreso` | Registra el ingreso al evento |
| DELETE | `/api/asistentes/{dni}/ingreso` | Deshace el ingreso al evento |

El registro de ingreso no tiene tope: el evento admite todas las personas que
lleguen.

### Modulo Salas

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET    | `/api/salas?incluirInactivas=false` | Lista las salas configuradas |
| GET    | `/api/salas/{id}` | Obtiene una sala |
| POST   | `/api/salas` | Crea una sala - **ADMIN** |
| PUT    | `/api/salas/{id}` | Edita una sala - **ADMIN** |
| DELETE | `/api/salas/{id}` | Elimina una sala vacia - **ADMIN** |

### Modulo Charlas

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET    | `/api/charlas?salaId=1&incluirOcultas=false&incluirFinalizadas=true` | Lista charlas con ocupacion; con `salaId`, solo las de esa sala |
| GET    | `/api/charlas/{id}` | Obtiene una charla |
| POST   | `/api/charlas` | Crea charla (sala, marca, capacitador, horario, aforo) - **ADMIN** |
| PUT    | `/api/charlas/{id}` | Edita charla y aforo - **ADMIN** |
| DELETE | `/api/charlas/{id}` | Elimina charla - **ADMIN** |
| PATCH  | `/api/charlas/{id}/visibilidad` | Oculta / muestra charla |
| POST   | `/api/charlas/{id}/registros` | Inscribe un DNI en la charla |
| POST   | `/api/charlas/registros` | Inscribe un DNI en varias charlas de una vez |
| DELETE | `/api/charlas/{id}/registros/{dni}` | Deshace una inscripcion |
| GET    | `/api/charlas/{id}/registros` | Lista los inscritos de la charla |

Solo se puede inscribir a personas que **ya registraron su ingreso al evento**. La
base impide inscribir dos veces el mismo DNI en la misma charla, y el servicio
rechaza inscribirlo en dos charlas cuyo horario se cruza, aunque sean de salas
distintas: nadie puede estar en dos charlas a la vez.

### Modulo Configuracion

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET    | `/api/configuracion/contador` | Contador: registrados por DNI + agregados a mano |
| POST   | `/api/configuracion/contador` | Suma personas al contador (negativo para restar) - **ADMIN** |
| PUT    | `/api/configuracion/contador` | Fija el total de personas agregadas a mano - **ADMIN** |
| GET    | `/api/configuracion/diploma` | Calibracion de impresion del diploma |
| PUT    | `/api/configuracion/diploma` | Guarda la calibracion del diploma - **ADMIN** |

El evento **no tiene tope de personas**. El contador manual sirve para sumar a la
gente que entro sin pasar por el registro: es solo un numero, no crea asistentes ni
aparece en charlas, diplomas o reportes.

La calibracion del diploma se guarda en la base, no en el navegador: se ajusta
**una sola vez** y vale para todas las hojas y todos los dispositivos.

### Modulo Diplomas

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET    | `/api/diplomas/{dni}` | Persona + todas sus charlas con el estado del diploma |
| GET    | `/api/diplomas/resumen` | Total, pendientes, impresos y reimpresos |
| POST   | `/api/diplomas/impresion` | Marca como impresos los diplomas indicados |
| POST   | `/api/diplomas/{registroId}/pendiente` | Devuelve un diploma a pendiente |

Cada inscripcion a una charla equivale a un diploma: si la persona asistio a 3
charlas, se imprimen 3 hojas. Un diploma que se imprime dos veces queda marcado
como **reimpreso**.

### Modulo Reportes

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET    | `/api/reportes/especialidad` | En la base, ingresaron, faltantes y % por especialidad |
| GET    | `/api/reportes/aforo-horario?fecha=&inicio=` | Ocupacion de cada sala en una franja horaria |
| GET    | `/api/reportes/especialidad/excel` | Asistencia por especialidad |
| GET    | `/api/reportes/por-persona/excel` | Una fila por persona con todas sus salas y charlas |
| GET    | `/api/reportes/por-sala-charla/excel` | Listado de asistentes de cada charla |
| GET    | `/api/reportes/detalle/excel` | Una fila por DNI y charla, con diploma |
| GET    | `/api/reportes/aforo-horario/excel?fecha=` | Todas las salas y franjas del dia |

Los conteos usan **DNI unicos**: nadie aparece dos veces.

### Modulo Carga

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| POST   | `/api/carga/asistentes` | Importa CSV (multipart, campo `archivo`) — **ADMIN** |
| GET    | `/api/carga/plantilla` | Descarga plantilla CSV |

**Formato del CSV** (primera fila = cabecera; acepta separador `,` o `;`):

```
dni,nombre_completo,celular,correo,especialidad,tipo_registro
12345678,Juan Perez Gomez,987654321,juan@correo.com,Cardiologia,PRE-REGISTRADO
```

Solo `dni` y `nombre_completo` son obligatorios. La carga es un **UPSERT**: vuelve a
importar el archivo sin crear duplicados (actualiza los DNI existentes).

---

## 6. Postman

Importa el archivo [`postman_collection.json`](postman_collection.json) en Postman.
Trae todos los endpoints organizados en carpetas y dos variables de coleccion:
`baseUrl` y `adminKey` (ajusta esta ultima al valor de tu `ADMIN_KEY`).

---

## 7. Tiempo real (opcional)

Para que el frontend actualice los contadores de aforo en vivo:

- **Opcion A (recomendada):** habilita Realtime en Supabase (ver final de `schema.sql`)
  y suscribete desde el frontend con `supabase-js` a las tablas `charla` y `registro_charla`.
- **Opcion B (simple):** el frontend consulta `GET /api/charlas` cada pocos segundos (polling).

El backend ya es seguro ante concurrencia: el aforo se controla con un incremento
atomico y los duplicados con una restriccion unica en la base de datos.

---

## Notas

- El `pom.xml` se ajusto a **Java 21** (LTS, instalado en el equipo). El proyecto venia
  apuntando a Java 26; si se instala ese JDK se puede volver a subir la version.
- `application-local.properties` NO se versiona (contiene credenciales).
