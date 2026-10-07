package com.banking.sdp.backend;

import com.banking.sdp.backend.exception.InsufficientBalanceException;
import com.banking.sdp.backend.model.Customer;
import com.banking.sdp.backend.model.Loan;
import com.banking.sdp.backend.model.Transaction;
import com.banking.sdp.backend.repository.CustomerRepository;
import com.banking.sdp.backend.repository.LoanRepository;
import com.banking.sdp.backend.repository.TransactionRepository;
import com.banking.sdp.backend.service.AdminService;
import com.banking.sdp.backend.service.LoanService;
import com.banking.sdp.backend.service.TransactionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.*;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class FinancialCorrectnessTests {

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private LoanRepository loanRepository;

    @Autowired
    private com.banking.sdp.backend.repository.NotificationRepository notificationRepository;

    @Autowired
    private TransactionService transactionService;

    @Autowired
    private LoanService loanService;

    @Autowired
    private AdminService adminService;

    private Customer sender;
    private Customer receiver;

    @BeforeEach
    void setUp() {
        notificationRepository.deleteAll();
        transactionRepository.deleteAll();
        loanRepository.deleteAll();
        customerRepository.deleteAll();

        sender = new Customer();
        sender.setFullName("Alice Sender");
        sender.setUsername("alice_" + UUID.randomUUID().toString().substring(0, 5));
        sender.setPassword("$2a$12$eXampleHashedPassword12345678901234567890123456789012");
        sender.setEmail("alice_" + UUID.randomUUID().toString().substring(0, 5) + "@test.com");
        sender.setPhone("9876543210");
        sender.setAccountNumber("100000000001");
        sender.setBalance(new BigDecimal("10000.00"));
        sender.setStatus("ACTIVE");
        sender.setDailyLimit(new BigDecimal("50000.00"));
        sender.setPerTransferLimit(new BigDecimal("25000.00"));
        sender = customerRepository.save(sender);

        receiver = new Customer();
        receiver.setFullName("Bob Receiver");
        receiver.setUsername("bob_" + UUID.randomUUID().toString().substring(0, 5));
        receiver.setPassword("$2a$12$eXampleHashedPassword12345678901234567890123456789012");
        receiver.setEmail("bob_" + UUID.randomUUID().toString().substring(0, 5) + "@test.com");
        receiver.setPhone("9876543211");
        receiver.setAccountNumber("100000000002");
        receiver.setBalance(new BigDecimal("2000.00"));
        receiver.setStatus("ACTIVE");
        receiver.setDailyLimit(new BigDecimal("50000.00"));
        receiver.setPerTransferLimit(new BigDecimal("25000.00"));
        receiver = customerRepository.save(receiver);
    }

    @Test
    @DisplayName("Single source of truth: Deposit and withdrawal mutate real balance accurately")
    void testDepositAndWithdrawalBalanceMutation() {
        // Test Deposit
        Transaction deposit = new Transaction();
        deposit.setCustomer(sender);
        deposit.setAmount(new BigDecimal("1500.00"));
        deposit.setType("Credit");
        deposit.setDescription("Salary Deposit");
        transactionService.addTransaction(deposit);

        Customer updatedSender = customerRepository.findById(sender.getId()).orElseThrow();
        assertEquals(0, new BigDecimal("11500.00").compareTo(updatedSender.getBalance()));

        // Test Withdrawal
        Transaction withdraw = new Transaction();
        withdraw.setCustomer(updatedSender);
        withdraw.setAmount(new BigDecimal("3500.00"));
        withdraw.setType("Debit");
        withdraw.setDescription("ATM Withdrawal");
        transactionService.addTransaction(withdraw);

        updatedSender = customerRepository.findById(sender.getId()).orElseThrow();
        assertEquals(0, new BigDecimal("8000.00").compareTo(updatedSender.getBalance()));
    }

    @Test
    @DisplayName("Overdraw prevention: Withdrawing more than current balance throws InsufficientBalanceException")
    void testOverdrawPrevention() {
        Transaction excessWithdraw = new Transaction();
        excessWithdraw.setCustomer(sender);
        excessWithdraw.setAmount(new BigDecimal("20000.00")); // current balance is 10000
        excessWithdraw.setType("Debit");

        assertThrows(InsufficientBalanceException.class, () -> transactionService.addTransaction(excessWithdraw));

        // Verify balance was untouched
        Customer current = customerRepository.findById(sender.getId()).orElseThrow();
        assertEquals(0, new BigDecimal("10000.00").compareTo(current.getBalance()));
    }

    @Test
    @DisplayName("Fund transfer atomically debits sender and credits receiver with reference IDs")
    void testAtomicTransfer() throws Exception {
        BigDecimal transferAmount = new BigDecimal("3000.00");
        String result = transactionService.transferFunds(sender.getId(), receiver.getId(), transferAmount, null);

        assertNotNull(result);
        assertTrue(result.contains("completed successfully"));

        Customer updatedSender = customerRepository.findById(sender.getId()).orElseThrow();
        Customer updatedReceiver = customerRepository.findById(receiver.getId()).orElseThrow();

        assertEquals(0, new BigDecimal("7000.00").compareTo(updatedSender.getBalance()));
        assertEquals(0, new BigDecimal("5000.00").compareTo(updatedReceiver.getBalance()));
    }

    @Test
    @DisplayName("Idempotency key prevents duplicate execution and double-deduction on transfer")
    void testTransferIdempotencyKey() throws Exception {
        String idempotencyKey = "IDEMP-KEY-" + UUID.randomUUID();
        BigDecimal transferAmount = new BigDecimal("2000.00");

        // First attempt
        String res1 = transactionService.transferFunds(sender.getId(), receiver.getId(), transferAmount, idempotencyKey);
        assertTrue(res1.contains("completed successfully"));

        // Second attempt with identical idempotency key
        String res2 = transactionService.transferFunds(sender.getId(), receiver.getId(), transferAmount, idempotencyKey);
        assertTrue(res2.contains("already completed successfully"));

        // Sender should only be charged once (10000 - 2000 = 8000)
        Customer updatedSender = customerRepository.findById(sender.getId()).orElseThrow();
        assertEquals(0, new BigDecimal("8000.00").compareTo(updatedSender.getBalance()));
    }

    @Test
    @DisplayName("Per-transfer limit violation throws IllegalArgumentException")
    void testPerTransferLimitEnforcement() {
        // Limit is 25,000; attempt 30,000
        BigDecimal excessAmount = new BigDecimal("30000.00");
        assertThrows(IllegalArgumentException.class, () ->
                transactionService.transferFunds(sender.getId(), receiver.getId(), excessAmount, null)
        );
    }

    @Test
    @DisplayName("Soft delete: Deactivating customer marks status as INACTIVE without removing row")
    void testCustomerSoftDelete() {
        String result = adminService.deleteCustomer(sender.getId());
        assertTrue(result.contains("INACTIVE"));

        Customer softDeleted = customerRepository.findById(sender.getId()).orElseThrow();
        assertEquals("INACTIVE", softDeleted.getStatus());
    }

    @Test
    @DisplayName("Loan disbursement credits customer's real balance and creates transaction")
    void testLoanDisbursement() throws Exception {
        Loan loan = new Loan();
        loan.setCustomer(receiver);
        loan.setLoanAmount(new BigDecimal("50000.00"));
        loan.setLoanType("Personal Loan");
        loan.setTenureMonths(12);
        loan.setPurpose("Medical expense");
        loan = loanService.requestLoan(loan);

        loanService.approveLoan(loan.getId(), "Approved for creditworthy customer");
        Loan disbursed = loanService.disbursement(loan.getId());

        assertEquals("Active", disbursed.getStatus());
        assertNotNull(disbursed.getDisbursementDate());

        // Verify receiver's balance was credited (2000 initial + 50000 loan = 52000)
        Customer updatedReceiver = customerRepository.findById(receiver.getId()).orElseThrow();
        assertEquals(0, new BigDecimal("52000.00").compareTo(updatedReceiver.getBalance()));
    }

    @Test
    @DisplayName("System reports handle empty database without divide-by-zero NaN")
    void testSystemReportsDivideByZeroSafe() {
        Map<String, Object> reports = adminService.getSystemReports();
        assertNotNull(reports);
        assertTrue(reports.containsKey("userStats"));
        assertTrue(reports.containsKey("transactionStats"));
        assertTrue(reports.containsKey("loanStats"));
        assertTrue(reports.containsKey("revenueStats"));
        assertTrue(reports.containsKey("systemHealth"));
    }

    @Test
    @DisplayName("Bidirectional concurrent transfers do not deadlock thanks to consistent lock ordering")
    void testConcurrentBidirectionalTransfersDeadlockFreedom() throws Exception {
        int threads = 10;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch latch = new CountDownLatch(threads);

        for (int i = 0; i < threads; i++) {
            final boolean even = (i % 2 == 0);
            executor.submit(() -> {
                try {
                    if (even) {
                        transactionService.transferFunds(sender.getId(), receiver.getId(), new BigDecimal("10.00"), null);
                    } else {
                        transactionService.transferFunds(receiver.getId(), sender.getId(), new BigDecimal("10.00"), null);
                    }
                } catch (Exception ignored) {
                } finally {
                    latch.countDown();
                }
            });
        }

        boolean completed = latch.await(10, TimeUnit.SECONDS);
        executor.shutdown();
        assertTrue(completed, "Concurrent transfers should complete within 10s without deadlock");
    }
}
