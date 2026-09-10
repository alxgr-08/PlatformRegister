package com.example.backend.charla;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CharlaRepository extends JpaRepository<Charla, Long> {

    List<Charla> findAllByOrderByHoraInicioAsc();

    List<Charla> findBySalaIdOrderByHoraInicioAsc(Long salaId);

    long countBySalaId(Long salaId);

    /**
     * Incrementa el contador de registrados solo si aun hay aforo disponible.
     * Devuelve 1 si lo logro, 0 si el aforo ya esta completo.
     * Es una operacion atomica: evita condiciones de carrera con varios
     * usuarios registrando al mismo tiempo.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update Charla c set c.registrados = c.registrados + 1 "
            + "where c.id = :id and c.registrados < c.aforo")
    int incrementarRegistrados(@Param("id") Long id);

    /**
     * Disminuye el contador de registrados (al deshacer una inscripcion).
     * No baja de cero.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update Charla c set c.registrados = c.registrados - 1 "
            + "where c.id = :id and c.registrados > 0")
    int decrementarRegistrados(@Param("id") Long id);
}
