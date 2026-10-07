package com.banking.sdp.backend.controller;

import com.banking.sdp.backend.dto.DepositWithdrawRequest;
import com.banking.sdp.backend.dto.TransferRequest;
import com.banking.sdp.backend.model.Customer;
import com.banking.sdp.backend.model.Transaction;
import com.banking.sdp.backend.service.CustomerService;
import com.banking.sdp.backend.service.TransactionService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/transaction")
public class TransactionController {

    @Autowired
    private TransactionService transactionService;

    @Autowired
    private CustomerService customerService;

    // Add transaction (Deposit / Withdraw)
    @PostMapping("/add/{customerId}")
    @PreAuthorize("@securityService.isCustomerOwner(#customerId)")
    public ResponseEntity<?> addTransaction(
            @PathVariable Long customerId,
            @Valid @RequestBody DepositWithdrawRequest request) {

        Customer customer = customerService.getCustomerById(customerId);
        if (customer == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Customer not found"));
        }

        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "Transaction amount must be greater than 0"));
        }

        Transaction transaction = new Transaction();
        transaction.setCustomer(customer);
        transaction.setAmount(request.getAmount().doubleValue());
        transaction.setType(request.getType());
        transaction.setDescription(request.getDescription());
        transaction.setTransactionDate(LocalDateTime.now());

        Transaction saved = transactionService.addTransaction(transaction);
        return ResponseEntity.ok(saved);
    }

    // Get transactions of a customer
    @GetMapping("/customer/{customerId}")
    @PreAuthorize("@securityService.isCustomerOwner(#customerId)")
    public ResponseEntity<?> getCustomerTransactions(@PathVariable Long customerId) {
        Customer customer = customerService.getCustomerById(customerId);
        if (customer == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Customer not found"));
        }
        List<Transaction> list = transactionService.getTransactionsByCustomer(customer);
        return ResponseEntity.ok(list);
    }

    // Get balance for a customer
    @GetMapping("/balance/{customerId}")
    @PreAuthorize("@securityService.isCustomerOwner(#customerId)")
    public ResponseEntity<?> getBalance(@PathVariable Long customerId) {
        Customer customer = customerService.getCustomerById(customerId);
        if (customer == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Customer not found"));
        }
        Double balance = transactionService.calculateBalance(customer);
        return ResponseEntity.ok(Map.of("balance", balance));
    }

    // Download PDF statement
    @GetMapping("/customer/{customerId}/statement")
    @PreAuthorize("@securityService.isCustomerOwner(#customerId)")
    public ResponseEntity<byte[]> downloadStatement(
            @PathVariable Long customerId,
            @RequestParam String fromDate,
            @RequestParam String toDate) {

        try {
            Customer customer = customerService.getCustomerById(customerId);
            if (customer == null) {
                return ResponseEntity.notFound().build();
            }

            LocalDateTime start = java.time.LocalDate.parse(fromDate).atStartOfDay();
            LocalDateTime end = java.time.LocalDate.parse(toDate).atTime(23, 59, 59);

            byte[] pdfBytes = transactionService.generatePdfStatement(customer, start, end);

            return ResponseEntity.ok()
                    .header("Content-Disposition", "attachment; filename=\"Bank_Statement.pdf\"")
                    .contentType(org.springframework.http.MediaType.APPLICATION_PDF)
                    .body(pdfBytes);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // Staff/Admin: Get all transactions
    @GetMapping("/all")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    public ResponseEntity<List<Transaction>> getAllTransactions() {
        List<Transaction> allTxns = transactionService.getAllTransactions();
        return ResponseEntity.ok(allTxns);
    }

    // Transfer funds between customers (by ID)
    @PostMapping("/transfer")
    @PreAuthorize("@securityService.isCustomerOwner(#fromCustomerId)")
    public ResponseEntity<?> transferFunds(
            @RequestParam(required = false) Long fromCustomerId,
            @RequestParam(required = false) Long toCustomerId,
            @RequestParam(required = false) Double amount,
            @RequestBody(required = false) TransferRequest body) {
        try {
            Long senderId = (body != null && body.getFromCustomerId() != null) ? body.getFromCustomerId() : fromCustomerId;
            Long receiverId = (body != null && body.getToCustomerId() != null) ? body.getToCustomerId() : toCustomerId;
            Double transferAmount = (body != null && body.getAmount() != null) ? body.getAmount().doubleValue() : amount;

            if (senderId == null || receiverId == null || transferAmount == null || transferAmount <= 0) {
                return ResponseEntity.badRequest().body(Map.of("error", "Valid sender ID, receiver ID, and positive amount are required"));
            }

            String result = transactionService.transferFunds(senderId, receiverId, transferAmount);
            return ResponseEntity.ok(Map.of("message", result));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "Transfer failed: " + e.getMessage()));
        }
    }

    // Transfer funds using account number
    @PostMapping("/transfer/by-account")
    @PreAuthorize("@securityService.isCustomerOwner(#fromCustomerId)")
    public ResponseEntity<?> transferFundsByAccount(
            @RequestParam(required = false) Long fromCustomerId,
            @RequestParam(required = false) String toAccountNumber,
            @RequestParam(required = false) Double amount,
            @RequestBody(required = false) TransferRequest body) {
        try {
            Long senderId = (body != null && body.getFromCustomerId() != null) ? body.getFromCustomerId() : fromCustomerId;
            String receiverAcc = (body != null && body.getToAccountNumber() != null) ? body.getToAccountNumber() : toAccountNumber;
            Double transferAmount = (body != null && body.getAmount() != null) ? body.getAmount().doubleValue() : amount;

            if (senderId == null || receiverAcc == null || receiverAcc.isBlank() || transferAmount == null || transferAmount <= 0) {
                return ResponseEntity.badRequest().body(Map.of("error", "Valid sender ID, receiver account number, and positive amount are required"));
            }

            String result = transactionService.transferFundsByAccountNumber(senderId, receiverAcc, transferAmount);
            return ResponseEntity.ok(Map.of("message", result));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "Transfer failed: " + e.getMessage()));
        }
    }
}
