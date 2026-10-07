import { useEffect, useState, useCallback, useMemo } from "react";
import apiClient from "../utils/axiosConfig";
import { useVisibilityPolling } from "../utils/useVisibilityPolling";
import Skeleton from "../components/Skeleton";
import "./staffcss/ViewAllCustomers.css";

export default function ViewAllCustomers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await apiClient.get("/admin/customers");
      setCustomers(Array.isArray(res.data) ? res.data : res.data?.content || []);
    } catch (err) {
      console.error("Failed to fetch customers:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useVisibilityPolling(fetchCustomers, 45000);

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const q = search.toLowerCase();
      const matchesSearch =
        c.fullName?.toLowerCase().includes(q) ||
        c.username?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.accountNumber?.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "ALL" || (c.status || "ACTIVE").toUpperCase() === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [customers, search, statusFilter]);

  if (loading) {
    return (
      <div style={{ maxWidth: "1100px", margin: "30px auto" }}>
        <Skeleton height="40px" width="300px" />
        <Skeleton height="350px" style={{ marginTop: "20px" }} />
      </div>
    );
  }

  return (
    <div className="view-customers-container fintech-card" style={{ maxWidth: "1100px", margin: "20px auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ fontSize: "24px", fontWeight: 700 }}>Customer Accounts Directory</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>
            Total registered customer accounts: {customers.length}
          </p>
        </div>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <input
            placeholder="🔍 Search name, username, phone, account #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: "10px 14px",
              borderRadius: "6px",
              border: "1px solid var(--border-color)",
              backgroundColor: "var(--bg-main)",
              color: "var(--text-main)",
              minWidth: "260px",
            }}
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: "10px 14px",
              borderRadius: "6px",
              border: "1px solid var(--border-color)",
              backgroundColor: "var(--bg-main)",
              color: "var(--text-main)",
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Deactivated Only</option>
          </select>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--border-color)", color: "var(--text-muted)" }}>
              <th style={{ padding: "12px 8px" }}>ID</th>
              <th style={{ padding: "12px 8px" }}>Customer Name</th>
              <th style={{ padding: "12px 8px" }}>Account #</th>
              <th style={{ padding: "12px 8px" }}>Contact</th>
              <th style={{ padding: "12px 8px" }}>Status</th>
              <th style={{ padding: "12px 8px", textAlign: "right" }}>Ledger Balance</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}>
                  No customer records found matching criteria
                </td>
              </tr>
            ) : (
              filteredCustomers.map((c) => (
                <tr key={c.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                  <td style={{ padding: "12px 8px", fontFamily: "monospace" }}>#{c.id}</td>
                  <td style={{ padding: "12px 8px" }}>
                    <div style={{ fontWeight: 600 }}>{c.fullName}</div>
                    <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>@{c.username}</span>
                  </td>
                  <td style={{ padding: "12px 8px", fontFamily: "monospace", fontSize: "13px" }}>
                    {c.accountNumber || "Pending"}
                  </td>
                  <td style={{ padding: "12px 8px" }}>
                    <div>{c.email}</div>
                    <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{c.phone}</span>
                  </td>
                  <td style={{ padding: "12px 8px" }}>
                    <span className={c.status === "INACTIVE" ? "badge-inactive" : "badge-active"}>
                      {c.status || "ACTIVE"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 8px", textAlign: "right", fontWeight: 700, color: "var(--primary)" }}>
                    ₹{Number(c.balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
