import React, { useEffect, useState } from 'react';
import apiClient from '../utils/axiosConfig';
import { useAuth } from '../contextapi/AuthContext';
import { useToast } from '../components/Toast';
import Skeleton from '../components/Skeleton';
import './customercss/Loans.css';

export default function Loans() {
  const { user } = useAuth();
  const [customer, setCustomer] = useState(null);
  const [myLoans, setMyLoans] = useState([]);
  const [showLoanForm, setShowLoanForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    loanAmount: '',
    loanType: 'Personal Loan',
    tenureMonths: '12',
    purpose: '',
  });

  const { addToast } = useToast();

  useEffect(() => {
    let stored = null;
    try {
      stored = JSON.parse(sessionStorage.getItem('customer'));
    } catch {}

    const custId = user?.id || stored?.id;
    if (custId) {
      loadLoans(custId);
    }
  }, [user]);

  const loadLoans = async (customerId) => {
    setLoading(true);
    try {
      const [custRes, loansRes] = await Promise.all([
        apiClient.get(`/customer/${customerId}`),
        apiClient.get(`/loan/customer/${customerId}`),
      ]);
      setCustomer(custRes.data);
      setMyLoans(loansRes.data || []);
    } catch (err) {
      addToast('Error fetching loans', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const calculateEstimatedEMI = () => {
    const P = parseFloat(formData.loanAmount) || 0;
    const N = parseInt(formData.tenureMonths, 10) || 12;
    const R = 8.5 / (12 * 100); // 8.5% annual rate
    if (P <= 0 || N <= 0) return 0;
    const emi = (P * R * Math.pow(1 + R, N)) / (Math.pow(1 + R, N) - 1);
    return isNaN(emi) ? 0 : Math.round(emi);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amount = parseFloat(formData.loanAmount);
    if (!amount || amount <= 0) {
      addToast('Please enter a valid loan amount', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        loanAmount: amount,
        loanType: formData.loanType,
        tenureMonths: parseInt(formData.tenureMonths, 10),
        purpose: formData.purpose || `${formData.loanType} request`,
        interestRate: 8.5,
      };

      await apiClient.post(`/loan/request/${customer.id}`, payload);
      addToast('Loan application submitted for underwriting review', 'success');
      setShowLoanForm(false);
      setFormData({ loanAmount: '', loanType: 'Personal Loan', tenureMonths: '12', purpose: '' });
      loadLoans(customer.id);
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to submit loan application';
      addToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'approved' || s === 'disbursed') return <span className="badge-active">{status}</span>;
    if (s === 'rejected') return <span className="badge-inactive">{status}</span>;
    return <span style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '4px 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: 600 }}>{status || 'Pending'}</span>;
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '900px', margin: '40px auto' }}>
        <Skeleton height="40px" width="250px" />
        <Skeleton height="160px" style={{ marginTop: '20px' }} />
        <Skeleton height="160px" style={{ marginTop: '20px' }} />
      </div>
    );
  }

  return (
    <div className="loans-container" style={{ maxWidth: '960px', margin: '30px auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '26px', fontWeight: 700 }}>🏦 Lending Services</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            Flexible personal, auto, and home financing with fixed 8.5% interest
          </p>
        </div>

        <button
          className="fintech-btn-primary"
          onClick={() => setShowLoanForm(!showLoanForm)}
        >
          {showLoanForm ? '✕ Close Application' : '+ Apply for Loan'}
        </button>
      </div>

      {showLoanForm && (
        <div className="fintech-card" style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Loan Application & EMI Calculator</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Loan Type</label>
                <select
                  name="loanType"
                  value={formData.loanType}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}
                >
                  <option value="Personal Loan">Personal Loan (8.5%)</option>
                  <option value="Home Loan">Home Mortgage (8.5%)</option>
                  <option value="Auto Loan">Auto Loan (8.5%)</option>
                  <option value="Education Loan">Education Loan (8.5%)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Principal Amount (INR)</label>
                <input
                  type="number"
                  name="loanAmount"
                  min="5000"
                  step="1000"
                  value={formData.loanAmount}
                  onChange={handleChange}
                  placeholder="e.g. 100000"
                  required
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Tenure (Months)</label>
                <select
                  name="tenureMonths"
                  value={formData.tenureMonths}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}
                >
                  <option value="6">6 Months</option>
                  <option value="12">12 Months (1 Year)</option>
                  <option value="24">24 Months (2 Years)</option>
                  <option value="36">36 Months (3 Years)</option>
                  <option value="60">60 Months (5 Years)</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Loan Purpose</label>
              <input
                type="text"
                name="purpose"
                value={formData.purpose}
                onChange={handleChange}
                placeholder="e.g. Home renovation, higher studies"
                required
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}
              />
            </div>

            {/* Estimated EMI Pill */}
            <div style={{ backgroundColor: 'var(--bg-main)', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Estimated Monthly EMI:</span>
                <span style={{ fontWeight: 800, fontSize: '18px', color: 'var(--primary)', marginLeft: '10px' }}>
                  ₹{calculateEstimatedEMI().toLocaleString('en-IN')}/mo
                </span>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>APR: 8.5% fixed</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={() => setShowLoanForm(false)} style={{ padding: '10px 16px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'none', cursor: 'pointer', color: 'var(--text-main)' }}>
                Cancel
              </button>
              <button type="submit" className="fintech-btn-primary" disabled={submitting}>
                {submitting ? 'Submitting Application...' : 'Submit Loan Request'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Existing Loans List */}
      <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Active & Past Loan Applications ({myLoans.length})</h3>
      {myLoans.length === 0 ? (
        <div className="fintech-card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          <p>You have not applied for any loans yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {myLoans.map((loan) => (
            <div key={loan.id} className="fintech-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h4 style={{ fontSize: '18px', fontWeight: 600 }}>{loan.loanType}</h4>
                  {getStatusBadge(loan.status)}
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
                  Applied: {loan.requestDate || 'Recent'} • Tenure: {loan.tenureMonths} months • Purpose: {loan.purpose}
                </p>
                {loan.adminComments && (
                  <p style={{ fontSize: '12px', color: 'var(--primary)', marginTop: '4px' }}>
                    Underwriter Note: {loan.adminComments}
                  </p>
                )}
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Sanctioned Principal</span>
                <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main)' }}>
                  ₹{Number(loan.loanAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
