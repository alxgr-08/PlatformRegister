-- ============================================================================
--  REPARAR CUPOS DE LAS CHARLAS
--
--  Usalo si una sala aparece LLENA sin tener a nadie dentro.
--
--  Pasa cuando el contador "registrados" de la charla quedo con un numero
--  viejo: por ejemplo, al reemplazar la base de asistentes se borraban las
--  inscripciones pero el contador se quedaba como estaba.
--
--  Esto vuelve a contar los inscritos REALES de cada charla. No borra nada.
--
--  Como usarlo:
--    1. Entra a tu proyecto en https://supabase.com
--    2. Menu lateral -> SQL Editor -> New query
--    3. Pega este archivo y presiona "Run"
--
--  Nota: ya no hace falta ejecutarlo a mano. El backend hace esta correccion
--  solo cada vez que arranca, y en la pantalla de Configuracion hay un boton
--  "Recalcular cupos" que hace exactamente lo mismo.
-- ============================================================================

-- Antes: asi esta cada charla ahora mismo.
select c.id, c.sala, c.nombre,
       c.registrados                as contador_actual,
       (select count(*) from registro_charla rc where rc.charla_id = c.id) as inscritos_reales,
       c.aforo
from charla c
order by c.sala, c.hora_inicio;

-- La correccion.
update charla c
set registrados = sub.total
from (
    select c2.id,
           (select count(*) from registro_charla rc where rc.charla_id = c2.id) as total
    from charla c2
) sub
where c.id = sub.id
  and c.registrados is distinct from sub.total;

-- Despues: contador_actual e inscritos_reales deben coincidir.
select c.id, c.sala, c.nombre,
       c.registrados                as contador_actual,
       (select count(*) from registro_charla rc where rc.charla_id = c.id) as inscritos_reales,
       c.aforo
from charla c
order by c.sala, c.hora_inicio;
