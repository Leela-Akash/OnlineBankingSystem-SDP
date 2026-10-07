-- ========================================================
-- Flyway Migration V1: Initial Database Schema
-- Online Banking System
-- ========================================================

-- Admin table
CREATE TABLE IF NOT EXISTS admin_table (
    username VARCHAR(50) NOT NULL PRIMARY KEY,
    password VARCHAR(255) NOT NULL
);

-- Staff table
CREATE TABLE IF NOT EXISTS staff_table (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(15) NOT NULL UNIQUE
);

-- Customer table (single source of truth for balances, limits, soft delete status)
CREATE TABLE IF NOT EXISTS customer_table (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    account_number VARCHAR(12) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(15) NOT NULL UNIQUE,
    address VARCHAR(255),
    dob DATE,
    gender VARCHAR(20),
    balance DECIMAL(19, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    daily_limit DECIMAL(19, 2) DEFAULT 100000.00,
    per_transfer_limit DECIMAL(19, 2) DEFAULT 50000.00,
    version BIGINT DEFAULT 0
);

CREATE INDEX idx_cust_account_no ON customer_table(account_number);
CREATE INDEX idx_cust_username ON customer_table(username);
CREATE INDEX idx_cust_status ON customer_table(status);

-- Transaction table
CREATE TABLE IF NOT EXISTS transaction_table (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    customer_id BIGINT NOT NULL,
    amount DECIMAL(19, 2) NOT NULL,
    type VARCHAR(20) NOT NULL,
    description VARCHAR(500),
    transaction_date DATETIME NOT NULL,
    balance_after DECIMAL(19, 2),
    reference_id VARCHAR(64) UNIQUE,
    idempotency_key VARCHAR(100),
    CONSTRAINT fk_txn_customer FOREIGN KEY (customer_id) REFERENCES customer_table(id) ON DELETE CASCADE
);

CREATE INDEX idx_txn_cust_id ON transaction_table(customer_id);
CREATE INDEX idx_txn_date ON transaction_table(transaction_date);
CREATE INDEX idx_txn_ref_id ON transaction_table(reference_id);
CREATE INDEX idx_txn_idempotency ON transaction_table(idempotency_key);

-- Loan table
CREATE TABLE IF NOT EXISTS loan_table (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    customer_id BIGINT NOT NULL,
    loan_amount DECIMAL(19, 2) NOT NULL,
    loan_type VARCHAR(50) NOT NULL,
    interest_rate DECIMAL(5, 2),
    tenure_months INT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'Pending',
    purpose VARCHAR(500),
    comments VARCHAR(500),
    request_date DATE NOT NULL,
    approval_date DATE,
    disbursement_date DATE,
    CONSTRAINT fk_loan_customer FOREIGN KEY (customer_id) REFERENCES customer_table(id) ON DELETE CASCADE
);

CREATE INDEX idx_loan_cust_id ON loan_table(customer_id);
CREATE INDEX idx_loan_status ON loan_table(status);

-- Notification table
CREATE TABLE IF NOT EXISTS notification_table (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    customer_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message VARCHAR(1000) NOT NULL,
    type VARCHAR(50),
    is_read BOOLEAN DEFAULT FALSE,
    created_at DATETIME NOT NULL,
    CONSTRAINT fk_notif_customer FOREIGN KEY (customer_id) REFERENCES customer_table(id) ON DELETE CASCADE
);

CREATE INDEX idx_notif_cust_id ON notification_table(customer_id);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_log_table (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    actor_username VARCHAR(100) NOT NULL,
    role VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(100),
    details VARCHAR(1000),
    ip_address VARCHAR(50),
    timestamp DATETIME NOT NULL
);

CREATE INDEX idx_audit_actor ON audit_log_table(actor_username);
CREATE INDEX idx_audit_action ON audit_log_table(action);
CREATE INDEX idx_audit_timestamp ON audit_log_table(timestamp);
