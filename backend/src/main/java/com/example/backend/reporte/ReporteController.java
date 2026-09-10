package com.example.backend.reporte;

import com.example.backend.reporte.dto.ReporteDto;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.time.LocalDate;

/**
 * Modulo de Reportes. Solo devuelve conteos agregados, asi que queda abierto.
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

    /** Descarga el reporte por especialidad en Excel. */
    @GetMapping("/especialidad/excel")
    public void exportarEspecialidad(HttpServletResponse response) throws IOException {
        String nombre = "REPORTE_ESPECIALIDAD_" + LocalDate.now() + ".xlsx";
        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        response.setHeader(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + nombre + "\"");
        service.exportarEspecialidadExcel(response.getOutputStream());
        response.flushBuffer();
    }
}
