import { useState } from "react";
import apiClient from "../utils/axiosConfig";
import { useToast } from "../components/Toast";
import "./admincss/AddStaff.css";

export default function AddStaff() {
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    password: "",
    email: "",
    phone: "",
  });

  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await apiClient.post("/staff/add", formData);
      const msg = response.data?.message || "Staff member provisioned successfully!";
      addToast(msg, "success");

      setFormData({
        fullName: "",
        username: "",
        password: "",
        email: "",
        phone: "",
      });
    } catch (err) {
      const errMsg = err.response?.data?.message || err.response?.data?.error || "Failed to add staff member";
      addToast(errMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="addstaff-container fintech-card" style={{ maxWidth: "600px", margin: "40px auto" }}>
      <h2 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "8px" }}>Provision Bank Staff Account</h2>
      <p style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "24px" }}>
        Assign branch employee credentials for operational access and underwriting
      </p>

      <form className="addstaff-form" onSubmit={handleSubmit}>
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>Full Name</label>
          <input
            type="text"
            id="fullName"
            value={formData.fullName}
            onChange={handleChange}
            required
            placeholder="e.g. John Doe"
            style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-main)", color: "var(--text-main)" }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>Username</label>
            <input
              type="text"
              id="username"
              value={formData.username}
              onChange={handleChange}
              required
              placeholder="e.g. jdoe_staff"
              style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-main)", color: "var(--text-main)" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>Temporary Password</label>
            <input
              type="password"
              id="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Min 6 characters"
              style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-main)", color: "var(--text-main)" }}
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "24px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>Staff Work Email</label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="staff@nexusbank.com"
              style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-main)", color: "var(--text-main)" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>Phone Number</label>
            <input
              type="tel"
              id="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              placeholder="10-digit number"
              style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-main)", color: "var(--text-main)" }}
            />
          </div>
        </div>

        <button type="submit" className="fintech-btn-primary" disabled={loading} style={{ width: "100%", justifyContent: "center", padding: "12px" }}>
          {loading ? "Provisioning..." : "Create Staff Profile"}
        </button>
      </form>
    </div>
  );
}
