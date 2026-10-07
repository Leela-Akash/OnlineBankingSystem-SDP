package com.banking.sdp.backend.controller;

import com.banking.sdp.backend.dto.CustomerRegistrationRequest;
import com.banking.sdp.backend.dto.CustomerUpdateRequest;
import com.banking.sdp.backend.dto.JwtResponse;
import com.banking.sdp.backend.dto.LoginRequest;
import com.banking.sdp.backend.exception.RateLimitExceededException;
import com.banking.sdp.backend.model.Customer;
import com.banking.sdp.backend.security.LoginRateLimiterService;
import com.banking.sdp.backend.security.SecurityService;
import com.banking.sdp.backend.service.CustomerService;
import com.banking.sdp.backend.util.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/customer")
public class CustomerController {

    @Autowired
    private CustomerService customerService;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private LoginRateLimiterService rateLimiterService;

    @Autowired
    private SecurityService securityService;

    // Registration with DTO validation
    @PostMapping("/register")
    public ResponseEntity<?> registerCustomer(@Valid @RequestBody CustomerRegistrationRequest request) {
        Customer customer = new Customer();
        customer.setFullName(request.getFullName());
        customer.setUsername(request.getUsername());
        customer.setPassword(request.getPassword());
        customer.setEmail(request.getEmail());
        customer.setPhone(request.getPhone());
        customer.setAddress(request.getAddress());
        customer.setDob(request.getDob());
        customer.setGender(request.getGender());
        // Default initial balance to 0.0
        customer.setAccountBalance(0.0);

        String result = customerService.registerCustomer(customer);

        if (result.contains("exists")) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", result));
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("message", result));
    }

    // Login with JWT and rate limiting
    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest loginRequest, HttpServletRequest request) {
        String clientIp = request.getRemoteAddr();
        String rateLimitKey = "customer:" + loginRequest.getUsername() + ":" + clientIp;

        if (rateLimiterService.isBlocked(rateLimitKey)) {
            long remaining = rateLimiterService.getRemainingLockoutSeconds(rateLimitKey);
            throw new RateLimitExceededException(
                    "Too many failed login attempts. Account temporarily locked. Please try again after " + remaining + " seconds.");
        }

        Customer c = customerService.checkCustomerLogin(loginRequest.getUsername(), loginRequest.getPassword());
        if (c != null) {
            rateLimiterService.resetAttempts(rateLimitKey);

            String accessToken = jwtUtil.generateAccessToken(c.getUsername(), "CUSTOMER", c.getId());
            String refreshToken = jwtUtil.generateRefreshToken(c.getUsername(), "CUSTOMER", c.getId());

            JwtResponse response = new JwtResponse(
                    accessToken,
                    refreshToken,
                    c.getId(),
                    c.getUsername(),
                    "CUSTOMER",
                    JwtUtil.ACCESS_TOKEN_VALIDITY
            );
            return ResponseEntity.ok(response);
        } else {
            rateLimiterService.recordFailedAttempt(rateLimitKey);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid Username or Password"));
        }
    }

    // Update Profile - ownership protected
    @PutMapping("/updateprofile")
    @PreAuthorize("@securityService.isCustomerOwner(#request.id)")
    public ResponseEntity<?> updateProfile(@Valid @RequestBody CustomerUpdateRequest request) {
        Customer customer = new Customer();
        customer.setId(request.getId());
        customer.setFullName(request.getFullName());
        customer.setUsername(request.getUsername());
        customer.setPassword(request.getPassword());
        customer.setEmail(request.getEmail());
        customer.setPhone(request.getPhone());
        customer.setAddress(request.getAddress());
        customer.setDob(request.getDob());
        customer.setGender(request.getGender());

        String result = customerService.updateCustomerProfile(customer);

        if (result.contains("exists")) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", result));
        }
        if (result.contains("Not Found")) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", result));
        }

        return ResponseEntity.ok(Map.of("message", result));
    }

    // Get Customer by ID - ownership protected
    @GetMapping("/{customerId}")
    @PreAuthorize("@securityService.isCustomerOwner(#customerId)")
    public ResponseEntity<Customer> getCustomerById(@PathVariable Long customerId) {
        Customer customer = customerService.getCustomerById(customerId);
        if (customer == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(customer);
    }
}
