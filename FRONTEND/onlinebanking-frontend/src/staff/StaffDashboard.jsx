import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { 
  FaUsers, 
  FaMoneyBillWave, 
  FaHandHoldingUsd, 
  FaClipboardList, 
  FaCheckCircle, 
  FaArrowRight, 
  FaFileInvoiceDollar,
  FaShieldAlt,
  FaExchangeAlt
} from "react-icons/fa";
import apiClient from "../utils/axiosConfig";
import { useAuth } from "../contextapi/AuthContext";
import { useVisibilityPolling } from "../utils/useVisibilityPolling";
import Skeleton from "../components/Skeleton";
import { useToast } from "../components/Toast";
import "./staffcss/Dashboard.css";

export default function StaffDashboard() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
  });
  const [pendingLoans, setPendingLoans] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState(null);

  const staffDetails = (() => {
    try {
      return JSON.parse(sessionStorage.getItem("staff")) || {};
    } catch {
      return {};
    }
  })();

  const fetchDashboardData = useCallback(async () => {
    try {
      const [dashRes, loansRes, txRes] = await Promise.all([
        apiClient.get("/staff/dashboard"),
        apiClient.get("/loan/pending"),
        apiClient.get("/transaction/all"),
      ]);

      setStats({
        totalCustomers: dashRes.data.totalCustomers || 0,
        totalDeposits: dashRes.data.totalDeposits || 0,
        totalWithdrawals: dashRes.data.totalWithdrawals || 0,
      });
      setPendingLoans(loansRes.data || []);
      const txList = Array.isArray(txRes.data) ? txRes.data : txRes.data?.content || [];
      setRecentTransactions(txList.slice(0, 5));
    } catch (err) {
      console.error("Error fetching staff dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useVisibilityPolling(fetchDashboardData, 30000);

  const handleQuickApprove = async (loanId) => {
    setApprovingId(loanId);
    try {
      await apiClient.put(`/loan/approve/${loanId}`, {
        comments: "Approved via Staff Quick Actions",
      });
      addToast("Loan application approved!", "success");
      fetchDashboardData();
    } catch (err) {
      addToast(err.response?.data?.error || "Failed to approve loan", "error");
    } finally {
      setApprovingId(null);
    }
  };

  if (loading) {
    return (
      <div className="staff-dash-container">
        <Skeleton height="140px" style={{ borderRadius: "16px", marginBottom: "24px" }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
          <Skeleton height="110px" />
          <Skeleton height="110px" />
          <Skeleton height="110px" />
          <Skeleton height="110px" />
        </div>
        <Skeleton height="280px" style={{ borderRadius: "16px" }} />
      </div>
    );
  }

  const staffDisplayName = staffDetails.fullName || user?.username || "Branch Officer";

  return (
    <div className="staff-dash-container">
      {/* Modern Executive Header */}
      <div className="staff-header-banner">
        <div className="staff-header-text">
          <div className="staff-system-status">
            <span className="status-dot-pulse"></span>
            <span>Core Ledger Connected • Branch Node #01</span>
          </div>
          <h1>Welcome, {staffDisplayName}</h1>
          <p>Nexus Operations Command & Underwriting Workflow Console</p>
        </div>
        <div className="staff-header-actions">
          <Link to="/staffloans" className="staff-banner-btn">
            <FaClipboardList />
            <span>Review Loans ({pendingLoans.length})</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="staff-kpi-grid">
        <div className="staff-kpi-card fintech-card kpi-blue">
          <div className="kpi-icon-wrap"><FaUsers /></div>
          <div className="kpi-content">
            <span className="kpi-label">Customer Accounts</span>
            <h3 className="kpi-value">{stats.totalCustomers}</h3>
            <span className="kpi-subtext">Active ledger members</span>
          </div>
        </div>

        <div className="staff-kpi-card fintech-card kpi-emerald">
          <div className="kpi-icon-wrap"><FaMoneyBillWave /></div>
          <div className="kpi-content">
            <span className="kpi-label">Cumulative Deposits</span>
            <h3 className="kpi-value">
              ₹{Number(stats.totalDeposits || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </h3>
            <span className="kpi-subtext">Total cash-in settlement</span>
          </div>
        </div>

        <div className="staff-kpi-card fintech-card kpi-rose">
          <div className="kpi-icon-wrap"><FaHandHoldingUsd /></div>
          <div className="kpi-content">
            <span className="kpi-label">Total Outflow</span>
            <h3 className="kpi-value">
              ₹{Number(stats.totalWithdrawals || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </h3>
            <span className="kpi-subtext">Withdrawals & transfers</span>
          </div>
        </div>

        <div className="staff-kpi-card fintech-card kpi-amber">
          <div className="kpi-icon-wrap"><FaClipboardList /></div>
          <div className="kpi-content">
            <span className="kpi-label">Pending Loan Reviews</span>
            <h3 className="kpi-value" style={{ color: "#f59e0b" }}>{pendingLoans.length}</h3>
            <span className="kpi-subtext">
              {pendingLoans.length > 0 ? "⚠️ Requires Underwriting" : "✓ Queue Clear"}
            </span>
          </div>
        </div>
      </div>

      {/* Main 2-Column Section: Underwriting Queue + Recent Transactions */}
      <div className="staff-main-grid">
        {/* Left Column: Underwriting Queue */}
        <div className="fintech-card staff-card-section">
          <div className="card-section-header">
            <div>
              <h3>Priority Loan Underwriting Queue</h3>
              <p>Borrower applications awaiting credit officer adjudication</p>
            </div>
            <Link to="/staffloans" className="section-see-all">
              Full Queue <FaArrowRight style={{ fontSize: "11px" }} />
            </Link>
          </div>

          {pendingLoans.length === 0 ? (
            <div className="staff-empty-state">
              <FaCheckCircle className="empty-state-icon" />
              <p>No pending loan applications. All submissions adjudicated.</p>
            </div>
          ) : (
            <div className="queue-list">
              {pendingLoans.slice(0, 4).map((loan) => (
                <div key={loan.id} className="queue-item">
                  <div className="queue-item-info">
                    <div className="queue-borrower-name">
                      {loan.customer?.fullName || `Applicant #${loan.customer?.id}`}
                    </div>
                    <div className="queue-meta">
                      <span>{loan.loanType}</span> • 
                      <span>{loan.tenureMonths} Months</span> • 
                      <span>Acc #{loan.customer?.accountNumber || "N/A"}</span>
                    </div>
                    {loan.purpose && (
                      <div className="queue-purpose">Purpose: {loan.purpose}</div>
                    )}
                  </div>

                  <div className="queue-item-actions">
                    <div className="queue-amount">
                      ₹{Number(loan.loanAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        onClick={() => handleQuickApprove(loan.id)}
                        disabled={approvingId === loan.id}
                        className="quick-approve-btn"
                      >
                        {approvingId === loan.id ? "..." : "Approve"}
                      </button>
                      <Link to="/staffloans" className="quick-view-btn">
                        Details
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Workflows & Activity */}
        <div className="staff-side-stack">
          {/* Operations Shortcuts */}
          <div className="fintech-card staff-card-section">
            <h3 style={{ fontSize: "16px", marginBottom: "14px", fontWeight: 700 }}>
              Staff Operational Modules
            </h3>
            <div className="workflow-links-grid">
              <Link to="/staffloans" className="workflow-link-item">
                <div className="wf-icon wf-purple"><FaClipboardList /></div>
                <div>
                  <div className="wf-title">Underwriting & Disbursements</div>
                  <div className="wf-desc">Review risk, approve loans, and credit borrower accounts</div>
                </div>
              </Link>

              <Link to="/transactions" className="workflow-link-item">
                <div className="wf-icon wf-teal"><FaExchangeAlt /></div>
                <div>
                  <div className="wf-title">Transaction Ledger Monitor</div>
                  <div className="wf-desc">Audit branch settlements, filter credits/debits, export CSV</div>
                </div>
              </Link>

              <Link to="/customers" className="workflow-link-item">
                <div className="wf-icon wf-blue"><FaUsers /></div>
                <div>
                  <div className="wf-title">Customer Accounts Directory</div>
                  <div className="wf-desc">Search member files, verify KYC, inspect ledger balances</div>
                </div>
              </Link>
            </div>
          </div>

          {/* Quick System Notice */}
          <div className="fintech-card staff-security-badge-card">
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <FaShieldAlt style={{ fontSize: "24px", color: "var(--success)" }} />
              <div>
                <h4 style={{ fontSize: "14px", fontWeight: 700, margin: 0 }}>Security Compliance Active</h4>
                <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "4px 0 0 0" }}>
                  All underwriting approvals are signed with your authenticated staff session key.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
