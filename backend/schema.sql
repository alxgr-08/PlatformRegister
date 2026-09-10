-- ============================================================================
--  Sistema de Registro de Evento, Charlas y Diplomas
--  Esquema de base de datos para Supabase / PostgreSQL
--
--  Como usarlo:
--    1. Entra a tu proyecto en https://supabase.com
--    2. Menu lateral -> SQL Editor -> New query
--    3. Pega TODO este archivo y presiona "Run"
--  (Ejecutar ANTES de iniciar el backend por primera vez.)
--
--  Si ya tenias la version anterior funcionando, ejecuta en su lugar
--  "migracion_v2.sql", que agrega lo nuevo sin borrar tus datos.
-- ============================================================================

-- ----- Tabla: asistente  (base de pre-registro + nuevos registrados) --------
create table if not exists asistente (
    id                    bigint generated always as identity primary key,
    dni                   varchar(20)  not null unique,
    nombre_completo       varchar(200) not null,
    nombre                varchar(150),
    apellidos             varchar(150),
    celular               varchar(30),
    correo                varchar(150),
    especialidad          varchar(150),
    tipo_documento        varchar(20),
    terminos_cmr          boolean,
    terminos_condiciones  boolean,
    fecha_registro_origen varchar(40),
    tipo_registro         varchar(50)  not null default 'PRE-REGISTRADO',
    fecha_ingreso_evento  timestamp,
    creado_en             timestamp    not null default now()
);

-- Si la tabla ya existia, agrega las columnas nuevas (Excel) de forma segura.
alter table asistente add column if not exists nombre                varchar(150);
alter table asistente add column if not exists apellidos             varchar(150);
alter table asistente add column if not exists tipo_documento        varchar(20);
alter table asistente add column if not exists terminos_cmr          boolean;
alter table asistente add column if not exists terminos_condiciones  boolean;
alter table asistente add column if not exists fecha_registro_origen varchar(40);

create index if not exists idx_asistente_dni          on asistente (dni);
create index if not exists idx_asistente_ingreso      on asistente (fecha_ingreso_evento);
create index if not exists idx_asistente_especialidad on asistente (especialidad);

-- ----- Tabla: configuracion  (ajustes generales del evento) -----------------
--  Pares clave/valor. Hoy guarda el aforo del evento y la calibracion del
--  diploma, para que la misma configuracion valga en todos los dispositivos.
create table if not exists configuracion (
    clave          varchar(80) primary key,
    valor          text,
    actualizado_en timestamp not null default now()
);

-- ----- Tabla: sala  (salas configurables por el administrador) --------------
create table if not exists sala (
    id        bigint generated always as identity primary key,
    nombre    varchar(100) not null unique,
    orden     integer      not null default 0,
    activa    boolean      not null default true,
    creado_en timestamp    not null default now()
);

-- ----- Tabla: charla  (charlas dentro de cada sala) -------------------------
create table if not exists charla (
    id          bigint generated always as identity primary key,
    nombre      varchar(200) not null,
    sala        varchar(100) not null,
    sala_id     bigint       references sala(id),
    marca       varchar(150),
    capacitador varchar(150),
    hora_inicio timestamp    not null,
    hora_fin    timestamp    not null,
    aforo       integer      not null default 0  check (aforo >= 0),
    registrados integer      not null default 0  check (registrados >= 0),
    oculta      boolean      not null default false,
    creado_en   timestamp    not null default now()
);

alter table charla add column if not exists sala_id     bigint;
alter table charla add column if not exists marca       varchar(150);
alter table charla add column if not exists capacitador varchar(150);

create index if not exists idx_charla_sala on charla (sala_id);

-- ----- Tabla: registro_charla  (asistentes inscritos en charlas) ------------
--  La restriccion unica impide que un DNI se inscriba dos veces en la misma charla.
--  Las columnas de diploma llevan el control de impresos / pendientes:
--    diploma_estado = PENDIENTE | IMPRESO      impresiones > 1 -> reimpreso
create table if not exists registro_charla (
    id             bigint generated always as identity primary key,
    charla_id      bigint      not null references charla(id)    on delete cascade,
    asistente_id   bigint      not null references asistente(id) on delete cascade,
    dni            varchar(20) not null,
    registrado_en  timestamp   not null default now(),
    diploma_estado varchar(20) not null default 'PENDIENTE',
    impresiones    integer     not null default 0,
    impreso_en     timestamp,
    constraint uk_registro_charla unique (charla_id, asistente_id)
);

alter table registro_charla add column if not exists diploma_estado varchar(20) not null default 'PENDIENTE';
alter table registro_charla add column if not exists impresiones    integer     not null default 0;
alter table registro_charla add column if not exists impreso_en     timestamp;

create index if not exists idx_registro_charla_charla    on registro_charla (charla_id);
create index if not exists idx_registro_charla_asistente on registro_charla (asistente_id);
create index if not exists idx_registro_charla_diploma   on registro_charla (diploma_estado);

-- ----- Valores iniciales de configuracion ----------------------------------
insert into configuracion (clave, valor)
values ('evento.aforo', '0')
on conflict (clave) do nothing;

-- ============================================================================
--  DATOS DE EJEMPLO (opcional)  -  ejecutar solo una vez
--  Dos salas con un par de charlas para tener contenido en pantalla.
-- ============================================================================
-- insert into sala (nombre, orden) values ('Sala 1', 1), ('Sala 2', 2);
--
-- insert into charla (nombre, sala, sala_id, marca, capacitador, hora_inicio, hora_fin, aforo)
-- select 'Acabados y terminaciones', s.nombre, s.id, 'Marca A', 'Juan Perez',
--        '2026-05-21 09:00:00', '2026-05-21 10:00:00', 80
-- from sala s where s.nombre = 'Sala 1';
--
-- insert into charla (nombre, sala, sala_id, marca, capacitador, hora_inicio, hora_fin, aforo)
-- select 'Instalaciones electricas', s.nombre, s.id, 'Marca B', 'Ana Rojas',
--        '2026-05-21 09:00:00', '2026-05-21 10:00:00', 50
-- from sala s where s.nombre = 'Sala 2';

-- ============================================================================
--  TIEMPO REAL (opcional, recomendado)
--  Habilita la replicacion Realtime para que el frontend reciba en vivo los
--  cambios de aforo / contadores sin recargar. Ejecutar una vez:
-- ============================================================================
-- alter publication supabase_realtime add table charla;
-- alter publication supabase_realtime add table registro_charla;
