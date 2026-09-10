package com.example.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Configura CORS (para el frontend) y registra el interceptor de administracion.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final AdminKeyInterceptor adminKeyInterceptor;
    private final String[] origenesPermitidos;

    public WebConfig(AdminKeyInterceptor adminKeyInterceptor,
                     @Value("${app.cors.allowed-origins}") String origenesPermitidos) {
        this.adminKeyInterceptor = adminKeyInterceptor;
        this.origenesPermitidos = origenesPermitidos.split(",");
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(origenesPermitidos)
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true);
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(adminKeyInterceptor)
                .addPathPatterns("/api/charlas/**", "/api/carga/**",
                        "/api/salas/**", "/api/configuracion/**");
    }
}
