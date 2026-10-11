package com.paytrail.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "paytrail")
public record PayTrailProperties(
        Jwt jwt,
        String internalSecret,
        String publicWebUrl,
        Solana solana,
        Seed seed,
        Bcb bcb) {

    public record Jwt(String secret, int ttlHours) {}

    public record Solana(String usdcMint, String cluster) {}

    public record Seed(String password, String anaSolanaWallet) {}

    /** Cotação do dólar no BCB (API Olinda/PTAX). enabled=false → provedor offline determinístico. */
    public record Bcb(boolean enabled, String baseUrl) {}
}
