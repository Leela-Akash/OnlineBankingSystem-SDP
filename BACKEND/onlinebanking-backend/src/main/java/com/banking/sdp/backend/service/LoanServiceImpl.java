package com.banking.sdp.backend.service;

import com.banking.sdp.backend.exception.ResourceNotFoundException;
import com.banking.sdp.backend.model.Customer;
import com.banking.sdp.backend.model.Loan;
import com.banking.sdp.backend.model.Transaction;
import com.banking.sdp.backend.repository.CustomerRepository;
import com.banking.sdp.backend.repository.LoanRepository;
import com.banking.sdp.backend.repository.TransactionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class LoanServiceImpl implements LoanService {

    @Autowired
    private LoanRepository loanRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private AuditLogService auditLogService;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Loan requestLoan(Loan loan) {
        if (loan.getLoanAmount() == null || loan.getLoanAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Loan amount must be strictly greater than 0");
        }

        // Set default interest rate based on loan type if not provided
        if (loan.getInterestRate() == null) {
            loan.setInterestRate(calculateInterestRate(loan.getLoanType()));
        }

        loan.setStatus("Pending");
        loan.setRequestDate(LocalDate.now());

        Loan saved = loanRepository.save(loan);
        auditLogService.log(
                loan.getCustomer().getUsername(),
                "CUSTOMER",
                "LOAN_REQUEST",
                "LOAN",
                String.valueOf(saved.getId()),
                "Applied for " + loan.getLoanType() + " of ₹" + loan.getLoanAmount(),
                null
        );
        return saved;
    }

    @Override
    public List<Loan> getCustomerLoans(Customer customer) {
        return loanRepository.findByCustomerOrderByRequestDateDesc(customer);
    }

    @Override
    public List<Loan> getAllPendingLoans() {
        return loanRepository.findByStatusOrderByRequestDateDesc("Pending");
    }

    @Override
    public List<Loan> getAllLoans() {
        return loanRepository.findAll();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Loan approveLoan(Long loanId, String comments) throws Exception {
        Loan loan = loanRepository.findById(loanId)
                .orElseThrow(() -> new ResourceNotFoundException("Loan not found with ID: " + loanId));

        if (!"Pending".equalsIgnoreCase(loan.getStatus())) {
            throw new IllegalArgumentException("Loan cannot be approved. Current status: " + loan.getStatus());
        }

        loan.setStatus("Approved");
        loan.setApprovalDate(LocalDate.now());
        loan.setComments(comments);

        Loan updated = loanRepository.save(loan);
        auditLogService.log(
                "STAFF",
                "STAFF",
                "LOAN_APPROVED",
                "LOAN",
                String.valueOf(loanId),
                "Approved loan for customer " + loan.getCustomer().getUsername() + ": " + comments,
                null
        );
        return updated;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Loan rejectLoan(Long loanId, String comments) throws Exception {
        Loan loan = loanRepository.findById(loanId)
                .orElseThrow(() -> new ResourceNotFoundException("Loan not found with ID: " + loanId));

        if (!"Pending".equalsIgnoreCase(loan.getStatus())) {
            throw new IllegalArgumentException("Loan cannot be rejected. Current status: " + loan.getStatus());
        }

        loan.setStatus("Rejected");
        loan.setComments(comments);

        Loan updated = loanRepository.save(loan);
        auditLogService.log(
                "STAFF",
                "STAFF",
                "LOAN_REJECTED",
                "LOAN",
                String.valueOf(loanId),
                "Rejected loan for customer " + loan.getCustomer().getUsername() + ": " + comments,
                null
        );
        return updated;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Loan disbursement(Long loanId) throws Exception {
        Loan loan = loanRepository.findById(loanId)
                .orElseThrow(() -> new ResourceNotFoundException("Loan not found with ID: " + loanId));

        if (!"Approved".equalsIgnoreCase(loan.getStatus())) {
            throw new IllegalArgumentException("Loan must be approved before disbursement. Current status: " + loan.getStatus());
        }

        // Lock customer account to safely update balance
        Customer customer = customerRepository.findByIdWithLock(loan.getCustomer().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Customer account not found"));

        // Single source of truth balance credit
        customer.setBalance(customer.getBalance().add(loan.getLoanAmount()));
        customerRepository.save(customer);

        loan.setStatus("Active");
        loan.setDisbursementDate(LocalDate.now());

        // Create formal credit transaction for disbursed loan
        Transaction transaction = new Transaction();
        transaction.setCustomer(customer);
        transaction.setAmount(loan.getLoanAmount());
        transaction.setType("Credit");
        transaction.setDescription("Loan disbursement - " + loan.getLoanType() + " (Loan ID: " + loanId + ")");
        transaction.setTransactionDate(LocalDateTime.now());
        transaction.setBalanceAfter(customer.getBalance());
        transaction.setReferenceId("LOAN-DISB-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 4).toUpperCase());
        transactionRepository.save(transaction);

        Loan updatedLoan = loanRepository.save(loan);
        auditLogService.log(
                "STAFF",
                "STAFF",
                "LOAN_DISBURSED",
                "LOAN",
                String.valueOf(loanId),
                "Disbursed loan amount ₹" + loan.getLoanAmount() + " to customer " + customer.getUsername(),
                null
        );

        return updatedLoan;
    }

    private BigDecimal calculateInterestRate(String loanType) {
        if (loanType == null) return new BigDecimal("12.00");

        switch (loanType) {
            case "Home Loan":
                return new BigDecimal("8.50");
            case "Car Loan":
                return new BigDecimal("10.50");
            case "Personal Loan":
                return new BigDecimal("15.00");
            case "Business Loan":
                return new BigDecimal("12.50");
            default:
                return new BigDecimal("12.00");
        }
    }
}
