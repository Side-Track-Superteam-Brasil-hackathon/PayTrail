package com.paytrail.auth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.springframework.web.filter.OncePerRequestFilter;

/** Protege /internal/** (watcher → API) com o header X-Internal-Secret. */
public class InternalSecretFilter extends OncePerRequestFilter {

    private final byte[] secret;

    public InternalSecretFilter(String secret) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException("INTERNAL_SECRET não configurado");
        }
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest req) {
        return !req.getRequestURI().startsWith(req.getContextPath() + "/internal/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        var given = req.getHeader("X-Internal-Secret");
        if (given == null || !MessageDigest.isEqual(secret, given.getBytes(StandardCharsets.UTF_8))) {
            res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }
        chain.doFilter(req, res);
    }
}
