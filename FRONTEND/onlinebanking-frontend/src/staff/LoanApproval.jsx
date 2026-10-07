import React, { useEffect, useState, useCallback } from 'react';
import apiClient from '../utils/axiosConfig';
import { useToast } from '../components/Toast';
import { useVisibilityPolling } from '../utils/useVisibilityPolling';
import Skeleton from '../components/Skeleton';
import './staffcss/LoanApproval.css';

export default function LoanApproval() {
  const [pendingLoans, setPendingLoans] = useState([]);
  const [allLoans, setAllLoans] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const { addToast } = useToast();

  const fetchLoans = useCallback(async () => {
    try {
      const [pendingRes, allRes] = await Promise.all([
        apiClient.get('/loan/pending'),
        apiClient.get('/loan/all'),
      ]);
      setPendingLoans(pendingRes.data || []);
      setAllLoans(allRes.data || []);
    } catch (error) {
      console.error('Error fetching loans:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLoans();
  }, [fetchLoans]);

  useVisibilityPolling(fetchLoans, 30000);

  const handleApprove = async (loanId) => {
    setProcessingId(loanId);
    try {
      await apiClient.put(`/loan/approve/${loanId}`, {
        comments: 'Credit terms verified & approved by Branch Staff',
      });
      addToast('Loan application approved successfully!', 'success');
      fetchLoans();
    } catch (error) {
      addToast(error.response?.data?.error || 'Failed to approve loan', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (loanId) => {
    const reason = window.prompt('Specify underwriting rejection reason:', 'Credit score threshold not met');
    if (!reason) return;

    setProcessingId(loanId);
    try {
      await apiClient.put(`/loan/reject/${loanId}`, {
        comments: reason,
      });
      addToast('Loan application rejected', 'info');
      fetchLoans();
    } catch (error) {
      addToast(error.response?.data?.error || 'Failed to reject loan', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDisburse = async (loanId) => {
    setProcessingId(loanId);
    try {
      await apiClient.put(`/loan/disburse/${loanId}`);
      addToast('Loan capital disbursed directly into customer ledger balance!', 'success');
      fetchLoans();
    } catch (error) {
      addToast(error.response?.data?.error || 'Failed to disburse loan funds', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'approved' || s === 'disbursed') return <span className="badge-active">{status}</span>;
    if (s === 'rejected') return <span className="badge-inactive">{status}</span>;
    return <span style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '4px 8px', borderRadius: '9999px', fontSize: '12px', fontWeight: 600 }}>{status}</span>;
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '1100px', margin: '30px auto' }}>
        <Skeleton height="40px" width="300px" />
        <Skeleton height="200px" style={{ marginTop: '20px' }} />
      </div>
    );
  }

  const displayedLoans = activeTab === 'pending' ? pendingLoans : allLoans;

  return (
    <div className="loan-approval-container" style={{ maxWidth: '1100px', margin: '20px auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '26px', fontWeight: 700 }}>📋 Loan Underwriting & Disbursement</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            Underwrite pending loan applications or disburse capital to borrowers
          </p>
        </div>

        {/* Tab Controls */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('pending')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              backgroundColor: activeTab === 'pending' ? 'var(--primary)' : 'var(--bg-card)',
              color: activeTab === 'pending' ? '#fff' : 'var(--text-main)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Pending Review ({pendingLoans.length})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              backgroundColor: activeTab === 'all' ? 'var(--primary)' : 'var(--bg-card)',
              color: activeTab === 'all' ? '#fff' : 'var(--text-main)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            All Loans ({allLoans.length})
          </button>
        </div>
      </div>

      <div className="fintech-card">
        {displayedLoans.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            No {activeTab === 'pending' ? 'pending' : ''} loans found.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 8px' }}>ID</th>
                  <th style={{ padding: '12px 8px' }}>Borrower</th>
                  <th style={{ padding: '12px 8px' }}>Type</th>
                  <th style={{ padding: '12px 8px' }}>Principal</th>
                  <th style={{ padding: '12px 8px' }}>Tenure</th>
                  <th style={{ padding: '12px 8px' }}>Status</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedLoans.map((loan) => (
                  <tr key={loan.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px 8px', fontFamily: 'monospace' }}>#{loan.id}</td>
                    <td style={{ padding: '12px 8px' }}>
                      <div style={{ fontWeight: 600 }}>{loan.customer?.fullName || 'Customer #' + (loan.customer?.id || 'N/A')}</div>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        Acc #{loan.customer?.accountNumber || 'Pending'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 8px' }}>{loan.loanType}</td>
                    <td style={{ padding: '12px 8px', fontWeight: 700, color: 'var(--primary)' }}>
                      ₹{Number(loan.loanAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '12px 8px' }}>{loan.tenureMonths} mos</td>
                    <td style={{ padding: '12px 8px' }}>{getStatusBadge(loan.status)}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        {loan.status?.toLowerCase() === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(loan.id)}
                              disabled={processingId === loan.id}
                              style={{
                                backgroundColor: 'var(--success)',
                                color: '#fff',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: 'none',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(loan.id)}
                              disabled={processingId === loan.id}
                              style={{
                                backgroundColor: 'var(--danger)',
                                color: '#fff',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: 'none',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {loan.status?.toLowerCase() === 'approved' && (
                          <button
                            onClick={() => handleDisburse(loan.id)}
                            disabled={processingId === loan.id}
                            className="fintech-btn-primary"
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                          >
                            💸 Disburse Funds
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
