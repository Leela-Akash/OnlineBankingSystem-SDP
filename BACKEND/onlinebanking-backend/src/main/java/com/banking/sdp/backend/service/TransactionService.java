package com.banking.sdp.backend.service;

import com.banking.sdp.backend.model.Customer;
import com.banking.sdp.backend.model.Transaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public interface TransactionService {
    Transaction addTransaction(Transaction transaction);
    List<Transaction> getAllTransactions();
    Page<Transaction> getAllTransactions(Pageable pageable);
    List<Transaction> getTransactionsByCustomer(Customer customer);
    Page<Transaction> getTransactionsByCustomer(Customer customer, Pageable pageable);
    List<Transaction> getTransactionsByCustomerAndDateRange(Customer customer, LocalDateTime start, LocalDateTime end);
    byte[] generatePdfStatement(Customer customer, LocalDateTime start, LocalDateTime end) throws Exception;

    Double calculateBalance(Customer customer);

    // Fund transfer with Double (backward compatibility)
    String transferFunds(Long fromCustomerId, Long toCustomerId, Double amount) throws Exception;
    String transferFundsByAccountNumber(Long fromCustomerId, String toAccountNumber, Double amount) throws Exception;

    // Financial correctness: Fund transfer with BigDecimal and Idempotency key
    String transferFunds(Long fromCustomerId, Long toCustomerId, BigDecimal amount, String idempotencyKey) throws Exception;
    String transferFundsByAccountNumber(Long fromCustomerId, String toAccountNumber, BigDecimal amount, String idempotencyKey) throws Exception;
}
