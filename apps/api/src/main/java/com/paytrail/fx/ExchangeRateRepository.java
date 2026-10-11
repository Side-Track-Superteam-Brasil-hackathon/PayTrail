package com.paytrail.fx;

import java.time.LocalDate;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExchangeRateRepository extends JpaRepository<ExchangeRate, LocalDate> {}
