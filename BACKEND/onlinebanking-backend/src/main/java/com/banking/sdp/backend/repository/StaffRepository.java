package com.banking.sdp.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.banking.sdp.backend.model.Staff;

@Repository
public interface StaffRepository extends JpaRepository<Staff, Long> {
    Staff findByUsernameAndPassword(String username, String password);
    java.util.Optional<Staff> findByUsername(String username);

    // For duplicate checks
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
    boolean existsByPhone(String phone);
}
