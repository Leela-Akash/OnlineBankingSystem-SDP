package com.banking.sdp.backend;

import com.banking.sdp.backend.security.LoginRateLimiterService;
import com.banking.sdp.backend.security.SecurityService;
import com.banking.sdp.backend.security.UserPrincipal;
import com.banking.sdp.backend.util.JwtUtil;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class SecurityAndAuthTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private LoginRateLimiterService rateLimiterService;

    @Autowired
    private SecurityService securityService;

    @Test
    @DisplayName("Password encoder should hash and verify BCrypt passwords")
    void testBCryptHashing() {
        String rawPassword = "SecurePassword123!";
        String encoded = passwordEncoder.encode(rawPassword);

        assertNotNull(encoded);
        assertTrue(encoded.startsWith("$2a$") || encoded.startsWith("$2b$"));
        assertTrue(passwordEncoder.matches(rawPassword, encoded));
        assertFalse(passwordEncoder.matches("WrongPassword", encoded));
    }

    @Test
    @DisplayName("JwtUtil generates access and refresh tokens with valid claims")
    void testJwtTokenGenerationAndClaims() {
        String username = "johndoe";
        String role = "CUSTOMER";
        Long userId = 101L;

        String accessToken = jwtUtil.generateAccessToken(username, role, userId);
        assertNotNull(accessToken);
        assertTrue(jwtUtil.validateToken(accessToken));
        assertEquals(username, jwtUtil.getUsernameFromToken(accessToken));
        assertEquals(role, jwtUtil.getRoleFromToken(accessToken));
        assertEquals(userId, jwtUtil.getUserIdFromToken(accessToken));
        assertEquals("ACCESS", jwtUtil.getTokenType(accessToken));

        String refreshToken = jwtUtil.generateRefreshToken(username, role, userId);
        assertNotNull(refreshToken);
        assertTrue(jwtUtil.validateToken(refreshToken));
        assertEquals("REFRESH", jwtUtil.getTokenType(refreshToken));
    }

    @Test
    @DisplayName("Rate limiter blocks after 5 failed login attempts and resets")
    void testLoginRateLimiter() {
        String testKey = "testuser:127.0.0.1";
        rateLimiterService.resetAttempts(testKey);

        assertFalse(rateLimiterService.isBlocked(testKey));

        for (int i = 0; i < 4; i++) {
            rateLimiterService.recordFailedAttempt(testKey);
            assertFalse(rateLimiterService.isBlocked(testKey));
        }

        // 5th failed attempt should trigger block
        rateLimiterService.recordFailedAttempt(testKey);
        assertTrue(rateLimiterService.isBlocked(testKey));
        assertTrue(rateLimiterService.getRemainingLockoutSeconds(testKey) > 0);

        // Reset clears lockout
        rateLimiterService.resetAttempts(testKey);
        assertFalse(rateLimiterService.isBlocked(testKey));
    }

    @Test
    @DisplayName("Unauthenticated request to protected admin route returns 401 Unauthorized")
    void testProtectedAdminRouteWithoutToken() throws Exception {
        mockMvc.perform(get("/admin/customers"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("SecurityService correctly verifies customer data ownership")
    void testSecurityServiceOwnership() {
        UserPrincipal customer1 = new UserPrincipal(10L, "customer1", "CUSTOMER");
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(customer1, null, customer1.getAuthorities())
        );

        assertTrue(securityService.isCustomerOwner(10L));
        assertFalse(securityService.isCustomerOwner(20L));

        UserPrincipal admin = new UserPrincipal(1L, "admin", "ADMIN");
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(admin, null, admin.getAuthorities())
        );

        // Admin can access any customer's data
        assertTrue(securityService.isCustomerOwner(10L));
        assertTrue(securityService.isCustomerOwner(20L));

        SecurityContextHolder.clearContext();
    }
}
