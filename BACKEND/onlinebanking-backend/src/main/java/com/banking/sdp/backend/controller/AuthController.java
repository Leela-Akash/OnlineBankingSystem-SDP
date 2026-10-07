package com.banking.sdp.backend.controller;

import com.banking.sdp.backend.dto.JwtResponse;
import com.banking.sdp.backend.dto.RefreshTokenRequest;
import com.banking.sdp.backend.util.JwtUtil;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthController {

    @Autowired
    private JwtUtil jwtUtil;

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
