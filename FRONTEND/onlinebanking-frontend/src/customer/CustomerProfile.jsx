import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../utils/axiosConfig";
import { useAuth } from "../contextapi/AuthContext";
import Skeleton from "../components/Skeleton";
import "./customercss/CustomerProfile.css";

export default function CustomerProfile() {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const fetchCustomer = async () => {
      let storedCustomer = null;
      try {
        storedCustomer = JSON.parse(sessionStorage.getItem("customer"));
      } catch {}

      const custId = user?.id || storedCustomer?.id;
      if (!custId) {
        setLoading(false);
        return;
      }

      try {
        const response = await apiClient.get(`/customer/${custId}`);
        setCustomer(response.data);
        sessionStorage.setItem("customer", JSON.stringify(response.data));
      } catch (error) {
        console.error("Error fetching customer data:", error);
        if (storedCustomer) {
          setCustomer(storedCustomer);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCustomer();
  }, [user]);

  if (loading) {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto', padding: '24px' }}>
        <Skeleton height="80px" />
        <Skeleton height="200px" style={{ marginTop: '20px' }} />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="fintech-card" style={{ maxWidth: '600px', margin: '40px auto', textAlign: 'center' }}>
        <h3>Profile unavailable</h3>
        <p style={{ color: 'var(--text-muted)' }}>Please log in to inspect your account profile.</p>
        <button onClick={() => navigate("/customerlogin")} className="fintech-btn-primary" style={{ marginTop: '16px' }}>
          Sign In
        </button>
      </div>
    );
  }

  const getInitials = (name) => {
    if (!name) return "NB";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="customer-profile-container fintech-card" style={{ maxWidth: '840px', margin: '30px auto' }}>
      {/* Header */}
      <div className="customer-profile-header" style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '28px' }}>
        <div className="customer-avatar" style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: 'var(--primary)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          fontWeight: 700
        }}>
          {getInitials(customer.fullName)}
        </div>
        <div className="customer-info" style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 700 }}>{customer.fullName}</h2>
            <span className={customer.status === 'INACTIVE' ? 'badge-inactive' : 'badge-active'}>
              {customer.status || 'ACTIVE'}
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
            Online Banking Customer #{customer.id} • Registered Member
          </p>
        </div>
      </div>

      {/* Balance Highlight Banner */}
      <div style={{
        backgroundColor: 'var(--bg-main)',
        border: '1px solid var(--border-color)',
        borderRadius: '10px',
        padding: '16px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Verified Ledger Balance</span>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary)' }}>
            ₹{Number(customer.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Daily Limit</span>
          <div style={{ fontSize: '16px', fontWeight: 600 }}>
            ₹{Number(customer.dailyLimit || 100000).toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Profile Details Grid */}
      <div className="customer-profile-details" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '16px',
        marginBottom: '28px'
      }}>
        <div className="detail-item fintech-card" style={{ padding: '16px' }}>
          <span className="detail-label" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Account Number</span>
          <div style={{ fontWeight: 700, fontSize: '16px', marginTop: '4px', fontFamily: 'monospace' }}>
            {customer.accountNumber || 'Not Assigned'}
          </div>
        </div>

        <div className="detail-item fintech-card" style={{ padding: '16px' }}>
          <span className="detail-label" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Username</span>
          <div style={{ fontWeight: 600, fontSize: '15px', marginTop: '4px' }}>
            @{customer.username}
          </div>
        </div>

        <div className="detail-item fintech-card" style={{ padding: '16px' }}>
          <span className="detail-label" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Email Address</span>
          <div style={{ fontWeight: 600, fontSize: '15px', marginTop: '4px' }}>
            {customer.email}
          </div>
        </div>

        <div className="detail-item fintech-card" style={{ padding: '16px' }}>
          <span className="detail-label" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Phone Number</span>
          <div style={{ fontWeight: 600, fontSize: '15px', marginTop: '4px' }}>
            {customer.phone}
          </div>
        </div>

        <div className="detail-item fintech-card" style={{ padding: '16px' }}>
          <span className="detail-label" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Gender / DOB</span>
          <div style={{ fontWeight: 600, fontSize: '15px', marginTop: '4px' }}>
            {customer.gender || 'Not specified'} • {customer.dob || 'N/A'}
          </div>
        </div>

        <div className="detail-item fintech-card" style={{ padding: '16px' }}>
          <span className="detail-label" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Residential Address</span>
          <div style={{ fontWeight: 600, fontSize: '15px', marginTop: '4px' }}>
            {customer.address || 'N/A'}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
        <button onClick={() => navigate("/update")} className="fintech-btn-primary">
          ✏️ Edit Profile
        </button>
      </div>
    </div>
  );
}
