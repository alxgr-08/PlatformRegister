package com.example.backend.asistente;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AsistenteRepository extends JpaRepository<Asistente, Long> {

    Optional<Asistente> findByDni(String dni);

    boolean existsByDni(String dni);

    long countByFechaIngresoEventoIsNotNull();

    long countByTipoRegistro(String tipoRegistro);

    long countByTipoRegistroAndFechaIngresoEventoIsNotNull(String tipoRegistro);
}
