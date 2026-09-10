package com.example.backend.configuracion;

import com.example.backend.configuracion.dto.ConfiguracionDto;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
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

    /** Contador de asistentes: registrados por DNI + agregados a mano. */
    @GetMapping("/contador")
    public ConfiguracionDto.ContadorRespuesta contador() {
        return service.contador();
    }

    /**
     * Suma personas al contador del evento (negativo para restar).
     * Es solo un contador: no crea asistentes ni afecta charlas ni diplomas.
     * Requiere X-Admin-Key.
     */
    @PostMapping("/contador")
    public ConfiguracionDto.ContadorRespuesta agregarAlContador(
            @Valid @RequestBody ConfiguracionDto.AgregarAlContadorRequest req) {
        return service.agregarAlContador(req.cantidad());
    }

    /** Fija el total de personas agregadas a mano. Requiere X-Admin-Key. */
    @PutMapping("/contador")
    public ConfiguracionDto.ContadorRespuesta fijarAgregados(
            @Valid @RequestBody ConfiguracionDto.AgregadosRequest req) {
        return service.fijarAgregados(req.agregados());
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
