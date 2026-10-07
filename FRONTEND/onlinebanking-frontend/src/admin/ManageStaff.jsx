import { useEffect, useState, useCallback, useMemo } from "react";
import apiClient from "../utils/axiosConfig";
import { useToast } from "../components/Toast";
import Skeleton from "../components/Skeleton";
import DeleteIcon from "@mui/icons-material/Delete";
import "./admincss/ManageStaff.css";

export default function ManageStaff() {
  const [staffList, setStaffList] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const { addToast } = useToast();

  const fetchStaff = useCallback(async () => {
    try {
      const res = await apiClient.get("/admin/staff");
      setStaffList(res.data || []);
    } catch (err) {
      addToast("Failed to fetch staff members", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const deleteStaff = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove staff member ${name}?`)) {
      return;
    }

    setDeletingId(id);
    try {
      await apiClient.delete(`/admin/deletestaff?staffId=${id}`);
      addToast(`Staff member ${name} removed successfully`, "info");
      fetchStaff();
    } catch (err) {
      addToast(err.response?.data?.message || err.response?.data?.error || "Failed to delete staff member", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredStaff = useMemo(() => {
    const q = search.toLowerCase();
    return staffList.filter(
      (s) =>
        s.fullName?.toLowerCase().includes(q) ||
        s.username?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.phone?.toLowerCase().includes(q)
    );
  }, [staffList, search]);

  if (loading) {
    return (
      <div style={{ maxWidth: "1000px", margin: "30px auto" }}>
        <Skeleton height="40px" width="250px" />
        <Skeleton height="300px" style={{ marginTop: "20px" }} />
      </div>
    );
  }

  return (
    <div className="staff-container fintech-card" style={{ maxWidth: "1000px", margin: "20px auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ fontSize: "24px", fontWeight: 700 }}>Staff Personnel Management</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>
            Total bank staff team members: {staffList.length}
          </p>
        </div>

        <input
          placeholder="🔍 Search staff name, username, email..."
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
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--border-color)", color: "var(--text-muted)" }}>
              <th style={{ padding: "12px 8px" }}>ID</th>
              <th style={{ padding: "12px 8px" }}>Staff Name</th>
              <th style={{ padding: "12px 8px" }}>Username</th>
              <th style={{ padding: "12px 8px" }}>Email</th>
              <th style={{ padding: "12px 8px" }}>Phone</th>
              <th style={{ padding: "12px 8px", textAlign: "right" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredStaff.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}>
                  No staff members found matching search
                </td>
              </tr>
            ) : (
              filteredStaff.map((staff) => (
                <tr key={staff.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                  <td style={{ padding: "12px 8px", fontFamily: "monospace" }}>#{staff.id}</td>
                  <td style={{ padding: "12px 8px", fontWeight: 600 }}>{staff.fullName}</td>
                  <td style={{ padding: "12px 8px", color: "var(--text-muted)" }}>@{staff.username}</td>
                  <td style={{ padding: "12px 8px" }}>{staff.email}</td>
                  <td style={{ padding: "12px 8px" }}>{staff.phone}</td>
                  <td style={{ padding: "12px 8px", textAlign: "right" }}>
                    <button
                      className="delete-btn"
                      onClick={() => deleteStaff(staff.id, staff.fullName)}
                      disabled={deletingId === staff.id}
                      style={{
                        backgroundColor: "var(--danger)",
                        color: "#fff",
                        padding: "6px 12px",
                        borderRadius: "6px",
                        border: "none",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <DeleteIcon style={{ fontSize: "16px" }} />
                      {deletingId === staff.id ? "Removing..." : "Remove"}
                    </button>
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
