package com.paytrail.common;

import java.math.BigInteger;
import java.security.SecureRandom;

/** Base58 (alfabeto Bitcoin/Solana). Usado para validar endereços e gerar a reference do Solana Pay. */
public final class Base58 {

    private static final String ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    private static final BigInteger BASE = BigInteger.valueOf(58);
    private static final SecureRandom RANDOM = new SecureRandom();

    private Base58() {}

    public static String encode(byte[] input) {
        var n = new BigInteger(1, input);
        var sb = new StringBuilder();
        while (n.signum() > 0) {
            var qr = n.divideAndRemainder(BASE);
            sb.append(ALPHABET.charAt(qr[1].intValue()));
            n = qr[0];
        }
        for (byte b : input) {
            if (b != 0) break;
            sb.append('1');
        }
        return sb.reverse().toString();
    }

    public static byte[] decode(String input) {
        var n = BigInteger.ZERO;
        for (char c : input.toCharArray()) {
            int digit = ALPHABET.indexOf(c);
            if (digit < 0) throw new IllegalArgumentException("invalid base58 character: " + c);
            n = n.multiply(BASE).add(BigInteger.valueOf(digit));
        }
        var bytes = n.toByteArray();
        boolean stripSign = bytes.length > 1 && bytes[0] == 0;
        int leadingZeros = 0;
        while (leadingZeros < input.length() && input.charAt(leadingZeros) == '1') leadingZeros++;
        int len = bytes.length - (stripSign ? 1 : 0);
        if (n.signum() == 0) len = 0;
        var out = new byte[leadingZeros + len];
        System.arraycopy(bytes, stripSign ? 1 : 0, out, leadingZeros, len);
        return out;
    }

    /** Endereço Solana = 32 bytes em base58. */
    public static boolean isSolanaAddress(String s) {
        if (s == null || s.length() < 32 || s.length() > 44) return false;
        try {
            return decode(s).length == 32;
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    /** Reference do Solana Pay: 32 bytes aleatórios (não precisa estar na curva). */
    public static String randomSolanaReference() {
        var bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return encode(bytes);
    }
}
