package com.example.backend.reporte;

import com.example.backend.common.ApiException;
import com.example.backend.reporte.dto.ReporteDto;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.List;

/**
 * Reportes del evento.
 *
 * Reporte por especialidad: compara cuantas personas de cada especialidad
 * estaban en la base contra cuantas realmente ingresaron al evento, contando
 * cada DNI una sola vez.
 */
@Service
public class ReporteService {

    private static final String SQL_ESPECIALIDAD = """
            select coalesce(nullif(btrim(especialidad), ''), 'SIN ESPECIALIDAD') as especialidad,
                   count(distinct dni)                                            as en_base,
                   count(distinct dni) filter (where fecha_ingreso_evento is not null) as ingresaron
            from asistente
            group by 1
            order by en_base desc, especialidad
            """;

    private static final String[] CABECERAS = {
            "ESPECIALIDAD", "EN LA BASE", "INGRESARON", "FALTANTES", "% ASISTENCIA"
    };

    private final JdbcTemplate jdbcTemplate;

    public ReporteService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional(readOnly = true)
    public ReporteDto.ReporteEspecialidad porEspecialidad() {
        List<ReporteDto.FilaEspecialidad> filas = jdbcTemplate.query(SQL_ESPECIALIDAD, (rs, i) -> {
            String especialidad = rs.getString("especialidad");
            long enBase = rs.getLong("en_base");
            long ingresaron = rs.getLong("ingresaron");
            return construirFila(especialidad, enBase, ingresaron);
        });

        long enBase = filas.stream().mapToLong(ReporteDto.FilaEspecialidad::enBase).sum();
        long ingresaron = filas.stream().mapToLong(ReporteDto.FilaEspecialidad::ingresaron).sum();
        return new ReporteDto.ReporteEspecialidad(filas, construirFila("TOTAL", enBase, ingresaron));
    }

    /** Escribe el reporte por especialidad en un Excel (.xlsx). */
    public void exportarEspecialidadExcel(OutputStream salida) {
        ReporteDto.ReporteEspecialidad reporte = porEspecialidad();
        try (Workbook wb = new XSSFWorkbook()) {
            Sheet hoja = wb.createSheet("Por especialidad");

            Font negrita = wb.createFont();
            negrita.setBold(true);
            CellStyle estiloNegrita = wb.createCellStyle();
            estiloNegrita.setFont(negrita);

            Row cabecera = hoja.createRow(0);
            for (int i = 0; i < CABECERAS.length; i++) {
                cabecera.createCell(i).setCellValue(CABECERAS[i]);
                cabecera.getCell(i).setCellStyle(estiloNegrita);
            }

            int fila = 1;
            List<ReporteDto.FilaEspecialidad> todas = new ArrayList<>(reporte.filas());
            for (ReporteDto.FilaEspecialidad f : todas) {
                escribirFila(hoja.createRow(fila++), f, null);
            }
            // Una linea en blanco antes del total, para que se lea claro.
            fila++;
            escribirFila(hoja.createRow(fila), reporte.total(), estiloNegrita);

            for (int i = 0; i < CABECERAS.length; i++) {
                hoja.autoSizeColumn(i);
            }
            wb.write(salida);
        } catch (IOException e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "No se pudo generar el Excel del reporte.");
        }
    }

    private void escribirFila(Row row, ReporteDto.FilaEspecialidad f, CellStyle estilo) {
        row.createCell(0).setCellValue(f.especialidad());
        row.createCell(1).setCellValue(f.enBase());
        row.createCell(2).setCellValue(f.ingresaron());
        row.createCell(3).setCellValue(f.faltantes());
        row.createCell(4).setCellValue(f.porcentajeAsistencia() + "%");
        if (estilo != null) {
            for (int i = 0; i < CABECERAS.length; i++) {
                row.getCell(i).setCellStyle(estilo);
            }
        }
    }

    private ReporteDto.FilaEspecialidad construirFila(String especialidad, long enBase, long ingresaron) {
        long faltantes = Math.max(0, enBase - ingresaron);
        int porcentaje = enBase > 0 ? (int) Math.round(ingresaron * 100.0 / enBase) : 0;
        return new ReporteDto.FilaEspecialidad(especialidad, enBase, ingresaron, faltantes, porcentaje);
    }
}
