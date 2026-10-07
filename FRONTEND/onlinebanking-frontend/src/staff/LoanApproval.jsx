import React, { useEffect, useState, useCallback } from 'react';
import { FaCheckCircle, FaTimesCircle, FaMoneyCheckAlt, FaCalendarAlt, FaPercentage, FaUserCheck, FaExclamationTriangle } from 'react-icons/fa';
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
  
  // Rejection modal state
  const [rejectModalLoan, setRejectModalLoan] = useState(null);
  const [rejectReason, setRejectReason] = useState('Credit score below underwriting criteria');

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

  const handleOpenReject = (loan) => {
    setRejectModalLoan(loan);
    setRejectReason('Credit score below underwriting criteria');
  };

  const handleConfirmReject = async () => {
    if (!rejectModalLoan) return;
    const loanId = rejectModalLoan.id;
    setProcessingId(loanId);
    try {
      await apiClient.put(`/loan/reject/${loanId}`, {
        comments: rejectReason || 'Application rejected by underwriting committee',
      });
      addToast('Loan application rejected', 'info');
      setRejectModalLoan(null);
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
    if (s === 'approved') return <span className="loan-badge badge-approved">Approved</span>;
    if (s === 'disbursed' || s === 'active') return <span className="loan-badge badge-disbursed">Disbursed</span>;
    if (s === 'rejected') return <span className="loan-badge badge-rejected">Rejected</span>;
    return <span className="loan-badge badge-pending">Pending Review</span>;
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
    <div className="loan-approval-page">
      <div className="loan-page-header">
        <div>
          <h2>Loan Underwriting & Capital Disbursement</h2>
          <p>Adjudicate borrower applications and disburse approved loan capital directly to ledgers</p>
        </div>

        {/* Tab Controls */}
        <div className="loan-tab-pills">
          <button
            onClick={() => setActiveTab('pending')}
            className={`loan-tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
          >
            Pending Review ({pendingLoans.length})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`loan-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
          >
            All Loans ({allLoans.length})
          </button>
        </div>
      </div>

      <div className="fintech-card loan-card-table-wrapper">
        {displayedLoans.length === 0 ? (
          <div className="loan-empty-state">
            <FaCheckCircle className="empty-icon" />
            <h3>No {activeTab === 'pending' ? 'Pending' : ''} Loans Found</h3>
            <p>All loan applications for this view have been processed.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="loan-fintech-table">
              <thead>
                <tr>
                  <th>Application</th>
                  <th>Borrower Details</th>
                  <th>Loan Product</th>
                  <th>Principal Amount</th>
                  <th>Tenure & Rate</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Underwriting Action</th>
                </tr>
              </thead>
              <tbody>
                {displayedLoans.map((loan) => (
                  <tr key={loan.id}>
                    <td>
                      <span className="loan-app-id">#{loan.id}</span>
                      <div className="loan-app-date">{loan.requestDate || 'Recent'}</div>
                    </td>
                    <td>
                      <div className="borrower-name">{loan.customer?.fullName || 'Customer #' + (loan.customer?.id || 'N/A')}</div>
                      <div className="borrower-acc">Acc: {loan.customer?.accountNumber || 'Pending'}</div>
                    </td>
                    <td>
                      <span className="product-chip">{loan.loanType}</span>
                      {loan.purpose && <div className="product-purpose">{loan.purpose}</div>}
                    </td>
                    <td>
                      <div className="loan-principal">
                        ₹{Number(loan.loanAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </td>
                    <td>
                      <div className="loan-terms">
                        <span><FaCalendarAlt style={{ fontSize: '11px' }} /> {loan.tenureMonths} Mo</span>
                        <span><FaPercentage style={{ fontSize: '11px' }} /> {loan.interestRate || '10.5'}%</span>
                      </div>
                    </td>
                    <td>{getStatusBadge(loan.status)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="action-button-group">
                        {loan.status?.toLowerCase() === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(loan.id)}
                              disabled={processingId === loan.id}
                              className="btn-approve"
                              title="Approve loan application"
                            >
                              <FaCheckCircle /> Approve
                            </button>
                            <button
                              onClick={() => handleOpenReject(loan)}
                              disabled={processingId === loan.id}
                              className="btn-reject"
                              title="Reject loan application"
                            >
                              <FaTimesCircle /> Reject
                            </button>
                          </>
                        )}

                        {loan.status?.toLowerCase() === 'approved' && (
                          <button
                            onClick={() => handleDisburse(loan.id)}
                            disabled={processingId === loan.id}
                            className="btn-disburse"
                          >
                            <FaMoneyCheckAlt /> Disburse
                          </button>
                        )}

                        {(loan.status?.toLowerCase() === 'disbursed' || loan.status?.toLowerCase() === 'active') && (
                          <span className="disbursed-tag">✓ Capital Disbursed</span>
                        )}
                        {loan.status?.toLowerCase() === 'rejected' && (
                          <span className="rejected-tag">Declined</span>
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

      {/* Reject Reason Modal */}
      {rejectModalLoan && (
        <div className="modal-backdrop">
          <div className="fintech-card modal-content-box">
            <div className="modal-header">
              <FaExclamationTriangle style={{ color: '#ef4444', fontSize: '20px' }} />
              <h3>Decline Loan #{rejectModalLoan.id}</h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Select an underwriting reason to record in the audit log for borrower {rejectModalLoan.customer?.fullName}:
            </p>

            <div className="modal-reasons">
              <label>
                <input
                  type="radio"
                  name="reason"
                  checked={rejectReason === 'Credit score below underwriting criteria'}
                  onChange={() => setRejectReason('Credit score below underwriting criteria')}
                />
                Credit score below threshold
              </label>
              <label>
                <input
                  type="radio"
                  name="reason"
                  checked={rejectReason === 'Insufficient debt-to-income ratio'}
                  onChange={() => setRejectReason('Insufficient debt-to-income ratio')}
                />
                Insufficient debt-to-income ratio
              </label>
              <label>
                <input
                  type="radio"
                  name="reason"
                  checked={rejectReason === 'Incomplete financial disclosures'}
                  onChange={() => setRejectReason('Incomplete financial disclosures')}
                />
                Incomplete financial disclosures
              </label>
            </div>

            <div className="modal-footer">
              <button onClick={() => setRejectModalLoan(null)} className="btn-modal-cancel">
                Cancel
              </button>
              <button onClick={handleConfirmReject} className="btn-modal-confirm">
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
