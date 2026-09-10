package com.example.backend.diploma;

import com.example.backend.diploma.dto.DiplomaDto;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Modulo de Diplomas: buscar por DNI, ver las charlas de la persona y llevar
 * el control de lo impreso. Queda abierto (sin clave) porque lo opera el
 * personal del stand de diplomas.
 */
@RestController
@RequestMapping("/api/diplomas")
public class DiplomaController {

    private final DiplomaService service;

    public DiplomaController(DiplomaService service) {
        this.service = service;
    }

    /** Conteos generales: pendientes, impresos y reimpresos. */
    @GetMapping("/resumen")
    public DiplomaDto.Resumen resumen() {
        return service.resumen();
    }

    /** Busca por DNI y devuelve la persona con todos sus diplomas. */
    @GetMapping("/{dni}")
    public DiplomaDto.BusquedaRespuesta buscar(@PathVariable String dni) {
        return service.buscarPorDni(dni);
    }

    /** Marca como impresos los diplomas seleccionados (tras mandarlos a imprimir). */
    @PostMapping("/impresion")
    public List<DiplomaDto.Respuesta> marcarImpresos(
            @Valid @RequestBody DiplomaDto.MarcarImpresosRequest req) {
        return service.marcarImpresos(req.registroIds());
    }

    /** Devuelve un diploma al estado pendiente (corrige una marca equivocada). */
    @PostMapping("/{registroId}/pendiente")
    public DiplomaDto.Respuesta marcarPendiente(@PathVariable Long registroId) {
        return service.marcarPendiente(registroId);
    }
}
