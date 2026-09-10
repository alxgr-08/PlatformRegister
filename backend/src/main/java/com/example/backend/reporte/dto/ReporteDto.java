package com.example.backend.reporte.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
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

    /** Una franja horaria del dia (el horario de una charla). */
    public record Franja(
            LocalDateTime inicio,
            LocalDateTime fin,
            String etiqueta
    ) {
    }

    /** Ocupacion de una sala en la franja consultada. */
    public record FilaAforoSala(
            String sala,
            String charla,
            int inscritos,
            int aforo,
            int libres,
            String estado
    ) {
    }

    /**
     * Aforo por sala y horario: cuanta gente hay inscrita en la charla que cada
     * sala tiene programada en esa franja.
     */
    public record ReporteAforoHorario(
            LocalDate fecha,
            List<LocalDate> fechasDisponibles,
            Franja franja,
            List<Franja> franjas,
            List<FilaAforoSala> filas,
            int totalInscritos,
            int totalAforo,
            int salasLlenas,
            int salasConCharla
    ) {
    }
}
