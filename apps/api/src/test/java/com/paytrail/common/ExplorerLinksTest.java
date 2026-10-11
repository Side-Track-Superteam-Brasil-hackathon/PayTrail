package com.paytrail.common;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class ExplorerLinksTest {

    @Test
    void clusterQuery() {
        assertThat(ExplorerLinks.clusterQuery("devnet")).isEqualTo("?cluster=devnet");
        assertThat(ExplorerLinks.clusterQuery("mainnet-beta")).isEmpty();
        assertThat(ExplorerLinks.clusterQuery("custom")).isEqualTo("?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899");
        assertThat(ExplorerLinks.clusterQuery("localnet")).isEqualTo("?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899");
    }
}
