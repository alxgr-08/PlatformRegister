package com.example.backend.asistente.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

/**
 * Objetos de transferencia (DTO) del modulo de asistentes.
 */
public final class AsistenteDto {

    private AsistenteDto() {
    }

    /** Cuerpo para crear un nuevo asistente desde la pantalla de registro. */
    public record CrearRequest(
            @NotBlank(message = "El DNI es obligatorio")
            @Size(max = 20, message = "El DNI no puede superar los 20 caracteres")
            String dni,

            @NotBlank(message = "El nombre completo es obligatorio")
            @Size(max = 200, message = "El nombre no puede superar los 200 caracteres")
            String nombreCompleto,

            @Size(max = 30) String celular,
            @Size(max = 150) String correo,
            @Size(max = 150) String especialidad
    ) {
    }

    /** Cuerpo para editar los datos de un asistente existente. */
    public record ActualizarRequest(
            @NotBlank(message = "El nombre completo es obligatorio")
            @Size(max = 200, message = "El nombre no puede superar los 200 caracteres")
            String nombreCompleto,

            @Size(max = 30) String celular,
            @Size(max = 150) String correo,
            @Size(max = 150) String especialidad
    ) {
    }

    /** Datos de un asistente devueltos al cliente. */
    public record Respuesta(
            Long id,
            String dni,
            String nombreCompleto,
            String nombre,
            String apellidos,
            String celular,
            String correo,
            String especialidad,
            String tipoRegistro,
            boolean ingresadoAlEvento,
            LocalDateTime fechaIngresoEvento
    ) {
    }

    /** Resultado de buscar por DNI: indica si existe y, de existir, sus datos. */
    public record Busqueda(
            boolean encontrado,
            Respuesta asistente
    ) {
    }

    /**
     * Conteos del tablero de registro general.
     *
     * "En base" es todo lo que existe en la tabla; "ingresados" es quien ya
     * marco su ingreso al evento. De los ingresados se separa cuantos venian
     * pre-registrados y cuantos se crearon en puerta, con su porcentaje sobre
     * el total de ingresados.
     */
    public record Estadisticas(
            long totalAsistentes,
            long registradosPorDni,
            long agregadosManualmente,
            long totalIngresadosAlEvento,
            long preRegistradosEnBase,
            long nuevosEnBase,
            long preRegistradosIngresados,
            long nuevosIngresados,
            int porcentajeIngresados,
            int porcentajePreRegistrados,
            int porcentajeNuevos
    ) {
    }
}
