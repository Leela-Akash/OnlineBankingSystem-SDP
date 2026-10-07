package com.banking.sdp.backend.service;

import com.banking.sdp.backend.model.Customer;
import com.banking.sdp.backend.model.Loan;
import com.banking.sdp.backend.model.Transaction;
import com.banking.sdp.backend.repository.CustomerRepository;
import com.banking.sdp.backend.repository.LoanRepository;
import com.banking.sdp.backend.repository.TransactionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LoanServiceTests {

    @Mock
    private LoanRepository loanRepository;

    @Mock
    private CustomerRepository customerRepository;

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private AuditLogService auditLogService;

    @InjectMocks
    private LoanServiceImpl loanService;

    private Customer customer;
    private Loan loan;

    @BeforeEach
    void setUp() {
        customer = new Customer();
        customer.setId(5L);
        customer.setUsername("loan_applicant");
        customer.setBalance(new BigDecimal("1000.00"));

        loan = new Loan();
        loan.setId(100L);
        loan.setCustomer(customer);
        loan.setLoanAmount(new BigDecimal("100000.00"));
        loan.setLoanType("Home Loan");
        loan.setTenureMonths(60);
        loan.setStatus("Pending");
    }

    @Test
    @DisplayName("requestLoan sets status to Pending and assigns default interest rate if null")
    void testRequestLoan() {
        when(loanRepository.save(any(Loan.class))).thenAnswer(i -> i.getArgument(0));

        Loan result = loanService.requestLoan(loan);

        assertNotNull(result);
        assertEquals("Pending", result.getStatus());
        assertNotNull(result.getInterestRate());
        assertEquals(0, new BigDecimal("8.50").compareTo(result.getInterestRate()));
        verify(loanRepository, times(1)).save(loan);
    }

    @Test
    @DisplayName("approveLoan updates status to Approved")
    void testApproveLoan() throws Exception {
        when(loanRepository.findById(100L)).thenReturn(Optional.of(loan));
        when(loanRepository.save(any(Loan.class))).thenAnswer(i -> i.getArgument(0));

        Loan approved = loanService.approveLoan(100L, "Good credit score");

        assertEquals("Approved", approved.getStatus());
        assertNotNull(approved.getApprovalDate());
        assertEquals("Good credit score", approved.getComments());
    }

    @Test
    @DisplayName("rejectLoan updates status to Rejected")
    void testRejectLoan() throws Exception {
        when(loanRepository.findById(100L)).thenReturn(Optional.of(loan));
        when(loanRepository.save(any(Loan.class))).thenAnswer(i -> i.getArgument(0));

        Loan rejected = loanService.rejectLoan(100L, "Insufficient credit history");

        assertEquals("Rejected", rejected.getStatus());
        assertEquals("Insufficient credit history", rejected.getComments());
    }

    @Test
    @DisplayName("disbursement updates customer balance, creates credit transaction, and marks loan Active")
    void testDisbursement() throws Exception {
        loan.setStatus("Approved");

        when(loanRepository.findById(100L)).thenReturn(Optional.of(loan));
        when(customerRepository.findByIdWithLock(5L)).thenReturn(Optional.of(customer));
        when(loanRepository.save(any(Loan.class))).thenAnswer(i -> i.getArgument(0));
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(i -> i.getArgument(0));

        Loan disbursed = loanService.disbursement(100L);

        assertEquals("Active", disbursed.getStatus());
        assertNotNull(disbursed.getDisbursementDate());

        // Balance must be credited: 1,000 initial + 100,000 loan = 101,000
        assertEquals(0, new BigDecimal("101000.00").compareTo(customer.getBalance()));
        verify(customerRepository, times(1)).save(customer);
        verify(transactionRepository, times(1)).save(any(Transaction.class));
    }
}
