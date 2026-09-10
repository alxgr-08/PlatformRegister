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

    static final String CLAVE_AFORO = "evento.aforo";
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

    // ------------------------------------------------------- Aforo del evento

    @Transactional(readOnly = true)
    public ConfiguracionDto.AforoRespuesta aforoEvento() {
        return construirAforo(leerAforo());
    }

    @Transactional
    public ConfiguracionDto.AforoRespuesta guardarAforoEvento(int aforo) {
        guardar(CLAVE_AFORO, String.valueOf(aforo));
        return construirAforo(aforo);
    }

    /** Aforo configurado del evento. 0 significa "sin limite". */
    @Transactional(readOnly = true)
    public int leerAforo() {
        return repo.findById(CLAVE_AFORO)
                .map(Configuracion::getValor)
                .map(v -> {
                    try {
                        return Integer.parseInt(v.trim());
                    } catch (NumberFormatException e) {
                        return 0;
                    }
                })
                .orElse(0);
    }

    private ConfiguracionDto.AforoRespuesta construirAforo(int aforo) {
        long registrados = asistenteRepo.countByFechaIngresoEventoIsNotNull();
        boolean sinLimite = aforo <= 0;
        int disponibles = sinLimite ? 0 : (int) Math.max(0, aforo - registrados);
        int porcentaje = sinLimite ? 0 : (int) Math.round(registrados * 100.0 / aforo);
        return new ConfiguracionDto.AforoRespuesta(aforo, registrados, disponibles, porcentaje, sinLimite);
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
