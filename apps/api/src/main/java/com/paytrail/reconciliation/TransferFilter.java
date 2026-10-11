package com.paytrail.reconciliation;

import java.util.Set;

/** Passo 1 do pipeline: só interessa USDC enviado para a carteira de algum usuário. */
public final class TransferFilter {

    private TransferFilter() {}

    public static boolean isRelevant(String token, String usdcToken, String toAddress, Set<String> knownWallets) {
        return usdcToken.equals(token) && knownWallets.contains(toAddress);
    }
}
