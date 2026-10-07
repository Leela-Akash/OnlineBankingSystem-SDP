package com.banking.sdp.backend.repository;

import com.banking.sdp.backend.model.Customer;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {

    Customer findByUsernameAndPassword(String username, String password);

    Optional<Customer> findByUsername(String username);

    Optional<Customer> findByEmail(String email);

    Customer findByAccountNumber(String accountNumber);

    // Pessimistic write locking for double-spend protection
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM Customer c WHERE c.id = :id")
    Optional<Customer> findByIdWithLock(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM Customer c WHERE c.accountNumber = :accountNumber")
    Optional<Customer> findByAccountNumberWithLock(@Param("accountNumber") String accountNumber);

    // Soft delete filtering and pagination
    List<Customer> findByStatus(String status);

    Page<Customer> findByStatus(String status, Pageable pageable);

    @Query("SELECT c FROM Customer c WHERE " +
           "(:status IS NULL OR c.status = :status) AND " +
           "(:query IS NULL OR LOWER(c.fullName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(c.username) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(c.email) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "c.accountNumber LIKE CONCAT('%', :query, '%'))")
    Page<Customer> searchCustomers(@Param("query") String query,
                                   @Param("status") String status,
                                   Pageable pageable);

    long countByStatus(String status);

    // Duplicate validations
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
    boolean existsByPhone(String phone);
    boolean existsByAccountNumber(String accountNumber);
}
