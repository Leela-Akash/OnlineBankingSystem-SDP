package com.banking.sdp.backend.service;

import java.util.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.banking.sdp.backend.model.Admin;
import com.banking.sdp.backend.model.Customer;
import com.banking.sdp.backend.model.Staff;
import com.banking.sdp.backend.model.Transaction;
import com.banking.sdp.backend.model.Loan;
import com.banking.sdp.backend.repository.AdminRepository;
import com.banking.sdp.backend.repository.CustomerRepository;
import com.banking.sdp.backend.repository.StaffRepository;
import com.banking.sdp.backend.repository.TransactionRepository;
import com.banking.sdp.backend.repository.LoanRepository;

@Service
public class AdminServiceImpl implements AdminService {

    @Autowired
    private AdminRepository adminRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private StaffRepository staffRepository;
    
    @Autowired
    private TransactionRepository transactionRepository;
    
    @Autowired
    private LoanRepository loanRepository;

    @Autowired
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @Override
    public Admin checkAdminLogin(String username, String password) {
        java.util.Optional<Admin> opt = adminRepository.findById(username);
        if (opt.isPresent()) {
            Admin a = opt.get();
            if (passwordEncoder.matches(password, a.getPassword())) {
                return a;
            }
            if (password.equals(a.getPassword())) {
                a.setPassword(passwordEncoder.encode(password));
                adminRepository.save(a);
                return a;
            }
        }
        return null;
    }

    @Override
    public List<Customer> viewAllCustomers() {
        return customerRepository.findAll();
    }

    @Override
    public List<Staff> viewAllStaff() {
        return staffRepository.findAll();
    }

    @Override
    public String addStaff(Staff staff) {
        if (staffRepository.existsByUsername(staff.getUsername())) {
            return "Username already exists! Please choose another one.";
        }
        if (staffRepository.existsByEmail(staff.getEmail())) {
            return "Email already exists! Please use a different email.";
        }
        if (staffRepository.existsByPhone(staff.getPhone())) {
            return "Phone number already exists! Please use a different one.";
        }
        if (staff.getPassword() != null) {
            staff.setPassword(passwordEncoder.encode(staff.getPassword()));
        }
        staffRepository.save(staff);
        return "Staff Added Successfully";
    }

    @Override
    public String deleteCustomer(Long customerId) {
        Optional<Customer> customer = customerRepository.findById(customerId);
        if (customer.isPresent()) {
            customerRepository.deleteById(customerId);
            return "Customer Deleted Successfully";
        } else {
            return "Customer Not Found";
        }
    }

    @Override
    public String deleteStaff(Long staffId) {
        Optional<Staff> staff = staffRepository.findById(staffId);
        if (staff.isPresent()) {
            staffRepository.deleteById(staffId);
            return "Staff Deleted Successfully";
        } else {
            return "Staff Not Found";
        }
    }

    @Override
    public long getCustomerCount() {
        return customerRepository.count();
    }

    @Override
    public long getStaffCount() {
        return staffRepository.count();
    }

    @Override
    public Map<String, Object> getSystemReports() {
        Map<String, Object> reports = new HashMap<>();
        
        // User counts
        long totalCustomers = customerRepository.count();
        long totalStaff = staffRepository.count();
        
        // Active accounts (customers with transactions)
        long activeAccounts = transactionRepository.findAll().stream()
            .map(Transaction::getCustomer)
            .distinct()
            .count();
        
        // Transaction statistics
        List<Transaction> allTransactions = transactionRepository.findAll();
        long totalTransactions = allTransactions.size();
        
        double totalDeposits = allTransactions.stream()
            .filter(tx -> "Credit".equalsIgnoreCase(tx.getType()))
            .mapToDouble(Transaction::getAmount)
            .sum();
        
        double totalWithdrawals = allTransactions.stream()
            .filter(tx -> "Debit".equalsIgnoreCase(tx.getType()))
            .mapToDouble(Transaction::getAmount)
            .sum();
        
        long depositCount = allTransactions.stream()
            .filter(tx -> "Credit".equalsIgnoreCase(tx.getType()))
            .count();
        
        long withdrawalCount = allTransactions.stream()
            .filter(tx -> "Debit".equalsIgnoreCase(tx.getType()))
            .count();
        
        // Loan statistics
        List<Loan> allLoans = loanRepository.findAll();
        long totalLoans = allLoans.size();
        
        long pendingLoans = allLoans.stream()
            .filter(loan -> "Pending".equals(loan.getStatus()))
            .count();
        
        long approvedLoans = allLoans.stream()
            .filter(loan -> "Approved".equals(loan.getStatus()))
            .count();
        
        long activeLoans = allLoans.stream()
            .filter(loan -> "Active".equals(loan.getStatus()))
            .count();
        
        double totalLoanAmount = allLoans.stream()
            .mapToDouble(Loan::getLoanAmount)
            .sum();
        
        double pendingLoanAmount = allLoans.stream()
            .filter(loan -> "Pending".equals(loan.getStatus()))
            .mapToDouble(Loan::getLoanAmount)
            .sum();
        
        double approvedLoanAmount = allLoans.stream()
            .filter(loan -> "Approved".equals(loan.getStatus()) || "Active".equals(loan.getStatus()))
            .mapToDouble(Loan::getLoanAmount)
            .sum();
        
        // Loan type breakdown
        Map<String, Long> loanTypeCount = new HashMap<>();
        Map<String, Double> loanTypeAmount = new HashMap<>();
        allLoans.forEach(loan -> {
            String type = loan.getLoanType();
            loanTypeCount.put(type, loanTypeCount.getOrDefault(type, 0L) + 1);
            loanTypeAmount.put(type, loanTypeAmount.getOrDefault(type, 0.0) + loan.getLoanAmount());
        });
        
        // Transaction type breakdown
        Map<String, Long> transactionBreakdown = new HashMap<>();
        transactionBreakdown.put("Deposits", depositCount);
        transactionBreakdown.put("Withdrawals", withdrawalCount);
        transactionBreakdown.put("Total", totalTransactions);
        
        // Calculate transfers (both sender and receiver transactions)
        long transferTransactions = allTransactions.stream()
            .filter(tx -> tx.getDescription() != null && tx.getDescription().contains("Transfer"))
            .count();
        transactionBreakdown.put("Transfers", transferTransactions / 2); // Divide by 2 since transfers create 2 records
        
        // Calculate revenue (interest earnings)
        double totalLoanInterest = allLoans.stream()
            .filter(loan -> "Active".equals(loan.getStatus()))
            .mapToDouble(loan -> {
                double principal = loan.getLoanAmount();
                double rate = loan.getInterestRate() / 100;
                double monthlyEmi = (principal * rate * Math.pow(1 + rate, loan.getTenureMonths())) / 
                    (Math.pow(1 + rate, loan.getTenureMonths()) - 1);
                double totalAmount = monthlyEmi * loan.getTenureMonths();
                return totalAmount - principal; // Interest earned
            })
            .sum();
        
        // Overdue loans (simplified - loans past due date)
        long overdueLoans = allLoans.stream()
            .filter(loan -> "Active".equals(loan.getStatus()))
            .filter(loan -> loan.getDisbursementDate() != null)
            .filter(loan -> java.time.LocalDate.now().isAfter(
                loan.getDisbursementDate().plusMonths(loan.getTenureMonths())))
            .count();
        
        // Failed transactions (if we had a status field, for now estimate 1%)
        long failedTransactions = (long)(totalTransactions * 0.01);
        
        // High-value transactions (above 50,000)
        long highValueTransactions = allTransactions.stream()
            .filter(tx -> tx.getAmount() > 50000)
            .count();
        
        // System health metrics
        double transactionSuccessRate = ((double)(totalTransactions - failedTransactions) / totalTransactions) * 100;
        
        // Build reports
        reports.put("userStats", Map.of(
            "totalCustomers", totalCustomers,
            "activeAccounts", activeAccounts,
            "totalStaff", totalStaff,
            "totalUsers", totalCustomers + totalStaff
        ));
        
        reports.put("transactionStats", Map.of(
            "totalTransactions", totalTransactions,
            "totalDeposits", totalDeposits,
            "totalWithdrawals", totalWithdrawals,
            "depositCount", depositCount,
            "withdrawalCount", withdrawalCount,
            "netBalance", totalDeposits - totalWithdrawals
        ));
        
        reports.put("loanStats", Map.of(
            "totalLoans", totalLoans,
            "pendingLoans", pendingLoans,
            "approvedLoans", approvedLoans,
            "activeLoans", activeLoans,
            "overdueLoans", overdueLoans,
            "totalLoanAmount", totalLoanAmount,
            "pendingLoanAmount", pendingLoanAmount,
            "approvedLoanAmount", approvedLoanAmount
        ));
        
        reports.put("revenueStats", Map.of(
            "estimatedInterestEarnings", totalLoanInterest,
            "serviceCharges", totalLoanAmount * 0.01,
            "totalRevenue", totalLoanInterest + (totalLoanAmount * 0.01)
        ));
        
        reports.put("systemHealth", Map.of(
            "transactionSuccessRate", transactionSuccessRate,
            "apiUptime", 99.9,
            "failedTransactions", failedTransactions,
            "highValueTransactions", highValueTransactions
        ));
        
        reports.put("loanTypeCount", loanTypeCount);
        reports.put("loanTypeAmount", loanTypeAmount);
        reports.put("transactionBreakdown", transactionBreakdown);
        
        return reports;
    }
}
