package com.banking.sdp.backend.security;

import com.banking.sdp.backend.model.Admin;
import com.banking.sdp.backend.model.Customer;
import com.banking.sdp.backend.model.Staff;
import com.banking.sdp.backend.repository.AdminRepository;
import com.banking.sdp.backend.repository.CustomerRepository;
import com.banking.sdp.backend.repository.StaffRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
public class PasswordMigrationRunner implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(PasswordMigrationRunner.class);

    @Autowired
    private AdminRepository adminRepository;

    @Autowired
    private StaffRepository staffRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        migrateAdminPasswords();
        migrateStaffPasswords();
        migrateCustomerPasswords();
    }

    private boolean isBCrypt(String password) {
        if (password == null) return false;
        return (password.startsWith("$2a$") || password.startsWith("$2b$") || password.startsWith("$2y$")) 
                && password.length() == 60;
    }

    private void migrateAdminPasswords() {
        try {
            List<Admin> admins = adminRepository.findAll();
            int count = 0;
            for (Admin admin : admins) {
                if (admin.getPassword() != null && !isBCrypt(admin.getPassword())) {
                    admin.setPassword(passwordEncoder.encode(admin.getPassword()));
                    adminRepository.save(admin);
                    count++;
                }
            }
            if (count > 0) {
                logger.info("Migrated {} plaintext Admin password(s) to BCrypt", count);
            }
        } catch (Exception e) {
            logger.warn("Could not migrate admin passwords: {}", e.getMessage());
        }
    }

    private void migrateStaffPasswords() {
        try {
            List<Staff> staffList = staffRepository.findAll();
            int count = 0;
            for (Staff staff : staffList) {
                if (staff.getPassword() != null && !isBCrypt(staff.getPassword())) {
                    staff.setPassword(passwordEncoder.encode(staff.getPassword()));
                    staffRepository.save(staff);
                    count++;
                }
            }
            if (count > 0) {
                logger.info("Migrated {} plaintext Staff password(s) to BCrypt", count);
            }
        } catch (Exception e) {
            logger.warn("Could not migrate staff passwords: {}", e.getMessage());
        }
    }

    private void migrateCustomerPasswords() {
        try {
            List<Customer> customers = customerRepository.findAll();
            int count = 0;
            for (Customer customer : customers) {
                if (customer.getPassword() != null && !isBCrypt(customer.getPassword())) {
                    customer.setPassword(passwordEncoder.encode(customer.getPassword()));
                    customerRepository.save(customer);
                    count++;
                }
            }
            if (count > 0) {
                logger.info("Migrated {} plaintext Customer password(s) to BCrypt", count);
            }
        } catch (Exception e) {
            logger.warn("Could not migrate customer passwords: {}", e.getMessage());
        }
    }
}
