package com.paytrail.common;

import com.paytrail.common.Enums.Network;
import com.paytrail.config.PayTrailProperties;
import org.springframework.stereotype.Component;

/** Links do explorer montados pela API (specs/04-onchain.md). */
@Component
public class ExplorerLinks {

    private static final String LOCAL_RPC = "http%3A%2F%2Flocalhost%3A8899";

    private final String clusterQuery;

    public ExplorerLinks(PayTrailProperties props) {
        var cluster = props.solana() == null ? null : props.solana().cluster();
        this.clusterQuery = clusterQuery(cluster);
    }

    static String clusterQuery(String cluster) {
        if (cluster == null || cluster.isBlank() || cluster.equals("mainnet-beta") || cluster.equals("mainnet")) return "";
        if (cluster.equals("custom") || cluster.equals("localnet") || cluster.equals("localhost")) {
            return "?cluster=custom&customUrl=" + LOCAL_RPC;
        }
        return "?cluster=" + cluster;
    }

    public String tx(Network network, String txHash) {
        if (network != Network.SOLANA || txHash == null) return null;
        return "https://explorer.solana.com/tx/" + txHash + clusterQuery;
    }
}
