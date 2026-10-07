package com.banking.sdp.backend.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public class TransferRequest {

    private Long fromCustomerId;

    private String fromAccountNumber;

    private Long toCustomerId;

    private String toAccountNumber;

    @NotNull(message = "Transfer amount is required")
    @DecimalMin(value = "0.01", message = "Transfer amount must be greater than 0")
    private BigDecimal amount;

    private String idempotencyKey;

    public TransferRequest() {}

    public Long getFromCustomerId() { return fromCustomerId; }
    public void setFromCustomerId(Long fromCustomerId) { this.fromCustomerId = fromCustomerId; }

    public String getFromAccountNumber() { return fromAccountNumber; }
    public void setFromAccountNumber(String fromAccountNumber) { this.fromAccountNumber = fromAccountNumber; }

    public Long getToCustomerId() { return toCustomerId; }
    public void setToCustomerId(Long toCustomerId) { this.toCustomerId = toCustomerId; }

    public String getToAccountNumber() { return toAccountNumber; }
    public void setToAccountNumber(String toAccountNumber) { this.toAccountNumber = toAccountNumber; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getIdempotencyKey() { return idempotencyKey; }
    public void setIdempotencyKey(String idempotencyKey) { this.idempotencyKey = idempotencyKey; }
}
