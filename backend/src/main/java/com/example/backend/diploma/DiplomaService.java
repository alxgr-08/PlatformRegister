package com.example.backend.diploma;

import com.example.backend.asistente.Asistente;
import com.example.backend.asistente.AsistenteRepository;
import com.example.backend.charla.Charla;
import com.example.backend.charla.CharlaRepository;
import com.example.backend.charla.RegistroCharla;
import com.example.backend.charla.RegistroCharlaRepository;
import com.example.backend.common.ApiException;
import com.example.backend.asistente.dto.AsistenteDto;
import com.example.backend.diploma.dto.DiplomaDto;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Diplomas por DNI.
 *
 * Cada inscripcion a una charla es un diploma. El estado permite distinguir
 * los pendientes de los ya impresos, y reimprimir uno solo sin volver a sacar
 * los demas.
 */
@Service
public class DiplomaService {

    private static final String PENDIENTE = "PENDIENTE";
    private static final String IMPRESO = "IMPRESO";

    private final RegistroCharlaRepository registroRepo;
    private final CharlaRepository charlaRepo;
    private final AsistenteRepository asistenteRepo;

    public DiplomaService(RegistroCharlaRepository registroRepo,
                          CharlaRepository charlaRepo,
                          AsistenteRepository asistenteRepo) {
        this.registroRepo = registroRepo;
        this.charlaRepo = charlaRepo;
        this.asistenteRepo = asistenteRepo;
    }

    /** Busca por DNI y devuelve la persona con todas sus charlas / diplomas. */
    @Transactional(readOnly = true)
    public DiplomaDto.BusquedaRespuesta buscarPorDni(String dni) {
        Asistente a = buscarAsistente(dni);
        List<RegistroCharla> registros = registroRepo.findByAsistenteIdOrderByRegistradoEnAsc(a.getId());
        Map<Long, Charla> charlas = charlaRepo.findAllById(
                        registros.stream().map(RegistroCharla::getCharlaId).toList()).stream()
                .collect(Collectors.toMap(Charla::getId, Function.identity()));

        List<DiplomaDto.Respuesta> diplomas = registros.stream()
                .map(r -> aRespuesta(r, charlas.get(r.getCharlaId()), a))
                .filter(d -> d != null)
                .toList();

        int pendientes = (int) diplomas.stream().filter(d -> PENDIENTE.equals(d.estado())).count();
        return new DiplomaDto.BusquedaRespuesta(aRespuestaAsistente(a), diplomas,
                pendientes, diplomas.size() - pendientes);
    }

    /**
     * Marca como impresos los diplomas seleccionados. Se llama despues de
     * mandar las hojas a la impresora: suma una impresion a cada uno, de modo
     * que un diploma que ya estaba impreso queda registrado como reimpreso.
     */
    @Transactional
    public List<DiplomaDto.Respuesta> marcarImpresos(List<Long> registroIds) {
        List<RegistroCharla> registros = registroRepo.findAllById(registroIds);
        if (registros.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "No se encontraron los diplomas indicados.");
        }
        LocalDateTime ahora = LocalDateTime.now();
        registros.forEach(r -> {
            r.setImpresiones((r.getImpresiones() == null ? 0 : r.getImpresiones()) + 1);
            r.setDiplomaEstado(IMPRESO);
            r.setImpresoEn(ahora);
        });
        registroRepo.saveAll(registros);

        Map<Long, Charla> charlas = charlaRepo.findAllById(
                        registros.stream().map(RegistroCharla::getCharlaId).toList()).stream()
                .collect(Collectors.toMap(Charla::getId, Function.identity()));
        Map<Long, Asistente> asistentes = asistenteRepo.findAllById(
                        registros.stream().map(RegistroCharla::getAsistenteId).toList()).stream()
                .collect(Collectors.toMap(Asistente::getId, Function.identity()));

        return registros.stream()
                .map(r -> aRespuesta(r, charlas.get(r.getCharlaId()), asistentes.get(r.getAsistenteId())))
                .filter(d -> d != null)
                .toList();
    }

    /** Deshace la marca de impreso de un diploma (volver a dejarlo pendiente). */
    @Transactional
    public DiplomaDto.Respuesta marcarPendiente(Long registroId) {
        RegistroCharla r = registroRepo.findById(registroId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                        "No existe el diploma con id " + registroId));
        r.setDiplomaEstado(PENDIENTE);
        r.setImpresiones(0);
        r.setImpresoEn(null);
        registroRepo.save(r);
        return aRespuesta(r, charlaRepo.findById(r.getCharlaId()).orElse(null),
                asistenteRepo.findById(r.getAsistenteId()).orElse(null));
    }

    /** Conteos generales: pendientes, impresos y reimpresos. */
    @Transactional(readOnly = true)
    public DiplomaDto.Resumen resumen() {
        // El conteo se basa en las impresiones y no en la etiqueta de estado, para
        // que tambien sea correcto sobre filas que venian de la version anterior.
        long total = registroRepo.count();
        long impresos = registroRepo.countByImpresionesGreaterThan(0);
        long reimpresos = registroRepo.countByImpresionesGreaterThan(1);
        return new DiplomaDto.Resumen(total, total - impresos, impresos, reimpresos);
    }

    // ---------------------------------------------------------------- helpers

    private Asistente buscarAsistente(String dni) {
        String d = dni == null ? null : dni.trim();
        return asistenteRepo.findByDni(d)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                        "No existe un asistente con el DNI " + dni));
    }

    private DiplomaDto.Respuesta aRespuesta(RegistroCharla r, Charla c, Asistente a) {
        if (c == null || a == null) {
            return null;
        }
        int impresiones = r.getImpresiones() == null ? 0 : r.getImpresiones();
        String estado = impresiones > 0 ? IMPRESO : PENDIENTE;
        return new DiplomaDto.Respuesta(
                r.getId(), c.getId(), a.getDni(), a.getNombreCompleto(),
                c.getNombre(), c.getSala(), c.getMarca(), c.getCapacitador(),
                c.getHoraInicio(), c.getHoraFin(),
                estado, impresiones, impresiones > 1, r.getImpresoEn());
    }

    private AsistenteDto.Respuesta aRespuestaAsistente(Asistente a) {
        return new AsistenteDto.Respuesta(
                a.getId(), a.getDni(), a.getNombreCompleto(), a.getNombre(), a.getApellidos(),
                a.getCelular(), a.getCorreo(), a.getEspecialidad(), a.getTipoRegistro(),
                a.getFechaIngresoEvento() != null, a.getFechaIngresoEvento());
    }
}
