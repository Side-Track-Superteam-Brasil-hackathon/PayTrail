package com.paytrail.report;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.paytrail.CoreApiTest;
import com.paytrail.market.AccessLog;
import com.paytrail.market.AccessLogRepository;
import com.paytrail.market.AccountantAccess;
import com.paytrail.market.AccountantAccessRepository;
import com.paytrail.market.Conversation;
import com.paytrail.market.ConversationRepository;
import com.paytrail.market.Proposal;
import com.paytrail.market.ProposalRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

/** Relatório mensal (specs/02 §5) e A8/A9: acesso do contador com log. */
class ReportIntegrationTest extends CoreApiTest {

    @Autowired
    ConversationRepository conversations;

    @Autowired
    ProposalRepository proposals;

    @Autowired
    AccountantAccessRepository accesses;

    @Autowired
    AccessLogRepository logs;

    Account ana;
    String txA;
    String txB;
    String uniqueA;
    String uniqueB;
    String publicIdA;

    @BeforeEach
    void setUp() throws Exception {
        ana = freelancer("ana@test.dev");
        var a = createInvoice(ana, "1500.00", "Acme, \"Global\" Inc", LocalDate.of(2026, 12, 31));
        var b = createInvoice(ana, "800.00");
        uniqueA = a.get("uniqueAmount").asText();
        uniqueB = b.get("uniqueAmount").asText();
        publicIdA = a.get("publicId").asText();
        txA = sig();
        txB = sig();
        // 14/10 BRT → outubro
        send(transfer(txA, ana.wallet(), uniqueA, referenceOf(a)));
        // 31/10 23:30 BRT (01/11 02:30 UTC) → ainda outubro
        send(transferAt(txB, ana.wallet(), uniqueB, "2026-11-01T02:30:00Z", USDC));
        // 30/09 23:00 BRT (01/10 02:00 UTC) → setembro: fora
        send(transferAt(sig(), ana.wallet(), "100.00", "2026-10-01T02:00:00Z", USDC, referenceOf(createInvoice(ana, "100.00"))));
        // não conciliado em outubro
        send(transferAt(sig(), ana.wallet(), "57.30", "2026-10-20T12:00:00Z", USDC));
    }

    private AccountantAccess grant(Account accountant, LocalDate start, LocalDate end) {
        var conv = conversations.save(Conversation.between(accountant.id(), ana.id()));
        var proposal = proposals.save(new Proposal(conv.getId(), accountant.id(), ana.id(), accountant.id(), ana.id(),
                new BigDecimal("150.00"), Proposal.FeeCurrency.BRL, start, end, null));
        return accesses.save(new AccountantAccess(accountant.id(), ana.id(), proposal.getId(), start, end));
    }

    @Test
    void ownerMonthlyReport() throws Exception {
        var report = getJson("/reports/monthly?month=2026-10", ana);
        assertThat(report.get("month").asText()).isEqualTo("2026-10");
        assertThat(report.get("freelancerId").asText()).isEqualTo(ana.id().toString());
        assertThat(report.get("rows")).hasSize(2);
        assertThat(report.get("unmatchedCount").asInt()).isEqualTo(1);
        var total = dec(report.get("rows").get(0).get("amountUsdc")).add(dec(report.get("rows").get(1).get("amountUsdc")));
        assertThat(total).isEqualByComparingTo(new BigDecimal(uniqueA).add(new BigDecimal(uniqueB)));
        assertThat(dec(report.get("totalUsdc"))).isEqualByComparingTo(total);
        assertThat(report.get("totalBrl").asText())
                .isEqualTo(total.multiply(RATE).setScale(2, java.math.RoundingMode.HALF_UP).toPlainString());

        var row = report.get("rows").get(0);
        assertThat(row.get("txHash").asText()).isEqualTo(txA);
        assertThat(row.get("invoicePublicId").asText()).isEqualTo(publicIdA);
        assertThat(row.get("clientName").asText()).isEqualTo("Acme, \"Global\" Inc");
        assertThat(row.get("network").asText()).isEqualTo("SOLANA");
        assertThat(row.get("explorerUrl").asText()).contains(txA);
        assertThat(row.get("fxRule").asText()).isEqualTo("CARNE_LEAO");
        assertThat(row.get("fxDate").asText()).isEqualTo("2026-09-15");
        assertThat(row.get("fxRate").asText()).isEqualTo("5.0000");
        assertThat(row.get("date").asText()).isEqualTo("2026-10-14T15:00:00Z");
        assertThat(report.get("rows").get(1).get("txHash").asText()).isEqualTo(txB);

        var sept = getJson("/reports/monthly?month=2026-09", ana);
        assertThat(sept.get("rows")).hasSize(1);
        assertThat(sept.get("unmatchedCount").asInt()).isZero();

        mvc.perform(get("/reports/monthly?month=2026-13").header("Authorization", ana.bearer()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_MONTH"));
    }

    @Test
    void csvExport() throws Exception {
        var res = mvc.perform(get("/reports/monthly.csv?month=2026-10").header("Authorization", ana.bearer()))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", org.hamcrest.Matchers.startsWith("text/csv")))
                .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.containsString("paytrail-2026-10.csv")))
                .andReturn();
        var lines = res.getResponse().getContentAsString().split("\r\n");
        assertThat(lines).hasSize(3);
        assertThat(lines[0]).isEqualTo("date,clientName,invoicePublicId,network,txHash,explorerUrl,amountUsdc,fxRule,fxDate,fxRate,amountBrl");
        assertThat(lines[1]).startsWith("2026-10-14T15:00:00Z,\"Acme, \"\"Global\"\" Inc\"," + publicIdA + ",SOLANA," + txA + ",");
        assertThat(lines[1]).contains("," + uniqueA + ",CARNE_LEAO,2026-09-15,5.0000,");
    }

    @Test
    void accountantAccessAndLogs() throws Exception {
        var carlos = accountant("carlos@test.dev");
        var url = "/reports/monthly?month=2026-10&freelancerId=" + ana.id();
        var csvUrl = "/reports/monthly.csv?month=2026-10&freelancerId=" + ana.id();

        // Sem acesso: 403, nada registrado
        mvc.perform(get(url).header("Authorization", carlos.bearer()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("NO_ACCESS"));
        mvc.perform(get(csvUrl).header("Authorization", carlos.bearer())).andExpect(status().isForbidden());
        assertThat(logs.count()).isZero();

        // Sem freelancerId: 400
        mvc.perform(get("/reports/monthly?month=2026-10").header("Authorization", carlos.bearer()))
                .andExpect(status().isBadRequest());

        var access = grant(carlos, LocalDate.of(2026, 10, 1), LocalDate.of(2026, 12, 31));
        mvc.perform(get(url).header("Authorization", carlos.bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rows.length()").value(2))
                .andExpect(jsonPath("$.unmatchedCount").value(1));
        mvc.perform(get(csvUrl).header("Authorization", carlos.bearer()))
                .andExpect(status().isOk())
                .andExpect(content().string(org.hamcrest.Matchers.startsWith("date,clientName")));

        var entries = logs.findByAccountantIdAndFreelancerIdOrderByCreatedAtDesc(carlos.id(), ana.id());
        assertThat(entries).extracting(AccessLog::getAction)
                .containsExactlyInAnyOrder(AccessLog.Action.VIEW_REPORT, AccessLog.Action.EXPORT_CSV);

        // Mês fora do período: 403
        mvc.perform(get("/reports/monthly?month=2026-09&freelancerId=" + ana.id()).header("Authorization", carlos.bearer()))
                .andExpect(status().isForbidden());

        // A9: revogado → 403
        access.revoke();
        accesses.save(access);
        mvc.perform(get(url).header("Authorization", carlos.bearer())).andExpect(status().isForbidden());

        // Outro freelancer não lê o relatório da Ana
        var bob = freelancer("bob@test.dev");
        mvc.perform(get(url).header("Authorization", bob.bearer())).andExpect(status().isForbidden());
    }
}
