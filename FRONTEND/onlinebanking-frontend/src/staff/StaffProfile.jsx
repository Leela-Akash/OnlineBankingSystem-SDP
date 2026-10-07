import { useState, useEffect } from "react";
import apiClient from "../utils/axiosConfig";
import { useAuth } from "../contextapi/AuthContext";
import Skeleton from "../components/Skeleton";
import "./staffcss/StaffProfile.css";

export default function StaffProfile() {
  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    let stored = null;
    try {
      stored = JSON.parse(sessionStorage.getItem("staff"));
    } catch {}

    const staffId = user?.id || stored?.id;
    if (staffId) {
      apiClient
        .get(`/staff/profile/${staffId}`)
        .then((res) => {
          setStaff(res.data);
          sessionStorage.setItem("staff", JSON.stringify(res.data));
        })
        .catch((err) => {
          console.error("Staff profile fetch error:", err);
          if (stored) setStaff(stored);
        })
        .finally(() => setLoading(false));
    } else {
      if (stored) setStaff(stored);
      setLoading(false);
    }
  }, [user]);

  if (loading) {
    return (
      <div style={{ maxWidth: "700px", margin: "40px auto" }}>
        <Skeleton height="80px" />
        <Skeleton height="200px" style={{ marginTop: "20px" }} />
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="fintech-card" style={{ maxWidth: "600px", margin: "40px auto", textAlign: "center" }}>
        <h3>Staff Profile Unavailable</h3>
        <p style={{ color: "var(--text-muted)" }}>Unable to retrieve staff employee details.</p>
      </div>
    );
  }

  const getInitials = (name) => {
    if (!name) return "ST";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="staff-profile-container fintech-card" style={{ maxWidth: "720px", margin: "30px auto" }}>
      {/* Header */}
      <div className="staff-profile-header" style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "28px" }}>
        <div
          className="staff-avatar"
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            backgroundColor: "var(--primary)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "24px",
            fontWeight: 700,
          }}
        >
          {getInitials(staff.fullName)}
        </div>

        <div className="staff-header-info">
          <h2 className="staff-name" style={{ fontSize: "24px", fontWeight: 700 }}>
            {staff.fullName}
          </h2>
          <span className="badge-active" style={{ display: "inline-block", marginTop: "4px" }}>
            Staff Member #{staff.id}
          </span>
        </div>
      </div>

      {/* Profile Details Grid */}
      <div
        className="staff-profile-details"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
        }}
      >
        <div className="detail-item fintech-card" style={{ padding: "16px" }}>
          <span className="detail-label" style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            Full Name
          </span>
          <div style={{ fontWeight: 600, fontSize: "15px", marginTop: "4px" }}>{staff.fullName}</div>
        </div>

        <div className="detail-item fintech-card" style={{ padding: "16px" }}>
          <span className="detail-label" style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            Username
          </span>
          <div style={{ fontWeight: 600, fontSize: "15px", marginTop: "4px" }}>@{staff.username}</div>
        </div>

        <div className="detail-item fintech-card" style={{ padding: "16px" }}>
          <span className="detail-label" style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            Email
          </span>
          <div style={{ fontWeight: 600, fontSize: "15px", marginTop: "4px" }}>{staff.email}</div>
        </div>

        <div className="detail-item fintech-card" style={{ padding: "16px" }}>
          <span className="detail-label" style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            Contact Phone
          </span>
          <div style={{ fontWeight: 600, fontSize: "15px", marginTop: "4px" }}>{staff.phone}</div>
        </div>
      </div>
    </div>
  );
}
