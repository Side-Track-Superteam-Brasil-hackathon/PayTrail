package com.paytrail.common;

import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ApiException.class)
    ResponseEntity<Map<String, String>> handleApi(ApiException e) {
        return ResponseEntity.status(e.status()).body(Map.of("code", e.code(), "message", e.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<Map<String, String>> handleValidation(MethodArgumentNotValidException e) {
        var field = e.getBindingResult().getFieldError();
        var message = field == null ? "invalid request" : field.getField() + ": " + field.getDefaultMessage();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("code", "VALIDATION_ERROR", "message", message));
    }
}
