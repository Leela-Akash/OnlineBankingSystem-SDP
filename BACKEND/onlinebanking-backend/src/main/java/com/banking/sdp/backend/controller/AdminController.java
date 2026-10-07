package com.banking.sdp.backend.controller;

import com.banking.sdp.backend.dto.JwtResponse;
import com.banking.sdp.backend.dto.LoginRequest;
import com.banking.sdp.backend.dto.StaffRegistrationRequest;
import com.banking.sdp.backend.exception.RateLimitExceededException;
import com.banking.sdp.backend.model.Admin;
import com.banking.sdp.backend.model.Customer;
import com.banking.sdp.backend.model.Staff;
import com.banking.sdp.backend.repository.CustomerRepository;
import com.banking.sdp.backend.security.LoginRateLimiterService;
import com.banking.sdp.backend.service.AdminService;
import com.banking.sdp.backend.service.AuditLogService;
import com.banking.sdp.backend.util.JwtUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping({"/api/v1/admin", "/admin"})
@Tag(name = "Administrator Management", description = "Endpoints for administrator controls: user lifecycle, audit trail, reports, and staff management")
public class AdminController {

    @Autowired
    private AdminService adminService;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private LoginRateLimiterService rateLimiterService;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private AuditLogService auditLogService;

    @Operation(summary = "Admin login", description = "Authenticates administrator credentials with rate limiting and issues JWT")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Authentication successful"),
            @ApiResponse(responseCode = "401", description = "Invalid administrator credentials"),
            @ApiResponse(responseCode = "429", description = "Lockout due to excessive failed attempts")
    })
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

    @Operation(summary = "List all customers (with pagination & search)", description = "Retrieves customer directory with optional pagination, status filter, and keyword search")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Customers retrieved"),
            @ApiResponse(responseCode = "403", description = "Admin role required")
    })
    @GetMapping("/customers")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getAllCustomers(
            @Parameter(description = "Zero-based page index") @RequestParam(required = false) Integer page,
            @Parameter(description = "Page size") @RequestParam(required = false) Integer size,
            @Parameter(description = "Filter by status: ACTIVE or INACTIVE") @RequestParam(required = false) String status,
            @Parameter(description = "Search term in name, username, email, phone, or account number") @RequestParam(required = false) String search) {
        if (page != null && size != null) {
            Pageable pageable = PageRequest.of(page, size, Sort.by("id").descending());
            return ResponseEntity.ok(customerRepository.searchCustomers(search, status, pageable));
        }
        return ResponseEntity.ok(adminService.viewAllCustomers());
    }

    @Operation(summary = "Get system audit logs", description = "Retrieves security and financial action logs recorded across the platform")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Recent audit logs returned"),
            @ApiResponse(responseCode = "403", description = "Admin role required")
    })
    @GetMapping("/audit-logs")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getAuditLogs() {
        return ResponseEntity.ok(auditLogService.getRecentLogs());
    }

    @Operation(summary = "List all staff members", description = "Returns full directory of bank staff employees")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Staff list retrieved"),
            @ApiResponse(responseCode = "403", description = "Admin role required")
    })
    @GetMapping("/staff")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Staff>> getAllStaff() {
        return ResponseEntity.ok(adminService.viewAllStaff());
    }

    @Operation(summary = "Add staff member", description = "Provisions a new staff user account")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Staff account created"),
            @ApiResponse(responseCode = "403", description = "Admin role required"),
            @ApiResponse(responseCode = "409", description = "Duplicate staff username or contact")
    })
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

    @Operation(summary = "Deactivate customer (Soft Delete)", description = "Soft-deletes customer by transitioning status to INACTIVE, preserving financial ledger history")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Customer deactivated successfully"),
            @ApiResponse(responseCode = "403", description = "Admin role required"),
            @ApiResponse(responseCode = "404", description = "Customer not found")
    })
    @DeleteMapping("/deletecustomer")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteCustomer(@Parameter(description = "Customer ID to deactivate") @RequestParam Long customerId) {
        String result = adminService.deleteCustomer(customerId);
        if (result.contains("Not Found")) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", result));
        }
        return ResponseEntity.ok(Map.of("message", result));
    }

    @Operation(summary = "Remove staff member", description = "Removes a staff member account from the banking system")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Staff member deleted"),
            @ApiResponse(responseCode = "403", description = "Admin role required"),
            @ApiResponse(responseCode = "404", description = "Staff not found")
    })
    @DeleteMapping("/deletestaff")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteStaff(@Parameter(description = "Staff ID to delete") @RequestParam Long staffId) {
        String result = adminService.deleteStaff(staffId);
        if (result.contains("Not Found")) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", result));
        }
        return ResponseEntity.ok(Map.of("message", result));
    }

    @Operation(summary = "Get total customer count", description = "Returns total count of registered customer accounts")
    @GetMapping("/customercount")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Long> getCustomerCount() {
        return ResponseEntity.ok(adminService.getCustomerCount());
    }

    @Operation(summary = "Get total staff count", description = "Returns total count of active bank staff members")
    @GetMapping("/staffcount")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Long> getStaffCount() {
        return ResponseEntity.ok(adminService.getStaffCount());
    }

    @Operation(summary = "Generate system aggregation reports", description = "Calculates system-wide financial statistics via direct JPQL aggregations")
    @GetMapping("/reports")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getReports() {
        return ResponseEntity.ok(adminService.getSystemReports());
    }
}
