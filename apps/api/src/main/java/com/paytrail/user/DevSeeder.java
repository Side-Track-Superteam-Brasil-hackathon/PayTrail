package com.paytrail.user;

import com.paytrail.common.Enums.Role;
import com.paytrail.config.PayTrailProperties;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Usuários de demo (specs/05-aceite.md). Roda só com o perfil "dev" e só cria quem ainda não existe.
 * A senha vem de SEED_PASSWORD; nada de credencial no repositório.
 */
@Component
@Profile("dev")
public class DevSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DevSeeder.class);

    private record Seed(String email, Role role, String name, String city, String bio, List<String> specialties) {}

    private static final List<Seed> SEEDS = List.of(
            new Seed("ana@demo.paytrail", Role.FREELANCER, "Ana Souza", "São Paulo",
                    "Full-stack developer working with US startups.", List.of("web", "react", "java")),
            new Seed("carlos@demo.paytrail", Role.ACCOUNTANT, "Carlos Lima", "Curitiba",
                    "Accountant for freelancers paid from abroad. Crypto & export services.",
                    List.of("crypto", "carne-leao", "export-services")),
            new Seed("beatriz@demo.paytrail", Role.ACCOUNTANT, "Beatriz Rocha", "Belo Horizonte",
                    "MEI and Simples Nacional for digital professionals.", List.of("mei", "simples")),
            new Seed("diego@demo.paytrail", Role.ACCOUNTANT, "Diego Alves", "Recife",
                    "Crypto tax reporting and DeCripto filings.", List.of("crypto", "decripto")),
            new Seed("fernanda@demo.paytrail", Role.ACCOUNTANT, "Fernanda Costa", "Porto Alegre",
                    "Small agencies exporting services.", List.of("export-services", "agencies")),
            new Seed("gustavo@demo.paytrail", Role.ACCOUNTANT, "Gustavo Martins", "Florianópolis",
                    "Carnê-leão and foreign income for individuals.", List.of("carne-leao", "foreign-income")),
            new Seed("helena@demo.paytrail", Role.ACCOUNTANT, "Helena Prado", "Rio de Janeiro",
                    "Accounting for creators and freelancers.", List.of("creators", "crypto")),
            new Seed("igor@demo.paytrail", Role.FREELANCER, "Igor Nunes", "Salvador",
                    "Product designer for SaaS companies.", List.of("design", "ux")),
            new Seed("julia@demo.paytrail", Role.FREELANCER, "Júlia Ramos", "Fortaleza",
                    "Smart contract auditor.", List.of("solana", "security")),
            new Seed("kaique@demo.paytrail", Role.FREELANCER, "Kaique Torres", "Goiânia",
                    "Mobile developer.", List.of("mobile", "flutter")));

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final PayTrailProperties props;

    public DevSeeder(UserRepository users, PasswordEncoder encoder, PayTrailProperties props) {
        this.users = users;
        this.encoder = encoder;
        this.props = props;
    }

    @Override
    @Transactional
    public void run(String... args) {
        var password = props.seed().password();
        if (password == null || password.isBlank()) {
            log.warn("SEED_PASSWORD vazio: seed de demo ignorado");
            return;
        }
        var hash = encoder.encode(password);
        int created = 0;
        for (var s : SEEDS) {
            if (users.existsByEmailIgnoreCase(s.email())) continue;
            var u = new User(s.email(), hash, s.role(), s.name());
            u.setCity(s.city());
            u.setBio(s.bio());
            u.setSpecialties(s.specialties().toArray(String[]::new));
            if (s.email().startsWith("ana@")) {
                var wallet = props.seed().anaSolanaWallet();
                u.setSolanaWallet(wallet == null || wallet.isBlank() ? null : wallet);
            }
            users.save(u);
            created++;
        }
        log.info("Seed de demo: {} usuários criados", created);
    }
}
