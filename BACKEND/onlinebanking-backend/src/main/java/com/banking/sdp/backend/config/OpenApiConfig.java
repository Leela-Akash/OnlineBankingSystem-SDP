package com.banking.sdp.backend.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    public static final String BEARER_KEY_SECURITY_SCHEME = "bearerAuth";

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Nexus Online Banking System API")
                        .version("v1.0.0")
                        .description("Production-grade, enterprise-ready Online Banking RESTful API with " +
                                "stateless JWT authentication, role-based authorization (CUSTOMER, STAFF, ADMIN), " +
                                "pessimistic locking double-spending prevention, transaction idempotency, " +
                                "loan approval lifecycles, and audit logging.")
                        .contact(new Contact()
                                .name("Nexus Core Banking Engineering")
                                .email("dev@nexusbanking.com"))
                        .license(new License()
                                .name("Apache 2.0")
                                .url("https://springdoc.org")))
                .servers(List.of(
                        new Server().url("/").description("Default Server URI")
                ))
                .addSecurityItem(new SecurityRequirement().addList(BEARER_KEY_SECURITY_SCHEME))
                .components(new Components()
                        .addSecuritySchemes(BEARER_KEY_SECURITY_SCHEME,
                                new SecurityScheme()
                                        .name(BEARER_KEY_SECURITY_SCHEME)
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT")
                                        .description("Provide JWT access token generated via /auth/login or /api/v1/auth/login")));
    }
}
