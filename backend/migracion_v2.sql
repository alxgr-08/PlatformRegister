-- ============================================================================
--  MIGRACION v2  -  Salas configurables, diplomas y reportes
--
--  Como usarlo:
--    1. Entra a tu proyecto en https://supabase.com
--    2. Menu lateral -> SQL Editor -> New query
--    3. Pega TODO este archivo y presiona "Run"
--
--  Es seguro ejecutarlo varias veces: todo usa "if not exists" / "if exists".
--  NO borra datos: conserva asistentes, charlas e inscripciones existentes.
-- ============================================================================

-- ----- Tabla: configuracion  (ajustes generales del evento) -----------------
--  Guarda pares clave/valor: aforo del evento y calibracion del diploma.
create table if not exists configuracion (
    clave         varchar(80) primary key,
    valor         text,
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

-- ----- Charla: sala_id, marca y capacitador --------------------------------
alter table charla add column if not exists sala_id     bigint;
alter table charla add column if not exists marca       varchar(150);
alter table charla add column if not exists capacitador varchar(150);

--  Crea una fila en "sala" por cada nombre de sala usado hoy en las charlas.
insert into sala (nombre, orden)
select distinct c.sala, 0
from charla c
where c.sala is not null
  and btrim(c.sala) <> ''
  and not exists (select 1 from sala s where s.nombre = c.sala);

--  Enlaza cada charla con su sala.
update charla c
set sala_id = s.id
from sala s
where c.sala_id is null
  and s.nombre = c.sala;

--  Numera las salas por orden alfabetico (solo las que quedaron en 0).
with numeradas as (
    select id, row_number() over (order by nombre) as n
    from sala
    where orden = 0
)
update sala s set orden = numeradas.n
from numeradas
where s.id = numeradas.id;

do $$
begin
    if not exists (
        select 1 from information_schema.table_constraints
        where constraint_name = 'fk_charla_sala'
    ) then
        alter table charla
            add constraint fk_charla_sala foreign key (sala_id) references sala(id);
    end if;
end $$;

create index if not exists idx_charla_sala on charla (sala_id);

-- ----- registro_charla: estado del diploma ---------------------------------
--  PENDIENTE -> nunca se imprimio | IMPRESO -> ya salio al menos una vez.
--  impresiones > 1  ->  se considera REIMPRESO.
alter table registro_charla add column if not exists diploma_estado   varchar(20) not null default 'PENDIENTE';
alter table registro_charla add column if not exists impresiones      integer     not null default 0;
alter table registro_charla add column if not exists impreso_en       timestamp;

create index if not exists idx_registro_charla_diploma on registro_charla (diploma_estado);

-- ----- Valores iniciales de configuracion ----------------------------------
insert into configuracion (clave, valor)
values ('evento.aforo', '0')
on conflict (clave) do nothing;
