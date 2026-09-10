package com.example.backend.charla;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.LocalDateTime;

/**
 * Inscripcion de un asistente en una charla.
 * La restriccion unica (charla_id, asistente_id) impide registros duplicados:
 * un DNI no puede inscribirse dos veces en la misma charla.
 *
 * Cada inscripcion equivale a un diploma. Su estado lleva el control de lo que
 * ya salio por impresora:
 *   diplomaEstado = PENDIENTE  -> nunca se imprimio
 *   diplomaEstado = IMPRESO    -> ya salio al menos una vez
 *   impresiones   > 1          -> se considera reimpreso
 */
@Entity
@Table(name = "registro_charla",
        uniqueConstraints = @UniqueConstraint(name = "uk_registro_charla",
                columnNames = {"charla_id", "asistente_id"}),
        indexes = {
                @Index(name = "idx_registro_charla_charla", columnList = "charla_id"),
                @Index(name = "idx_registro_charla_asistente", columnList = "asistente_id"),
                @Index(name = "idx_registro_charla_diploma", columnList = "diploma_estado")
        })
public class RegistroCharla {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "charla_id", nullable = false)
    private Long charlaId;

    @Column(name = "asistente_id", nullable = false)
    private Long asistenteId;

    @Column(name = "dni", nullable = false, length = 20)
    private String dni;

    @Column(name = "registrado_en", nullable = false)
    private LocalDateTime registradoEn;

    // Sin "nullable = false": asi Hibernate puede agregar la columna sobre una
    // base que ya tenia filas. El codigo trata el null como PENDIENTE.
    @Column(name = "diploma_estado", length = 20)
    private String diplomaEstado = "PENDIENTE";

    @Column(name = "impresiones")
    private Integer impresiones = 0;

    @Column(name = "impreso_en")
    private LocalDateTime impresoEn;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getCharlaId() { return charlaId; }
    public void setCharlaId(Long charlaId) { this.charlaId = charlaId; }

    public Long getAsistenteId() { return asistenteId; }
    public void setAsistenteId(Long asistenteId) { this.asistenteId = asistenteId; }

    public String getDni() { return dni; }
    public void setDni(String dni) { this.dni = dni; }

    public LocalDateTime getRegistradoEn() { return registradoEn; }
    public void setRegistradoEn(LocalDateTime registradoEn) { this.registradoEn = registradoEn; }

    public String getDiplomaEstado() { return diplomaEstado; }
    public void setDiplomaEstado(String diplomaEstado) { this.diplomaEstado = diplomaEstado; }

    public Integer getImpresiones() { return impresiones; }
    public void setImpresiones(Integer impresiones) { this.impresiones = impresiones; }

    public LocalDateTime getImpresoEn() { return impresoEn; }
    public void setImpresoEn(LocalDateTime impresoEn) { this.impresoEn = impresoEn; }
}
