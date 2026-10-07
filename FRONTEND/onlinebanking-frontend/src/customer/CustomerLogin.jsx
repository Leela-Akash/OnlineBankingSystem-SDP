import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contextapi/AuthContext";
import { useToast } from "../components/Toast";
import apiClient from "../utils/axiosConfig";
import "./customercss/CustomerLogin.css";

export default function CustomerLogin() {
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
      const res = await apiClient.post("/customer/login", formData);
      const { accessToken, token, refreshToken, userId, id, username, role } = res.data;
      const validToken = accessToken || token;
      const validId = userId || id;

      login({
        accessToken: validToken,
        refreshToken,
        userId: validId,
        username: username || formData.username,
        role: role || "CUSTOMER",
      });

      try {
        const customerRes = await apiClient.get(`/customer/${validId}`);
        sessionStorage.setItem("customer", JSON.stringify(customerRes.data));
      } catch {
        sessionStorage.setItem("customer", JSON.stringify({ id: validId, username: formData.username }));
      }

      addToast("Successfully signed in as Customer", "success");
      navigate("/customer/profile");
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || "Invalid username or password";
      setError(msg);
      addToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-form">
        <h2>Customer Sign In</h2>
        {error && <p className="error-message">{error}</p>}

        <form onSubmit={handleSubmit}>
          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
            value={formData.username}
            onChange={handleChange}
            required
            placeholder="Enter your username"
            autoComplete="username"
          />

          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            value={formData.password}
            onChange={handleChange}
            required
            placeholder="Enter your password"
            autoComplete="current-password"
          />

          <button type="submit" className="signin-button" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="signup-link">
          Don't have an account? <Link to="/customerregistration">Register here</Link>
        </p>
      </div>
    </div>
  );
}
