package com.banking.sdp.backend.controller;

import com.banking.sdp.backend.dto.LoanApplicationRequest;
import com.banking.sdp.backend.model.Customer;
import com.banking.sdp.backend.model.Loan;
import com.banking.sdp.backend.service.CustomerService;
import com.banking.sdp.backend.service.LoanService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping({"/api/v1/loan", "/loan"})
@Tag(name = "Loan Management", description = "Endpoints for loan applications, review, approvals, rejections, and funds disbursement")
public class LoanController {

    @Autowired
    private LoanService loanService;

    @Autowired
    private CustomerService customerService;

    @Operation(summary = "Submit loan application", description = "Customer applies for a loan with specified amount, tenure, and purpose")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Loan application submitted"),
            @ApiResponse(responseCode = "400", description = "Invalid loan terms or validation error"),
            @ApiResponse(responseCode = "403", description = "Access denied"),
            @ApiResponse(responseCode = "404", description = "Customer not found")
    })
    @PostMapping("/request/{customerId}")
    @PreAuthorize("@securityService.isCustomerOwner(#customerId)")
    public ResponseEntity<?> requestLoan(
            @Parameter(description = "Customer ID") @PathVariable Long customerId,
            @Valid @RequestBody LoanApplicationRequest request) {
        try {
            Customer customer = customerService.getCustomerById(customerId);
            if (customer == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Customer not found"));
            }

            Loan loan = new Loan();
            loan.setCustomer(customer);
            loan.setLoanAmount(request.getLoanAmount().doubleValue());
            loan.setLoanType(request.getLoanType());
            loan.setTenureMonths(request.getTenureMonths());
            loan.setPurpose(request.getPurpose());
            loan.setInterestRate(request.getInterestRate() != null ? request.getInterestRate().doubleValue() : 8.5);
            loan.setStatus("Pending");
            loan.setRequestDate(LocalDate.now());

            Loan savedLoan = loanService.requestLoan(loan);
            return ResponseEntity.ok(savedLoan);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to request loan: " + e.getMessage()));
        }
    }

    @Operation(summary = "Get loan applications for customer", description = "Retrieves all loan applications submitted by customer")
    @GetMapping("/customer/{customerId}")
    @PreAuthorize("@securityService.isCustomerOwner(#customerId)")
    public ResponseEntity<List<Loan>> getCustomerLoans(
            @Parameter(description = "Customer ID") @PathVariable Long customerId) {
        Customer customer = customerService.getCustomerById(customerId);
        if (customer == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(loanService.getCustomerLoans(customer));
    }

    @Operation(summary = "Get pending loans for review (Staff / Admin)", description = "Retrieves queue of pending loan applications awaiting underwriting review")
    @GetMapping("/pending")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    public ResponseEntity<List<Loan>> getPendingLoans() {
        return ResponseEntity.ok(loanService.getAllPendingLoans());
    }

    @Operation(summary = "Get all loans across bank (Staff / Admin)", description = "Retrieves comprehensive history of all banking loans")
    @GetMapping("/all")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    public ResponseEntity<List<Loan>> getAllLoans() {
        return ResponseEntity.ok(loanService.getAllLoans());
    }

    @Operation(summary = "Approve loan application (Staff / Admin)", description = "Approves a pending loan application with optional underwriter comments")
    @PutMapping("/approve/{loanId}")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    public ResponseEntity<?> approveLoan(
            @Parameter(description = "Loan Application ID") @PathVariable Long loanId,
            @RequestBody(required = false) Map<String, String> request) {
        try {
            String comments = (request != null && request.containsKey("comments"))
                    ? request.get("comments") : "Loan approved by staff";
            Loan approvedLoan = loanService.approveLoan(loanId, comments);
            return ResponseEntity.ok(approvedLoan);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to approve loan: " + e.getMessage()));
        }
    }

    @Operation(summary = "Reject loan application (Staff / Admin)", description = "Rejects a pending loan application")
    @PutMapping("/reject/{loanId}")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    public ResponseEntity<?> rejectLoan(
            @Parameter(description = "Loan Application ID") @PathVariable Long loanId,
            @RequestBody(required = false) Map<String, String> request) {
        try {
            String comments = (request != null && request.containsKey("comments"))
                    ? request.get("comments") : "Loan rejected";
            Loan rejectedLoan = loanService.rejectLoan(loanId, comments);
            return ResponseEntity.ok(rejectedLoan);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to reject loan: " + e.getMessage()));
        }
    }

    @Operation(summary = "Disburse approved loan funds (Staff / Admin)", description = "Disburses loan amount into the borrower's account with atomic balance update and audit record")
    @PutMapping("/disburse/{loanId}")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    public ResponseEntity<?> disburseLoan(@Parameter(description = "Loan Application ID") @PathVariable Long loanId) {
        try {
            Loan disbursedLoan = loanService.disbursement(loanId);
            return ResponseEntity.ok(Map.of("message", "Loan disbursed successfully", "loan", disbursedLoan));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to disburse loan: " + e.getMessage()));
        }
    }
}
