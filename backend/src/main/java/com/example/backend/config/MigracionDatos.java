package com.example.backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Ajustes de datos que se ejecutan al arrancar, una vez que Hibernate ya creo
 * o actualizo las tablas.
 *
 * Sirve para que una base que venia de la version anterior siga funcionando
 * sin tener que ejecutar SQL a mano: crea una sala por cada nombre de sala que
 * ya usaban las charlas, las enlaza y deja los diplomas en estado pendiente.
 *
 * Es idempotente: correrlo varias veces no cambia nada.
 */
@Component
public class MigracionDatos implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(MigracionDatos.class);

    /** Deja "registrados" igual a las inscripciones que existen de verdad. */
    public static final String SQL_SINCRONIZAR_CUPOS = """
            update charla c
            set registrados = sub.total
            from (
                select c2.id,
                       (select count(*) from registro_charla rc where rc.charla_id = c2.id) as total
                from charla c2
            ) sub
            where c.id = sub.id
              and c.registrados is distinct from sub.total
            """;

    private final JdbcTemplate jdbc;

    public MigracionDatos(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        try {
            crearSalasFaltantes();
            enlazarCharlasSinSala();
            numerarSalasSinOrden();
            normalizarDiplomas();
            sincronizarCupos();
        } catch (RuntimeException e) {
            // No se corta el arranque: la aplicacion debe levantar igual y el
            // administrador puede ejecutar migracion_v2.sql si hiciera falta.
            log.warn("No se pudo completar la migracion automatica de datos: {}", e.getMessage());
        }
    }

    /** Crea una fila en "sala" por cada nombre de sala usado hoy en las charlas. */
    private void crearSalasFaltantes() {
        List<String> nombres = jdbc.queryForList("""
                select distinct btrim(c.sala) as nombre
                from charla c
                where c.sala is not null
                  and btrim(c.sala) <> ''
                  and not exists (
                      select 1 from sala s where lower(s.nombre) = lower(btrim(c.sala))
                  )
                """, String.class);
        for (String nombre : nombres) {
            jdbc.update("insert into sala (nombre, orden, activa, creado_en) values (?, 0, true, now())",
                    nombre);
            log.info("Migracion: sala \"{}\" creada a partir de las charlas existentes.", nombre);
        }
    }

    /** Enlaza cada charla con la sala que le corresponde por nombre. */
    private void enlazarCharlasSinSala() {
        int filas = jdbc.update("""
                update charla c
                set sala_id = s.id
                from sala s
                where c.sala_id is null
                  and lower(s.nombre) = lower(btrim(c.sala))
                """);
        if (filas > 0) {
            log.info("Migracion: {} charla(s) enlazadas con su sala.", filas);
        }
    }

    /** Da un orden a las salas que quedaron en 0, para que se listen parejas. */
    private void numerarSalasSinOrden() {
        jdbc.update("""
                with numeradas as (
                    select id, row_number() over (order by nombre) as n
                    from sala
                    where orden is null or orden = 0
                )
                update sala s set orden = numeradas.n
                from numeradas
                where s.id = numeradas.id
                """);
    }

    /**
     * Recalcula el contador de inscritos de cada charla a partir de las
     * inscripciones reales. Corrige las salas que aparecian llenas sin nadie
     * dentro, por ejemplo despues de reemplazar la base de asistentes.
     */
    private void sincronizarCupos() {
        int filas = jdbc.update(SQL_SINCRONIZAR_CUPOS);
        if (filas > 0) {
            log.info("Migracion: se corrigio el contador de inscritos de {} charla(s).", filas);
        }
    }

    /** Deja en estado pendiente los diplomas que venian de la version anterior. */
    private void normalizarDiplomas() {
        jdbc.update("update registro_charla set diploma_estado = 'PENDIENTE' where diploma_estado is null");
        jdbc.update("update registro_charla set impresiones = 0 where impresiones is null");
    }
}
