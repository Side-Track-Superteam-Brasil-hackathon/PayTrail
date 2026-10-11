package com.paytrail.auth;

import com.paytrail.common.ApiException;
import com.paytrail.common.Enums.Role;
import com.paytrail.user.User;
import com.paytrail.user.UserRepository;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/** Acesso ao usuário logado a partir do principal colocado pelo JwtAuthFilter. */
@Component
public class CurrentUser {

    private final UserRepository users;

    public CurrentUser(UserRepository users) {
        this.users = users;
    }

    public UUID id() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof UUID id)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "login required");
        }
        return id;
    }

    public User get() {
        return users.findById(id())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "user not found"));
    }

    public User require(Role role) {
        var u = get();
        if (u.getRole() != role) {
            throw new ApiException(HttpStatus.FORBIDDEN, "ROLE_REQUIRED", "requires role " + role);
        }
        return u;
    }
}
