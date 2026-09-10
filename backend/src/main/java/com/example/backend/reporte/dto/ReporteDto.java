package com.example.backend.reporte.dto;

import java.util.List;

/**
 * Objetos de transferencia (DTO) del modulo de reportes.
 */
public final class ReporteDto {

    private ReporteDto() {
    }

    /** Una fila del reporte por especialidad. Los DNI se cuentan una sola vez. */
    public record FilaEspecialidad(
            String especialidad,
            long enBase,
            long ingresaron,
            long faltantes,
            int porcentajeAsistencia
    ) {
    }

    /** Reporte completo por especialidad con su fila de totales. */
    public record ReporteEspecialidad(
            List<FilaEspecialidad> filas,
            FilaEspecialidad total
    ) {
    }
}
