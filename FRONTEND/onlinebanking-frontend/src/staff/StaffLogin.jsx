import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaUserShield, FaUser, FaLock, FaEye, FaEyeSlash, FaArrowRight, FaKey } from "react-icons/fa";
import { useAuth } from "../contextapi/AuthContext";
import { useToast } from "../components/Toast";
import apiClient from "../utils/axiosConfig";
import "./staffcss/StaffLogin.css";

export default function StaffLogin() {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();
  const { addToast } = useToast();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleFillDemo = () => {
    setFormData({ username: "staff", password: "staff123" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await apiClient.post("/staff/login", formData);
      const { accessToken, token, refreshToken, userId, id, username, role } = res.data;
      const validToken = accessToken || token;
      const validId = userId || id;

      login({
        accessToken: validToken,
        refreshToken,
        userId: validId,
        username: username || formData.username,
        role: role || "STAFF",
      });

      try {
        const staffRes = await apiClient.get(`/staff/profile/${validId}`);
        sessionStorage.setItem("staff", JSON.stringify(staffRes.data));
      } catch {
        sessionStorage.setItem("staff", JSON.stringify({ id: validId, username: formData.username }));
      }

      addToast("Signed in as Bank Staff", "success");
      navigate("/dashboard");
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || "Invalid username or password";
      setError(msg);
      addToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="staff-auth-wrapper">
      <div className="staff-auth-card">
        {/* Terminal Header */}
        <div className="staff-card-header">
          <div className="staff-badge">
            <FaUserShield /> Authorised Personnel Terminal
          </div>
          <h2>Staff Operations Login</h2>
          <p>Secure branch administration & underwriting console</p>
        </div>

        {error && <div className="staff-auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="staff-auth-form">
          <div className="staff-input-group">
            <label htmlFor="username">Staff Username</label>
            <div className="staff-input-field">
              <FaUser className="staff-field-icon" />
              <input
                type="text"
                id="username"
                value={formData.username}
                onChange={handleChange}
                required
                autoComplete="username"
                placeholder="Enter staff ID / username"
              />
            </div>
          </div>

          <div className="staff-input-group">
            <label htmlFor="password">Security Password</label>
            <div className="staff-input-field">
              <FaLock className="staff-field-icon" />
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={formData.password}
                onChange={handleChange}
                required
                autoComplete="current-password"
                placeholder="Enter security password"
              />
              <button
                type="button"
                className="staff-pw-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <button type="submit" className="staff-submit-btn" disabled={loading}>
            {loading ? (
              <span>Authenticating Credentials...</span>
            ) : (
              <>
                <span>Access Staff Portal</span>
                <FaArrowRight />
              </>
            )}
          </button>
        </form>

        {/* Demo Fast Fill & Security Notice */}
        <div className="staff-auth-footer">
          <button type="button" onClick={handleFillDemo} className="staff-demo-btn">
            <FaKey style={{ fontSize: "11px" }} /> Fill Demo Staff Credentials
          </button>
          <div className="staff-security-notice">
            🔒 All transactions & administrative operations are cryptographically audited with timestamped logs.
          </div>
          <div className="staff-portal-links">
            <Link to="/customerlogin">Customer Portal</Link> • <Link to="/adminlogin">Admin Control</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
