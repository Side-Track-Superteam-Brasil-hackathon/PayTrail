package com.paytrail.common;

/** Enums compartilhados entre módulos (specs/01-dominio.md). */
public final class Enums {

    private Enums() {}

    public enum Role { FREELANCER, ACCOUNTANT }

    /** MVP: somente SOLANA. ARC reservado (roadmap). */
    public enum Network { SOLANA, ARC }

    public enum FxRule { CARNE_LEAO, PTAX_DAY }
}
