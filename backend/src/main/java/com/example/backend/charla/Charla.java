package com.example.backend.charla;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

/**
 * Charla del evento. Pertenece a una sala (salaId) y guarda ademas la marca y
 * el capacitador, que son los datos que se imprimen en el diploma.
 *
 * El campo "registrados" es un contador que se actualiza de forma atomica
 * para controlar el aforo bajo alta concurrencia.
 */
@Entity
@Table(name = "charla",
        indexes = @Index(name = "idx_charla_sala", columnList = "sala_id"))
public class Charla {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String nombre;

    /** Nombre de la sala. Se mantiene sincronizado con la sala enlazada. */
    @Column(nullable = false, length = 100)
    private String sala;

    @Column(name = "sala_id")
    private Long salaId;

    @Column(length = 150)
    private String marca;

    @Column(length = 150)
    private String capacitador;

    @Column(name = "hora_inicio", nullable = false)
    private LocalDateTime horaInicio;

    @Column(name = "hora_fin", nullable = false)
    private LocalDateTime horaFin;

    @Column(nullable = false)
    private Integer aforo;

    @Column(nullable = false)
    private Integer registrados = 0;

    @Column(nullable = false)
    private Boolean oculta = false;

    @Column(name = "creado_en", nullable = false, updatable = false)
    private LocalDateTime creadoEn;

    @PrePersist
    void prePersist() {
        if (creadoEn == null) {
            creadoEn = LocalDateTime.now();
        }
        if (registrados == null) {
            registrados = 0;
        }
        if (oculta == null) {
            oculta = false;
        }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getSala() { return sala; }
    public void setSala(String sala) { this.sala = sala; }

    public Long getSalaId() { return salaId; }
    public void setSalaId(Long salaId) { this.salaId = salaId; }

    public String getMarca() { return marca; }
    public void setMarca(String marca) { this.marca = marca; }

    public String getCapacitador() { return capacitador; }
    public void setCapacitador(String capacitador) { this.capacitador = capacitador; }

    public LocalDateTime getHoraInicio() { return horaInicio; }
    public void setHoraInicio(LocalDateTime horaInicio) { this.horaInicio = horaInicio; }

    public LocalDateTime getHoraFin() { return horaFin; }
    public void setHoraFin(LocalDateTime horaFin) { this.horaFin = horaFin; }

    public Integer getAforo() { return aforo; }
    public void setAforo(Integer aforo) { this.aforo = aforo; }

    public Integer getRegistrados() { return registrados; }
    public void setRegistrados(Integer registrados) { this.registrados = registrados; }

    public Boolean getOculta() { return oculta; }
    public void setOculta(Boolean oculta) { this.oculta = oculta; }

    public LocalDateTime getCreadoEn() { return creadoEn; }
    public void setCreadoEn(LocalDateTime creadoEn) { this.creadoEn = creadoEn; }
}
