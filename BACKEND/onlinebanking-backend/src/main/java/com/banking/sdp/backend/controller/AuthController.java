package com.banking.sdp.backend.controller;

import com.banking.sdp.backend.dto.JwtResponse;
import com.banking.sdp.backend.dto.RefreshTokenRequest;
import com.banking.sdp.backend.util.JwtUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping({"/api/v1/auth", "/auth"})
@Tag(name = "Authentication", description = "Endpoints for user session management and JWT token lifecycle")
public class AuthController {

    @Autowired
    private JwtUtil jwtUtil;

    @Operation(summary = "Refresh JWT access token",
            description = "Exchange an active refresh token for a newly minted short-lived JWT access token and rotated refresh token.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Token refreshed successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid token type supplied"),
            @ApiResponse(responseCode = "401", description = "Expired or forged refresh token")
    })
    @PostMapping("/refresh")
    public ResponseEntity<?> refreshToken(@Valid @RequestBody RefreshTokenRequest request) {
        String refreshToken = request.getRefreshToken();

        try {
            if (!jwtUtil.validateToken(refreshToken)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Invalid or expired refresh token"));
            }

            String tokenType = jwtUtil.getTokenType(refreshToken);
            if (!"REFRESH".equalsIgnoreCase(tokenType)) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "Token provided is not a refresh token"));
            }

            String username = jwtUtil.getUsernameFromToken(refreshToken);
            String role = jwtUtil.getRoleFromToken(refreshToken);
            Long userId = jwtUtil.getUserIdFromToken(refreshToken);

            String newAccessToken = jwtUtil.generateAccessToken(username, role, userId);
            String newRefreshToken = jwtUtil.generateRefreshToken(username, role, userId);

            JwtResponse response = new JwtResponse(
                    newAccessToken,
                    newRefreshToken,
                    userId,
                    username,
                    role,
                    JwtUtil.ACCESS_TOKEN_VALIDITY
            );

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Could not refresh token: " + e.getMessage()));
        }
    }
}
