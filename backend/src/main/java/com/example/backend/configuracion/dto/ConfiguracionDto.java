package com.example.backend.configuracion.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * Objetos de transferencia (DTO) de la configuracion general del evento.
 */
public final class ConfiguracionDto {

    private ConfiguracionDto() {
    }

    /**
     * Personas a sumar (o restar, con un numero negativo) al contador de
     * asistentes al evento.
     */
    public record AgregarAlContadorRequest(
            @NotNull(message = "Indique cuantas personas agregar") Integer cantidad
    ) {
    }

    /** Total acumulado de personas agregadas a mano al contador. */
    public record AgregadosRequest(
            @NotNull(message = "Indique el total de personas agregadas")
            @Min(value = 0, message = "No puede ser negativo") Integer agregados
    ) {
    }

    /**
     * Contador de asistentes al evento.
     *
     * "registradosPorDni" son las personas que pasaron por el registro y tienen
     * su DNI en la base. "agregadosManualmente" son las que entraron sin
     * registrarse y el administrador suma a mano: solo cuentan para este total,
     * no aparecen en charlas, diplomas ni reportes.
     */
    public record ContadorRespuesta(
            long registradosPorDni,
            long agregadosManualmente,
            long total
    ) {
    }

    /**
     * Posicion y estilo de un texto dentro de la hoja del diploma.
     * Las medidas van en milimetros desde el borde superior izquierdo de la hoja,
     * para que coincidan exactamente con lo que sale por la impresora.
     */
    public record CampoDiploma(
            boolean visible,
            double x,
            double y,
            double ancho,
            double tamano,
            String alineacion,
            boolean negrita,
            boolean mayusculas
    ) {
        public CampoDiploma {
            if (alineacion == null || alineacion.isBlank()) {
                alineacion = "centro";
            }
        }
    }

    /**
     * Calibracion de impresion del diploma: se ajusta UNA sola vez y se aplica
     * a todas las hojas que se manden a imprimir, en cualquier dispositivo.
     */
    public record CalibracionDiploma(
            String tamanoHoja,
            double anchoHoja,
            double altoHoja,
            String orientacion,
            double desplazamientoX,
            double desplazamientoY,
            String fuente,
            CampoDiploma nombre,
            CampoDiploma charla,
            CampoDiploma marca,
            CampoDiploma capacitador,
            CampoDiploma fecha
    ) {
        /** Valores iniciales: hoja A4 horizontal con los textos centrados. */
        public static CalibracionDiploma porDefecto() {
            return new CalibracionDiploma(
                    "A4", 297, 210, "horizontal", 0, 0, "Georgia, 'Times New Roman', serif",
                    new CampoDiploma(true, 20, 112, 257, 32, "centro", true, true),
                    new CampoDiploma(true, 20, 70, 257, 16, "centro", true, false),
                    new CampoDiploma(true, 20, 84, 257, 13, "centro", false, false),
                    new CampoDiploma(true, 20, 95, 257, 13, "centro", false, false),
                    new CampoDiploma(true, 20, 160, 257, 12, "centro", false, false));
        }
    }
}
