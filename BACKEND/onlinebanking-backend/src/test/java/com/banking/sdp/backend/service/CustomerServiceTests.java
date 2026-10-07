package com.banking.sdp.backend.service;

import com.banking.sdp.backend.model.Customer;
import com.banking.sdp.backend.repository.CustomerRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CustomerServiceTests {

    @Mock
    private CustomerRepository customerRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private CustomerServiceImpl customerService;

    private Customer sampleCustomer;

    @BeforeEach
    void setUp() {
        sampleCustomer = new Customer();
        sampleCustomer.setId(1L);
        sampleCustomer.setFullName("John Doe");
        sampleCustomer.setUsername("johndoe");
        sampleCustomer.setPassword("rawPassword123");
        sampleCustomer.setEmail("john@example.com");
        sampleCustomer.setPhone("9876543210");
        sampleCustomer.setBalance(new BigDecimal("5000.00"));
        sampleCustomer.setStatus("ACTIVE");
    }

    @Test
    @DisplayName("Registration rejects duplicate username")
    void testRegisterCustomerDuplicateUsername() {
        when(customerRepository.existsByUsername("johndoe")).thenReturn(true);

        String result = customerService.registerCustomer(sampleCustomer);
        assertTrue(result.contains("Username already exists"));
        verify(customerRepository, never()).save(any());
    }

    @Test
    @DisplayName("Registration rejects duplicate email")
    void testRegisterCustomerDuplicateEmail() {
        when(customerRepository.existsByUsername("johndoe")).thenReturn(false);
        when(customerRepository.existsByEmail("john@example.com")).thenReturn(true);

        String result = customerService.registerCustomer(sampleCustomer);
        assertTrue(result.contains("Email already exists"));
        verify(customerRepository, never()).save(any());
    }

    @Test
    @DisplayName("Successful registration encodes password and generates 12-digit account number")
    void testRegisterCustomerSuccess() {
        when(customerRepository.existsByUsername("johndoe")).thenReturn(false);
        when(customerRepository.existsByEmail("john@example.com")).thenReturn(false);
        when(customerRepository.existsByPhone("9876543210")).thenReturn(false);
        when(customerRepository.existsByAccountNumber(anyString())).thenReturn(false);
        when(passwordEncoder.encode("rawPassword123")).thenReturn("$2a$12$hashedPassword");

        String result = customerService.registerCustomer(sampleCustomer);

        assertTrue(result.contains("Customer Registered Successfully"));
        assertNotNull(sampleCustomer.getAccountNumber());
        assertEquals(12, sampleCustomer.getAccountNumber().length());
        assertEquals("$2a$12$hashedPassword", sampleCustomer.getPassword());
        verify(customerRepository, times(1)).save(sampleCustomer);
    }

    @Test
    @DisplayName("checkCustomerLogin succeeds with valid BCrypt password")
    void testCheckCustomerLoginSuccess() {
        sampleCustomer.setPassword("$2a$12$hashedPassword");
        when(customerRepository.findByUsername("johndoe")).thenReturn(Optional.of(sampleCustomer));
        when(passwordEncoder.matches("rawPassword123", "$2a$12$hashedPassword")).thenReturn(true);

        Customer authenticated = customerService.checkCustomerLogin("johndoe", "rawPassword123");
        assertNotNull(authenticated);
        assertEquals("johndoe", authenticated.getUsername());
    }

    @Test
    @DisplayName("checkCustomerLogin fails with invalid password")
    void testCheckCustomerLoginBadPassword() {
        sampleCustomer.setPassword("$2a$12$hashedPassword");
        when(customerRepository.findByUsername("johndoe")).thenReturn(Optional.of(sampleCustomer));
        when(passwordEncoder.matches("wrongPassword", "$2a$12$hashedPassword")).thenReturn(false);

        Customer authenticated = customerService.checkCustomerLogin("johndoe", "wrongPassword");
        assertNull(authenticated);
    }

    @Test
    @DisplayName("Profile update blocks direct balance overwrite")
    void testUpdateProfileBlocksBalanceMutation() {
        Customer existing = new Customer();
        existing.setId(1L);
        existing.setFullName("John Doe");
        existing.setUsername("johndoe");
        existing.setEmail("john@example.com");
        existing.setPhone("9876543210");
        existing.setBalance(new BigDecimal("5000.00"));

        Customer incomingUpdate = new Customer();
        incomingUpdate.setId(1L);
        incomingUpdate.setFullName("John Updated");
        incomingUpdate.setUsername("johndoe");
        incomingUpdate.setEmail("john@example.com");
        incomingUpdate.setPhone("9876543210");
        // Malicious or accidental attempt to update balance to 999999
        incomingUpdate.setBalance(new BigDecimal("999999.00"));

        when(customerRepository.findById(1L)).thenReturn(Optional.of(existing));

        String result = customerService.updateCustomerProfile(incomingUpdate);
        assertTrue(result.contains("Updated Successfully"));

        // Crucial financial assertion: existing balance remains 5000.00
        assertEquals(0, new BigDecimal("5000.00").compareTo(existing.getBalance()));
        verify(customerRepository, times(1)).save(existing);
    }
}
