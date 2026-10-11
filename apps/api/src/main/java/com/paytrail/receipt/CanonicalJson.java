package com.paytrail.receipt;

import com.fasterxml.jackson.core.io.JsonStringEncoder;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.HexFormat;

/**
 * JSON canônico dos comprovantes (specs/02-conciliacao.md §4): chaves ordenadas, sem espaços,
 * números como string. Canonicalizar um JSON já canônico devolve o mesmo texto (e o mesmo hash).
 */
public final class CanonicalJson {

    /** Floats viram BigDecimal (sem perda), para "1500.10" continuar "1500.10". */
    private static final ObjectMapper MAPPER = new ObjectMapper()
            .setNodeFactory(JsonNodeFactory.withExactBigDecimals(true))
            .enable(DeserializationFeature.USE_BIG_DECIMAL_FOR_FLOATS)
            .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS);

    private CanonicalJson() {}

    public static JsonNode parse(String json) {
        try {
            return MAPPER.readTree(json);
        } catch (Exception e) {
            throw new IllegalArgumentException("invalid JSON", e);
        }
    }

    public static String canonicalize(String json) {
        return canonicalize(parse(json));
    }

    public static String canonicalize(JsonNode node) {
        var sb = new StringBuilder();
        write(node, sb);
        return sb.toString();
    }

    public static String sha256Hex(String canonical) {
        try {
            var digest = MessageDigest.getInstance("SHA-256").digest(canonical.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private static void write(JsonNode node, StringBuilder sb) {
        if (node == null || node.isNull() || node.isMissingNode()) {
            sb.append("null");
        } else if (node.isObject()) {
            var names = new ArrayList<String>();
            node.fieldNames().forEachRemaining(names::add);
            names.sort(null);
            sb.append('{');
            for (int i = 0; i < names.size(); i++) {
                if (i > 0) sb.append(',');
                quote(names.get(i), sb);
                sb.append(':');
                write(node.get(names.get(i)), sb);
            }
            sb.append('}');
        } else if (node.isArray()) {
            sb.append('[');
            for (int i = 0; i < node.size(); i++) {
                if (i > 0) sb.append(',');
                write(node.get(i), sb);
            }
            sb.append(']');
        } else if (node.isNumber()) {
            quote(node.isIntegralNumber() ? node.bigIntegerValue().toString() : node.decimalValue().toPlainString(), sb);
        } else if (node.isBoolean()) {
            sb.append(node.booleanValue());
        } else {
            quote(node.asText(), sb);
        }
    }

    private static void quote(String s, StringBuilder sb) {
        sb.append('"');
        JsonStringEncoder.getInstance().quoteAsString(s, sb);
        sb.append('"');
    }
}
