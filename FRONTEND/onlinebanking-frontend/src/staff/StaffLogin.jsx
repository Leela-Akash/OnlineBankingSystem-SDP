import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contextapi/AuthContext";
import { useToast } from "../components/Toast";
import apiClient from "../utils/axiosConfig";
import "./staffcss/StaffLogin.css";

export default function StaffLogin() {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();
  const { addToast } = useToast();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
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
      navigate("/staff/dashboard");
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || "Invalid username or password";
      setError(msg);
      addToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <form className="register-form" onSubmit={handleSubmit}>
        <h3>Staff Portal Login</h3>
        {error && <p className="error-message">{error}</p>}

        <div>
          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
            value={formData.username}
            onChange={handleChange}
            required
            autoComplete="username"
          />
        </div>

        <div>
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            value={formData.password}
            onChange={handleChange}
            required
            autoComplete="current-password"
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Authenticating..." : "Login"}
        </button>
      </form>
    </div>
  );
}
