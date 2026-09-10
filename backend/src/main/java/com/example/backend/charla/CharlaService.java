package com.example.backend.charla;

import com.example.backend.asistente.Asistente;
import com.example.backend.asistente.AsistenteRepository;
import com.example.backend.charla.dto.CharlaDto;
import com.example.backend.common.ApiException;
import com.example.backend.sala.Sala;
import com.example.backend.sala.SalaRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Logica del modulo de Charlas: alta y edicion dentro de cada sala,
 * control de aforo e inscripcion de asistentes ya registrados al evento.
 */
@Service
public class CharlaService {

    private final CharlaRepository charlaRepo;
    private final RegistroCharlaRepository registroRepo;
    private final AsistenteRepository asistenteRepo;
    private final SalaRepository salaRepo;

    public CharlaService(CharlaRepository charlaRepo,
                         RegistroCharlaRepository registroRepo,
                         AsistenteRepository asistenteRepo,
                         SalaRepository salaRepo) {
        this.charlaRepo = charlaRepo;
        this.registroRepo = registroRepo;
        this.asistenteRepo = asistenteRepo;
        this.salaRepo = salaRepo;
    }

    /**
     * Lista las charlas. Si se indica salaId, devuelve solo las de esa sala:
     * es lo que usa cada dispositivo despues de elegir en que sala esta.
     */
    @Transactional(readOnly = true)
    public List<CharlaDto.Respuesta> listar(Long salaId, boolean incluirOcultas, boolean incluirFinalizadas) {
        LocalDateTime ahora = LocalDateTime.now();
        List<Charla> base = salaId == null
                ? charlaRepo.findAllByOrderByHoraInicioAsc()
                : charlaRepo.findBySalaIdOrderByHoraInicioAsc(salaId);
        return base.stream()
                .filter(c -> incluirOcultas || !Boolean.TRUE.equals(c.getOculta()))
                .filter(c -> incluirFinalizadas || !c.getHoraFin().isBefore(ahora))
                .map(this::aRespuesta)
                .toList();
    }

    @Transactional(readOnly = true)
    public CharlaDto.Respuesta obtener(Long id) {
        return aRespuesta(buscarEntidad(id));
    }

    @Transactional
    public CharlaDto.Respuesta crear(CharlaDto.CrearRequest req) {
        validarHorario(req.horaInicio(), req.horaFin());
        Sala sala = buscarSala(req.salaId());
        Charla c = new Charla();
        c.setNombre(req.nombre().trim());
        c.setSalaId(sala.getId());
        c.setSala(sala.getNombre());
        c.setMarca(limpiar(req.marca()));
        c.setCapacitador(limpiar(req.capacitador()));
        c.setHoraInicio(req.horaInicio());
        c.setHoraFin(req.horaFin());
        c.setAforo(req.aforo());
        c.setRegistrados(0);
        c.setOculta(false);
        return aRespuesta(charlaRepo.save(c));
    }

    @Transactional
    public CharlaDto.Respuesta actualizar(Long id, CharlaDto.ActualizarRequest req) {
        validarHorario(req.horaInicio(), req.horaFin());
        Sala sala = buscarSala(req.salaId());
        Charla c = buscarEntidad(id);
        int yaInscritos = c.getRegistrados() == null ? 0 : c.getRegistrados();
        if (req.aforo() < yaInscritos) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "La charla ya tiene " + yaInscritos
                            + " inscritos: el aforo no puede ser menor a esa cantidad.");
        }
        c.setNombre(req.nombre().trim());
        c.setSalaId(sala.getId());
        c.setSala(sala.getNombre());
        c.setMarca(limpiar(req.marca()));
        c.setCapacitador(limpiar(req.capacitador()));
        c.setHoraInicio(req.horaInicio());
        c.setHoraFin(req.horaFin());
        c.setAforo(req.aforo());
        if (req.oculta() != null) {
            c.setOculta(req.oculta());
        }
        return aRespuesta(charlaRepo.save(c));
    }

    @Transactional
    public void eliminar(Long id) {
        Charla c = buscarEntidad(id);
        registroRepo.deleteByCharlaId(id);
        charlaRepo.delete(c);
    }

    @Transactional
    public CharlaDto.Respuesta cambiarVisibilidad(Long id, boolean oculta) {
        Charla c = buscarEntidad(id);
        c.setOculta(oculta);
        return aRespuesta(charlaRepo.save(c));
    }

    /**
     * Inscribe un asistente en una charla. Es atomico y seguro ante concurrencia:
     *  - el asistente debe haber ingresado primero al evento;
     *  - no puede estar ya inscrito en esa charla;
     *  - solo se inscribe si hay aforo disponible.
     */
    @Transactional
    public CharlaDto.Respuesta registrarAsistente(Long charlaId, String dni) {
        Charla charla = buscarEntidad(charlaId);
        Asistente asistente = buscarAsistente(dni);

        if (asistente.getFechaIngresoEvento() == null) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "El asistente debe registrar primero su ingreso al evento.");
        }
        if (registroRepo.existsByCharlaIdAndAsistenteId(charlaId, asistente.getId())) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "El DNI " + asistente.getDni() + " ya esta registrado en esta charla.");
        }
        // Nadie puede estar en dos charlas a la vez, aunque sean de salas distintas.
        Charla cruzada = charlaQueSeCruza(asistente.getId(), charla);
        if (cruzada != null) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "El DNI " + asistente.getDni() + " ya esta inscrito en \""
                            + cruzada.getNombre() + "\" (" + cruzada.getSala()
                            + "), que es a la misma hora. No puede estar en dos charlas a la vez.");
        }

        int actualizadas = charlaRepo.incrementarRegistrados(charlaId);
        if (actualizadas == 0) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "El aforo de la charla " + charla.getNombre() + " esta completo.");
        }

        RegistroCharla r = new RegistroCharla();
        r.setCharlaId(charlaId);
        r.setAsistenteId(asistente.getId());
        r.setDni(asistente.getDni());
        r.setRegistradoEn(LocalDateTime.now());
        r.setDiplomaEstado("PENDIENTE");
        r.setImpresiones(0);
        registroRepo.save(r);

        return aRespuesta(buscarEntidad(charlaId));
    }

    /**
     * Inscribe un DNI en varias charlas de una sola vez: es el boton Guardar de
     * la pantalla de sala. Las que fallen se informan una por una sin cortar el
     * resto, para que el operador vea exactamente que paso con cada charla.
     */
    @Transactional
    public CharlaDto.ResultadoRegistroMultiple registrarAsistenteEnVarias(String dni, List<Long> charlaIds) {
        List<String> errores = new ArrayList<>();
        List<CharlaDto.Respuesta> resultado = new ArrayList<>();
        int registradas = 0;
        for (Long charlaId : charlaIds) {
            try {
                resultado.add(registrarAsistente(charlaId, dni));
                registradas++;
            } catch (ApiException e) {
                String nombre = charlaRepo.findById(charlaId)
                        .map(Charla::getNombre)
                        .orElse("Charla " + charlaId);
                errores.add(nombre + ": " + e.getMessage());
            }
        }
        return new CharlaDto.ResultadoRegistroMultiple(registradas, errores, resultado);
    }

    /** Deshace la inscripcion de un DNI en una charla y libera un cupo. */
    @Transactional
    public CharlaDto.Respuesta deshacerRegistro(Long charlaId, String dni) {
        buscarEntidad(charlaId);
        Asistente asistente = buscarAsistente(dni);
        RegistroCharla r = registroRepo.findByCharlaIdAndAsistenteId(charlaId, asistente.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                        "El DNI " + asistente.getDni() + " no esta registrado en esta charla."));
        registroRepo.delete(r);
        charlaRepo.decrementarRegistrados(charlaId);
        return aRespuesta(buscarEntidad(charlaId));
    }

    @Transactional(readOnly = true)
    public List<CharlaDto.RegistroRespuesta> registrosDeCharla(Long charlaId) {
        buscarEntidad(charlaId);
        List<RegistroCharla> registros = registroRepo.findByCharlaIdOrderByRegistradoEnAsc(charlaId);
        Map<Long, String> nombres = asistenteRepo.findAllById(
                        registros.stream().map(RegistroCharla::getAsistenteId).toList()).stream()
                .collect(Collectors.toMap(Asistente::getId, Asistente::getNombreCompleto));
        return registros.stream()
                .map(r -> new CharlaDto.RegistroRespuesta(r.getId(), r.getCharlaId(), r.getDni(),
                        nombres.get(r.getAsistenteId()), r.getRegistradoEn()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CharlaDto.Respuesta> charlasDeAsistente(String dni) {
        Asistente asistente = buscarAsistente(dni);
        List<Long> ids = registroRepo.findByAsistenteIdOrderByRegistradoEnAsc(asistente.getId()).stream()
                .map(RegistroCharla::getCharlaId)
                .toList();
        Map<Long, Charla> charlas = charlaRepo.findAllById(ids).stream()
                .collect(Collectors.toMap(Charla::getId, Function.identity()));
        return ids.stream()
                .map(charlas::get)
                .filter(c -> c != null)
                .map(this::aRespuesta)
                .toList();
    }

    // ---------------------------------------------------------------- helpers

    /**
     * Devuelve la charla en la que el asistente ya esta inscrito y que se
     * cruza en horario con la que se quiere registrar, o null si no hay cruce.
     */
    private Charla charlaQueSeCruza(Long asistenteId, Charla nueva) {
        List<Long> ids = registroRepo.findByAsistenteIdOrderByRegistradoEnAsc(asistenteId).stream()
                .map(RegistroCharla::getCharlaId)
                .toList();
        if (ids.isEmpty()) {
            return null;
        }
        return charlaRepo.findAllById(ids).stream()
                .filter(otra -> seCruzan(nueva, otra))
                .findFirst()
                .orElse(null);
    }

    /** Dos charlas se cruzan si sus horarios se pisan aunque sea un minuto. */
    private boolean seCruzan(Charla a, Charla b) {
        return a.getHoraInicio().isBefore(b.getHoraFin())
                && b.getHoraInicio().isBefore(a.getHoraFin());
    }

    private Charla buscarEntidad(Long id) {
        return charlaRepo.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                        "No existe una charla con el id " + id));
    }

    private Sala buscarSala(Long salaId) {
        return salaRepo.findById(salaId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                        "No existe una sala con el id " + salaId));
    }

    private Asistente buscarAsistente(String dni) {
        String d = dni == null ? null : dni.trim();
        return asistenteRepo.findByDni(d)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                        "No existe un asistente con el DNI " + dni));
    }

    private void validarHorario(LocalDateTime inicio, LocalDateTime fin) {
        if (inicio == null || fin == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Debe indicar la hora de inicio y de fin.");
        }
        if (!fin.isAfter(inicio)) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "La hora de fin debe ser posterior a la hora de inicio.");
        }
    }

    private String limpiar(String valor) {
        if (valor == null) {
            return null;
        }
        String v = valor.trim();
        return v.isEmpty() ? null : v;
    }

    private CharlaDto.Respuesta aRespuesta(Charla c) {
        int aforo = c.getAforo() == null ? 0 : c.getAforo();
        int registrados = c.getRegistrados() == null ? 0 : c.getRegistrados();
        int disponibles = Math.max(0, aforo - registrados);
        int porcentaje = aforo > 0 ? (int) Math.round(registrados * 100.0 / aforo) : 100;
        String nivel = porcentaje < 60 ? "VERDE" : (porcentaje < 85 ? "NARANJA" : "ROJO");
        boolean finalizada = c.getHoraFin().isBefore(LocalDateTime.now());
        String estado = finalizada ? "FINALIZADA" : (registrados >= aforo ? "LLENA" : "DISPONIBLE");
        return new CharlaDto.Respuesta(
                c.getId(), c.getNombre(), c.getSala(), c.getSalaId(), c.getMarca(), c.getCapacitador(),
                c.getHoraInicio(), c.getHoraFin(),
                aforo, registrados, disponibles, porcentaje, nivel, estado,
                Boolean.TRUE.equals(c.getOculta()), finalizada);
    }
}
