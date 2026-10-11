package com.paytrail.common;

import org.springframework.http.HttpStatus;

/** Erro de negócio. Vira { "code", "message" } na resposta (ver specs/03-api.yaml). */
public class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    public ApiException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public HttpStatus status() {
        return status;
    }

    public String code() {
        return code;
    }
}
