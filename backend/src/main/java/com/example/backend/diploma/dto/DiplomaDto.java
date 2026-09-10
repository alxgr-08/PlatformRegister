package com.example.backend.diploma.dto;

import com.example.backend.asistente.dto.AsistenteDto;
import jakarta.validation.constraints.NotEmpty;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Objetos de transferencia (DTO) del modulo de diplomas.
 * Cada inscripcion a una charla equivale a un diploma: si la persona asistio a
 * 3 charlas, tiene 3 diplomas y se imprimen 3 hojas.
 */
public final class DiplomaDto {

    private DiplomaDto() {
    }

    /** Un diploma: los datos que se imprimen y su estado. */
    public record Respuesta(
            Long registroId,
            Long charlaId,
            String dni,
            String nombreCompleto,
            String charla,
            String sala,
            String marca,
            String capacitador,
            LocalDateTime horaInicio,
            LocalDateTime horaFin,
            String estado,
            int impresiones,
            boolean reimpreso,
            LocalDateTime impresoEn
    ) {
    }

    /** Resultado de buscar por DNI: la persona y todos sus diplomas. */
    public record BusquedaRespuesta(
            AsistenteDto.Respuesta asistente,
            List<Respuesta> diplomas,
            int pendientes,
            int impresos
    ) {
    }

    /** Cuerpo para marcar como impresos los diplomas seleccionados. */
    public record MarcarImpresosRequest(
            @NotEmpty(message = "Selecciona al menos un diploma") List<Long> registroIds
    ) {
    }

    /** Conteos generales de diplomas para el tablero. */
    public record Resumen(
            long total,
            long pendientes,
            long impresos,
            long reimpresos
    ) {
    }
}
