-- ========================================================
-- Flyway Migration V2: Demo Seed Data
-- 1 Admin, 1 Staff, 3 Customers, Sample Transactions & Loans
-- (Plaintext passwords automatically rehashed to BCrypt by PasswordMigrationRunner)
-- ========================================================

-- Seed Admin (credentials: admin / admin123)
INSERT INTO admin_table (username, password)
VALUES ('admin', 'admin123')
ON DUPLICATE KEY UPDATE username = username;

-- Seed Staff (credentials: staff / staff123)
INSERT INTO staff_table (id, full_name, username, password, email, phone)
VALUES (1, 'Sarah Jenkins', 'staff', 'staff123', 'staff@onlinebank.com', '9876543210')
ON DUPLICATE KEY UPDATE username = username;

-- Seed Customers (credentials: johndoe, janesmith, robertb / customer123)
INSERT INTO customer_table (id, account_number, full_name, username, password, email, phone, address, dob, gender, balance, status, daily_limit, per_transfer_limit, version)
VALUES 
(1, '100000000001', 'John Doe', 'johndoe', 'customer123', 'john.doe@example.com', '9876543211', '742 Evergreen Terrace, Springfield', '1990-05-15', 'Male', 25000.00, 'ACTIVE', 100000.00, 50000.00, 0),
(2, '100000000002', 'Jane Smith', 'janesmith', 'customer123', 'jane.smith@example.com', '9876543212', '123 Baker Street, London', '1992-08-22', 'Female', 15000.00, 'ACTIVE', 100000.00, 50000.00, 0),
(3, '100000000003', 'Robert Brown', 'robertb', 'customer123', 'robert.brown@example.com', '9876543213', '456 Elm Street, Metropolis', '1988-11-30', 'Male', 50000.00, 'ACTIVE', 150000.00, 75000.00, 0)
ON DUPLICATE KEY UPDATE username = username;

-- Seed Transactions
INSERT INTO transaction_table (id, customer_id, amount, type, description, transaction_date, balance_after, reference_id, idempotency_key)
VALUES
(1, 1, 30000.00, 'Credit', 'Initial Account Opening Deposit', '2026-09-01 10:00:00', 30000.00, 'TXN-INIT-001', 'IDEMP-INIT-001'),
(2, 1, 5000.00, 'Debit', 'Transfer to Jane Smith (Acc: 100000000002)', '2026-09-15 14:30:00', 25000.00, 'TXN-DEMO-001-DR', 'IDEMP-DEMO-001'),
(3, 2, 10000.00, 'Credit', 'Initial Account Opening Deposit', '2026-09-01 11:00:00', 10000.00, 'TXN-INIT-002', 'IDEMP-INIT-002'),
(4, 2, 5000.00, 'Credit', 'Transfer from John Doe (Acc: 100000000001)', '2026-09-15 14:30:00', 15000.00, 'TXN-DEMO-001-CR', 'IDEMP-DEMO-001'),
(5, 3, 50000.00, 'Credit', 'Initial Corporate Salary Credit', '2026-09-01 09:00:00', 50000.00, 'TXN-INIT-003', 'IDEMP-INIT-003')
ON DUPLICATE KEY UPDATE reference_id = reference_id;

-- Seed Loans
INSERT INTO loan_table (id, customer_id, loan_amount, loan_type, interest_rate, tenure_months, status, purpose, comments, request_date, approval_date, disbursement_date)
VALUES
(1, 1, 200000.00, 'Personal Loan', 11.50, 24, 'Approved', 'Home Renovation', 'Approved based on stable banking history', '2026-09-10', '2026-09-12', NULL),
(2, 2, 500000.00, 'Car Loan', 9.25, 36, 'Active', 'Electric Vehicle Purchase', 'Disbursed to auto dealership', '2026-08-01', '2026-08-03', '2026-08-05'),
(3, 3, 1500000.00, 'Home Loan', 8.50, 120, 'Pending', 'Apartment Purchase', 'Under credit verification', '2026-10-01', NULL, NULL)
ON DUPLICATE KEY UPDATE id = id;

-- Seed Notifications
INSERT INTO notification_table (id, customer_id, title, message, type, is_read, created_at)
VALUES
(1, 1, 'Welcome to Online Banking', 'Your account #100000000001 is active and ready for transfers.', 'account', TRUE, '2026-09-01 10:05:00'),
(2, 1, 'Debit Alert', '₹5000.00 transferred to Jane Smith.', 'transaction', FALSE, '2026-09-15 14:31:00'),
(3, 2, 'Credit Alert', '₹5000.00 received from John Doe.', 'transaction', FALSE, '2026-09-15 14:31:00'),
(4, 3, 'Welcome to Online Banking', 'Your high-limit account #100000000003 is active.', 'account', TRUE, '2026-09-01 09:05:00')
ON DUPLICATE KEY UPDATE id = id;

-- Seed Initial Audit Logs
INSERT INTO audit_log_table (actor_username, role, action, resource_type, resource_id, details, ip_address, timestamp)
VALUES
('SYSTEM', 'SYSTEM', 'SYSTEM_INIT', 'DATABASE', 'SCHEMA', 'Database initialized and seeded via Flyway V2', '127.0.0.1', '2026-10-01 00:00:00');
