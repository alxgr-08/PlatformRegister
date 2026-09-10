package com.example.backend.charla;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RegistroCharlaRepository extends JpaRepository<RegistroCharla, Long> {

    boolean existsByCharlaIdAndAsistenteId(Long charlaId, Long asistenteId);

    Optional<RegistroCharla> findByCharlaIdAndAsistenteId(Long charlaId, Long asistenteId);

    List<RegistroCharla> findByCharlaIdOrderByRegistradoEnAsc(Long charlaId);

    List<RegistroCharla> findByAsistenteIdOrderByRegistradoEnAsc(Long asistenteId);

    long deleteByCharlaId(Long charlaId);

    long countByImpresionesGreaterThan(int impresiones);
}
