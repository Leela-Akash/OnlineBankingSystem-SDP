import React, { useEffect, useState } from 'react';
import apiClient from '../utils/axiosConfig';
import { useAuth } from '../contextapi/AuthContext';
import { useToast } from '../components/Toast';
import './customercss/Transferfunds.css';

export default function Transferfunds() {
  const { user } = useAuth();
  const [customer, setCustomer] = useState(null);
  const [balance, setBalance] = useState(0);
  const [toAccountNumber, setToAccountNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    let customerData = null;
    try {
      customerData = JSON.parse(sessionStorage.getItem('customer'));
    } catch {}

    const custId = user?.id || customerData?.id;
    if (custId) {
      loadCustomer(custId);
    }
  }, [user]);

  const loadCustomer = async (id) => {
    try {
      const res = await apiClient.get(`/customer/${id}`);
      setCustomer(res.data);
      setBalance(res.data.balance || 0);
    } catch {
      try {
        const balRes = await apiClient.get(`/transaction/balance/${id}`);
        setBalance(balRes.data.balance || 0);
      } catch (err) {
        console.error('Error fetching balance:', err);
      }
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();

    if (!toAccountNumber || toAccountNumber.trim().length !== 12) {
      addToast('Recipient account number must be exactly 12 digits', 'warning');
      return;
    }

    if (customer && customer.accountNumber === toAccountNumber.trim()) {
      addToast('Cannot transfer funds to your own account', 'warning');
      return;
    }

    const transferAmount = parseFloat(amount);
    if (!transferAmount || transferAmount <= 0) {
      addToast('Please enter a valid transfer amount greater than 0', 'warning');
      return;
    }

    if (transferAmount > balance) {
      addToast('Insufficient funds for this transfer', 'error');
      return;
    }

    setLoading(true);
    // Unique idempotency key preventing accidental duplicate submissions
    const idempotencyKey = `TRANSFER-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    try {
      const payload = {
        fromCustomerId: customer?.id || user?.id,
        toAccountNumber: toAccountNumber.trim(),
        amount: transferAmount,
        idempotencyKey: idempotencyKey,
      };

      const res = await apiClient.post('/transaction/transfer/by-account', payload, {
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
      });

      const successMsg = res.data?.message || 'Transfer completed successfully!';
      addToast(successMsg, 'success');
      setAmount('');
      setToAccountNumber('');
      loadCustomer(customer?.id || user?.id);
    } catch (err) {
      const errMsg = err.response?.data?.error || err.response?.data?.message || 'Transfer failed';
      addToast(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="transfer-container fintech-card" style={{ maxWidth: '640px', margin: '40px auto' }}>
      <div className="transfer-header" style={{ marginBottom: '24px' }}>
        <h2>⚡ Secure Wire Transfer</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
          Instant, idempotent account-to-account funds transfer
        </p>
      </div>

      <div style={{
        backgroundColor: 'var(--bg-main)',
        padding: '16px 20px',
        borderRadius: '10px',
        border: '1px solid var(--border-color)',
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>From Account</span>
          <div style={{ fontWeight: 600, fontSize: '16px', color: 'var(--text-main)' }}>
            #{customer?.accountNumber || 'Pending'}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Available Balance</span>
          <div style={{ fontWeight: 800, fontSize: '20px', color: 'var(--primary)' }}>
            ₹{Number(balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      <form onSubmit={handleTransfer} className="transfer-form">
        <div style={{ marginBottom: '18px' }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '14px' }}>
            Recipient 12-Digit Account Number
          </label>
          <input
            type="text"
            maxLength="12"
            value={toAccountNumber}
            onChange={(e) => setToAccountNumber(e.target.value.replace(/\D/g, ''))}
            placeholder="e.g. 100000000002"
            required
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              fontSize: '16px',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-main)',
              letterSpacing: '1px'
            }}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '14px' }}>
            Transfer Amount (INR)
          </label>
          <input
            type="number"
            min="1"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount to send"
            required
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              fontSize: '16px',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-main)'
            }}
          />
        </div>

        <button
          type="submit"
          className="fintech-btn-primary"
          disabled={loading}
          style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '16px' }}
        >
          {loading ? 'Executing Wire Transfer...' : 'Confirm & Transfer Funds'}
        </button>
      </form>
    </div>
  );
}
