package com.paytrail.report;

import com.paytrail.auth.CurrentUser;
import com.paytrail.common.ApiException;
import com.paytrail.market.AccessGuard;
import com.paytrail.market.AccessLog;
import com.paytrail.report.ReportService.MonthlyReport;
import java.nio.charset.StandardCharsets;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Freelancer vê o próprio relatório; contador passa freelancerId e precisa de acesso ACTIVE cobrindo o mês. */
@RestController
@RequestMapping("/reports")
public class ReportController {

    private static final MediaType TEXT_CSV = new MediaType("text", "csv", StandardCharsets.UTF_8);

    private final CurrentUser currentUser;
    private final AccessGuard guard;
    private final ReportService reports;

    public ReportController(CurrentUser currentUser, AccessGuard guard, ReportService reports) {
        this.currentUser = currentUser;
        this.guard = guard;
        this.reports = reports;
    }

    @GetMapping("/monthly")
    @Transactional
    public MonthlyReport monthly(@RequestParam String month, @RequestParam(required = false) UUID freelancerId) {
        var ym = parseMonth(month);
        var target = guard.checkCanRead(currentUser.get(), freelancerId, ym, AccessLog.Action.VIEW_REPORT);
        return reports.monthly(target, ym);
    }

    @GetMapping("/monthly.csv")
    @Transactional
    public ResponseEntity<String> monthlyCsv(@RequestParam String month, @RequestParam(required = false) UUID freelancerId) {
        var ym = parseMonth(month);
        var target = guard.checkCanRead(currentUser.get(), freelancerId, ym, AccessLog.Action.EXPORT_CSV);
        var csv = reports.toCsv(reports.monthly(target, ym));
        return ResponseEntity.ok()
                .contentType(TEXT_CSV)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"paytrail-" + ym + ".csv\"")
                .body(csv);
    }

    private static YearMonth parseMonth(String month) {
        try {
            return YearMonth.parse(month.trim());
        } catch (DateTimeParseException | NullPointerException e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_MONTH", "month must be YYYY-MM");
        }
    }
}
