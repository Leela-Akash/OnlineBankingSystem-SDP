package com.banking.sdp.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.banking.sdp.backend.model.Customer;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {
    Customer findByUsernameAndPassword(String username, String password);
    java.util.Optional<Customer> findByUsername(String username);
    java.util.Optional<Customer> findByEmail(String email);

    // Find by account number
    Customer findByAccountNumber(String accountNumber);

    // Duplicate validations
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
    boolean existsByPhone(String phone);
    boolean existsByAccountNumber(String accountNumber);
}
