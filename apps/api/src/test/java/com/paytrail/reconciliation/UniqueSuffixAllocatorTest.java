package com.paytrail.reconciliation;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.Test;

class UniqueSuffixAllocatorTest {

    @Test
    void addsCentsSuffixBetween01And99() {
        var unique = UniqueSuffixAllocator.allocate(new BigDecimal("1500.00"), List.of(), new Random(1)).orElseThrow();
        var suffix = unique.subtract(new BigDecimal("1500.00"));
        assertThat(suffix).isBetween(new BigDecimal("0.01"), new BigDecimal("0.99"));
        assertThat(unique.scale()).isEqualTo(6);
    }

    @Test
    void neverReusesASuffixInUse() {
        var used = new ArrayList<BigDecimal>();
        for (int cents = 1; cents <= 98; cents++) used.add(BigDecimal.valueOf(cents, 2));
        var unique = UniqueSuffixAllocator.allocate(new BigDecimal("10.00"), used, new Random(7)).orElseThrow();
        assertThat(unique).isEqualByComparingTo("10.99");
    }

    /** Caso 13: a 100ª fatura aberta na mesma carteira não tem sufixo livre. */
    @Test
    void case13_noFreeSuffix() {
        var used = new ArrayList<BigDecimal>();
        for (int cents = 1; cents <= 99; cents++) used.add(BigDecimal.valueOf(cents, 2).setScale(6));
        assertThat(UniqueSuffixAllocator.allocate(new BigDecimal("10.00"), used, new Random(3))).isEmpty();
    }
}
