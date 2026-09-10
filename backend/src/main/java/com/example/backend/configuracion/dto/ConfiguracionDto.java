package com.example.backend.configuracion.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * Objetos de transferencia (DTO) de la configuracion general del evento.
 */
public final class ConfiguracionDto {

    private ConfiguracionDto() {
    }

    /** Aforo maximo del evento. 0 = sin limite. */
    public record AforoRequest(
            @NotNull(message = "Indique el aforo del evento")
            @Min(value = 0, message = "El aforo no puede ser negativo") Integer aforo
    ) {
    }

    /** Aforo del evento con su ocupacion actual. */
    public record AforoRespuesta(
            int aforo,
            long registrados,
            int disponibles,
            int porcentajeOcupacion,
            boolean sinLimite
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
