import { useEffect, useState, useCallback, useMemo } from "react";
import apiClient from "../utils/axiosConfig";
import { useToast } from "../components/Toast";
import Skeleton from "../components/Skeleton";
import "./admincss/ManageCustomer.css";

export default function ManageCustomers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);

  // Edit / View modal state
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({
    id: "",
    fullName: "",
    phone: "",
    email: "",
    address: "",
  });
  const [actionLoading, setActionLoading] = useState(false);

  const { addToast } = useToast();

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await apiClient.get("/admin/customers");
      setCustomers(Array.isArray(res.data) ? res.data : res.data?.content || []);
    } catch (err) {
      console.error("Failed to fetch customers:", err);
      addToast("Failed to fetch customers directory", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

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

  const handleDeactivate = async (customerId, customerName) => {
    if (!window.confirm(`Are you sure you want to deactivate customer ${customerName}? They will be marked INACTIVE.`)) {
      return;
    }

    try {
      await apiClient.delete(`/admin/deletecustomer?customerId=${customerId}`);
      addToast(`Customer ${customerName} successfully deactivated`, "info");
      fetchCustomers();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || "Failed to deactivate customer";
      addToast(msg, "error");
    }
  };

  const openEditModal = (c) => {
    setSelectedCustomer(c);
    setEditFormData({
      id: c.id,
      fullName: c.fullName || "",
      phone: c.phone || "",
      email: c.email || "",
      address: c.address || "",
    });
    setIsEditing(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      const payload = {
        ...selectedCustomer,
        ...editFormData,
        password: "Password@123", // preserve password if not changing
      };

      await apiClient.put("/customer/updateprofile", payload);
      addToast("Customer details successfully updated", "success");
      setIsEditing(false);
      setSelectedCustomer(null);
      fetchCustomers();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || "Failed to update customer";
      addToast(msg, "error");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: "1140px", margin: "30px auto" }}>
        <Skeleton height="40px" width="300px" />
        <Skeleton height="350px" style={{ marginTop: "20px" }} />
      </div>
    );
  }

  return (
    <div className="customer-container fintech-card" style={{ maxWidth: "1140px", margin: "20px auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ fontSize: "24px", fontWeight: 700 }}>Customer Accounts Management</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>
            Inspect profiles, edit customer records, or soft-deactivate accounts
          </p>
        </div>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <input
            placeholder="🔍 Search name, phone, account #..."
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
            <option value="ALL">All Account Statuses</option>
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
              <th style={{ padding: "12px 8px" }}>Email & Phone</th>
              <th style={{ padding: "12px 8px" }}>Status</th>
              <th style={{ padding: "12px 8px", textAlign: "right" }}>Ledger Balance</th>
              <th style={{ padding: "12px 8px", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}>
                  No customer records found
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
                  <td style={{ padding: "12px 8px", textAlign: "right" }}>
                    <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                      <button
                        onClick={() => openEditModal(c)}
                        style={{
                          backgroundColor: "var(--primary)",
                          color: "#fff",
                          padding: "6px 12px",
                          borderRadius: "6px",
                          border: "none",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Edit
                      </button>
                      {c.status !== "INACTIVE" && (
                        <button
                          onClick={() => handleDeactivate(c.id, c.fullName)}
                          style={{
                            backgroundColor: "var(--danger)",
                            color: "#fff",
                            padding: "6px 12px",
                            borderRadius: "6px",
                            border: "none",
                            fontSize: "12px",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Deactivate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Customer Modal */}
      {isEditing && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div className="fintech-card" style={{ width: "480px", maxWidth: "90%" }}>
            <h3 style={{ fontSize: "20px", marginBottom: "16px" }}>Edit Customer: {selectedCustomer?.fullName}</h3>
            <form onSubmit={handleSaveEdit}>
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>Full Name</label>
                <input
                  type="text"
                  value={editFormData.fullName}
                  onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                  required
                  style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-main)", color: "var(--text-main)" }}
                />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>Email</label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  required
                  style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-main)", color: "var(--text-main)" }}
                />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>Phone</label>
                <input
                  type="tel"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  required
                  style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-main)", color: "var(--text-main)" }}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>Address</label>
                <textarea
                  rows="2"
                  value={editFormData.address}
                  onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                  style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-main)", color: "var(--text-main)" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid var(--border-color)", background: "none", cursor: "pointer", color: "var(--text-main)" }}
                >
                  Cancel
                </button>
                <button type="submit" className="fintech-btn-primary" disabled={actionLoading}>
                  {actionLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
