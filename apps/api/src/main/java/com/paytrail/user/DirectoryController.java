package com.paytrail.user;

import com.paytrail.auth.CurrentUser;
import com.paytrail.common.ApiException;
import com.paytrail.common.Enums.Role;
import com.paytrail.user.UserDtos.PublicProfile;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Diretório público de perfis (specs/06-marketplace.md). */
@RestController
@RequestMapping("/users")
public class DirectoryController {

    private final CurrentUser currentUser;
    private final UserRepository users;

    public DirectoryController(CurrentUser currentUser, UserRepository users) {
        this.currentUser = currentUser;
        this.users = users;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<PublicProfile> search(@RequestParam(required = false) Role role, @RequestParam(required = false) String q) {
        currentUser.id();
        var query = q == null || q.isBlank() ? null : q.trim();
        return users.searchDirectory(role == null ? null : role.name(), query).stream().map(PublicProfile::of).toList();
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public PublicProfile get(@PathVariable UUID id) {
        currentUser.id();
        return users.findById(id).map(PublicProfile::of)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "user not found"));
    }
}
