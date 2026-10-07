package com.banking.sdp.backend.security;

import com.banking.sdp.backend.util.JwtUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    @Autowired
    private JwtUtil jwtUtil;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        final String authHeader = request.getHeader("Authorization");

        String username = null;
        String jwtToken = null;

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            jwtToken = authHeader.substring(7);
            try {
                if (jwtUtil.validateToken(jwtToken)) {
                    String tokenType = jwtUtil.getTokenType(jwtToken);
                    // Refresh tokens must not be used as bearer access tokens on standard API routes
                    if ("REFRESH".equalsIgnoreCase(tokenType)) {
                        logger.warn("Attempted to access API with refresh token");
                    } else {
                        username = jwtUtil.getUsernameFromToken(jwtToken);
                    }
                }
            } catch (Exception e) {
                logger.warn("Invalid JWT token: {}", e.getMessage());
            }
        }

        if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            String role = jwtUtil.getRoleFromToken(jwtToken);
            Long userId = jwtUtil.getUserIdFromToken(jwtToken);

            UserPrincipal userPrincipal = new UserPrincipal(userId, username, role != null ? role : "CUSTOMER");
            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(userPrincipal, null, userPrincipal.getAuthorities());
            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

            SecurityContextHolder.getContext().setAuthentication(authentication);
        }

        filterChain.doFilter(request, response);
    }
}
