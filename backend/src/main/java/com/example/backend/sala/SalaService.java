package com.example.backend.sala;

import com.example.backend.charla.Charla;
import com.example.backend.charla.CharlaRepository;
import com.example.backend.common.ApiException;
import com.example.backend.sala.dto.SalaDto;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Alta, edicion y baja de las salas del evento.
 * Una sala solo se puede eliminar si no tiene charlas configuradas.
 */
@Service
public class SalaService {

    private final SalaRepository repo;
    private final CharlaRepository charlaRepo;

    public SalaService(SalaRepository repo, CharlaRepository charlaRepo) {
        this.repo = repo;
        this.charlaRepo = charlaRepo;
    }

    @Transactional(readOnly = true)
    public List<SalaDto.Respuesta> listar(boolean incluirInactivas) {
        return repo.findAllByOrderByOrdenAscNombreAsc().stream()
                .filter(s -> incluirInactivas || Boolean.TRUE.equals(s.getActiva()))
                .map(this::aRespuesta)
                .toList();
    }

    @Transactional(readOnly = true)
    public SalaDto.Respuesta obtener(Long id) {
        return aRespuesta(buscarEntidad(id));
    }

    @Transactional
    public SalaDto.Respuesta crear(SalaDto.GuardarRequest req) {
        String nombre = req.nombre().trim();
        if (repo.existsByNombreIgnoreCase(nombre)) {
            throw new ApiException(HttpStatus.CONFLICT, "Ya existe una sala llamada \"" + nombre + "\".");
        }
        Sala s = new Sala();
        s.setNombre(nombre);
        s.setOrden(req.orden() != null ? req.orden() : siguienteOrden());
        s.setActiva(req.activa() == null || req.activa());
        return aRespuesta(repo.save(s));
    }

    @Transactional
    public SalaDto.Respuesta actualizar(Long id, SalaDto.GuardarRequest req) {
        Sala s = buscarEntidad(id);
        String nombre = req.nombre().trim();
        repo.findByNombreIgnoreCase(nombre)
                .filter(otra -> !otra.getId().equals(id))
                .ifPresent(otra -> {
                    throw new ApiException(HttpStatus.CONFLICT,
                            "Ya existe una sala llamada \"" + nombre + "\".");
                });

        boolean cambioNombre = !nombre.equals(s.getNombre());
        s.setNombre(nombre);
        if (req.orden() != null) {
            s.setOrden(req.orden());
        }
        if (req.activa() != null) {
            s.setActiva(req.activa());
        }
        Sala guardada = repo.save(s);

        // Mantiene sincronizado el nombre de la sala dentro de cada charla.
        if (cambioNombre) {
            List<Charla> charlas = charlaRepo.findBySalaIdOrderByHoraInicioAsc(id);
            charlas.forEach(c -> c.setSala(nombre));
            charlaRepo.saveAll(charlas);
        }
        return aRespuesta(guardada);
    }

    @Transactional
    public void eliminar(Long id) {
        Sala s = buscarEntidad(id);
        long charlas = charlaRepo.countBySalaId(id);
        if (charlas > 0) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "La sala \"" + s.getNombre() + "\" tiene " + charlas
                            + " charla(s). Eliminalas primero o desactiva la sala.");
        }
        repo.delete(s);
    }

    /** Busca la entidad por id o lanza 404. Uso interno / otros modulos. */
    public Sala buscarEntidad(Long id) {
        return repo.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                        "No existe una sala con el id " + id));
    }

    private int siguienteOrden() {
        return repo.findAllByOrderByOrdenAscNombreAsc().stream()
                .mapToInt(s -> s.getOrden() == null ? 0 : s.getOrden())
                .max()
                .orElse(0) + 1;
    }

    private SalaDto.Respuesta aRespuesta(Sala s) {
        List<Charla> charlas = charlaRepo.findBySalaIdOrderByHoraInicioAsc(s.getId());
        int aforo = charlas.stream().mapToInt(c -> c.getAforo() == null ? 0 : c.getAforo()).sum();
        int registrados = charlas.stream().mapToInt(c -> c.getRegistrados() == null ? 0 : c.getRegistrados()).sum();
        int visibles = (int) charlas.stream().filter(c -> !Boolean.TRUE.equals(c.getOculta())).count();
        return new SalaDto.Respuesta(s.getId(), s.getNombre(),
                s.getOrden() == null ? 0 : s.getOrden(),
                Boolean.TRUE.equals(s.getActiva()),
                charlas.size(), visibles, aforo, registrados);
    }
}
