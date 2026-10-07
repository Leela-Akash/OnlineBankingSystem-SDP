package com.banking.sdp.backend.security;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

    @Autowired
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Autowired
    private JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint;

    @Autowired
    private CustomAccessDeniedHandler customAccessDeniedHandler;

    @Value("${ALLOWED_ORIGINS:${allowed.origins:http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://localhost:8080}}")
    private String allowedOrigins;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint(jwtAuthenticationEntryPoint)
                        .accessDeniedHandler(customAccessDeniedHandler)
                )
                .authorizeHttpRequests(auth -> auth
                        // Preflight requests
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // Public endpoints
                        .requestMatchers(
                                "/customer/login",
                                "/customer/register",
                                "/api/v1/customer/login",
                                "/api/v1/customer/register",
                                "/staff/login",
                                "/api/v1/staff/login",
                                "/admin/login",
                                "/api/v1/admin/login",
                                "/auth/**",
                                "/api/v1/auth/**",
                                "/actuator/**",
                                "/swagger-ui/**",
                                "/swagger-ui.html",
                                "/v3/api-docs/**",
                                "/swagger-resources/**",
                                "/webjars/**"
                        ).permitAll()

                        // Staff and Admin endpoints
                        .requestMatchers(
                                "/admin/customers",
                                "/api/v1/admin/customers",
                                "/staff/**",
                                "/api/v1/staff/**",
                                "/loan/pending",
                                "/api/v1/loan/pending",
                                "/loan/all",
                                "/api/v1/loan/all",
                                "/loan/approve/**",
                                "/api/v1/loan/approve/**",
                                "/loan/reject/**",
                                "/api/v1/loan/reject/**",
                                "/loan/disburse/**",
                                "/api/v1/loan/disburse/**",
                                "/transaction/all",
                                "/api/v1/transaction/all"
                        ).hasAnyRole("STAFF", "ADMIN")

                        // Admin-only endpoints
                        .requestMatchers("/admin/**", "/api/v1/admin/**", "/staff/add", "/api/v1/staff/add").hasRole("ADMIN")

                        // Customer / shared endpoints requiring authentication
                        .requestMatchers(
                                "/customer/**",
                                "/api/v1/customer/**",
                                "/transaction/**",
                                "/api/v1/transaction/**",
                                "/loan/**",
                                "/api/v1/loan/**",
                                "/notification/**",
                                "/api/v1/notification/**"
                        ).authenticated()

                        // Any other endpoint
                        .anyRequest().authenticated()
                );

        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        List<String> origins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();

        configuration.setAllowedOriginPatterns(origins);
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "Accept", "X-Requested-With", "X-Request-Id", "Idempotency-Key"));
        configuration.setExposedHeaders(Arrays.asList("Authorization", "X-Request-Id", "Content-Disposition"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
