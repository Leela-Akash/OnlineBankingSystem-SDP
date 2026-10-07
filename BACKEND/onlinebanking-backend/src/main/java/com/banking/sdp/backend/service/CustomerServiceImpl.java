package com.banking.sdp.backend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.banking.sdp.backend.model.Customer;
import com.banking.sdp.backend.repository.CustomerRepository;

import java.util.List;
import java.util.Random;

@Service
public class CustomerServiceImpl implements CustomerService {

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @Override
    public String registerCustomer(Customer customer) {
        if (customerRepository.existsByUsername(customer.getUsername())) {
            return "Username already exists!";
        }
        if (customerRepository.existsByEmail(customer.getEmail())) {
            return "Email already exists!";
        }
        if (customerRepository.existsByPhone(customer.getPhone())) {
            return "Phone number already exists!";
        }

        // Generate unique account number
        String accountNumber = generateUniqueAccountNumber();
        customer.setAccountNumber(accountNumber);

        // Secure password with BCrypt
        if (customer.getPassword() != null) {
            customer.setPassword(passwordEncoder.encode(customer.getPassword()));
        }
        
        customerRepository.save(customer);
        return "Customer Registered Successfully with Account Number: " + accountNumber;
    }
    
    private String generateUniqueAccountNumber() {
        Random random = new Random();
        String accountNumber;
        do {
            // Generate 12-digit account number
            long num = 100000000000L + random.nextInt(900000000);
            accountNumber = String.valueOf(num);
        } while (customerRepository.existsByAccountNumber(accountNumber));
        
        return accountNumber;
    }

    @Override
    public Customer checkCustomerLogin(String username, String password) {
        java.util.Optional<Customer> optionalCustomer = customerRepository.findByUsername(username);
        if (optionalCustomer.isPresent()) {
            Customer customer = optionalCustomer.get();
            if (passwordEncoder.matches(password, customer.getPassword())) {
                return customer;
            }
            // Support legacy plaintext passwords by upgrading them on the fly
            if (password.equals(customer.getPassword())) {
                customer.setPassword(passwordEncoder.encode(password));
                customerRepository.save(customer);
                return customer;
            }
        }
        return null;
    }

    @Override
    public String updateCustomerProfile(Customer customer) {
        Customer existing = customerRepository.findById(customer.getId()).orElse(null);
        if (existing != null) {
            // Prevent duplicates during update
            if (!existing.getUsername().equals(customer.getUsername()) &&
                customerRepository.existsByUsername(customer.getUsername())) {
                return "Username already exists!";
            }
            if (!existing.getEmail().equals(customer.getEmail()) &&
                customerRepository.existsByEmail(customer.getEmail())) {
                return "Email already exists!";
            }
            if (!existing.getPhone().equals(customer.getPhone()) &&
                customerRepository.existsByPhone(customer.getPhone())) {
                return "Phone number already exists!";
            }

            existing.setFullName(customer.getFullName());
            existing.setEmail(customer.getEmail());
            existing.setUsername(customer.getUsername());
            if (customer.getPassword() != null && !customer.getPassword().isBlank()) {
                existing.setPassword(passwordEncoder.encode(customer.getPassword()));
            }
            existing.setPhone(customer.getPhone());
            existing.setAddress(customer.getAddress());
            existing.setDob(customer.getDob());
            existing.setGender(customer.getGender());
            // Intentionally DO NOT copy customer.getAccountBalance() - balance is managed solely by transactions/financial operations

            customerRepository.save(existing);
            return "Customer Profile Updated Successfully";
        }
        return "Customer Not Found";
    }

    @Override
    public Customer getCustomerById(Long id) {
        return customerRepository.findById(id).orElse(null);
    }

    @Override
    public Customer getCustomerByAccountNumber(String accountNumber) {
        return customerRepository.findByAccountNumber(accountNumber);
    }

    @Override
    public List<Customer> getAllCustomers() {
        return customerRepository.findAll();
    }
}
