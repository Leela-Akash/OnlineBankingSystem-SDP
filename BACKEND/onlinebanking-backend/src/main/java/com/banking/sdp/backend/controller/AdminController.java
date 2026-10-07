package com.banking.sdp.backend.controller;

import com.banking.sdp.backend.dto.JwtResponse;
import com.banking.sdp.backend.dto.LoginRequest;
import com.banking.sdp.backend.dto.StaffRegistrationRequest;
import com.banking.sdp.backend.exception.RateLimitExceededException;
import com.banking.sdp.backend.model.Admin;
import com.banking.sdp.backend.model.Customer;
import com.banking.sdp.backend.model.Staff;
import com.banking.sdp.backend.security.LoginRateLimiterService;
import com.banking.sdp.backend.service.AdminService;
import com.banking.sdp.backend.util.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin")
public class AdminController {

    @Autowired
    private AdminService adminService;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private LoginRateLimiterService rateLimiterService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest loginRequest, HttpServletRequest request) {
        String clientIp = request.getRemoteAddr();
        String rateLimitKey = "admin:" + loginRequest.getUsername() + ":" + clientIp;

        if (rateLimiterService.isBlocked(rateLimitKey)) {
            long remaining = rateLimiterService.getRemainingLockoutSeconds(rateLimitKey);
            throw new RateLimitExceededException(
                    "Too many failed login attempts. Account temporarily locked. Please try again after " + remaining + " seconds.");
        }

        Admin a = adminService.checkAdminLogin(loginRequest.getUsername(), loginRequest.getPassword());
        if (a != null) {
            rateLimiterService.resetAttempts(rateLimitKey);

            String accessToken = jwtUtil.generateAccessToken(a.getUsername(), "ADMIN", 0L);
            String refreshToken = jwtUtil.generateRefreshToken(a.getUsername(), "ADMIN", 0L);

            JwtResponse response = new JwtResponse(
                    accessToken,
                    refreshToken,
                    0L,
                    a.getUsername(),
                    "ADMIN",
                    JwtUtil.ACCESS_TOKEN_VALIDITY
            );
            return ResponseEntity.ok(response);
        } else {
            rateLimiterService.recordFailedAttempt(rateLimitKey);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid Username or Password"));
        }
    }

    @Autowired
    private com.banking.sdp.backend.repository.CustomerRepository customerRepository;

    @Autowired
    private com.banking.sdp.backend.service.AuditLogService auditLogService;

    @GetMapping("/customers")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getAllCustomers(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search) {
        if (page != null && size != null) {
            org.springframework.data.domain.Pageable pageable = 
                    org.springframework.data.domain.PageRequest.of(page, size, org.springframework.data.domain.Sort.by("id").descending());
            return ResponseEntity.ok(customerRepository.searchCustomers(search, status, pageable));
        }
        return ResponseEntity.ok(adminService.viewAllCustomers());
    }

    @GetMapping("/audit-logs")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getAuditLogs() {
        return ResponseEntity.ok(auditLogService.getRecentLogs());
    }

    @GetMapping("/staff")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Staff>> getAllStaff() {
        return ResponseEntity.ok(adminService.viewAllStaff());
    }

    @PostMapping("/addstaff")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> addStaff(@Valid @RequestBody StaffRegistrationRequest request) {
        Staff staff = new Staff();
        staff.setFullName(request.getFullName());
        staff.setUsername(request.getUsername());
        staff.setPassword(request.getPassword());
        staff.setEmail(request.getEmail());
        staff.setPhone(request.getPhone());

        String result = adminService.addStaff(staff);
        if (result.contains("exists")) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", result));
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("message", result));
    }

    @DeleteMapping("/deletecustomer")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteCustomer(@RequestParam Long customerId) {
        String result = adminService.deleteCustomer(customerId);
        if (result.contains("Not Found")) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", result));
        }
        return ResponseEntity.ok(Map.of("message", result));
    }

    @DeleteMapping("/deletestaff")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteStaff(@RequestParam Long staffId) {
        String result = adminService.deleteStaff(staffId);
        if (result.contains("Not Found")) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", result));
        }
        return ResponseEntity.ok(Map.of("message", result));
    }

    @GetMapping("/customercount")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Long> getCustomerCount() {
        return ResponseEntity.ok(adminService.getCustomerCount());
    }

    @GetMapping("/staffcount")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Long> getStaffCount() {
        return ResponseEntity.ok(adminService.getStaffCount());
    }

    @GetMapping("/reports")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getReports() {
        return ResponseEntity.ok(adminService.getSystemReports());
    }
}
