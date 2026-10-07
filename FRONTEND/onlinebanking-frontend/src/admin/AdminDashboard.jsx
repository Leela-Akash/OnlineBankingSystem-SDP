import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../utils/axiosConfig";
import { useVisibilityPolling } from "../utils/useVisibilityPolling";
import Skeleton from "../components/Skeleton";
import "./admincss/AdminDashboard.css";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    customerCount: 0,
    staffCount: 0,
    activeAccounts: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
    totalTransfers: 0,
    activeLoans: 0,
    overdueLoans: 0,
    revenue: 0,
    transactionSuccessRate: 0,
    apiUptime: 100,
  });
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [customerRes, staffRes, reportsRes] = await Promise.all([
        apiClient.get("/admin/customercount"),
        apiClient.get("/admin/staffcount"),
        apiClient.get("/admin/reports"),
      ]);

      const reports = reportsRes.data;
      setStats({
        customerCount: reports.userStats?.totalCustomers || customerRes.data || 0,
        activeAccounts: reports.userStats?.activeAccounts || 0,
        staffCount: staffRes.data || 0,
        totalDeposits: reports.transactionStats?.totalDeposits || 0,
        totalWithdrawals: reports.transactionStats?.totalWithdrawals || 0,
        totalTransfers: reports.transactionBreakdown?.Transfers || 0,
        activeLoans: reports.loanStats?.activeLoans || 0,
        overdueLoans: reports.loanStats?.overdueLoans || 0,
        revenue: reports.revenueStats?.totalRevenue || 0,
        transactionSuccessRate: reports.systemHealth?.transactionSuccessRate || 99.8,
        apiUptime: reports.systemHealth?.apiUptime || 99.9,
      });
    } catch (error) {
      console.error("Error fetching admin dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useVisibilityPolling(fetchDashboardData, 45000);

  if (loading) {
    return (
      <div style={{ maxWidth: "1100px", margin: "30px auto" }}>
        <Skeleton height="50px" width="350px" />
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
    <div className="admin-dashboard" style={{ maxWidth: "1140px", margin: "20px auto" }}>
      <div className="dashboard-header" style={{ marginBottom: "28px" }}>
        <div className="welcome-section">
          <h1 style={{ fontSize: "28px", fontWeight: 800 }}>Executive Bank Command Center</h1>
          <p style={{ color: "rgba(255, 255, 255, 0.92)", fontSize: "14px" }}>
            Nexus Core Banking High-Reliability Operations & System Health
          </p>
        </div>
      </div>

      {/* Primary KPIs */}
      <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px", marginBottom: "20px" }}>
        <div className="stat-card fintech-card" style={{ borderLeft: "4px solid var(--primary)" }}>
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3 style={{ fontSize: "24px", fontWeight: 700 }}>{stats.customerCount}</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>Registered Accounts</p>
            <small style={{ color: "var(--success)", fontWeight: 600 }}>{stats.activeAccounts} Active Ledgers</small>
          </div>
        </div>

        <div className="stat-card fintech-card" style={{ borderLeft: "4px solid var(--success)" }}>
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3 style={{ fontSize: "clamp(18px, 1.8vw, 22px)", fontWeight: 700, color: "var(--success)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              ₹{Number(stats.totalDeposits || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>Cumulative Deposits</p>
          </div>
        </div>

        <div className="stat-card fintech-card" style={{ borderLeft: "4px solid var(--danger)" }}>
          <div className="stat-icon">💸</div>
          <div className="stat-content">
            <h3 style={{ fontSize: "clamp(18px, 1.8vw, 22px)", fontWeight: 700, color: "var(--danger)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              ₹{Number(stats.totalWithdrawals || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>Cumulative Outflow</p>
          </div>
        </div>

        <div className="stat-card fintech-card" style={{ borderLeft: "4px solid #8b5cf6" }}>
          <div className="stat-icon">👔</div>
          <div className="stat-content">
            <h3 style={{ fontSize: "24px", fontWeight: 700 }}>{stats.staffCount}</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>Active Staff Personnel</p>
          </div>
        </div>
      </div>

      {/* Financial Health KPIs */}
      <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px", marginBottom: "32px" }}>
        <div className="stat-card fintech-card" style={{ borderLeft: "4px solid #f59e0b" }}>
          <div className="stat-icon">🏦</div>
          <div className="stat-content">
            <h3 style={{ fontSize: "24px", fontWeight: 700 }}>{stats.activeLoans}</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>Active Disbursed Loans</p>
          </div>
        </div>

        <div className="stat-card fintech-card" style={{ borderLeft: "4px solid #10b981" }}>
          <div className="stat-icon">💵</div>
          <div className="stat-content">
            <h3 style={{ fontSize: "clamp(18px, 1.8vw, 22px)", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              ₹{Number(stats.revenue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>Est. Interest Revenue</p>
          </div>
        </div>

        <div className="stat-card fintech-card" style={{ borderLeft: "4px solid #06b6d4" }}>
          <div className="stat-icon">⚡</div>
          <div className="stat-content">
            <h3 style={{ fontSize: "28px", fontWeight: 700 }}>{Number(stats.transactionSuccessRate).toFixed(1)}%</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>SLA Reliability Rate</p>
          </div>
        </div>
      </div>

      {/* Navigation Shortcuts */}
      <div className="fintech-card">
        <h3 style={{ fontSize: "18px", marginBottom: "16px" }}>Management Shortcuts</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
          <button
            onClick={() => navigate("/admin/manage-customers")}
            className="fintech-btn-primary"
            style={{ justifyContent: "center" }}
          >
            👥 Manage Customers
          </button>
          <button
            onClick={() => navigate("/admin/manage-staff")}
            className="fintech-btn-primary"
            style={{ justifyContent: "center", backgroundColor: "#475569" }}
          >
            👔 Manage Staff
          </button>
          <button
            onClick={() => navigate("/admin/add-staff")}
            className="fintech-btn-primary"
            style={{ justifyContent: "center", backgroundColor: "#0f766e" }}
          >
            ➕ Provision Staff Account
          </button>
          <button
            onClick={() => navigate("/admin/reports")}
            className="fintech-btn-primary"
            style={{ justifyContent: "center", backgroundColor: "#6366f1" }}
          >
            📊 Detailed Analytics & Audit
          </button>
        </div>
      </div>
    </div>
  );
}
