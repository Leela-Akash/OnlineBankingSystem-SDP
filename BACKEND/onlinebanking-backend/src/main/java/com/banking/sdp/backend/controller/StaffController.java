package com.banking.sdp.backend.controller;

import com.banking.sdp.backend.dto.JwtResponse;
import com.banking.sdp.backend.dto.LoginRequest;
import com.banking.sdp.backend.dto.StaffRegistrationRequest;
import com.banking.sdp.backend.exception.RateLimitExceededException;
import com.banking.sdp.backend.model.Customer;
import com.banking.sdp.backend.model.Staff;
import com.banking.sdp.backend.model.Transaction;
import com.banking.sdp.backend.security.LoginRateLimiterService;
import com.banking.sdp.backend.service.CustomerService;
import com.banking.sdp.backend.service.StaffService;
import com.banking.sdp.backend.service.TransactionService;
import com.banking.sdp.backend.util.JwtUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@RequestMapping({"/api/v1/staff", "/staff"})
@Tag(name = "Staff Operations", description = "Endpoints for bank operations staff authentication, profile management, and dashboard analytics")
public class StaffController {

    @Autowired
    private StaffService staffService;

    @Autowired
    private CustomerService customerService;

    @Autowired
    private TransactionService transactionService;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private LoginRateLimiterService rateLimiterService;

    @Operation(summary = "Staff login", description = "Authenticates banking staff credentials with rate-limiting and issues JWT")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Authentication successful"),
            @ApiResponse(responseCode = "401", description = "Invalid credentials"),
            @ApiResponse(responseCode = "429", description = "Account locked due to excessive failed attempts")
    })
    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest loginRequest, HttpServletRequest request) {
        String clientIp = request.getRemoteAddr();
        String rateLimitKey = "staff:" + loginRequest.getUsername() + ":" + clientIp;

        if (rateLimiterService.isBlocked(rateLimitKey)) {
            long remaining = rateLimiterService.getRemainingLockoutSeconds(rateLimitKey);
            throw new RateLimitExceededException(
                    "Too many failed login attempts. Account temporarily locked. Please try again after " + remaining + " seconds.");
        }

        Staff s = staffService.checkStaffLogin(loginRequest.getUsername(), loginRequest.getPassword());
        if (s != null) {
            rateLimiterService.resetAttempts(rateLimitKey);

            String accessToken = jwtUtil.generateAccessToken(s.getUsername(), "STAFF", s.getId());
            String refreshToken = jwtUtil.generateRefreshToken(s.getUsername(), "STAFF", s.getId());

            JwtResponse response = new JwtResponse(
                    accessToken,
                    refreshToken,
                    s.getId(),
                    s.getUsername(),
                    "STAFF",
                    JwtUtil.ACCESS_TOKEN_VALIDITY
            );
            return ResponseEntity.ok(response);
        } else {
            rateLimiterService.recordFailedAttempt(rateLimitKey);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid Username or Password"));
        }
    }

    @Operation(summary = "Get staff profile", description = "Fetches employee details by staff ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Profile retrieved"),
            @ApiResponse(responseCode = "403", description = "Forbidden"),
            @ApiResponse(responseCode = "404", description = "Staff member not found")
    })
    @GetMapping("/profile/{staffId}")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    public ResponseEntity<?> getProfile(@Parameter(description = "Staff Member ID") @PathVariable Long staffId) {
        Staff s = staffService.getStaffProfile(staffId);
        if (s != null) {
            return ResponseEntity.ok(s);
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Staff Not Found"));
        }
    }

    @Operation(summary = "Register staff member (Admin only)", description = "Adds a new staff employee to the banking institution")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Staff created successfully"),
            @ApiResponse(responseCode = "403", description = "Admin privilege required"),
            @ApiResponse(responseCode = "409", description = "Username, email, or phone number conflict")
    })
    @PostMapping("/add")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> addStaff(@Valid @RequestBody StaffRegistrationRequest request) {
        Staff staff = new Staff();
        staff.setFullName(request.getFullName());
        staff.setUsername(request.getUsername());
        staff.setPassword(request.getPassword());
        staff.setEmail(request.getEmail());
        staff.setPhone(request.getPhone());

        String result = staffService.registerStaff(staff);
        if (result.contains("exists")) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", result));
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("message", result));
    }

    @Operation(summary = "Get staff dashboard metrics", description = "Retrieves high-level counts for total customers, deposits, and withdrawals")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Dashboard statistics retrieved")
    })
    @GetMapping("/dashboard")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    public ResponseEntity<?> getDashboardStats() {
        List<Customer> customers = customerService.getAllCustomers();
        List<Transaction> transactions = transactionService.getAllTransactions();

        long totalCustomers = customers.size();
        long totalDeposits = transactions.stream()
                .filter(tx -> "Credit".equalsIgnoreCase(tx.getType()))
                .count();
        long totalWithdrawals = transactions.stream()
                .filter(tx -> "Debit".equalsIgnoreCase(tx.getType()))
                .count();

        return ResponseEntity.ok(new StaffDashboardStats(totalCustomers, totalDeposits, totalWithdrawals));
    }

    public static class StaffDashboardStats {
        public long totalCustomers;
        public long totalDeposits;
        public long totalWithdrawals;

        public StaffDashboardStats(long totalCustomers, long totalDeposits, long totalWithdrawals) {
            this.totalCustomers = totalCustomers;
            this.totalDeposits = totalDeposits;
            this.totalWithdrawals = totalWithdrawals;
        }
    }
}
