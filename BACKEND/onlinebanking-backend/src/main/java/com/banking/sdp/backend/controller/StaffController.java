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
@RequestMapping("/staff")
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

    // Staff login with JWT and rate limiting
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

    // Get staff profile
    @GetMapping("/profile/{staffId}")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    public ResponseEntity<?> getProfile(@PathVariable Long staffId) {
        Staff s = staffService.getStaffProfile(staffId);
        if (s != null) {
            return ResponseEntity.ok(s);
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Staff Not Found"));
        }
    }

    // Admin: Add staff with validation
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

    // Get dashboard stats for staff
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
