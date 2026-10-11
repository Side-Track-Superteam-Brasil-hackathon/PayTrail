package com.paytrail.auth;

import com.paytrail.config.PayTrailProperties;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
public class SecurityConfig {

    /** Rotas públicas (security: [] em specs/03-api.yaml). /internal/** é protegido pelo InternalSecretFilter. */
    private static final String[] PUBLIC = {
        "/auth/**", "/pay/**", "/verify/**", "/verify", "/internal/**", "/actuator/health"
    };

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http, JwtService jwt, PayTrailProperties props) throws Exception {
        http.csrf(c -> c.disable())
                .cors(c -> {})
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(a -> a.requestMatchers(PUBLIC).permitAll().anyRequest().authenticated())
                .exceptionHandling(e -> e.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
                .addFilterBefore(new InternalSecretFilter(props.internalSecret()), UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(new JwtAuthFilter(jwt), UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(PayTrailProperties props) {
        var cfg = new CorsConfiguration();
        cfg.setAllowedOrigins(List.of(props.publicWebUrl()));
        cfg.setAllowedMethods(List.of("GET", "POST", "PATCH", "DELETE", "OPTIONS"));
        cfg.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        var source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", cfg);
        return source;
    }
}
