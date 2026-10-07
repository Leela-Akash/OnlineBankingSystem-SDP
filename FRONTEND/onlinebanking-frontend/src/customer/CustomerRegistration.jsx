import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  FaUser, 
  FaEnvelope, 
  FaPhone, 
  FaMapMarkerAlt, 
  FaCalendarAlt, 
  FaLock, 
  FaEye, 
  FaEyeSlash, 
  FaCheckCircle, 
  FaShieldAlt, 
  FaBolt, 
  FaArrowRight 
} from "react-icons/fa";
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

  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { addToast } = useToast();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const getPasswordStrength = () => {
    const pw = formData.password;
    if (!pw) return { score: 0, label: "", color: "" };
    let score = 0;
    if (pw.length >= 6) score += 1;
    if (pw.length >= 10) score += 1;
    if (/[0-9]/.test(pw)) score += 1;
    if (/[^A-Za-z0-9]/.test(pw)) score += 1;

    switch (score) {
      case 1:
        return { score: 25, label: "Weak", color: "#ef4444" };
      case 2:
        return { score: 50, label: "Fair", color: "#f59e0b" };
      case 3:
        return { score: 75, label: "Good", color: "#3b82f6" };
      case 4:
        return { score: 100, label: "Strong", color: "#10b981" };
      default:
        return { score: 15, label: "Too short", color: "#ef4444" };
    }
  };

  const strength = getPasswordStrength();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agreedToTerms) {
      setError("Please agree to the Terms of Service to continue.");
      addToast("Please accept terms of service", "warning");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await apiClient.post("/customer/register", formData);
      const successMsg = response.data?.message || "Account successfully created! Welcome to Nexus Bank.";
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
      }, 1500);
    } catch (err) {
      const errMsg = err.response?.data?.message || err.response?.data?.error || "Registration failed. Please check your inputs.";
      setError(errMsg);
      addToast(errMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="nexus-reg-wrapper">
      <div className="nexus-reg-card">
        {/* Left Side: Brand & Feature Highlights */}
        <div className="nexus-reg-sidebar">
          <div className="reg-sidebar-brand">
            <span className="brand-icon">🏦</span>
            <h2>Nexus Bank</h2>
          </div>
          <p className="reg-sidebar-tagline">
            Experience next-generation digital banking engineered for speed, privacy, and financial growth.
          </p>

          <div className="reg-perks-list">
            <div className="perk-item">
              <div className="perk-icon-wrap"><FaBolt /></div>
              <div>
                <h4>Zero Transfer Fees</h4>
                <p>Instant IMPS, NEFT, and RTGS internal settlements at ₹0 fee.</p>
              </div>
            </div>

            <div className="perk-item">
              <div className="perk-icon-wrap"><FaShieldAlt /></div>
              <div>
                <h4>Bank-Grade Security</h4>
                <p>Multi-factor JWT sessions and 256-bit AES encryption.</p>
              </div>
            </div>

            <div className="perk-item">
              <div className="perk-icon-wrap"><FaCheckCircle /></div>
              <div>
                <h4>Instant Account Opening</h4>
                <p>Virtual account and ledger balance provisioned immediately.</p>
              </div>
            </div>
          </div>

          <div className="reg-sidebar-footer">
            <span>Already a customer?</span>
            <Link to="/customerlogin" className="sidebar-login-btn">
              Sign In <FaArrowRight style={{ fontSize: "11px" }} />
            </Link>
          </div>
        </div>

        {/* Right Side: Registration Form */}
        <div className="nexus-reg-content">
          <div className="reg-form-header">
            <h3>Open Your Digital Account</h3>
            <p>Join thousands enjoying high-speed, modern banking in minutes.</p>
          </div>

          {error && <div className="reg-alert-error">{error}</div>}

          <form onSubmit={handleSubmit} className="reg-grid-form">
            {/* Section: Personal Info */}
            <div className="form-section-title">Personal Details</div>

            <div className="form-group">
              <label htmlFor="fullName">Full Legal Name</label>
              <div className="input-with-icon">
                <FaUser className="field-icon" />
                <input
                  type="text"
                  id="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  placeholder="e.g. John Doe"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="username">Choose Username</label>
              <div className="input-with-icon">
                <FaUser className="field-icon" />
                <input
                  type="text"
                  id="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  placeholder="e.g. johndoe24"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-with-icon">
                <FaEnvelope className="field-icon" />
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="john@example.com"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone Number</label>
              <div className="input-with-icon">
                <FaPhone className="field-icon" />
                <input
                  type="tel"
                  id="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  placeholder="10-digit mobile number"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="dob">Date of Birth</label>
              <div className="input-with-icon">
                <FaCalendarAlt className="field-icon" />
                <input
                  type="date"
                  id="dob"
                  value={formData.dob}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="gender">Gender</label>
              <select
                id="gender"
                value={formData.gender}
                onChange={handleChange}
                required
                className="reg-select"
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Address: Full Width */}
            <div className="form-group full-width">
              <label htmlFor="address">Residential Address</label>
              <div className="input-with-icon textarea-wrap">
                <FaMapMarkerAlt className="field-icon textarea-icon" />
                <textarea
                  id="address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                  placeholder="Enter full residential address (Street, City, Postal Code)"
                  rows="2"
                />
              </div>
            </div>

            {/* Password: Full Width with Strength */}
            <div className="form-group full-width">
              <label htmlFor="password">Create Secure Password</label>
              <div className="input-with-icon">
                <FaLock className="field-icon" />
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="Min. 8 characters with numbers & symbols"
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>

              {formData.password && (
                <div className="password-strength-box">
                  <div className="strength-bar-track">
                    <div
                      className="strength-bar-fill"
                      style={{
                        width: `${strength.score}%`,
                        backgroundColor: strength.color,
                      }}
                    />
                  </div>
                  <span className="strength-label" style={{ color: strength.color }}>
                    Strength: {strength.label}
                  </span>
                </div>
              )}
            </div>

            {/* Terms Checkbox */}
            <div className="form-group full-width checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  required
                />
                <span>
                  I agree to the <Link to="/about">Terms of Banking Service</Link> and consent to electronic disclosures.
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <div className="form-group full-width">
              <button
                type="submit"
                className="reg-submit-btn"
                disabled={loading || !agreedToTerms}
              >
                {loading ? (
                  <span className="btn-spinner-content">Creating Your Account...</span>
                ) : (
                  <>
                    <span>Complete Registration</span>
                    <FaArrowRight />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="reg-mobile-footer">
            Already have an account? <Link to="/customerlogin">Sign In</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
