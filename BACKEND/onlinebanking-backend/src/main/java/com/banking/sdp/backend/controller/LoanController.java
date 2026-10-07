package com.banking.sdp.backend.controller;

import com.banking.sdp.backend.dto.LoanApplicationRequest;
import com.banking.sdp.backend.model.Customer;
import com.banking.sdp.backend.model.Loan;
import com.banking.sdp.backend.service.CustomerService;
import com.banking.sdp.backend.service.LoanService;
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
@RequestMapping("/loan")
public class LoanController {

    @Autowired
    private LoanService loanService;

    @Autowired
    private CustomerService customerService;

    // Customer: Request a loan
    @PostMapping("/request/{customerId}")
    @PreAuthorize("@securityService.isCustomerOwner(#customerId)")
    public ResponseEntity<?> requestLoan(
            @PathVariable Long customerId,
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

    // Customer: Get my loans
    @GetMapping("/customer/{customerId}")
    @PreAuthorize("@securityService.isCustomerOwner(#customerId)")
    public ResponseEntity<List<Loan>> getCustomerLoans(@PathVariable Long customerId) {
        Customer customer = customerService.getCustomerById(customerId);
        if (customer == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(loanService.getCustomerLoans(customer));
    }

    // Staff / Admin: Get all pending loans
    @GetMapping("/pending")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    public ResponseEntity<List<Loan>> getPendingLoans() {
        return ResponseEntity.ok(loanService.getAllPendingLoans());
    }

    // Staff / Admin: Get all loans
    @GetMapping("/all")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    public ResponseEntity<List<Loan>> getAllLoans() {
        return ResponseEntity.ok(loanService.getAllLoans());
    }

    // Staff / Admin: Approve loan
    @PutMapping("/approve/{loanId}")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    public ResponseEntity<?> approveLoan(
            @PathVariable Long loanId,
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

    // Staff / Admin: Reject loan
    @PutMapping("/reject/{loanId}")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    public ResponseEntity<?> rejectLoan(
            @PathVariable Long loanId,
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

    // Staff / Admin: Disburse loan
    @PutMapping("/disburse/{loanId}")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    public ResponseEntity<?> disburseLoan(@PathVariable Long loanId) {
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
