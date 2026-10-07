import React, { useState, useEffect, useMemo, useCallback } from "react";
import apiClient from "../utils/axiosConfig";
import { useVisibilityPolling } from "../utils/useVisibilityPolling";
import Skeleton from "../components/Skeleton";
import { useToast } from "../components/Toast";
import "./staffcss/Transactions.css";

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const { addToast } = useToast();

  const fetchTransactions = useCallback(async () => {
    try {
      const res = await apiClient.get("/transaction/all");
      setTransactions(Array.isArray(res.data) ? res.data : res.data?.content || []);
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useVisibilityPolling(fetchTransactions, 45000);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesType = typeFilter === "ALL" || tx.type?.toUpperCase() === typeFilter;
      const desc = tx.description || "";
      const custName = tx.customer?.fullName || "";
      const ref = tx.referenceId || "";
      const matchesSearch =
        desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
        custName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ref.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [transactions, typeFilter, searchTerm]);

  const exportCSV = () => {
    if (filteredTransactions.length === 0) {
      addToast("No transactions to export", "warning");
      return;
    }

    const headers = ["ID", "Reference ID", "Customer", "Account #", "Type", "Amount", "Description", "Date"];
    const rows = filteredTransactions.map((tx) => [
      `"${tx.id}"`,
      `"${tx.referenceId || "N/A"}"`,
      `"${tx.customer?.fullName || "N/A"}"`,
      `"${tx.customer?.accountNumber || "N/A"}"`,
      `"${tx.type || ""}"`,
      `"${tx.amount || 0}"`,
      `"${(tx.description || "").replace(/"/g, '""')}"`,
      `"${tx.transactionDate || ""}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Staff_Transactions_Audit_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();

    addToast("Exported transactions to CSV", "success");
  };

  if (loading) {
    return (
      <div style={{ maxWidth: "1100px", margin: "30px auto" }}>
        <Skeleton height="40px" width="300px" />
        <Skeleton height="350px" style={{ marginTop: "20px" }} />
      </div>
    );
  }

  return (
    <div className="transactions-container fintech-card" style={{ maxWidth: "1100px", margin: "20px auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ fontSize: "24px", fontWeight: 700 }}>System Transactions Ledger</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>
            Real-time branch financial transactions monitoring & auditing
          </p>
        </div>

        <button onClick={exportCSV} className="fintech-btn-primary" style={{ backgroundColor: "#0f766e" }}>
          📥 Export CSV
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Filter by customer, description, reference..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: 1,
            minWidth: "240px",
            padding: "10px 14px",
            borderRadius: "6px",
            border: "1px solid var(--border-color)",
            backgroundColor: "var(--bg-main)",
            color: "var(--text-main)",
            fontSize: "14px",
          }}
        />

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{
            padding: "10px 14px",
            borderRadius: "6px",
            border: "1px solid var(--border-color)",
            backgroundColor: "var(--bg-main)",
            color: "var(--text-main)",
            fontSize: "14px",
          }}
        >
          <option value="ALL">All Transaction Types</option>
          <option value="CREDIT">Credits (Deposits)</option>
          <option value="DEBIT">Debits (Withdrawals / Transfers)</option>
        </select>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--border-color)", color: "var(--text-muted)" }}>
              <th style={{ padding: "12px 8px" }}>ID / Reference</th>
              <th style={{ padding: "12px 8px" }}>Customer</th>
              <th style={{ padding: "12px 8px" }}>Account #</th>
              <th style={{ padding: "12px 8px" }}>Type</th>
              <th style={{ padding: "12px 8px", textAlign: "right" }}>Amount</th>
              <th style={{ padding: "12px 8px" }}>Description</th>
              <th style={{ padding: "12px 8px" }}>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}>
                  No matching transactions found
                </td>
              </tr>
            ) : (
              filteredTransactions.map((txn) => {
                const isCredit = txn.type?.toLowerCase() === "credit";
                return (
                  <tr key={txn.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                    <td style={{ padding: "12px 8px", fontFamily: "monospace", fontSize: "12px" }}>
                      {txn.referenceId || `#${txn.id}`}
                    </td>
                    <td style={{ padding: "12px 8px", fontWeight: 600 }}>
                      {txn.customer?.fullName || `Customer #${txn.customer?.id || "N/A"}`}
                    </td>
                    <td style={{ padding: "12px 8px", fontFamily: "monospace", fontSize: "13px" }}>
                      {txn.customer?.accountNumber || "-"}
                    </td>
                    <td style={{ padding: "12px 8px" }}>
                      <span className={isCredit ? "badge-active" : "badge-inactive"}>{txn.type}</span>
                    </td>
                    <td
                      style={{
                        padding: "12px 8px",
                        textAlign: "right",
                        fontWeight: 700,
                        color: isCredit ? "var(--success)" : "var(--danger)",
                      }}
                    >
                      {isCredit ? "+" : "-"}₹{Number(txn.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: "12px 8px" }}>{txn.description || "-"}</td>
                    <td style={{ padding: "12px 8px", color: "var(--text-muted)", fontSize: "13px" }}>
                      {txn.transactionDate ? new Date(txn.transactionDate).toLocaleString() : "N/A"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
