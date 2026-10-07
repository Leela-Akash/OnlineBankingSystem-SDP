import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import apiClient from "../utils/axiosConfig";
import { useToast } from "../components/Toast";
import "./customercss/CustomerRegistration.css";

export default function CustomerRegistration() {
  const [formData, setFormData] = useState({
    fullName: "",
    gender: "",
    dob: "",
    email: "",
    username: "",
    password: "",
    phone: "",
    address: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { addToast } = useToast();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await apiClient.post("/customer/register", formData);
      const successMsg = response.data?.message || "Registration successful!";
      setMessage(successMsg);
      addToast(successMsg, "success");

      setFormData({
        fullName: "",
        gender: "",
        dob: "",
        email: "",
        username: "",
        password: "",
        phone: "",
        address: "",
      });

      setTimeout(() => {
        navigate("/customerlogin");
      }, 2000);
    } catch (err) {
      const errMsg = err.response?.data?.message || err.response?.data?.error || "Registration failed. Please check your inputs.";
      setError(errMsg);
      addToast(errMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-form">
        <h3>Create Customer Account</h3>

        {message && <p className="success-message">{message}</p>}
        {error && <p className="error-message">{error}</p>}

        <form onSubmit={handleSubmit}>
          <label htmlFor="fullName">Full Name</label>
          <input
            type="text"
            id="fullName"
            value={formData.fullName}
            onChange={handleChange}
            required
            placeholder="Enter full name"
          />

          <label htmlFor="gender">Gender</label>
          <select
            id="gender"
            value={formData.gender}
            onChange={handleChange}
            required
          >
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>

          <label htmlFor="dob">Date of Birth</label>
          <input
            type="date"
            id="dob"
            value={formData.dob}
            onChange={handleChange}
            required
          />

          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            value={formData.email}
            onChange={handleChange}
            required
            placeholder="Enter email address"
          />

          <label htmlFor="phone">Phone Number</label>
          <input
            type="tel"
            id="phone"
            value={formData.phone}
            onChange={handleChange}
            required
            placeholder="10-digit phone number"
          />

          <label htmlFor="address">Address</label>
          <textarea
            id="address"
            value={formData.address}
            onChange={handleChange}
            required
            placeholder="Enter residential address"
            rows="2"
          />

          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
            value={formData.username}
            onChange={handleChange}
            required
            placeholder="Choose username"
          />

          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            value={formData.password}
            onChange={handleChange}
            required
            placeholder="Enter strong password"
          />

          <button type="submit" className="signup-button" disabled={loading}>
            {loading ? "Creating Account..." : "Register"}
          </button>
        </form>

        <p className="signin-link">
          Already have an account? <Link to="/customerlogin">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
