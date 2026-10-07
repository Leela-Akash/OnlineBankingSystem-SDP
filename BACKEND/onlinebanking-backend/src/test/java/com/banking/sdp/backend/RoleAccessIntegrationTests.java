package com.banking.sdp.backend;

import com.banking.sdp.backend.dto.LoginRequest;
import com.banking.sdp.backend.exception.InsufficientBalanceException;
import com.banking.sdp.backend.model.Customer;
import com.banking.sdp.backend.repository.CustomerRepository;
import com.banking.sdp.backend.repository.LoanRepository;
import com.banking.sdp.backend.repository.NotificationRepository;
import com.banking.sdp.backend.repository.TransactionRepository;
import com.banking.sdp.backend.service.TransactionService;
import com.banking.sdp.backend.util.JwtUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.UUID;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class RoleAccessIntegrationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private LoanRepository loanRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private TransactionService transactionService;

    private Customer testCustomer;

    @BeforeEach
    void setUp() {
        notificationRepository.deleteAll();
        transactionRepository.deleteAll();
        loanRepository.deleteAll();
        customerRepository.deleteAll();

        testCustomer = new Customer();
        testCustomer.setFullName("Test User");
        testCustomer.setUsername("testuser_" + UUID.randomUUID().toString().substring(0, 5));
        testCustomer.setPassword(passwordEncoder.encode("Password@123"));
        testCustomer.setEmail("test_" + UUID.randomUUID().toString().substring(0, 5) + "@test.com");
        testCustomer.setPhone("9123456789");
        testCustomer.setAccountNumber("100000000099");
        testCustomer.setBalance(new BigDecimal("1000.00"));
        testCustomer.setStatus("ACTIVE");
        testCustomer = customerRepository.save(testCustomer);
    }

    @Test
    @DisplayName("Auth flow: Customer login returns JWT accessToken and refreshToken")
    void testCustomerLoginFlow() throws Exception {
        LoginRequest request = new LoginRequest(testCustomer.getUsername(), "Password@123");

        mockMvc.perform(post("/customer/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").isNotEmpty())
                .andExpect(jsonPath("$.role").value("CUSTOMER"))
                .andExpect(jsonPath("$.username").value(testCustomer.getUsername()));
    }

    @Test
    @DisplayName("Role access guard: Customer token accessing Admin endpoint returns 403 Forbidden")
    void testCustomerForbiddenOnAdminRoute() throws Exception {
        String customerToken = jwtUtil.generateAccessToken(testCustomer.getUsername(), "CUSTOMER", testCustomer.getId());

        mockMvc.perform(get("/admin/customers")
                        .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.error").value("Forbidden"));
    }

    @Test
    @DisplayName("Role access guard: Customer token accessing Staff dashboard returns 403 Forbidden")
    void testCustomerForbiddenOnStaffRoute() throws Exception {
        String customerToken = jwtUtil.generateAccessToken(testCustomer.getUsername(), "CUSTOMER", testCustomer.getId());

        mockMvc.perform(get("/staff/dashboard")
                        .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Role access success: Admin token successfully accesses Admin endpoint")
    void testAdminAccessAllowed() throws Exception {
        String adminToken = jwtUtil.generateAccessToken("superadmin", "ADMIN", 0L);

        mockMvc.perform(get("/admin/customers")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Concurrency: 20 simultaneous threads attempting to overdraw account must never exceed balance")
    void testConcurrentTransfersNeverOverdraw() throws Exception {
        // testCustomer has exactly 1000.00 balance
        Customer targetReceiver = new Customer();
        targetReceiver.setFullName("Receiver User");
        targetReceiver.setUsername("receiver_" + UUID.randomUUID().toString().substring(0, 5));
        targetReceiver.setPassword(passwordEncoder.encode("Password@123"));
        targetReceiver.setEmail("rec_" + UUID.randomUUID().toString().substring(0, 5) + "@test.com");
        targetReceiver.setPhone("9988776655");
        targetReceiver.setAccountNumber("100000000088");
        targetReceiver.setBalance(new BigDecimal("0.00"));
        targetReceiver.setStatus("ACTIVE");
        targetReceiver = customerRepository.save(targetReceiver);

        int totalThreads = 20;
        BigDecimal transferAmount = new BigDecimal("100.00"); // 20 * 100 = 2000 > 1000 balance!
        ExecutorService executor = Executors.newFixedThreadPool(totalThreads);
        CountDownLatch startGate = new CountDownLatch(1);
        CountDownLatch endGate = new CountDownLatch(totalThreads);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failCount = new AtomicInteger(0);

        Long senderId = testCustomer.getId();
        Long receiverId = targetReceiver.getId();

        for (int i = 0; i < totalThreads; i++) {
            executor.submit(() -> {
                try {
                    startGate.await();
                    transactionService.transferFunds(senderId, receiverId, transferAmount, null);
                    successCount.incrementAndGet();
                } catch (InsufficientBalanceException e) {
                    failCount.incrementAndGet();
                } catch (Exception e) {
                    failCount.incrementAndGet();
                } finally {
                    endGate.countDown();
                }
            });
        }

        // Release all threads simultaneously
        startGate.countDown();
        boolean finished = endGate.await(15, TimeUnit.SECONDS);
        executor.shutdown();

        assertTrue(finished, "Transfers should complete in 15 seconds");

        Customer senderAfter = customerRepository.findById(senderId).orElseThrow();
        Customer receiverAfter = customerRepository.findById(receiverId).orElseThrow();

        // Exact financial invariance check:
        // Sender balance must NEVER be negative!
        assertTrue(senderAfter.getBalance().compareTo(BigDecimal.ZERO) >= 0, "Sender balance must not drop below 0");
        // Sender balance + Receiver balance must equal original total (1000.00 + 0.00 = 1000.00)
        BigDecimal totalSystemBalance = senderAfter.getBalance().add(receiverAfter.getBalance());
        assertEquals(0, new BigDecimal("1000.00").compareTo(totalSystemBalance),
                "Conservation of money: Total system balance must equal initial funds");

        assertEquals(10, successCount.get(), "Exactly 10 transfers of 100 should succeed out of 1000 balance");
        assertEquals(10, failCount.get(), "Remaining 10 transfers must be rejected due to insufficient funds");
    }
}
