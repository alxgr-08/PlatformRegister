package com.example.backend.reporte;

import com.example.backend.common.ApiException;
import com.example.backend.reporte.dto.ReporteDto;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.streaming.SXSSFSheet;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.OutputStream;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Reportes del evento.
 *
 *  - Por especialidad: cuantos estaban en la base contra cuantos ingresaron.
 *  - Aforo por sala y horario: cuanta gente hay en la charla que cada sala
 *    tiene programada en una franja del dia.
 *  - Descargas en Excel por persona, por sala y charla, el detalle completo y
 *    los aforos de todas las franjas del dia.
 *
 * Todos los conteos de personas usan DNI unicos.
 */
@Service
public class ReporteService {

    private static final DateTimeFormatter HORA = DateTimeFormatter.ofPattern("HH:mm");
    private static final DateTimeFormatter FECHA_HORA =
            DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    private static final String SQL_ESPECIALIDAD = """
            select coalesce(nullif(btrim(especialidad), ''), 'SIN ESPECIALIDAD') as especialidad,
                   count(distinct dni)                                            as en_base,
                   count(distinct dni) filter (where fecha_ingreso_evento is not null) as ingresaron
            from asistente
            group by 1
            order by en_base desc, especialidad
            """;

    private static final String SQL_FECHAS = """
            select distinct cast(hora_inicio as date) as fecha
            from charla
            where not oculta
            order by 1
            """;

    private static final String SQL_FRANJAS = """
            select distinct hora_inicio, hora_fin
            from charla
            where not oculta and cast(hora_inicio as date) = cast(? as date)
            order by hora_inicio
            """;

    /** Una fila por sala; sin charla en esa franja, los datos vienen en null. */
    private static final String SQL_AFORO_FRANJA = """
            select s.nombre                        as sala,
                   c.nombre                        as charla,
                   coalesce(c.registrados, 0)      as inscritos,
                   coalesce(c.aforo, 0)            as aforo
            from sala s
            left join charla c
                   on c.sala_id = s.id
                  and c.hora_inicio = ?
                  and not c.oculta
            where s.activa
            order by s.orden, s.nombre
            """;

    /**
     * Una fila por persona de la base, haya ingresado o no. La columna
     * "ingreso" permite separar a los que vinieron de los que faltaron, que es
     * justo lo que el reporte por especialidad muestra como numero.
     */
    private static final String SQL_POR_PERSONA = """
            select a.dni, a.nombre_completo, coalesce(a.especialidad, '') as especialidad,
                   a.tipo_registro,
                   case when a.fecha_ingreso_evento is not null then 'SI' else 'NO' end as ingreso,
                   a.fecha_ingreso_evento,
                   coalesce(a.celular, '') as celular, coalesce(a.correo, '') as correo,
                   coalesce(string_agg(distinct c.sala, ' | ' order by c.sala), '')   as salas,
                   coalesce(string_agg(c.nombre, ' | ' order by c.hora_inicio), '')   as charlas,
                   count(rc.id)                                                       as total_charlas
            from asistente a
            left join registro_charla rc on rc.asistente_id = a.id
            left join charla c           on c.id = rc.charla_id
            group by a.id, a.dni, a.nombre_completo, a.especialidad, a.tipo_registro,
                     a.fecha_ingreso_evento, a.celular, a.correo
            order by a.especialidad, a.nombre_completo
            """;

    private static final String SQL_POR_SALA_CHARLA = """
            select c.sala, c.nombre as charla, c.hora_inicio, c.hora_fin,
                   a.dni, a.nombre_completo, coalesce(a.especialidad, '') as especialidad,
                   rc.registrado_en
            from charla c
            join registro_charla rc on rc.charla_id = c.id
            join asistente a        on a.id = rc.asistente_id
            order by c.sala, c.hora_inicio, a.nombre_completo
            """;

    private static final String SQL_DETALLE = """
            select a.dni, a.nombre_completo, coalesce(a.especialidad, '') as especialidad,
                   a.tipo_registro, a.fecha_ingreso_evento,
                   c.sala, c.nombre as charla, coalesce(c.marca, '') as marca,
                   coalesce(c.capacitador, '') as capacitador,
                   c.hora_inicio, c.hora_fin, rc.registrado_en,
                   case when coalesce(rc.impresiones, 0) = 0 then 'PENDIENTE'
                        when rc.impresiones > 1 then 'REIMPRESO'
                        else 'IMPRESO' end as diploma,
                   coalesce(rc.impresiones, 0) as impresiones
            from registro_charla rc
            join asistente a on a.id = rc.asistente_id
            join charla c    on c.id = rc.charla_id
            order by a.nombre_completo, c.hora_inicio
            """;

    private static final String SQL_AFORO_DIA = """
            select cast(c.hora_inicio as date) as fecha, c.hora_inicio, c.hora_fin,
                   c.sala, c.nombre as charla,
                   coalesce(c.registrados, 0) as inscritos, coalesce(c.aforo, 0) as aforo
            from charla c
            where not c.oculta and cast(c.hora_inicio as date) = cast(? as date)
            order by c.hora_inicio, c.sala
            """;

    private final JdbcTemplate jdbcTemplate;

    public ReporteService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    // -------------------------------------------------------- Por especialidad

    @Transactional(readOnly = true)
    public ReporteDto.ReporteEspecialidad porEspecialidad() {
        List<ReporteDto.FilaEspecialidad> filas = jdbcTemplate.query(SQL_ESPECIALIDAD, (rs, i) ->
                construirFila(rs.getString("especialidad"), rs.getLong("en_base"), rs.getLong("ingresaron")));

        long enBase = filas.stream().mapToLong(ReporteDto.FilaEspecialidad::enBase).sum();
        long ingresaron = filas.stream().mapToLong(ReporteDto.FilaEspecialidad::ingresaron).sum();
        return new ReporteDto.ReporteEspecialidad(filas, construirFila("TOTAL", enBase, ingresaron));
    }

    // --------------------------------------------------- Aforo por sala y hora

    /**
     * Ocupacion de cada sala en una franja. Sin fecha toma el primer dia con
     * charlas; sin hora toma la primera franja de ese dia.
     */
    @Transactional(readOnly = true)
    public ReporteDto.ReporteAforoHorario aforoPorHorario(LocalDate fecha, LocalDateTime inicio) {
        List<LocalDate> fechas = jdbcTemplate.queryForList(SQL_FECHAS, LocalDate.class);
        LocalDate dia = fecha != null ? fecha : (inicio != null ? inicio.toLocalDate()
                : fechas.stream().findFirst().orElse(LocalDate.now()));

        List<ReporteDto.Franja> franjas = jdbcTemplate.query(SQL_FRANJAS, (rs, i) -> {
            LocalDateTime ini = rs.getTimestamp("hora_inicio").toLocalDateTime();
            LocalDateTime fin = rs.getTimestamp("hora_fin").toLocalDateTime();
            return new ReporteDto.Franja(ini, fin, etiqueta(ini, fin));
        }, dia);

        ReporteDto.Franja franja = franjas.stream()
                .filter(f -> inicio == null || f.inicio().equals(inicio))
                .findFirst()
                .orElseGet(() -> franjas.stream().findFirst().orElse(null));

        if (franja == null) {
            return new ReporteDto.ReporteAforoHorario(dia, fechas, null, franjas, List.of(), 0, 0, 0, 0);
        }

        List<ReporteDto.FilaAforoSala> filas = jdbcTemplate.query(SQL_AFORO_FRANJA, (rs, i) -> {
            String charla = rs.getString("charla");
            int inscritos = rs.getInt("inscritos");
            int aforo = rs.getInt("aforo");
            String estado;
            if (charla == null) {
                estado = "SIN CHARLA";
            } else if (aforo > 0 && inscritos >= aforo) {
                estado = "LLENA";
            } else {
                estado = "DISPONIBLE";
            }
            return new ReporteDto.FilaAforoSala(rs.getString("sala"), charla, inscritos, aforo,
                    Math.max(0, aforo - inscritos), estado);
        }, Timestamp.valueOf(franja.inicio()));

        int totalInscritos = filas.stream().mapToInt(ReporteDto.FilaAforoSala::inscritos).sum();
        int totalAforo = filas.stream().mapToInt(ReporteDto.FilaAforoSala::aforo).sum();
        int llenas = (int) filas.stream().filter(f -> "LLENA".equals(f.estado())).count();
        int conCharla = (int) filas.stream().filter(f -> f.charla() != null).count();

        return new ReporteDto.ReporteAforoHorario(dia, fechas, franja, franjas, filas,
                totalInscritos, totalAforo, llenas, conCharla);
    }

    // ------------------------------------------------------------- Descargas

    /** Asistencia por especialidad. */
    public void exportarEspecialidadExcel(OutputStream salida) {
        ReporteDto.ReporteEspecialidad reporte = porEspecialidad();
        escribir(salida, "Por especialidad",
                new String[]{"ESPECIALIDAD", "EN LA BASE", "INGRESARON", "FALTANTES", "% ASISTENCIA"},
                hoja -> {
                    int fila = 1;
                    for (ReporteDto.FilaEspecialidad f : reporte.filas()) {
                        escribirEspecialidad(hoja.createRow(fila++), f);
                    }
                    escribirEspecialidad(hoja.createRow(fila + 1), reporte.total());
                });
    }

    /**
     * Una fila por persona de la base, con nombre, DNI y especialidad, haya
     * ingresado al evento o no. Sirve para saber quien es cada uno detras de
     * los numeros del reporte por especialidad, incluidos los faltantes.
     */
    public void exportarPorPersonaExcel(OutputStream salida) {
        List<Object[]> filas = jdbcTemplate.query(SQL_POR_PERSONA, (rs, i) -> new Object[]{
                rs.getString("dni"), rs.getString("nombre_completo"), rs.getString("especialidad"),
                rs.getString("ingreso"), texto(rs.getTimestamp("fecha_ingreso_evento")),
                rs.getString("tipo_registro"), rs.getString("celular"), rs.getString("correo"),
                rs.getInt("total_charlas"), rs.getString("salas"), rs.getString("charlas"),
        });
        escribir(salida, "Por persona",
                new String[]{"DNI", "NOMBRE", "ESPECIALIDAD", "INGRESO AL EVENTO",
                        "FECHA DE INGRESO", "TIPO REGISTRO", "CELULAR", "CORREO",
                        "N CHARLAS", "SALAS", "CHARLAS"},
                hoja -> volcar(hoja, filas));
    }

    /** Listado de asistentes agrupado por sala y charla. */
    public void exportarPorSalaCharlaExcel(OutputStream salida) {
        List<Object[]> filas = jdbcTemplate.query(SQL_POR_SALA_CHARLA, (rs, i) -> new Object[]{
                rs.getString("sala"), rs.getString("charla"),
                etiqueta(rs.getTimestamp("hora_inicio").toLocalDateTime(),
                        rs.getTimestamp("hora_fin").toLocalDateTime()),
                rs.getString("dni"), rs.getString("nombre_completo"), rs.getString("especialidad"),
                texto(rs.getTimestamp("registrado_en")),
        });
        escribir(salida, "Por sala y charla",
                new String[]{"SALA", "CHARLA", "HORARIO", "DNI", "NOMBRE", "ESPECIALIDAD",
                        "HORA DE INSCRIPCION"},
                hoja -> volcar(hoja, filas));
    }

    /** Una fila por DNI y charla, con marca, capacitador y estado del diploma. */
    public void exportarDetalleExcel(OutputStream salida) {
        List<Object[]> filas = jdbcTemplate.query(SQL_DETALLE, (rs, i) -> new Object[]{
                rs.getString("dni"), rs.getString("nombre_completo"), rs.getString("especialidad"),
                rs.getString("tipo_registro"), texto(rs.getTimestamp("fecha_ingreso_evento")),
                rs.getString("sala"), rs.getString("charla"), rs.getString("marca"),
                rs.getString("capacitador"),
                etiqueta(rs.getTimestamp("hora_inicio").toLocalDateTime(),
                        rs.getTimestamp("hora_fin").toLocalDateTime()),
                texto(rs.getTimestamp("registrado_en")),
                rs.getString("diploma"), rs.getInt("impresiones"),
        });
        escribir(salida, "Detalle completo",
                new String[]{"DNI", "NOMBRE", "ESPECIALIDAD", "TIPO REGISTRO", "INGRESO AL EVENTO",
                        "SALA", "CHARLA", "MARCA", "CAPACITADOR", "HORARIO", "HORA DE INSCRIPCION",
                        "DIPLOMA", "IMPRESIONES"},
                hoja -> volcar(hoja, filas));
    }

    /** Todas las salas y todas las franjas del dia indicado. */
    public void exportarAforoDiaExcel(OutputStream salida, LocalDate fecha) {
        LocalDate dia = fecha != null ? fecha
                : jdbcTemplate.queryForList(SQL_FECHAS, LocalDate.class).stream()
                        .findFirst().orElse(LocalDate.now());
        List<Object[]> filas = jdbcTemplate.query(SQL_AFORO_DIA, (rs, i) -> {
            int inscritos = rs.getInt("inscritos");
            int aforo = rs.getInt("aforo");
            return new Object[]{
                    rs.getDate("fecha").toString(),
                    etiqueta(rs.getTimestamp("hora_inicio").toLocalDateTime(),
                            rs.getTimestamp("hora_fin").toLocalDateTime()),
                    rs.getString("sala"), rs.getString("charla"),
                    inscritos, aforo, Math.max(0, aforo - inscritos),
                    aforo > 0 && inscritos >= aforo ? "LLENA" : "DISPONIBLE",
            };
        }, dia);
        escribir(salida, "Aforos por horario",
                new String[]{"FECHA", "HORARIO", "SALA", "CHARLA", "INSCRITOS", "AFORO", "LIBRES",
                        "ESTADO"},
                hoja -> volcar(hoja, filas));
    }

    // ---------------------------------------------------------------- helpers

    /** Lo que cada reporte escribe dentro de la hoja, debajo de la cabecera. */
    private interface Contenido {
        void escribir(Sheet hoja);
    }

    /**
     * Arma la hoja y la manda al cliente. Usa el modo "streaming" de POI: solo
     * mantiene unas pocas filas en memoria y el resto las va escribiendo, para
     * que un reporte grande no infle la memoria del servidor.
     */
    private void escribir(OutputStream salida, String nombreHoja, String[] cabeceras, Contenido contenido) {
        SXSSFWorkbook wb = new SXSSFWorkbook(100);
        try {
            SXSSFSheet hoja = wb.createSheet(nombreHoja);
            hoja.trackAllColumnsForAutoSizing();

            Font negrita = wb.createFont();
            negrita.setBold(true);
            CellStyle estilo = wb.createCellStyle();
            estilo.setFont(negrita);

            Row cabecera = hoja.createRow(0);
            for (int i = 0; i < cabeceras.length; i++) {
                cabecera.createCell(i).setCellValue(cabeceras[i]);
                cabecera.getCell(i).setCellStyle(estilo);
            }
            contenido.escribir(hoja);
            for (int i = 0; i < cabeceras.length; i++) {
                hoja.autoSizeColumn(i);
            }
            wb.write(salida);
        } catch (IOException e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "No se pudo generar el Excel del reporte.");
        } finally {
            // Borra los archivos temporales que deja el modo streaming.
            wb.dispose();
            try {
                wb.close();
            } catch (IOException ignorado) {
                // El flujo ya se cerro: no hay nada que hacer.
            }
        }
    }

    private void volcar(Sheet hoja, List<Object[]> filas) {
        int n = 1;
        for (Object[] valores : filas) {
            Row row = hoja.createRow(n++);
            for (int i = 0; i < valores.length; i++) {
                Object v = valores[i];
                if (v instanceof Number numero) {
                    row.createCell(i).setCellValue(numero.doubleValue());
                } else {
                    row.createCell(i).setCellValue(v == null ? "" : v.toString());
                }
            }
        }
    }

    private void escribirEspecialidad(Row row, ReporteDto.FilaEspecialidad f) {
        row.createCell(0).setCellValue(f.especialidad());
        row.createCell(1).setCellValue(f.enBase());
        row.createCell(2).setCellValue(f.ingresaron());
        row.createCell(3).setCellValue(f.faltantes());
        row.createCell(4).setCellValue(f.porcentajeAsistencia() + "%");
    }

    private ReporteDto.FilaEspecialidad construirFila(String especialidad, long enBase, long ingresaron) {
        long faltantes = Math.max(0, enBase - ingresaron);
        int porcentaje = enBase > 0 ? (int) Math.round(ingresaron * 100.0 / enBase) : 0;
        return new ReporteDto.FilaEspecialidad(especialidad, enBase, ingresaron, faltantes, porcentaje);
    }

    private String etiqueta(LocalDateTime inicio, LocalDateTime fin) {
        return HORA.format(inicio) + " - " + HORA.format(fin);
    }

    private String texto(Timestamp t) {
        return t == null ? "" : FECHA_HORA.format(t.toLocalDateTime());
    }
}
