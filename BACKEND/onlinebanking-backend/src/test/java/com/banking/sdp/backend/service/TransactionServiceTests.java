package com.banking.sdp.backend.service;

import com.banking.sdp.backend.exception.InsufficientBalanceException;
import com.banking.sdp.backend.model.Customer;
import com.banking.sdp.backend.model.Transaction;
import com.banking.sdp.backend.repository.CustomerRepository;
import com.banking.sdp.backend.repository.TransactionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TransactionServiceTests {

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private CustomerRepository customerRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private AuditLogService auditLogService;

    @InjectMocks
    private TransactionServiceImpl transactionService;

    private Customer sender;
    private Customer receiver;

    @BeforeEach
    void setUp() {
        sender = new Customer();
        sender.setId(10L);
        sender.setUsername("sender_alice");
        sender.setAccountNumber("100000000010");
        sender.setBalance(new BigDecimal("10000.00"));
        sender.setStatus("ACTIVE");
        sender.setDailyLimit(new BigDecimal("50000.00"));
        sender.setPerTransferLimit(new BigDecimal("25000.00"));

        receiver = new Customer();
        receiver.setId(20L);
        receiver.setUsername("receiver_bob");
        receiver.setAccountNumber("100000000020");
        receiver.setBalance(new BigDecimal("5000.00"));
        receiver.setStatus("ACTIVE");
        receiver.setDailyLimit(new BigDecimal("50000.00"));
        receiver.setPerTransferLimit(new BigDecimal("25000.00"));
    }

    @Test
    @DisplayName("addTransaction for Credit deposits amount into customer balance")
    void testAddTransactionDeposit() {
        when(customerRepository.findByIdWithLock(10L)).thenReturn(Optional.of(sender));
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Transaction tx = new Transaction();
        tx.setCustomer(sender);
        tx.setAmount(new BigDecimal("2000.00"));
        tx.setType("Credit");

        Transaction saved = transactionService.addTransaction(tx);

        assertNotNull(saved);
        assertEquals(0, new BigDecimal("12000.00").compareTo(sender.getBalance()));
        assertEquals(0, new BigDecimal("12000.00").compareTo(saved.getBalanceAfter()));
        assertNotNull(saved.getReferenceId());
        verify(customerRepository, times(1)).save(sender);
    }

    @Test
    @DisplayName("addTransaction for Debit with insufficient funds throws InsufficientBalanceException")
    void testAddTransactionInsufficientBalance() {
        when(customerRepository.findByIdWithLock(10L)).thenReturn(Optional.of(sender));

        Transaction tx = new Transaction();
        tx.setCustomer(sender);
        tx.setAmount(new BigDecimal("15000.00")); // current is 10000
        tx.setType("Debit");

        assertThrows(InsufficientBalanceException.class, () -> transactionService.addTransaction(tx));
        verify(customerRepository, never()).save(any());
        verify(transactionRepository, never()).save(any());
    }

    @Test
    @DisplayName("transferFunds rejects non-positive transfer amounts")
    void testTransferZeroOrNegativeAmount() {
        assertThrows(IllegalArgumentException.class, () ->
                transactionService.transferFunds(10L, 20L, BigDecimal.ZERO, null));
        assertThrows(IllegalArgumentException.class, () ->
                transactionService.transferFunds(10L, 20L, new BigDecimal("-50.00"), null));
    }

    @Test
    @DisplayName("transferFunds rejects transferring to oneself")
    void testTransferToSameAccount() {
        assertThrows(IllegalArgumentException.class, () ->
                transactionService.transferFunds(10L, 10L, new BigDecimal("100.00"), null));
    }

    @Test
    @DisplayName("transferFunds enforces per-transfer limit")
    void testTransferExceedsPerTransferLimit() {
        // Limit is 25000, attempt 26000
        when(customerRepository.findByIdWithLock(10L)).thenReturn(Optional.of(sender));
        when(customerRepository.findByIdWithLock(20L)).thenReturn(Optional.of(receiver));

        assertThrows(IllegalArgumentException.class, () ->
                transactionService.transferFunds(10L, 20L, new BigDecimal("26000.00"), null));
    }

    @Test
    @DisplayName("transferFunds enforces daily limit")
    void testTransferExceedsDailyLimit() {
        // Daily limit 50000, already spent 45000 today, attempting 6000
        when(customerRepository.findByIdWithLock(10L)).thenReturn(Optional.of(sender));
        when(customerRepository.findByIdWithLock(20L)).thenReturn(Optional.of(receiver));
        when(transactionRepository.calculateDailyDebitSum(eq(sender), any(LocalDateTime.class)))
                .thenReturn(new BigDecimal("45000.00"));

        assertThrows(IllegalArgumentException.class, () ->
                transactionService.transferFunds(10L, 20L, new BigDecimal("6000.00"), null));
    }

    @Test
    @DisplayName("transferFunds returns cached confirmation when duplicate idempotency key is submitted")
    void testTransferDuplicateIdempotencyKey() throws Exception {
        Transaction existing = new Transaction();
        existing.setReferenceId("TXN-EXISTING-1234");
        existing.setIdempotencyKey("KEY-123");

        when(transactionRepository.findByIdempotencyKey("KEY-123")).thenReturn(Optional.of(existing));

        String result = transactionService.transferFunds(10L, 20L, new BigDecimal("500.00"), "KEY-123");
        assertTrue(result.contains("already completed successfully"));
        assertTrue(result.contains("TXN-EXISTING-1234"));

        verify(customerRepository, never()).findByIdWithLock(any());
        verify(customerRepository, never()).save(any());
    }
}
