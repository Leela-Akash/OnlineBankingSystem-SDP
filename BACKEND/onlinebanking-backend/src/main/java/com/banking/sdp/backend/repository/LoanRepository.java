package com.banking.sdp.backend.repository;

import com.banking.sdp.backend.model.Customer;
import com.banking.sdp.backend.model.Loan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface LoanRepository extends JpaRepository<Loan, Long> {

    List<Loan> findByCustomerOrderByRequestDateDesc(Customer customer);

    List<Loan> findByStatusOrderByRequestDateDesc(String status);

    List<Loan> findByCustomerAndStatus(Customer customer, String status);

    // Reporting aggregations
    long countByStatus(String status);

    @Query("SELECT COALESCE(SUM(l.loanAmount), 0) FROM Loan l")
    BigDecimal sumTotalLoanAmount();

    @Query("SELECT COALESCE(SUM(l.loanAmount), 0) FROM Loan l WHERE l.status = :status")
    BigDecimal sumLoanAmountByStatus(@Param("status") String status);

    @Query("SELECT COALESCE(SUM(l.loanAmount), 0) FROM Loan l WHERE l.status IN ('Approved', 'Active')")
    BigDecimal sumApprovedAndActiveLoanAmount();

    @Query("SELECT l.loanType, COUNT(l), COALESCE(SUM(l.loanAmount), 0) FROM Loan l GROUP BY l.loanType")
    List<Object[]> getLoanStatsGroupedByType();

    @Query("SELECT l FROM Loan l WHERE l.status = 'Active'")
    List<Loan> findActiveLoans();
}
