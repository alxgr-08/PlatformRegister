package com.example.backend.reporte;

import com.example.backend.reporte.dto.ReporteDto;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.io.OutputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Modulo de Reportes. Devuelve conteos agregados y descargas en Excel.
 */
@RestController
@RequestMapping("/api/reportes")
public class ReporteController {

    private final ReporteService service;

    public ReporteController(ReporteService service) {
        this.service = service;
    }

    /** Asistencia por especialidad: base, ingresados, faltantes y porcentaje. */
    @GetMapping("/especialidad")
    public ReporteDto.ReporteEspecialidad porEspecialidad() {
        return service.porEspecialidad();
    }

    /**
     * Aforo de cada sala en una franja horaria. Sin parametros toma el primer
     * dia con charlas y su primera franja.
     */
    @GetMapping("/aforo-horario")
    public ReporteDto.ReporteAforoHorario aforoPorHorario(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime inicio) {
        return service.aforoPorHorario(fecha, inicio);
    }

    // ------------------------------------------------------------- Descargas

    @GetMapping("/especialidad/excel")
    public void exportarEspecialidad(HttpServletResponse response) throws IOException {
        descargar(response, "REPORTE_ESPECIALIDAD", service::exportarEspecialidadExcel);
    }

    @GetMapping("/por-persona/excel")
    public void exportarPorPersona(HttpServletResponse response) throws IOException {
        descargar(response, "REPORTE_POR_PERSONA", service::exportarPorPersonaExcel);
    }

    @GetMapping("/por-sala-charla/excel")
    public void exportarPorSalaCharla(HttpServletResponse response) throws IOException {
        descargar(response, "REPORTE_POR_SALA_Y_CHARLA", service::exportarPorSalaCharlaExcel);
    }

    @GetMapping("/detalle/excel")
    public void exportarDetalle(HttpServletResponse response) throws IOException {
        descargar(response, "REPORTE_DETALLE_COMPLETO", service::exportarDetalleExcel);
    }

    /** Aforos de todas las salas y franjas del dia indicado. */
    @GetMapping("/aforo-horario/excel")
    public void exportarAforoDia(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha,
            HttpServletResponse response) throws IOException {
        descargar(response, "REPORTE_AFOROS_POR_HORARIO",
                salida -> service.exportarAforoDiaExcel(salida, fecha));
    }

    /** Escribe el Excel en la respuesta con el nombre de archivo indicado. */
    private void descargar(HttpServletResponse response, String nombre, Escritor escritor)
            throws IOException {
        String archivo = nombre + "_" + LocalDate.now() + ".xlsx";
        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        response.setHeader(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + archivo + "\"");
        escritor.escribir(response.getOutputStream());
        response.flushBuffer();
    }

    private interface Escritor {
        void escribir(OutputStream salida);
    }
}
