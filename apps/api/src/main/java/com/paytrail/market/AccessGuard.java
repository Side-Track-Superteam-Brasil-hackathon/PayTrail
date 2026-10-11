package com.paytrail.market;

import com.paytrail.common.ApiException;
import com.paytrail.common.Enums.Role;
import com.paytrail.user.User;
import java.time.YearMonth;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/**
 * Quem pode ler os dados contábeis de um freelancer (specs/06-marketplace.md, "Acesso do contador").
 * - o próprio freelancer: sempre;
 * - um contador: só com acesso ACTIVE cobrindo o mês, e cada leitura é registrada em AccessLog.
 */
@Component
public class AccessGuard {

    private final AccountantAccessRepository accesses;
    private final AccessLogRepository logs;

    public AccessGuard(AccountantAccessRepository accesses, AccessLogRepository logs) {
        this.accesses = accesses;
        this.logs = logs;
    }

    /**
     * Valida e devolve o id do freelancer cujos dados serão lidos.
     *
     * @param freelancerId null = o próprio usuário (precisa ser FREELANCER)
     * @param month        mês pedido; null = qualquer mês do período (ex.: ver uma fatura)
     */
    public UUID checkCanRead(User viewer, UUID freelancerId, YearMonth month, AccessLog.Action action) {
        if (freelancerId == null || freelancerId.equals(viewer.getId())) {
            if (viewer.getRole() != Role.FREELANCER) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "FREELANCER_ID_REQUIRED", "freelancerId is required");
            }
            return viewer.getId();
        }
        if (viewer.getRole() != Role.ACCOUNTANT) {
            throw new ApiException(HttpStatus.FORBIDDEN, "NO_ACCESS", "no access to this freelancer");
        }
        var access = accesses.findByAccountantIdAndFreelancerIdAndStatus(viewer.getId(), freelancerId, AccountantAccess.Status.ACTIVE)
                .filter(a -> month == null || a.covers(month))
                .orElseThrow(() -> new ApiException(HttpStatus.FORBIDDEN, "NO_ACCESS", "no active access for this period"));
        logs.save(new AccessLog(viewer.getId(), access.getFreelancerId(), action));
        return freelancerId;
    }
}
