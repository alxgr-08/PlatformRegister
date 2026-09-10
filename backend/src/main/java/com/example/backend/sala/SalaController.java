package com.example.backend.sala;

import com.example.backend.sala.dto.SalaDto;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Modulo de Salas. Las lecturas (GET) quedan abiertas para que cualquier
 * dispositivo pueda elegir su sala sin usuario ni contrasena; crear, editar y
 * eliminar exigen la cabecera X-Admin-Key.
 */
@RestController
@RequestMapping("/api/salas")
public class SalaController {

    private final SalaService service;

    public SalaController(SalaService service) {
        this.service = service;
    }

    /** Lista las salas configuradas. */
    @GetMapping
    public List<SalaDto.Respuesta> listar(
            @RequestParam(defaultValue = "false") boolean incluirInactivas) {
        return service.listar(incluirInactivas);
    }

    @GetMapping("/{id}")
    public SalaDto.Respuesta obtener(@PathVariable Long id) {
        return service.obtener(id);
    }

    /** Crea una sala. Requiere X-Admin-Key. */
    @PostMapping
    public ResponseEntity<SalaDto.Respuesta> crear(@Valid @RequestBody SalaDto.GuardarRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.crear(req));
    }

    /** Edita una sala. Requiere X-Admin-Key. */
    @PutMapping("/{id}")
    public SalaDto.Respuesta actualizar(@PathVariable Long id,
                                        @Valid @RequestBody SalaDto.GuardarRequest req) {
        return service.actualizar(id, req);
    }

    /** Elimina una sala vacia. Requiere X-Admin-Key. */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        service.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
