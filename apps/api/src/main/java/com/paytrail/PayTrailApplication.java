package com.paytrail;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class PayTrailApplication {

    public static void main(String[] args) {
        SpringApplication.run(PayTrailApplication.class, args);
    }
}
