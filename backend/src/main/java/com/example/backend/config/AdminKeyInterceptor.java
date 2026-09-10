package com.example.backend.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * Protege los endpoints de administracion. Exige la cabecera X-Admin-Key con
 * la clave configurada en app.admin-key.
 *
 * Quedan ABIERTOS (no requieren clave), porque los usa el personal de puerta y
 * de salas desde el celular sin login:
 *   - cualquier peticion GET, salvo el modulo de carga;
 *   - el registro de asistentes en charlas  (.../registros);
 *   - ocultar / mostrar una charla          (.../visibilidad).
 *
 * El modulo de carga (importar y exportar la base) exige clave siempre.
 */
@Component
public class AdminKeyInterceptor implements HandlerInterceptor {

    private final String adminKey;

    public AdminKeyInterceptor(@Value("${app.admin-key}") String adminKey) {
        this.adminKey = adminKey;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws Exception {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }
        if (esAbierto(request)) {
            return true;
        }
        String provista = request.getHeader("X-Admin-Key");
        if (adminKey != null && adminKey.equals(provista)) {
            return true;
        }
        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write(
                "{\"status\":401,\"error\":\"Unauthorized\","
                        + "\"mensaje\":\"Falta o es invalida la cabecera X-Admin-Key.\"}");
        return false;
    }

    private boolean esAbierto(HttpServletRequest request) {
        String path = request.getRequestURI();
        if (path.contains("/api/carga/")) {
            return false;
        }
        return "GET".equalsIgnoreCase(request.getMethod())
                || path.contains("/registros")
                || path.contains("/visibilidad");
    }
}
