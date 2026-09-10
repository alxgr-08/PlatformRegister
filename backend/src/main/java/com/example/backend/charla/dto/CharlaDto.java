package com.example.backend.charla.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

/**
 * Objetos de transferencia (DTO) del modulo de charlas.
 */
public final class CharlaDto {

    private CharlaDto() {
    }

    /** Cuerpo para crear una charla dentro de una sala. */
    public record CrearRequest(
            @NotBlank(message = "El nombre de la charla es obligatorio") String nombre,
            @NotNull(message = "Indique la sala de la charla") Long salaId,
            String marca,
            String capacitador,
            @NotNull(message = "La hora de inicio es obligatoria") LocalDateTime horaInicio,
            @NotNull(message = "La hora de fin es obligatoria") LocalDateTime horaFin,
            @NotNull(message = "El aforo es obligatorio")
            @Min(value = 0, message = "El aforo no puede ser negativo") Integer aforo
    ) {
    }

    /** Cuerpo para editar una charla. */
    public record ActualizarRequest(
            @NotBlank(message = "El nombre de la charla es obligatorio") String nombre,
            @NotNull(message = "Indique la sala de la charla") Long salaId,
            String marca,
            String capacitador,
            @NotNull(message = "La hora de inicio es obligatoria") LocalDateTime horaInicio,
            @NotNull(message = "La hora de fin es obligatoria") LocalDateTime horaFin,
            @NotNull(message = "El aforo es obligatorio")
            @Min(value = 0, message = "El aforo no puede ser negativo") Integer aforo,
            Boolean oculta
    ) {
    }

    /** Cuerpo para ocultar / mostrar una charla. */
    public record VisibilidadRequest(
            @NotNull(message = "Indique el valor de 'oculta'") Boolean oculta
    ) {
    }

    /** Cuerpo para inscribir un DNI en una charla. */
    public record RegistrarRequest(
            @NotBlank(message = "El DNI es obligatorio") String dni
    ) {
    }

    /** Cuerpo para inscribir un DNI en varias charlas de una sola vez. */
    public record RegistrarVariasRequest(
            @NotBlank(message = "El DNI es obligatorio") String dni,
            @NotNull(message = "Indique las charlas a registrar") java.util.List<Long> charlaIds
    ) {
    }

    /** Resultado de un registro multiple: que charlas entraron y cuales no. */
    public record ResultadoRegistroMultiple(
            int registradas,
            java.util.List<String> errores,
            java.util.List<Respuesta> charlas
    ) {
    }

    /** Datos de una charla con su estado de ocupacion calculado. */
    public record Respuesta(
            Long id,
            String nombre,
            String sala,
            Long salaId,
            String marca,
            String capacitador,
            LocalDateTime horaInicio,
            LocalDateTime horaFin,
            int aforo,
            int registrados,
            int disponibles,
            int porcentajeOcupacion,
            String nivelOcupacion,
            String estado,
            boolean oculta,
            boolean finalizada
    ) {
    }

    /** Una inscripcion dentro de una charla. */
    public record RegistroRespuesta(
            Long registroId,
            Long charlaId,
            String dni,
            String nombreCompleto,
            LocalDateTime registradoEn
    ) {
    }
}
