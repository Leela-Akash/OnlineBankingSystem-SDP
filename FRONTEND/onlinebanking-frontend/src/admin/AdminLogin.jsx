import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contextapi/AuthContext";
import { useToast } from "../components/Toast";
import apiClient from "../utils/axiosConfig";
import "./admincss/AdminLogin.css";

export default function AdminLogin() {
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
      const response = await apiClient.post("/admin/login", formData);
      const { accessToken, token, refreshToken, userId, id, username, role } = response.data;
      const validToken = accessToken || token;

      login({
        accessToken: validToken,
        refreshToken,
        userId: userId || id || 0,
        username: username || formData.username,
        role: role || "ADMIN",
      });

      sessionStorage.setItem("admin", JSON.stringify({ username: formData.username, role: "ADMIN" }));

      addToast("Signed in as Administrator", "success");
      navigate("/admin/dashboard");
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
        <h2>Administrator Login</h2>
        {error && <p className="error-message">{error}</p>}

        <form onSubmit={handleSubmit}>
          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="Enter admin username"
            required
            autoComplete="username"
          />

          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Enter password"
            required
            autoComplete="current-password"
          />

          <button type="submit" className="signin-button" disabled={loading}>
            {loading ? "Authenticating..." : "Login"}
          </button>
        </form>

        <p className="signup-link">
          <Link to="/">Back to Home</Link>
        </p>
      </div>
    </div>
  );
}
