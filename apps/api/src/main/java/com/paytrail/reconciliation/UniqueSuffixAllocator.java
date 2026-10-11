package com.paytrail.reconciliation;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.Optional;
import java.util.random.RandomGenerator;

/**
 * Sorteia o sufixo de centavos (0.01–0.99) que identifica a fatura (specs/02-conciliacao.md §1).
 * O sufixo precisa ser único entre as faturas abertas da mesma carteira e rede.
 */
public final class UniqueSuffixAllocator {

    private UniqueSuffixAllocator() {}

    /**
     * @param base          valor cobrado (escala 2 ou menor)
     * @param usedSuffixes  sufixos ({@code uniqueAmount − baseAmount}) das faturas OPEN/PARTIALLY_PAID da carteira
     * @return valor único, ou vazio se os 99 sufixos estiverem em uso (→ 409 NO_UNIQUE_SUFFIX)
     */
    public static Optional<BigDecimal> allocate(BigDecimal base, Collection<BigDecimal> usedSuffixes, RandomGenerator rnd) {
        var usedCents = new HashSet<Integer>();
        for (var s : usedSuffixes) {
            usedCents.add(s.movePointRight(2).intValue());
        }
        var free = new ArrayList<Integer>();
        for (int cents = 1; cents <= 99; cents++) {
            if (!usedCents.contains(cents)) free.add(cents);
        }
        if (free.isEmpty()) return Optional.empty();
        int cents = free.get(rnd.nextInt(free.size()));
        return Optional.of(base.add(BigDecimal.valueOf(cents, 2)).setScale(6));
    }
}
