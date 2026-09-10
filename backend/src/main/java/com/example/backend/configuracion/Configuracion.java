package com.example.backend.configuracion;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

/**
 * Ajuste general del evento guardado como par clave/valor.
 * Se usa para el aforo del evento y para la calibracion del diploma, de modo
 * que la misma configuracion valga para todos los dispositivos.
 */
@Entity
@Table(name = "configuracion")
public class Configuracion {

    @Id
    @Column(length = 80)
    private String clave;

    @Column(columnDefinition = "text")
    private String valor;

    @Column(name = "actualizado_en", nullable = false)
    private LocalDateTime actualizadoEn;

    @PrePersist
    @PreUpdate
    void marcarActualizacion() {
        actualizadoEn = LocalDateTime.now();
    }

    public Configuracion() {
    }

    public Configuracion(String clave, String valor) {
        this.clave = clave;
        this.valor = valor;
    }

    public String getClave() { return clave; }
    public void setClave(String clave) { this.clave = clave; }

    public String getValor() { return valor; }
    public void setValor(String valor) { this.valor = valor; }

    public LocalDateTime getActualizadoEn() { return actualizadoEn; }
    public void setActualizadoEn(LocalDateTime actualizadoEn) { this.actualizadoEn = actualizadoEn; }
}
