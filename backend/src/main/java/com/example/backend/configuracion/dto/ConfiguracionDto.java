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
        /**
         * Valores iniciales pensados para el arte del diploma de la feria:
         * hoja A4 horizontal, con la foto ocupando el tercio izquierdo y los
         * textos centrados en la columna de la derecha (de 131 a 293 mm).
         *
         * Cada texto cae en el espacio en blanco que sigue a su rotulo ya
         * impreso, en este orden de arriba hacia abajo:
         *   titulo -> nombre -> "especializacion en:" -> charla ->
         *   "Brindada por:" -> marca -> "CAPACITADOR:" -> capacitador ->
         *   "Fecha:" -> fecha.
         *
         * Son solo un punto de partida: se afinan una vez desde la pantalla de
         * calibracion y quedan guardados para todas las hojas.
         */
        public static CalibracionDiploma porDefecto() {
            return new CalibracionDiploma(
                    "A4", 297, 210, "horizontal", 0, 0,
                    "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
                    new CampoDiploma(true, 131, 58.8, 162, 17, "centro", true, true),
                    new CampoDiploma(true, 131, 76, 162, 17, "centro", true, false),
                    new CampoDiploma(true, 131, 103, 162, 14, "centro", false, false),
                    new CampoDiploma(true, 131, 127, 162, 14, "centro", false, false),
                    new CampoDiploma(true, 131, 151, 162, 13, "centro", false, false));
        }
    }
}
