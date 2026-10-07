import React, { useEffect, useState, useCallback } from 'react';
import apiClient from '../utils/axiosConfig';
import { useToast } from '../components/Toast';
import Skeleton from '../components/Skeleton';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import './admincss/Reports.css';

export default function Reports() {
  const [reports, setReports] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const fetchReportsAndLogs = useCallback(async () => {
    try {
      const [reportsRes, logsRes] = await Promise.all([
        apiClient.get('/admin/reports'),
        apiClient.get('/admin/audit-logs'),
      ]);
      setReports(reportsRes.data);
      setAuditLogs(Array.isArray(logsRes.data) ? logsRes.data : []);
    } catch (err) {
      console.error('Failed to load reports:', err);
      addToast('Failed to load system reports and audit logs', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchReportsAndLogs();
  }, [fetchReportsAndLogs]);

  if (loading) {
    return (
      <div style={{ maxWidth: '1140px', margin: '30px auto' }}>
        <Skeleton height="50px" width="300px" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '20px' }}>
          <Skeleton height="120px" />
          <Skeleton height="120px" />
          <Skeleton height="120px" />
        </div>
        <Skeleton height="350px" style={{ marginTop: '24px' }} />
      </div>
    );
  }

  if (!reports) {
    return <div className="fintech-card" style={{ maxWidth: '600px', margin: '40px auto', textAlign: 'center' }}>No reports available</div>;
  }

  const userStats = reports.userStats || {};
  const transactionStats = reports.transactionStats || {};
  const loanStats = reports.loanStats || {};
  const revenueStats = reports.revenueStats || {};
  const systemHealth = reports.systemHealth || {};
  const loanTypeCount = reports.loanTypeCount || {};
  const loanTypeAmount = reports.loanTypeAmount || {};
  const transactionBreakdown = reports.transactionBreakdown || {};

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  const formatNumber = (num) => new Intl.NumberFormat('en-IN').format(num || 0);

  return (
    <div className="reports-container" style={{ maxWidth: '1140px', margin: '20px auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800 }}>📊 System Analytics & Audit Reports</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            Aggregated real-time JPQL metrics, financial ledgers, and compliance audit trail
          </p>
        </div>
        <button onClick={fetchReportsAndLogs} className="fintech-btn-primary">
          🔄 Synchronize Metrics
        </button>
      </div>

      {/* Primary KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="fintech-card" style={{ borderLeft: '4px solid var(--primary)' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Registered Customers</div>
          <div style={{ fontSize: '26px', fontWeight: 700, marginTop: '4px' }}>{formatNumber(userStats.totalCustomers)}</div>
          <small style={{ color: 'var(--success)', fontWeight: 600 }}>{userStats.activeAccounts || 0} Active Ledgers</small>
        </div>

        <div className="fintech-card" style={{ borderLeft: '4px solid var(--success)' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Deposits Volume</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--success)', marginTop: '4px' }}>
            {formatCurrency(transactionStats.totalDeposits)}
          </div>
          <small style={{ color: 'var(--text-muted)' }}>{formatNumber(transactionStats.depositCount)} transactions</small>
        </div>

        <div className="fintech-card" style={{ borderLeft: '4px solid var(--danger)' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Outflow Volume</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--danger)', marginTop: '4px' }}>
            {formatCurrency(transactionStats.totalWithdrawals)}
          </div>
          <small style={{ color: 'var(--text-muted)' }}>{formatNumber(transactionStats.withdrawalCount)} transactions</small>
        </div>

        <div className="fintech-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Net Ledger Balance</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#8b5cf6', marginTop: '4px' }}>
            {formatCurrency(transactionStats.netBalance)}
          </div>
          <small style={{ color: 'var(--text-muted)' }}>{formatNumber(transactionStats.totalTransactions)} total records</small>
        </div>
      </div>

      {/* Charts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        <div className="fintech-card">
          <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>Transaction Volume Distribution</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Deposits', value: transactionBreakdown.Deposits || 0 },
                  { name: 'Withdrawals', value: transactionBreakdown.Withdrawals || 0 },
                ]}
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={45}
                paddingAngle={4}
                dataKey="value"
              >
                <Cell fill="#10b981" />
                <Cell fill="#ef4444" />
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="fintech-card">
          <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>Financial Flow Overview</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={[
                { name: 'Deposits', amount: transactionStats.totalDeposits },
                { name: 'Withdrawals', amount: transactionStats.totalWithdrawals },
                { name: 'Net Assets', amount: transactionStats.netBalance },
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Bar dataKey="amount" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="fintech-card">
        <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Security & Transaction Audit Trail ({auditLogs.length})</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
          Immutable records of financial transfers, underwriting decisions, and administrative actions
        </p>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '10px 8px' }}>Timestamp</th>
                <th style={{ padding: '10px 8px' }}>Actor</th>
                <th style={{ padding: '10px 8px' }}>Action</th>
                <th style={{ padding: '10px 8px' }}>Target</th>
                <th style={{ padding: '10px 8px' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    No audit records registered yet
                  </td>
                </tr>
              ) : (
                auditLogs.slice(0, 15).map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '10px 8px', color: 'var(--text-muted)' }}>
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Recent'}
                    </td>
                    <td style={{ padding: '10px 8px', fontWeight: 600 }}>{log.actor || 'SYSTEM'}</td>
                    <td style={{ padding: '10px 8px' }}>
                      <span className="badge-active" style={{ fontSize: '11px' }}>{log.action}</span>
                    </td>
                    <td style={{ padding: '10px 8px' }}>{log.targetEntity || '-'}</td>
                    <td style={{ padding: '10px 8px', color: 'var(--text-secondary)' }}>{log.details || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
