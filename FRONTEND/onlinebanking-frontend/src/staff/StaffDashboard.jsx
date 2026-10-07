import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import apiClient from "../utils/axiosConfig";
import { useVisibilityPolling } from "../utils/useVisibilityPolling";
import Skeleton from "../components/Skeleton";
import "./staffcss/Dashboard.css";

export default function StaffDashboard() {
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
  });
  const [pendingLoansCount, setPendingLoansCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboardData = useCallback(async () => {
    try {
      const [dashRes, loansRes] = await Promise.all([
        apiClient.get("/staff/dashboard"),
        apiClient.get("/loan/pending"),
      ]);

      setStats({
        totalCustomers: dashRes.data.totalCustomers || 0,
        totalDeposits: dashRes.data.totalDeposits || 0,
        totalWithdrawals: dashRes.data.totalWithdrawals || 0,
      });
      setPendingLoansCount((loansRes.data || []).length);
      setError("");
    } catch (err) {
      console.error("Error fetching staff dashboard data:", err);
      setError("Failed to synchronize branch statistics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Visibility-aware polling pauses when tab is hidden, refreshes on return
  useVisibilityPolling(fetchDashboardData, 45000);

  if (loading) {
    return (
      <div style={{ maxWidth: "1000px", margin: "30px auto" }}>
        <Skeleton height="50px" width="300px" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginTop: "24px" }}>
          <Skeleton height="120px" />
          <Skeleton height="120px" />
          <Skeleton height="120px" />
          <Skeleton height="120px" />
        </div>
      </div>
    );
  }

  return (
    <div className="staff-dashboard" style={{ maxWidth: "1100px", margin: "20px auto" }}>
      <div className="dashboard-header" style={{ marginBottom: "28px" }}>
        <div className="welcome-section">
          <h1 style={{ fontSize: "28px", fontWeight: 800 }}>Staff Operations Dashboard</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>
            Branch Operational Metrics & Underwriting Queue
          </p>
        </div>
      </div>

      {error && <p className="dashboard-error">{error}</p>}

      <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "32px" }}>
        <div className="stat-card fintech-card" style={{ borderLeft: "4px solid var(--primary)" }}>
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3 style={{ fontSize: "28px", fontWeight: 700 }}>{stats.totalCustomers}</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>Registered Accounts</p>
          </div>
        </div>

        <div className="stat-card fintech-card" style={{ borderLeft: "4px solid var(--success)" }}>
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3 style={{ fontSize: "28px", fontWeight: 700 }}>{stats.totalDeposits}</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>Deposits Processed</p>
          </div>
        </div>

        <div className="stat-card fintech-card" style={{ borderLeft: "4px solid var(--danger)" }}>
          <div className="stat-icon">💸</div>
          <div className="stat-content">
            <h3 style={{ fontSize: "28px", fontWeight: 700 }}>{stats.totalWithdrawals}</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>Withdrawals Processed</p>
          </div>
        </div>

        <div className="stat-card fintech-card" style={{ borderLeft: "4px solid #f59e0b" }}>
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <h3 style={{ fontSize: "28px", fontWeight: 700, color: "#f59e0b" }}>{pendingLoansCount}</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>Pending Loan Reviews</p>
          </div>
        </div>
      </div>

      {/* Quick Actions Panel */}
      <div className="fintech-card">
        <h3 style={{ fontSize: "18px", marginBottom: "16px" }}>Operational Workflows</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
          <Link to="/staffloans" style={{ textDecoration: "none" }}>
            <div style={{ padding: "18px", borderRadius: "8px", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-main)" }}>
              <div style={{ fontWeight: 600, fontSize: "16px", color: "var(--text-main)" }}>📋 Loan Approval Queue</div>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
                Review pending loan applications and disburse approved funds
              </p>
            </div>
          </Link>

          <Link to="/transactions" style={{ textDecoration: "none" }}>
            <div style={{ padding: "18px", borderRadius: "8px", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-main)" }}>
              <div style={{ fontWeight: 600, fontSize: "16px", color: "var(--text-main)" }}>💳 Transaction Monitor</div>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
                Inspect systemic transactions, audit references, and settlement timestamps
              </p>
            </div>
          </Link>

          <Link to="/customers" style={{ textDecoration: "none" }}>
            <div style={{ padding: "18px", borderRadius: "8px", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-main)" }}>
              <div style={{ fontWeight: 600, fontSize: "16px", color: "var(--text-main)" }}>👥 Customer Directory</div>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
                Browse customer profiles, ledger balances, and active account numbers
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
