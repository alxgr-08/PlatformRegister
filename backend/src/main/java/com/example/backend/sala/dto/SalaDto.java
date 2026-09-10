package com.example.backend.sala.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Objetos de transferencia (DTO) del modulo de salas.
 */
public final class SalaDto {

    private SalaDto() {
    }

    /** Cuerpo para crear o editar una sala. */
    public record GuardarRequest(
            @NotBlank(message = "El nombre de la sala es obligatorio")
            @Size(max = 100, message = "El nombre no puede superar los 100 caracteres")
            String nombre,
            Integer orden,
            Boolean activa
    ) {
    }

    /** Sala con el resumen de lo que tiene configurado. */
    public record Respuesta(
            Long id,
            String nombre,
            int orden,
            boolean activa,
            int totalCharlas,
            int charlasVisibles,
            int aforoTotal,
            int registradosTotal
    ) {
    }
}
