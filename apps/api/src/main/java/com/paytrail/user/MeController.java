package com.paytrail.user;

import com.paytrail.auth.CurrentUser;
import com.paytrail.user.UserDtos.UpdateMeRequest;
import com.paytrail.user.UserDtos.UserDto;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/me")
public class MeController {

    private final CurrentUser currentUser;

    public MeController(CurrentUser currentUser) {
        this.currentUser = currentUser;
    }

    @GetMapping
    public UserDto me() {
        return UserDto.of(currentUser.get());
    }

    @PatchMapping
    @Transactional
    public UserDto update(@RequestBody UpdateMeRequest req) {
        var u = currentUser.get();
        if (req.name() != null) u.setName(req.name());
        if (req.city() != null) u.setCity(req.city());
        if (req.bio() != null) u.setBio(req.bio());
        if (req.specialties() != null) u.setSpecialties(req.specialties().toArray(String[]::new));
        if (req.solanaWallet() != null) u.setSolanaWallet(req.solanaWallet().isBlank() ? null : req.solanaWallet());
        if (req.arcWallet() != null) u.setArcWallet(req.arcWallet().isBlank() ? null : req.arcWallet());
        if (req.fxRule() != null) u.setFxRule(req.fxRule());
        return UserDto.of(u);
    }
}
