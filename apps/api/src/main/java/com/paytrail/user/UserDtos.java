package com.paytrail.user;

import com.paytrail.common.Enums.FxRule;
import com.paytrail.common.Enums.Role;
import java.util.List;
import java.util.UUID;

/** DTOs de usuário (schemas User, PublicProfile e PATCH /me em specs/03-api.yaml). */
public final class UserDtos {

    private UserDtos() {}

    public record UserDto(
            UUID id, String email, Role role, String name, String city, String bio,
            List<String> specialties, String solanaWallet, String arcWallet, FxRule fxRule) {

        public static UserDto of(User u) {
            return new UserDto(u.getId(), u.getEmail(), u.getRole(), u.getName(), u.getCity(), u.getBio(),
                    List.of(u.getSpecialties()), u.getSolanaWallet(), u.getArcWallet(), u.getFxRule());
        }
    }

    /** Perfil público: nunca expõe e-mail nem carteiras. */
    public record PublicProfile(UUID id, Role role, String name, String city, String bio, List<String> specialties) {

        public static PublicProfile of(User u) {
            return new PublicProfile(u.getId(), u.getRole(), u.getName(), u.getCity(), u.getBio(),
                    List.of(u.getSpecialties()));
        }
    }

    public record UpdateMeRequest(
            String name, String city, String bio, List<String> specialties,
            String solanaWallet, String arcWallet, FxRule fxRule) {}
}
