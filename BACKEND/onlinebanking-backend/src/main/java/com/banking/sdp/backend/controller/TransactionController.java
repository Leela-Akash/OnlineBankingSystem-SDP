package com.banking.sdp.backend.controller;

import com.banking.sdp.backend.dto.DepositWithdrawRequest;
import com.banking.sdp.backend.dto.TransferRequest;
import com.banking.sdp.backend.model.Customer;
import com.banking.sdp.backend.model.Transaction;
import com.banking.sdp.backend.repository.TransactionRepository;
import com.banking.sdp.backend.service.CustomerService;
import com.banking.sdp.backend.service.TransactionService;
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

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping({"/api/v1/transaction", "/transaction"})
@Tag(name = "Transaction Management", description = "Endpoints for funds transfers, deposits, withdrawals, history querying, and bank statement generation")
public class TransactionController {

    @Autowired
    private TransactionService transactionService;

    @Autowired
    private CustomerService customerService;

    @Autowired
    private TransactionRepository transactionRepository;

    @Operation(summary = "Add deposit or withdrawal transaction", description = "Directly records a credit or debit operation on customer balance")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Transaction recorded"),
            @ApiResponse(responseCode = "400", description = "Invalid transaction parameters or insufficient funds"),
            @ApiResponse(responseCode = "403", description = "Customer ownership required"),
            @ApiResponse(responseCode = "404", description = "Customer not found")
    })
    @PostMapping("/add/{customerId}")
    @PreAuthorize("@securityService.isCustomerOwner(#customerId)")
    public ResponseEntity<?> addTransaction(
            @Parameter(description = "Customer ID") @PathVariable Long customerId,
            @Valid @RequestBody DepositWithdrawRequest request) {

        Customer customer = customerService.getCustomerById(customerId);
        if (customer == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Customer not found"));
        }

        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "Transaction amount must be strictly greater than 0"));
        }

        Transaction transaction = new Transaction();
        transaction.setCustomer(customer);
        transaction.setAmount(request.getAmount());
        transaction.setType(request.getType());
        transaction.setDescription(request.getDescription());
        transaction.setTransactionDate(LocalDateTime.now());

        Transaction saved = transactionService.addTransaction(transaction);
        return ResponseEntity.ok(saved);
    }

    @Operation(summary = "Get transactions for customer", description = "Returns customer ledger history with optional pagination")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Transaction list retrieved"),
            @ApiResponse(responseCode = "403", description = "Customer ownership required"),
            @ApiResponse(responseCode = "404", description = "Customer not found")
    })
    @GetMapping("/customer/{customerId}")
    @PreAuthorize("@securityService.isCustomerOwner(#customerId)")
    public ResponseEntity<?> getCustomerTransactions(
            @Parameter(description = "Customer ID") @PathVariable Long customerId,
            @Parameter(description = "Zero-based page index") @RequestParam(required = false) Integer page,
            @Parameter(description = "Page size") @RequestParam(required = false) Integer size) {

        Customer customer = customerService.getCustomerById(customerId);
        if (customer == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Customer not found"));
        }

        if (page != null && size != null) {
            Pageable pageable = PageRequest.of(page, size, Sort.by("transactionDate").descending());
            return ResponseEntity.ok(transactionRepository.findByCustomerOrderByTransactionDateDesc(customer, pageable));
        }

        List<Transaction> list = transactionService.getTransactionsByCustomer(customer);
        return ResponseEntity.ok(list);
    }

    @Operation(summary = "Get current customer balance", description = "Calculates verified balance for a customer")
    @GetMapping("/balance/{customerId}")
    @PreAuthorize("@securityService.isCustomerOwner(#customerId)")
    public ResponseEntity<?> getBalance(@Parameter(description = "Customer ID") @PathVariable Long customerId) {
        Customer customer = customerService.getCustomerById(customerId);
        if (customer == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Customer not found"));
        }
        Double balance = transactionService.calculateBalance(customer);
        return ResponseEntity.ok(Map.of("balance", balance));
    }

    @Operation(summary = "Download PDF bank statement", description = "Generates a styled PDF bank statement within the specified date range")
    @GetMapping("/customer/{customerId}/statement")
    @PreAuthorize("@securityService.isCustomerOwner(#customerId)")
    public ResponseEntity<byte[]> downloadStatement(
            @Parameter(description = "Customer ID") @PathVariable Long customerId,
            @Parameter(description = "Start date (YYYY-MM-DD)") @RequestParam String fromDate,
            @Parameter(description = "End date (YYYY-MM-DD)") @RequestParam String toDate) {

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

    @Operation(summary = "View all transactions (Staff / Admin)", description = "Staff and admin view across all transactions with filtering and pagination")
    @GetMapping("/all")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    public ResponseEntity<?> getAllTransactions(
            @Parameter(description = "Zero-based page index") @RequestParam(required = false) Integer page,
            @Parameter(description = "Page size") @RequestParam(required = false) Integer size,
            @Parameter(description = "Transaction type filter: Credit or Debit") @RequestParam(required = false) String type,
            @Parameter(description = "Search description or reference") @RequestParam(required = false) String search) {

        if (page != null && size != null) {
            Pageable pageable = PageRequest.of(page, size, Sort.by("transactionDate").descending());
            return ResponseEntity.ok(transactionRepository.filterTransactions(type, search, pageable));
        }

        List<Transaction> allTxns = transactionService.getAllTransactions();
        return ResponseEntity.ok(allTxns);
    }

    @Operation(summary = "Transfer funds by customer ID", description = "Executes an atomic funds transfer between two customer IDs with pessimistic locking and idempotency protection")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Transfer completed successfully"),
            @ApiResponse(responseCode = "400", description = "Insufficient funds, limit exceeded, or invalid IDs"),
            @ApiResponse(responseCode = "403", description = "Unauthorized sender transfer")
    })
    @PostMapping("/transfer")
    @PreAuthorize("@securityService.isCustomerOwner(#fromCustomerId)")
    public ResponseEntity<?> transferFunds(
            @RequestParam(required = false) Long fromCustomerId,
            @RequestParam(required = false) Long toCustomerId,
            @RequestParam(required = false) Double amount,
            @RequestBody(required = false) TransferRequest body,
            HttpServletRequest httpRequest) {
        try {
            Long senderId = (body != null && body.getFromCustomerId() != null) ? body.getFromCustomerId() : fromCustomerId;
            Long receiverId = (body != null && body.getToCustomerId() != null) ? body.getToCustomerId() : toCustomerId;
            Double transferAmount = (body != null && body.getAmount() != null) ? body.getAmount().doubleValue() : amount;

            if (senderId == null || receiverId == null || transferAmount == null || transferAmount <= 0) {
                return ResponseEntity.badRequest().body(Map.of("error", "Valid sender ID, receiver ID, and positive amount are required"));
            }

            String idempotencyKey = (body != null && body.getIdempotencyKey() != null)
                    ? body.getIdempotencyKey() : httpRequest.getHeader("Idempotency-Key");

            String result = transactionService.transferFunds(
                    senderId, receiverId, BigDecimal.valueOf(transferAmount), idempotencyKey);
            return ResponseEntity.ok(Map.of("message", result));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "Transfer failed: " + e.getMessage()));
        }
    }

    @Operation(summary = "Transfer funds by account number", description = "Executes an atomic funds transfer using destination account number")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Transfer completed successfully"),
            @ApiResponse(responseCode = "400", description = "Insufficient funds, recipient account not found, or limit exceeded"),
            @ApiResponse(responseCode = "403", description = "Unauthorized sender transfer")
    })
    @PostMapping("/transfer/by-account")
    @PreAuthorize("@securityService.isCustomerOwner(#fromCustomerId)")
    public ResponseEntity<?> transferFundsByAccount(
            @RequestParam(required = false) Long fromCustomerId,
            @RequestParam(required = false) String toAccountNumber,
            @RequestParam(required = false) Double amount,
            @RequestBody(required = false) TransferRequest body,
            HttpServletRequest httpRequest) {
        try {
            Long senderId = (body != null && body.getFromCustomerId() != null) ? body.getFromCustomerId() : fromCustomerId;
            String receiverAcc = (body != null && body.getToAccountNumber() != null) ? body.getToAccountNumber() : toAccountNumber;
            Double transferAmount = (body != null && body.getAmount() != null) ? body.getAmount().doubleValue() : amount;

            if (senderId == null || receiverAcc == null || receiverAcc.isBlank() || transferAmount == null || transferAmount <= 0) {
                return ResponseEntity.badRequest().body(Map.of("error", "Valid sender ID, receiver account number, and positive amount are required"));
            }

            String idempotencyKey = (body != null && body.getIdempotencyKey() != null)
                    ? body.getIdempotencyKey() : httpRequest.getHeader("Idempotency-Key");

            String result = transactionService.transferFundsByAccountNumber(
                    senderId, receiverAcc, BigDecimal.valueOf(transferAmount), idempotencyKey);
            return ResponseEntity.ok(Map.of("message", result));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "Transfer failed: " + e.getMessage()));
        }
    }
}
