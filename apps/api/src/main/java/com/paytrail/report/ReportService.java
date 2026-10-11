package com.paytrail.report;

import com.paytrail.common.Dates;
import com.paytrail.common.Enums.FxRule;
import com.paytrail.common.Enums.Network;
import com.paytrail.common.ExplorerLinks;
import com.paytrail.common.Money;
import com.paytrail.invoice.Invoice;
import com.paytrail.invoice.InvoiceRepository;
import com.paytrail.payment.PaymentRepository;
import com.paytrail.reconciliation.Reconciliation.PaymentStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Relatório mensal (specs/02-conciliacao.md §5). O controle de acesso fica no controller (AccessGuard). */
@Service
public class ReportService {

    /** Schema MonthlyReport de specs/03-api.yaml. */
    public record MonthlyReport(String month, UUID freelancerId, String totalUsdc, String totalBrl, long unmatchedCount,
                                List<Row> rows) {}

    public record Row(Instant date, String clientName, String invoicePublicId, Network network, String txHash,
                      String explorerUrl, String amountUsdc, FxRule fxRule, LocalDate fxDate, String fxRate,
                      String amountBrl) {}

    static final List<String> CSV_HEADER = List.of("date", "clientName", "invoicePublicId", "network", "txHash",
            "explorerUrl", "amountUsdc", "fxRule", "fxDate", "fxRate", "amountBrl");

    private final PaymentRepository payments;
    private final InvoiceRepository invoices;
    private final ExplorerLinks links;

    public ReportService(PaymentRepository payments, InvoiceRepository invoices, ExplorerLinks links) {
        this.payments = payments;
        this.invoices = invoices;
        this.links = links;
    }

    @Transactional(readOnly = true)
    public MonthlyReport monthly(UUID freelancerId, YearMonth month) {
        var from = Dates.monthStart(month);
        var to = Dates.monthEnd(month);
        var matched = payments.findByFreelancerIdAndStatusAndBlockTimeGreaterThanEqualAndBlockTimeLessThanOrderByBlockTimeAsc(
                freelancerId, PaymentStatus.MATCHED, from, to);
        var invoiceIds = matched.stream().map(p -> p.getInvoiceId()).filter(Objects::nonNull).distinct().toList();
        var byId = invoices.findAllById(invoiceIds).stream()
                .collect(Collectors.toMap(Invoice::getId, Function.identity()));

        var totalUsdc = BigDecimal.ZERO;
        var totalBrl = BigDecimal.ZERO;
        var rows = new java.util.ArrayList<Row>(matched.size());
        for (var p : matched) {
            var inv = byId.get(p.getInvoiceId());
            rows.add(new Row(p.getBlockTime(), inv == null ? null : inv.getClientName(),
                    inv == null ? null : inv.getPublicId(), p.getNetwork(), p.getTxHash(),
                    links.tx(p.getNetwork(), p.getTxHash()), Money.usdc(p.getAmount()), p.getFxRule(), p.getFxDate(),
                    Money.rate(p.getFxRate()), Money.brl(p.getAmountBrl())));
            totalUsdc = totalUsdc.add(p.getAmount());
            if (p.getAmountBrl() != null) totalBrl = totalBrl.add(p.getAmountBrl());
        }
        long unmatched = payments.countUnmatched(freelancerId, from, to);
        return new MonthlyReport(month.toString(), freelancerId, Money.usdc(totalUsdc), Money.brl(totalBrl), unmatched, rows);
    }

    public String toCsv(MonthlyReport report) {
        var sb = new StringBuilder();
        appendLine(sb, CSV_HEADER);
        for (var r : report.rows()) {
            appendLine(sb, java.util.Arrays.asList(
                    str(r.date()), r.clientName(), r.invoicePublicId(), str(r.network()), r.txHash(), r.explorerUrl(),
                    r.amountUsdc(), str(r.fxRule()), str(r.fxDate()), r.fxRate(), r.amountBrl()));
        }
        return sb.toString();
    }

    private static String str(Object o) {
        return o == null ? null : o.toString();
    }

    private static void appendLine(StringBuilder sb, List<String> cells) {
        for (int i = 0; i < cells.size(); i++) {
            if (i > 0) sb.append(',');
            sb.append(csvCell(cells.get(i)));
        }
        sb.append("\r\n");
    }

    /** RFC 4180: aspas quando houver vírgula, aspas ou quebra de linha. */
    static String csvCell(String v) {
        if (v == null) return "";
        if (v.indexOf(',') >= 0 || v.indexOf('"') >= 0 || v.indexOf('\n') >= 0 || v.indexOf('\r') >= 0) {
            return '"' + v.replace("\"", "\"\"") + '"';
        }
        return v;
    }
}
