import React, { useEffect, useState } from "react";
import apiClient from "../utils/axiosConfig";
import { useToast } from "../components/Toast";
import { useAuth } from "../contextapi/AuthContext";
import "./customercss/DepositWithdraw.css";

export default function DepositWithdraw() {
  const { user } = useAuth();
  const [customer, setCustomer] = useState(null);
  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    let customerData = null;
    try {
      customerData = JSON.parse(sessionStorage.getItem("customer"));
    } catch {}

    const custId = user?.id || customerData?.id;
    if (custId) {
      fetchCustomerAndBalance(custId);
    }
  }, [user]);

  const fetchCustomerAndBalance = async (customerId) => {
    try {
      const custRes = await apiClient.get(`/customer/${customerId}`);
      setCustomer(custRes.data);
      setBalance(custRes.data.balance !== undefined ? custRes.data.balance : 0);
    } catch {
      // Fallback to balance endpoint
      try {
        const balRes = await apiClient.get(`/transaction/balance/${customerId}`);
        setBalance(balRes.data.balance || 0);
      } catch (err) {
        console.error("Failed to fetch balance", err);
      }
    }
  };

  const handleTransaction = async (type) => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      addToast("Please enter a valid amount greater than 0", "warning");
      return;
    }

    if (type === "Debit" && balance !== null && numAmount > balance) {
      addToast("Insufficient funds for withdrawal", "error");
      return;
    }

    setLoading(true);
    try {
      const customerId = customer?.id || user?.id;
      const res = await apiClient.post(`/transaction/add/${customerId}`, {
        amount: numAmount,
        type: type,
        description: `${type} via Online Portal`,
      });

      addToast(`Successfully processed ${type} of ₹${numAmount.toLocaleString()}`, "success");
      setAmount("");
      fetchCustomerAndBalance(customerId);
    } catch (err) {
      const errMsg = err.response?.data?.error || err.response?.data?.message || `${type} failed.`;
      addToast(errMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="deposit-withdraw-container fintech-card" style={{ maxWidth: '600px', margin: '40px auto' }}>
      <h2 style={{ marginBottom: '8px' }}>Direct Deposit & Withdrawal</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
        Instant deposit or cash withdrawal on your active banking ledger
      </p>

      <div style={{
        backgroundColor: 'var(--bg-main)',
        padding: '20px',
        borderRadius: '10px',
        border: '1px solid var(--border-color)',
        marginBottom: '24px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Available Balance
        </div>
        <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--primary)', marginTop: '4px' }}>
          ₹{balance !== null ? Number(balance).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '...'}
        </div>
        {customer && (
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>
            Account #{customer.accountNumber} ({customer.fullName})
          </div>
        )}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '14px' }}>
          Amount (INR)
        </label>
        <input
          type="number"
          min="1"
          step="any"
          value={amount}
          placeholder="e.g. 5000"
          onChange={(e) => setAmount(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            fontSize: '18px',
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text-main)'
          }}
        />

        {/* Quick select pills */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
          {[500, 1000, 2500, 5000, 10000].map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => setAmount(val.toString())}
              style={{
                background: 'var(--bg-main)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-main)',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              +₹{val}
            </button>
          ))}
        </div>
      </div>

      <div className="button-group" style={{ display: 'flex', gap: '16px', marginTop: '24px' }}>
        <button
          onClick={() => handleTransaction("Credit")}
          disabled={loading}
          style={{
            flex: 1,
            backgroundColor: 'var(--success)',
            color: '#fff',
            padding: '12px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '16px',
            fontWeight: 600,
            cursor: 'pointer',
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? "Processing..." : "Deposit Funds"}
        </button>

        <button
          onClick={() => handleTransaction("Debit")}
          disabled={loading}
          style={{
            flex: 1,
            backgroundColor: 'var(--danger)',
            color: '#fff',
            padding: '12px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '16px',
            fontWeight: 600,
            cursor: 'pointer',
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? "Processing..." : "Withdraw Funds"}
        </button>
      </div>
    </div>
  );
}
