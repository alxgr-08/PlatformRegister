package com.example.backend.configuracion;

import com.example.backend.configuracion.dto.ConfiguracionDto;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Configuracion general del evento.
 * Las lecturas (GET) quedan abiertas; guardar exige la cabecera X-Admin-Key.
 */
@RestController
@RequestMapping("/api/configuracion")
public class ConfiguracionController {

    private final ConfiguracionService service;

    public ConfiguracionController(ConfiguracionService service) {
        this.service = service;
    }

    /** Aforo del evento con su ocupacion actual. */
    @GetMapping("/aforo")
    public ConfiguracionDto.AforoRespuesta aforo() {
        return service.aforoEvento();
    }

    /** Cambia el aforo del evento (0 = sin limite). Requiere X-Admin-Key. */
    @PutMapping("/aforo")
    public ConfiguracionDto.AforoRespuesta guardarAforo(@Valid @RequestBody ConfiguracionDto.AforoRequest req) {
        return service.guardarAforoEvento(req.aforo());
    }

    /** Calibracion de impresion del diploma (posicion y tamano de cada texto). */
    @GetMapping("/diploma")
    public ConfiguracionDto.CalibracionDiploma calibracion() {
        return service.calibracionDiploma();
    }

    /** Guarda la calibracion del diploma para todas las hojas. Requiere X-Admin-Key. */
    @PutMapping("/diploma")
    public ConfiguracionDto.CalibracionDiploma guardarCalibracion(
            @RequestBody ConfiguracionDto.CalibracionDiploma req) {
        return service.guardarCalibracionDiploma(req);
    }
}
