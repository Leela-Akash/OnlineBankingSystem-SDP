package com.banking.sdp.backend.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "customer_table", indexes = {
        @Index(name = "idx_cust_account_no", columnList = "accountNumber"),
        @Index(name = "idx_cust_username", columnList = "username"),
        @Index(name = "idx_cust_status", columnList = "status")
})
public class Customer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 12)
    private String accountNumber;

    @Column(nullable = false)
    private String fullName;

    @Column(unique = true, nullable = false, length = 50)
    private String username;

    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    @Column(length = 255, nullable = false)
    private String password;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(unique = true, nullable = false, length = 15)
    private String phone;

    private String address;
    private LocalDate dob;
    private String gender;

    // Single source of truth for account balance
    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal balance = BigDecimal.ZERO;

    // Account status: ACTIVE, INACTIVE, SUSPENDED
    @Column(nullable = false, length = 20)
    private String status = "ACTIVE";

    // Financial limits
    @Column(precision = 19, scale = 2)
    private BigDecimal dailyLimit = new BigDecimal("100000.00");

    @Column(precision = 19, scale = 2)
    private BigDecimal perTransferLimit = new BigDecimal("50000.00");

    @Version
    private Long version;

    public Customer() {}

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getAccountNumber() { return accountNumber; }
    public void setAccountNumber(String accountNumber) { this.accountNumber = accountNumber; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public LocalDate getDob() { return dob; }
    public void setDob(LocalDate dob) { this.dob = dob; }

    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }

    public BigDecimal getBalance() { return balance != null ? balance : BigDecimal.ZERO; }
    public void setBalance(BigDecimal balance) { this.balance = balance != null ? balance : BigDecimal.ZERO; }

    // Backward compatibility helper methods
    public Double getAccountBalance() {
        return balance != null ? balance.doubleValue() : 0.0;
    }

    public void setAccountBalance(Double accountBalance) {
        if (accountBalance != null) {
            this.balance = BigDecimal.valueOf(accountBalance);
        }
    }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public BigDecimal getDailyLimit() { return dailyLimit; }
    public void setDailyLimit(BigDecimal dailyLimit) { this.dailyLimit = dailyLimit; }

    public BigDecimal getPerTransferLimit() { return perTransferLimit; }
    public void setPerTransferLimit(BigDecimal perTransferLimit) { this.perTransferLimit = perTransferLimit; }

    public Long getVersion() { return version; }
    public void setVersion(Long version) { this.version = version; }
}
