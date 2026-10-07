package com.banking.sdp.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "loan_table", indexes = {
        @Index(name = "idx_loan_cust_id", columnList = "customer_id"),
        @Index(name = "idx_loan_status", columnList = "status")
})
public class Loan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "customer_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Customer customer;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal loanAmount;

    @Column(length = 50, nullable = false)
    private String loanType; // "Home Loan", "Personal Loan", "Business Loan", "Car Loan"

    @Column(precision = 5, scale = 2)
    private BigDecimal interestRate;

    @Column(nullable = false)
    private Integer tenureMonths; // Loan duration in months

    @Column(length = 30, nullable = false)
    private String status; // "Pending", "Approved", "Rejected", "Active", "Completed"

    @Column(length = 500)
    private String purpose;

    @Column(length = 500)
    private String comments;

    @Column(nullable = false)
    private LocalDate requestDate;

    private LocalDate approvalDate;
    private LocalDate disbursementDate;

    public Loan() {
        this.requestDate = LocalDate.now();
        this.status = "Pending";
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Customer getCustomer() { return customer; }
    public void setCustomer(Customer customer) { this.customer = customer; }

    public BigDecimal getLoanAmount() { return loanAmount; }
    public void setLoanAmount(BigDecimal loanAmount) { this.loanAmount = loanAmount; }

    public void setLoanAmount(Double loanAmount) {
        this.loanAmount = loanAmount != null ? BigDecimal.valueOf(loanAmount) : null;
    }

    public Double getLoanAmountValue() {
        return loanAmount != null ? loanAmount.doubleValue() : 0.0;
    }

    public String getLoanType() { return loanType; }
    public void setLoanType(String loanType) { this.loanType = loanType; }

    public BigDecimal getInterestRate() { return interestRate; }
    public void setInterestRate(BigDecimal interestRate) { this.interestRate = interestRate; }

    public void setInterestRate(Double interestRate) {
        this.interestRate = interestRate != null ? BigDecimal.valueOf(interestRate) : null;
    }

    public Double getInterestRateValue() {
        return interestRate != null ? interestRate.doubleValue() : 0.0;
    }

    public Integer getTenureMonths() { return tenureMonths; }
    public void setTenureMonths(Integer tenureMonths) { this.tenureMonths = tenureMonths; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getPurpose() { return purpose; }
    public void setPurpose(String purpose) { this.purpose = purpose; }

    public String getComments() { return comments; }
    public void setComments(String comments) { this.comments = comments; }

    public LocalDate getRequestDate() { return requestDate; }
    public void setRequestDate(LocalDate requestDate) { this.requestDate = requestDate; }

    public LocalDate getApprovalDate() { return approvalDate; }
    public void setApprovalDate(LocalDate approvalDate) { this.approvalDate = approvalDate; }

    public LocalDate getDisbursementDate() { return disbursementDate; }
    public void setDisbursementDate(LocalDate disbursementDate) { this.disbursementDate = disbursementDate; }
}
