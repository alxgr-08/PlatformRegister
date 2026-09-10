package com.example.backend.configuracion;

import com.example.backend.asistente.AsistenteRepository;
import com.example.backend.common.ApiException;
import com.example.backend.configuracion.dto.ConfiguracionDto;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Ajustes generales del evento: aforo total y calibracion del diploma.
 * Se guardan en la tabla "configuracion" para que valgan en todos los
 * dispositivos (la calibracion se hace una vez y sirve para todas las hojas).
 */
@Service
public class ConfiguracionService {

    /** Clave nueva: parte de 0 y no hereda el valor del aforo anterior. */
    static final String CLAVE_AGREGADOS = "evento.agregadosManualmente";
    static final String CLAVE_CALIBRACION = "diploma.calibracion";

    private final ConfiguracionRepository repo;
    private final AsistenteRepository asistenteRepo;
    private final ObjectMapper mapper;

    public ConfiguracionService(ConfiguracionRepository repo,
                                AsistenteRepository asistenteRepo,
                                ObjectMapper mapper) {
        this.repo = repo;
        this.asistenteRepo = asistenteRepo;
        this.mapper = mapper;
    }

    // ---------------------------------------------- Contador de asistentes

    @Transactional(readOnly = true)
    public ConfiguracionDto.ContadorRespuesta contador() {
        return construirContador(leerAgregados());
    }

    /**
     * Suma personas al contador del evento (o resta, con un numero negativo).
     *
     * Sirve para la gente que entro sin pasar por el registro: solo mueve este
     * contador, no crea asistentes ni aparece en charlas, diplomas o reportes.
     * El evento no tiene tope: esto no limita nada, solo cuenta.
     */
    @Transactional
    public ConfiguracionDto.ContadorRespuesta agregarAlContador(int cantidad) {
        long total = leerAgregados() + cantidad;
        if (total < 0) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "No se puede restar mas de lo agregado a mano (hay " + leerAgregados() + ").");
        }
        return fijarAgregados(total);
    }

    /** Fija el total de personas agregadas a mano (se usa para ponerlo en cero). */
    @Transactional
    public ConfiguracionDto.ContadorRespuesta fijarAgregados(long agregados) {
        guardar(CLAVE_AGREGADOS, String.valueOf(Math.max(0, agregados)));
        return construirContador(Math.max(0, agregados));
    }

    /** Personas sumadas a mano al contador. */
    @Transactional(readOnly = true)
    public long leerAgregados() {
        return repo.findById(CLAVE_AGREGADOS)
                .map(Configuracion::getValor)
                .map(v -> {
                    try {
                        return Long.parseLong(v.trim());
                    } catch (NumberFormatException e) {
                        return 0L;
                    }
                })
                .orElse(0L);
    }

    private ConfiguracionDto.ContadorRespuesta construirContador(long agregados) {
        long registrados = asistenteRepo.countByFechaIngresoEventoIsNotNull();
        return new ConfiguracionDto.ContadorRespuesta(registrados, agregados, registrados + agregados);
    }

    // -------------------------------------------------- Calibracion del diploma

    @Transactional(readOnly = true)
    public ConfiguracionDto.CalibracionDiploma calibracionDiploma() {
        return repo.findById(CLAVE_CALIBRACION)
                .map(Configuracion::getValor)
                .map(this::leerCalibracion)
                .orElseGet(ConfiguracionDto.CalibracionDiploma::porDefecto);
    }

    @Transactional
    public ConfiguracionDto.CalibracionDiploma guardarCalibracionDiploma(
            ConfiguracionDto.CalibracionDiploma calibracion) {
        try {
            guardar(CLAVE_CALIBRACION, mapper.writeValueAsString(calibracion));
        } catch (JacksonException e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "No se pudo guardar la calibracion del diploma.");
        }
        return calibracion;
    }

    private ConfiguracionDto.CalibracionDiploma leerCalibracion(String json) {
        try {
            return mapper.readValue(json, ConfiguracionDto.CalibracionDiploma.class);
        } catch (JacksonException e) {
            // Si el valor guardado quedo corrupto, no se rompe la pantalla.
            return ConfiguracionDto.CalibracionDiploma.porDefecto();
        }
    }

    // ------------------------------------------------------------------ comun

    private void guardar(String clave, String valor) {
        Configuracion c = repo.findById(clave).orElseGet(() -> new Configuracion(clave, null));
        c.setValor(valor);
        repo.save(c);
    }
}
