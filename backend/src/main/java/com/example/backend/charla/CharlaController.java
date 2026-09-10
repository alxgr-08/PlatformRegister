package com.example.backend.charla;

import com.example.backend.charla.dto.CharlaDto;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Modulo de Charlas: gestion de charlas, aforos y registro de asistentes.
 *
 * Endpoints de administracion (POST/PUT/DELETE de la charla en si) requieren
 * la cabecera X-Admin-Key. El registro de asistentes (.../registros) queda
 * abierto para el personal de salas, que trabaja desde el celular sin login.
 */
@RestController
@RequestMapping("/api/charlas")
public class CharlaController {

    private final CharlaService service;

    public CharlaController(CharlaService service) {
        this.service = service;
    }

    /** Lista las charlas con su estado de ocupacion. Con salaId, solo las de esa sala. */
    @GetMapping
    public List<CharlaDto.Respuesta> listar(
            @RequestParam(required = false) Long salaId,
            @RequestParam(defaultValue = "false") boolean incluirOcultas,
            @RequestParam(defaultValue = "true") boolean incluirFinalizadas) {
        return service.listar(salaId, incluirOcultas, incluirFinalizadas);
    }

    @GetMapping("/{id}")
    public CharlaDto.Respuesta obtener(@PathVariable Long id) {
        return service.obtener(id);
    }

    /** Crea una charla. Requiere X-Admin-Key. */
    @PostMapping
    public ResponseEntity<CharlaDto.Respuesta> crear(@Valid @RequestBody CharlaDto.CrearRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.crear(req));
    }

    /** Edita una charla (incluye su aforo). Requiere X-Admin-Key. */
    @PutMapping("/{id}")
    public CharlaDto.Respuesta actualizar(@PathVariable Long id,
                                          @Valid @RequestBody CharlaDto.ActualizarRequest req) {
        return service.actualizar(id, req);
    }

    /** Elimina una charla y sus inscripciones. Requiere X-Admin-Key. */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        service.eliminar(id);
        return ResponseEntity.noContent().build();
    }

    /** Oculta o muestra una charla (horarios finalizados). Requiere X-Admin-Key. */
    @PatchMapping("/{id}/visibilidad")
    public CharlaDto.Respuesta cambiarVisibilidad(@PathVariable Long id,
                                                  @Valid @RequestBody CharlaDto.VisibilidadRequest req) {
        return service.cambiarVisibilidad(id, req.oculta());
    }

    /** Inscribe un DNI en la charla. Abierto. */
    @PostMapping("/{id}/registros")
    public ResponseEntity<CharlaDto.Respuesta> registrar(@PathVariable Long id,
                                                         @Valid @RequestBody CharlaDto.RegistrarRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.registrarAsistente(id, req.dni()));
    }

    /**
     * Inscribe un DNI en varias charlas a la vez (boton Guardar de la sala).
     * Devuelve cuantas entraron y el detalle de las que no. Abierto.
     */
    @PostMapping("/registros")
    public CharlaDto.ResultadoRegistroMultiple registrarVarias(
            @Valid @RequestBody CharlaDto.RegistrarVariasRequest req) {
        return service.registrarAsistenteEnVarias(req.dni(), req.charlaIds());
    }

    /** Deshace la inscripcion de un DNI en la charla. Abierto. */
    @DeleteMapping("/{id}/registros/{dni}")
    public CharlaDto.Respuesta deshacerRegistro(@PathVariable Long id, @PathVariable String dni) {
        return service.deshacerRegistro(id, dni);
    }

    /** Lista los asistentes inscritos en la charla. */
    @GetMapping("/{id}/registros")
    public List<CharlaDto.RegistroRespuesta> registros(@PathVariable Long id) {
        return service.registrosDeCharla(id);
    }
}
