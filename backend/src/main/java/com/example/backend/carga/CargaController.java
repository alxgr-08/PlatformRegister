package com.example.backend.carga;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;

/**
 * Modulo de Base de Datos: importar y exportar la base de asistentes.
 * Todos los endpoints requieren la cabecera  X-Admin-Key.
 */
@RestController
@RequestMapping("/api/carga")
public class CargaController {

    private final CargaService service;

    public CargaController(CargaService service) {
        this.service = service;
    }

    /** Importa la base de asistentes desde un Excel (.xlsx). Sin limite de filas. */
    @PostMapping(value = "/asistentes-excel", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public CargaService.Resultado cargarAsistentesExcel(@RequestParam("archivo") MultipartFile archivo) {
        return service.importarAsistentesExcel(archivo);
    }

    /** Descarga toda la base de asistentes en un Excel con el mismo formato de origen. */
    @GetMapping("/exportar")
    public void exportar(HttpServletResponse response) throws IOException {
        String nombre = "BASE_DATOS_EVENTO_" + LocalDate.now() + ".xlsx";
        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        response.setHeader(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + nombre + "\"");
        service.exportarAsistentesExcel(response.getOutputStream());
        response.flushBuffer();
    }

    /** Descarga los asistentes inscritos en una charla especifica. */
    @GetMapping("/exportar/charla/{id}")
    public void exportarCharla(@PathVariable Long id, HttpServletResponse response) throws IOException {
        String nombre = "CHARLA_" + id + "_" + LocalDate.now() + ".xlsx";
        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        response.setHeader(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + nombre + "\"");
        service.exportarAsistentesDeCharlaExcel(id, response.getOutputStream());
        response.flushBuffer();
    }

    /** Importa la base de asistentes desde un CSV (formato simple alternativo). */
    @PostMapping(value = "/asistentes", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public CargaService.Resultado cargarAsistentes(@RequestParam("archivo") MultipartFile archivo) {
        return service.importarAsistentes(archivo);
    }

    /** Descarga una plantilla CSV de ejemplo. */
    @GetMapping("/plantilla")
    public ResponseEntity<byte[]> plantilla() {
        String csv = "dni,nombre_completo,celular,correo,especialidad,tipo_registro\n"
                + "12345678,Juan Perez Gomez,987654321,juan@correo.com,Cardiologia,PRE-REGISTRADO\n";
        byte[] cuerpo = csv.getBytes(StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=plantilla_asistentes.csv")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(cuerpo);
    }
}
