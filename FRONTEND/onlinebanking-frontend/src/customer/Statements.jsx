import React, { useState, useEffect, useMemo } from "react";
import apiClient from "../utils/axiosConfig";
import { useAuth } from "../contextapi/AuthContext";
import { useToast } from "../components/Toast";
import Skeleton from "../components/Skeleton";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import "./customercss/Statement.css";

const COLORS = ["#10b981", "#ef4444"];

export default function Statements() {
  const { user } = useAuth();
  const [customer, setCustomer] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  // Statement date range defaults (last 30 days)
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);

  // Filtering & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");

  const { addToast } = useToast();

  useEffect(() => {
    let stored = null;
    try {
      stored = JSON.parse(sessionStorage.getItem("customer"));
    } catch {}

    const custId = user?.id || stored?.id;
    if (custId) {
      loadData(custId);
    }
  }, [user]);

  const loadData = async (customerId) => {
    setLoading(true);
    try {
      const [custRes, txRes] = await Promise.all([
        apiClient.get(`/customer/${customerId}`),
        apiClient.get(`/transaction/customer/${customerId}`),
      ]);
      setCustomer(custRes.data);
      setTransactions(Array.isArray(txRes.data) ? txRes.data : txRes.data?.content || []);
    } catch (err) {
      addToast("Failed to load customer statements and ledger", "error");
    } finally {
      setLoading(false);
    }
  };

  // Analytics Aggregations
  const analytics = useMemo(() => {
    let totalCredit = 0;
    let totalDebit = 0;

    transactions.forEach((tx) => {
      const amt = Number(tx.amount) || 0;
      if (tx.type?.toLowerCase() === "credit") {
        totalCredit += amt;
      } else if (tx.type?.toLowerCase() === "debit") {
        totalDebit += amt;
      }
    });

    const pieData = [
      { name: "Deposits / Inflow", value: totalCredit },
      { name: "Withdrawals / Outflow", value: totalDebit },
    ];

    return { totalCredit, totalDebit, net: totalCredit - totalDebit, pieData };
  }, [transactions]);

  // Filtered transactions for table
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesType =
        typeFilter === "ALL" || tx.type?.toUpperCase() === typeFilter;
      const desc = tx.description || "";
      const ref = tx.referenceId || "";
      const matchesSearch =
        desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ref.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [transactions, typeFilter, searchTerm]);

  // CSV Export feature
  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) {
      addToast("No transactions available to export", "warning");
      return;
    }

    const headers = ["Reference ID", "Date", "Type", "Amount (INR)", "Balance After", "Description"];
    const rows = filteredTransactions.map((tx) => [
      `"${tx.referenceId || "N/A"}"`,
      `"${tx.transactionDate || ""}"`,
      `"${tx.type || ""}"`,
      `"${tx.amount || 0}"`,
      `"${tx.balanceAfter || "N/A"}"`,
      `"${(tx.description || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Transactions_${customer?.accountNumber || "Statement"}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();

    addToast("Exported transactions to CSV successfully", "success");
  };

  // PDF Statement Download
  const handleDownloadPDF = async () => {
    if (!startDate || !endDate) {
      addToast("Please select both start and end dates", "warning");
      return;
    }

    setDownloading(true);
    try {
      const res = await apiClient.get(
        `/transaction/customer/${customer.id}/statement?fromDate=${startDate}&toDate=${endDate}`,
        { responseType: "blob" }
      );

      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Nexus_Bank_Statement_${startDate}_to_${endDate}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      addToast("Bank statement PDF downloaded successfully", "success");
    } catch (err) {
      addToast("Failed to generate PDF statement. Ensure date format is correct.", "error");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "20px" }}>
        <Skeleton height="40px" width="300px" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", margin: "20px 0" }}>
          <Skeleton height="100px" />
          <Skeleton height="100px" />
          <Skeleton height="100px" />
        </div>
        <Skeleton height="350px" />
      </div>
    );
  }

  return (
    <div className="statement-dashboard" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Top Banner */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ fontSize: "26px", fontWeight: 700 }}>Statements & Spending Analytics</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>
            Account #{customer?.accountNumber} • Verified Ledger Balance: ₹{Number(customer?.balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button onClick={handleExportCSV} className="fintech-btn-primary" style={{ backgroundColor: "#0f766e" }}>
            📥 Export to CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
        <div className="fintech-card" style={{ borderLeft: "4px solid var(--success)" }}>
          <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>Total Inflow (Credits)</div>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "var(--success)", marginTop: "4px" }}>
            +₹{analytics.totalCredit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="fintech-card" style={{ borderLeft: "4px solid var(--danger)" }}>
          <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>Total Outflow (Debits)</div>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "var(--danger)", marginTop: "4px" }}>
            -₹{analytics.totalDebit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="fintech-card" style={{ borderLeft: "4px solid var(--primary)" }}>
          <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>Net Cash Flow</div>
          <div
            style={{
              fontSize: "24px",
              fontWeight: 700,
              color: analytics.net >= 0 ? "var(--success)" : "var(--danger)",
              marginTop: "4px",
            }}
          >
            {analytics.net >= 0 ? "+" : ""}₹{analytics.net.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "20px" }}>
        {/* Pie Chart */}
        <div className="fintech-card">
          <h3 style={{ fontSize: "16px", marginBottom: "16px" }}>Inflow vs Outflow Ratio</h3>
          <div style={{ height: "240px", width: "100%" }}>
            {analytics.totalCredit === 0 && analytics.totalDebit === 0 ? (
              <div style={{ textAlign: "center", paddingTop: "80px", color: "var(--text-muted)" }}>No transaction data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={45}
                    paddingAngle={4}
                  >
                    {analytics.pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `₹${Number(value).toLocaleString()}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Download PDF Statement Card */}
        <div className="fintech-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <h3 style={{ fontSize: "16px", marginBottom: "8px" }}>Official Bank PDF Statement</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "13px", marginBottom: "20px" }}>
              Download certified, password-free PDF statement branded with Nexus Core Banking watermark and transaction ledger details.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    border: "1px solid var(--border-color)",
                    backgroundColor: "var(--bg-main)",
                    color: "var(--text-main)",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    border: "1px solid var(--border-color)",
                    backgroundColor: "var(--bg-main)",
                    color: "var(--text-main)",
                  }}
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleDownloadPDF}
            className="fintech-btn-primary"
            disabled={downloading}
            style={{ width: "100%", justifyContent: "center" }}
          >
            {downloading ? "Generating PDF..." : "📄 Download PDF Statement"}
          </button>
        </div>
      </div>

      {/* Transactions Search & Table */}
      <div className="fintech-card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            marginBottom: "16px",
          }}
        >
          <h3 style={{ fontSize: "18px" }}>Account Activity ({filteredTransactions.length})</h3>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="Search reference or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid var(--border-color)",
                backgroundColor: "var(--bg-main)",
                color: "var(--text-main)",
                fontSize: "14px",
                minWidth: "220px",
              }}
            />

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid var(--border-color)",
                backgroundColor: "var(--bg-main)",
                color: "var(--text-main)",
                fontSize: "14px",
              }}
            >
              <option value="ALL">All Types</option>
              <option value="CREDIT">Credits Only</option>
              <option value="DEBIT">Debits Only</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border-color)", color: "var(--text-muted)" }}>
                <th style={{ padding: "12px 8px" }}>Reference</th>
                <th style={{ padding: "12px 8px" }}>Date</th>
                <th style={{ padding: "12px 8px" }}>Type</th>
                <th style={{ padding: "12px 8px" }}>Description</th>
                <th style={{ padding: "12px 8px", textAlign: "right" }}>Amount</th>
                <th style={{ padding: "12px 8px", textAlign: "right" }}>Balance After</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}>
                    No transactions matching your criteria
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const isCredit = tx.type?.toLowerCase() === "credit";
                  return (
                    <tr key={tx.id || tx.referenceId} style={{ borderBottom: "1px solid var(--border-color)" }}>
                      <td style={{ padding: "12px 8px", fontFamily: "monospace", fontSize: "12px" }}>
                        {tx.referenceId || `#${tx.id}`}
                      </td>
                      <td style={{ padding: "12px 8px", color: "var(--text-muted)", fontSize: "13px" }}>
                        {tx.transactionDate ? new Date(tx.transactionDate).toLocaleDateString() : "N/A"}
                      </td>
                      <td style={{ padding: "12px 8px" }}>
                        <span className={isCredit ? "badge-active" : "badge-inactive"}>{tx.type}</span>
                      </td>
                      <td style={{ padding: "12px 8px" }}>{tx.description || "N/A"}</td>
                      <td
                        style={{
                          padding: "12px 8px",
                          textAlign: "right",
                          fontWeight: 600,
                          color: isCredit ? "var(--success)" : "var(--danger)",
                        }}
                      >
                        {isCredit ? "+" : "-"}₹{Number(tx.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: "12px 8px", textAlign: "right", color: "var(--text-muted)" }}>
                        ₹{Number(tx.balanceAfter || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
