package com.banking.sdp.backend.service;

import com.banking.sdp.backend.exception.InsufficientBalanceException;
import com.banking.sdp.backend.exception.ResourceNotFoundException;
import com.banking.sdp.backend.model.Customer;
import com.banking.sdp.backend.model.Transaction;
import com.banking.sdp.backend.repository.CustomerRepository;
import com.banking.sdp.backend.repository.TransactionRepository;
import com.itextpdf.text.*;
import com.itextpdf.text.pdf.PdfPCell;
import com.itextpdf.text.pdf.PdfPTable;
import com.itextpdf.text.pdf.PdfWriter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Stream;

@Service
public class TransactionServiceImpl implements TransactionService {

    private static final Logger logger = LoggerFactory.getLogger(TransactionServiceImpl.class);

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private CustomerService customerService;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private AuditLogService auditLogService;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Transaction addTransaction(Transaction transaction) {
        Customer attachedCustomer = transaction.getCustomer();
        if (attachedCustomer == null || attachedCustomer.getId() == null) {
            throw new IllegalArgumentException("Customer is required for transaction");
        }

        // Acquire pessimistic lock on customer account
        Customer customer = customerRepository.findByIdWithLock(attachedCustomer.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with ID: " + attachedCustomer.getId()));

        if (!"ACTIVE".equalsIgnoreCase(customer.getStatus())) {
            throw new IllegalStateException("Account is not active. Current status: " + customer.getStatus());
        }

        BigDecimal amount = transaction.getAmount();
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Transaction amount must be strictly greater than 0");
        }

        String type = transaction.getType();
        if (type == null || type.isBlank()) {
            throw new IllegalArgumentException("Transaction type (Credit/Debit) is required");
        }

        if ("Debit".equalsIgnoreCase(type) || "Withdrawal".equalsIgnoreCase(type)) {
            if (customer.getBalance().compareTo(amount) < 0) {
                throw new InsufficientBalanceException(
                        "Insufficient balance. Current balance: ₹" + customer.getBalance() + ", Requested: ₹" + amount);
            }
            customer.setBalance(customer.getBalance().subtract(amount));
        } else if ("Credit".equalsIgnoreCase(type) || "Deposit".equalsIgnoreCase(type)) {
            customer.setBalance(customer.getBalance().add(amount));
        } else {
            throw new IllegalArgumentException("Invalid transaction type: " + type);
        }

        customerRepository.save(customer);

        transaction.setCustomer(customer);
        transaction.setBalanceAfter(customer.getBalance());
        if (transaction.getTransactionDate() == null) {
            transaction.setTransactionDate(LocalDateTime.now());
        }
        if (transaction.getReferenceId() == null || transaction.getReferenceId().isBlank()) {
            transaction.setReferenceId(generateReferenceId());
        }

        Transaction savedTx = transactionRepository.save(transaction);

        // Audit log action
        auditLogService.log(
                customer.getUsername(),
                "CUSTOMER",
                type.toUpperCase(),
                "TRANSACTION",
                String.valueOf(savedTx.getId()),
                "Processed " + type + " of ₹" + amount + ", Balance after: ₹" + customer.getBalance(),
                null
        );

        return savedTx;
    }

    @Override
    public List<Transaction> getAllTransactions() {
        return transactionRepository.findAll();
    }

    @Override
    public Page<Transaction> getAllTransactions(Pageable pageable) {
        return transactionRepository.findAll(pageable);
    }

    @Override
    public List<Transaction> getTransactionsByCustomer(Customer customer) {
        return transactionRepository.findByCustomerOrderByTransactionDateDesc(customer);
    }

    @Override
    public Page<Transaction> getTransactionsByCustomer(Customer customer, Pageable pageable) {
        return transactionRepository.findByCustomerOrderByTransactionDateDesc(customer, pageable);
    }

    @Override
    public List<Transaction> getTransactionsByCustomerAndDateRange(Customer customer, LocalDateTime start, LocalDateTime end) {
        return transactionRepository.findByCustomerAndTransactionDateBetweenOrderByTransactionDateDesc(customer, start, end);
    }

    @Override
    public Double calculateBalance(Customer customer) {
        if (customer == null) return 0.0;
        Customer current = customerRepository.findById(customer.getId()).orElse(customer);
        return current.getBalance().doubleValue();
    }

    // Backward compatible Double-based transfers
    @Override
    @Transactional(rollbackFor = Exception.class)
    public String transferFunds(Long fromCustomerId, Long toCustomerId, Double amount) throws Exception {
        if (amount == null) {
            throw new IllegalArgumentException("Transfer amount is required");
        }
        return transferFunds(fromCustomerId, toCustomerId, BigDecimal.valueOf(amount), null);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public String transferFundsByAccountNumber(Long fromCustomerId, String toAccountNumber, Double amount) throws Exception {
        if (amount == null) {
            throw new IllegalArgumentException("Transfer amount is required");
        }
        return transferFundsByAccountNumber(fromCustomerId, toAccountNumber, BigDecimal.valueOf(amount), null);
    }

    // Production-grade transfer with Pessimistic Locking, Deadlock Prevention, Limits, and Idempotency
    @Override
    @Transactional(rollbackFor = Exception.class, isolation = Isolation.READ_COMMITTED)
    public String transferFunds(Long fromCustomerId, Long toCustomerId, BigDecimal amount, String idempotencyKey) throws Exception {
        // Idempotency check: if transfer already processed for this idempotency key, return idempotent response
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            Optional<Transaction> existingTx = transactionRepository.findByIdempotencyKey(idempotencyKey);
            if (existingTx.isPresent()) {
                logger.info("Idempotent request received with key: {}. Returning previously confirmed result.", idempotencyKey);
                return "Transfer already completed successfully (Reference: " + existingTx.get().getReferenceId() + ")";
            }
        }

        // Validate amount
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Transfer amount must be strictly greater than 0");
        }

        if (fromCustomerId.equals(toCustomerId)) {
            throw new IllegalArgumentException("Cannot transfer to the same account");
        }

        // DEADLOCK PREVENTION: Always lock in deterministic order of numerical ID (min first, then max)
        Long firstLockId = Math.min(fromCustomerId, toCustomerId);
        Long secondLockId = Math.max(fromCustomerId, toCustomerId);

        Customer firstCustomer = customerRepository.findByIdWithLock(firstLockId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer account not found with ID: " + firstLockId));
        Customer secondCustomer = customerRepository.findByIdWithLock(secondLockId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer account not found with ID: " + secondLockId));

        Customer fromCustomer = fromCustomerId.equals(firstLockId) ? firstCustomer : secondCustomer;
        Customer toCustomer = toCustomerId.equals(firstLockId) ? firstCustomer : secondCustomer;

        if (!"ACTIVE".equalsIgnoreCase(fromCustomer.getStatus())) {
            throw new IllegalStateException("Sender account is not active. Status: " + fromCustomer.getStatus());
        }
        if (!"ACTIVE".equalsIgnoreCase(toCustomer.getStatus())) {
            throw new IllegalStateException("Receiver account is not active. Status: " + toCustomer.getStatus());
        }

        // Validate per-transfer limit
        if (fromCustomer.getPerTransferLimit() != null && amount.compareTo(fromCustomer.getPerTransferLimit()) > 0) {
            throw new IllegalArgumentException(
                    "Amount exceeds per-transfer limit of ₹" + fromCustomer.getPerTransferLimit());
        }

        // Validate daily transfer limit
        LocalDateTime startOfDay = LocalDateTime.now().toLocalDate().atStartOfDay();
        BigDecimal dailySpent = transactionRepository.calculateDailyDebitSum(fromCustomer, startOfDay);
        if (fromCustomer.getDailyLimit() != null && dailySpent.add(amount).compareTo(fromCustomer.getDailyLimit()) > 0) {
            throw new IllegalArgumentException(
                    "Transfer exceeds daily limit of ₹" + fromCustomer.getDailyLimit() +
                    " (Already spent today: ₹" + dailySpent + ")");
        }

        // Validate balance
        if (fromCustomer.getBalance().compareTo(amount) < 0) {
            throw new InsufficientBalanceException(
                    "Insufficient balance. Current balance: ₹" + fromCustomer.getBalance() + ", Transfer amount: ₹" + amount);
        }

        // Atomically mutate balances
        fromCustomer.setBalance(fromCustomer.getBalance().subtract(amount));
        toCustomer.setBalance(toCustomer.getBalance().add(amount));

        customerRepository.save(fromCustomer);
        customerRepository.save(toCustomer);

        LocalDateTime now = LocalDateTime.now();
        String transferRef = generateReferenceId();

        // Create debit transaction for sender
        Transaction debitTx = new Transaction();
        debitTx.setCustomer(fromCustomer);
        debitTx.setAmount(amount);
        debitTx.setType("Debit");
        debitTx.setDescription("Transfer to " + toCustomer.getFullName() + " (Acc: " + toCustomer.getAccountNumber() + ")");
        debitTx.setTransactionDate(now);
        debitTx.setBalanceAfter(fromCustomer.getBalance());
        debitTx.setReferenceId(transferRef + "-DR");
        debitTx.setIdempotencyKey(idempotencyKey);
        transactionRepository.save(debitTx);

        // Create credit transaction for receiver
        Transaction creditTx = new Transaction();
        creditTx.setCustomer(toCustomer);
        creditTx.setAmount(amount);
        creditTx.setType("Credit");
        creditTx.setDescription("Transfer from " + fromCustomer.getFullName() + " (Acc: " + fromCustomer.getAccountNumber() + ")");
        creditTx.setTransactionDate(now);
        creditTx.setBalanceAfter(toCustomer.getBalance());
        creditTx.setReferenceId(transferRef + "-CR");
        transactionRepository.save(creditTx);

        // Notifications
        try {
            notificationService.createTransactionNotification(
                    fromCustomer,
                    "Debit: Fund Transfer",
                    "₹" + amount + " transferred to " + toCustomer.getFullName() + ". Reference: " + transferRef
            );
            notificationService.createTransactionNotification(
                    toCustomer,
                    "Credit: Fund Transfer",
                    "₹" + amount + " received from " + fromCustomer.getFullName() + ". Reference: " + transferRef
            );
        } catch (Exception e) {
            logger.warn("Could not dispatch transfer notification: {}", e.getMessage());
        }

        // Audit log
        auditLogService.log(
                fromCustomer.getUsername(),
                "CUSTOMER",
                "FUND_TRANSFER",
                "TRANSACTION",
                transferRef,
                "Transferred ₹" + amount + " to account " + toCustomer.getAccountNumber(),
                null
        );

        return "Transfer of ₹" + amount + " completed successfully! Reference: " + transferRef;
    }

    @Override
    @Transactional(rollbackFor = Exception.class, isolation = Isolation.READ_COMMITTED)
    public String transferFundsByAccountNumber(Long fromCustomerId, String toAccountNumber, BigDecimal amount, String idempotencyKey) throws Exception {
        Customer receiver = customerRepository.findByAccountNumber(toAccountNumber);
        if (receiver == null) {
            throw new ResourceNotFoundException("Receiver account number not found: " + toAccountNumber);
        }

        return transferFunds(fromCustomerId, receiver.getId(), amount, idempotencyKey);
    }

    @Override
    public byte[] generatePdfStatement(Customer customer, LocalDateTime start, LocalDateTime end) throws Exception {
        List<Transaction> txns = getTransactionsByCustomerAndDateRange(customer, start, end);

        Document document = new Document();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        PdfWriter.getInstance(document, out);

        document.open();
        Font title = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 20);
        Paragraph p = new Paragraph("Online Banking - Account Statement", title);
        p.setAlignment(Element.ALIGN_CENTER);
        document.add(p);

        Font subtitle = FontFactory.getFont(FontFactory.HELVETICA, 11);
        document.add(new Paragraph("Customer Name: " + customer.getFullName() + " | Account: " + customer.getAccountNumber(), subtitle));
        document.add(new Paragraph("Statement Period: " + start.toLocalDate() + " to " + end.toLocalDate(), subtitle));
        document.add(new Paragraph("Current Balance: ₹" + customer.getBalance(), subtitle));
        document.add(Chunk.NEWLINE);

        PdfPTable table = new PdfPTable(6);
        table.setWidthPercentage(100);
        table.setWidths(new int[]{2, 2, 2, 2, 2, 3});

        Stream.of("Date", "Reference", "Type", "Amount (₹)", "Balance (₹)", "Description").forEach(headerTitle -> {
            PdfPCell header = new PdfPCell();
            header.setBackgroundColor(BaseColor.LIGHT_GRAY);
            header.setBorderWidth(1);
            header.setPhrase(new Phrase(headerTitle));
            table.addCell(header);
        });

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

        for (Transaction txn : txns) {
            table.addCell(txn.getTransactionDate().format(formatter));
            table.addCell(txn.getReferenceId() != null ? txn.getReferenceId() : "-");
            table.addCell(txn.getType());
            table.addCell(txn.getAmount() != null ? txn.getAmount().toString() : "0.00");
            table.addCell(txn.getBalanceAfter() != null ? txn.getBalanceAfter().toString() : "-");
            table.addCell(txn.getDescription() == null ? "" : txn.getDescription());
        }

        document.add(table);
        document.close();
        return out.toByteArray();
    }

    private String generateReferenceId() {
        return "TXN-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
    }
}
