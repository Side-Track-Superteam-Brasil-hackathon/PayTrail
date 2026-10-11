package com.paytrail.user;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    Optional<User> findBySolanaWallet(String solanaWallet);

    List<User> findBySolanaWalletIsNotNull();

    /** Diretório: busca em nome, cidade, bio e especialidades (specs/06). role e q são opcionais. */
    @Query(value = """
            select * from users u
            where (cast(:role as text) is null or u.role = cast(:role as text))
              and (cast(:q as text) is null
                   or u.name ilike '%' || cast(:q as text) || '%'
                   or coalesce(u.city, '') ilike '%' || cast(:q as text) || '%'
                   or coalesce(u.bio, '') ilike '%' || cast(:q as text) || '%'
                   or array_to_string(u.specialties, ' ') ilike '%' || cast(:q as text) || '%')
            order by u.name
            limit 50""", nativeQuery = true)
    List<User> searchDirectory(@Param("role") String role, @Param("q") String q);
}
