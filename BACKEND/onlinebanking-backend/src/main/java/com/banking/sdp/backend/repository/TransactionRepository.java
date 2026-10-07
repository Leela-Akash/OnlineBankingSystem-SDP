package com.banking.sdp.backend.repository;

import com.banking.sdp.backend.model.Customer;
import com.banking.sdp.backend.model.Transaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    List<Transaction> findByCustomerOrderByTransactionDateDesc(Customer customer);

    Page<Transaction> findByCustomerOrderByTransactionDateDesc(Customer customer, Pageable pageable);

    List<Transaction> findByCustomerAndTransactionDateBetweenOrderByTransactionDateDesc(
            Customer customer, LocalDateTime start, LocalDateTime end);

    Page<Transaction> findByCustomerAndTransactionDateBetweenOrderByTransactionDateDesc(
            Customer customer, LocalDateTime start, LocalDateTime end, Pageable pageable);

    Optional<Transaction> findByIdempotencyKey(String idempotencyKey);

    Optional<Transaction> findByReferenceId(String referenceId);

    // Sum of debits for daily limit enforcement
    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE t.customer = :customer AND LOWER(t.type) = 'debit' AND t.transactionDate >= :startOfDay")
    BigDecimal calculateDailyDebitSum(@Param("customer") Customer customer, @Param("startOfDay") LocalDateTime startOfDay);

    // SQL/JPQL Aggregations for High-Performance Reporting
    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE LOWER(t.type) = 'credit'")
    BigDecimal sumTotalDeposits();

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE LOWER(t.type) = 'debit'")
    BigDecimal sumTotalWithdrawals();

    @Query("SELECT COUNT(t) FROM Transaction t WHERE LOWER(t.type) = 'credit'")
    long countDeposits();

    @Query("SELECT COUNT(t) FROM Transaction t WHERE LOWER(t.type) = 'debit'")
    long countWithdrawals();

    @Query("SELECT COUNT(DISTINCT t.customer.id) FROM Transaction t")
    long countActiveAccounts();

    @Query("SELECT COUNT(t) FROM Transaction t WHERE t.amount > :threshold")
    long countHighValueTransactions(@Param("threshold") BigDecimal threshold);

    @Query("SELECT COUNT(t) FROM Transaction t WHERE LOWER(t.description) LIKE '%transfer%'")
    long countTransferRecords();

    // Filtering
    @Query("SELECT t FROM Transaction t WHERE " +
           "(:type IS NULL OR LOWER(t.type) = LOWER(:type)) AND " +
           "(:search IS NULL OR LOWER(t.description) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(t.referenceId) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Transaction> filterTransactions(@Param("type") String type,
                                         @Param("search") String search,
                                         Pageable pageable);
}
