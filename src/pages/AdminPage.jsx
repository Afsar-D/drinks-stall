import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Download, Search, ShieldCheck } from 'lucide-react';
import {
  adminLogin,
  approvePayment,
  cancelPayment,
  downloadAdminBackupCsv,
  getAdminAuditLogs,
  getAdminPayments,
  getAdminSummary
} from '../lib/api';

function csvEscape(value) {
  const text = String(value ?? '');
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function flattenItems(items) {
  return items.map((item) => `${item.quantity}x ${item.name}`).join('; ');
}

export default function AdminPage() {
  const [isAuthed, setIsAuthed] = useState(false);
  const [code, setCode] = useState('');
  const [sessionCode, setSessionCode] = useState('');
  const [codeError, setCodeError] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState({
    totalRequests: 0,
    pendingCount: 0,
    approvedCount: 0,
    cancelledCount: 0,
    approvedTotal: '0.00'
  });
  const [pendingPayments, setPendingPayments] = useState([]);
  const [approvedPayments, setApprovedPayments] = useState([]);
  const [cancelledPayments, setCancelledPayments] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [cancelReasons, setCancelReasons] = useState({});
  const sessionTimerRef = useRef(null);

  const loadPayments = async (adminCode, searchText = '') => {
    const [pending, approved, cancelled] = await Promise.all([
      getAdminPayments('pending', adminCode, searchText),
      getAdminPayments('approved', adminCode, searchText),
      getAdminPayments('cancelled', adminCode, searchText)
    ]);
    setPendingPayments(pending);
    setApprovedPayments(approved);
    setCancelledPayments(cancelled);
  };

  const loadSummary = async (adminCode) => {
    const result = await getAdminSummary(adminCode);
    setSummary(result);
  };

  const loadAuditLogs = async (adminCode) => {
    const logs = await getAdminAuditLogs(adminCode, 60);
    setAuditLogs(logs);
  };

  const resetSessionTimer = () => {
    if (!isAuthed) {
      return;
    }

    if (sessionTimerRef.current) {
      clearTimeout(sessionTimerRef.current);
    }

    sessionTimerRef.current = setTimeout(() => {
      handleLogout(true);
    }, 15 * 60 * 1000);
  };

  const handleLogin = async () => {
    setError('');
    setCodeError(false);

    try {
      await adminLogin(code.trim());
      setIsAuthed(true);
      setSessionCode(code.trim());
      await Promise.all([
        loadPayments(code.trim(), appliedSearch),
        loadSummary(code.trim()),
        loadAuditLogs(code.trim())
      ]);
      resetSessionTimer();
    } catch (caughtError) {
      setCodeError(true);
      setError(caughtError instanceof Error ? caughtError.message : 'Invalid admin code or server unreachable.');
    }
  };

  const handleApprove = async (requestId) => {
    try {
      setError('');
      await approvePayment(requestId, sessionCode);
      await Promise.all([
        loadPayments(sessionCode, appliedSearch),
        loadSummary(sessionCode),
        loadAuditLogs(sessionCode)
      ]);
      resetSessionTimer();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Could not approve payment right now.');
    }
  };

  const handleCancel = async (requestId) => {
    const reason = (cancelReasons[requestId] || '').trim();
    if (!reason) {
      setError('Cancellation reason is required.');
      return;
    }

    try {
      setError('');
      await cancelPayment(requestId, sessionCode, reason);
      setCancelReasons((prev) => ({ ...prev, [requestId]: '' }));
      await Promise.all([
        loadPayments(sessionCode, appliedSearch),
        loadSummary(sessionCode),
        loadAuditLogs(sessionCode)
      ]);
      resetSessionTimer();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Could not cancel payment right now.');
    }
  };

  const handleSearch = async () => {
    if (!sessionCode) {
      return;
    }

    const normalizedSearch = searchInput.trim();
    setAppliedSearch(normalizedSearch);
    setError('');

    try {
      await loadPayments(sessionCode, normalizedSearch);
      resetSessionTimer();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Could not run search right now.');
    }
  };

  const handleExportBackupCsv = async () => {
    if (!sessionCode) {
      return;
    }

    try {
      setError('');
      const blob = await downloadAdminBackupCsv(sessionCode);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `payments-backup-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      resetSessionTimer();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Could not export backup CSV.');
    }
  };

  const handleLogout = (fromTimeout = false) => {
    if (sessionTimerRef.current) {
      clearTimeout(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }

    setIsAuthed(false);
    setCode('');
    setSessionCode('');
    setCodeError(false);
    setError(fromTimeout ? 'Logged out due to inactivity.' : '');
    setSummary({
      totalRequests: 0,
      pendingCount: 0,
      approvedCount: 0,
      cancelledCount: 0,
      approvedTotal: '0.00'
    });
    setPendingPayments([]);
    setApprovedPayments([]);
    setCancelledPayments([]);
    setAuditLogs([]);
    setSearchInput('');
    setAppliedSearch('');
    setCancelReasons({});
  };

  const handleExportCsv = () => {
    if (approvedPayments.length === 0) {
      return;
    }

    const header = [
      'request_id',
      'invoice_id',
      'customer_name',
      'total',
      'status',
      'created_at',
      'approved_at',
      'items'
    ];

    const rows = approvedPayments.map((payment) => [
      payment.id,
      payment.orderId || '',
      payment.customerName,
      Number(payment.total).toFixed(2),
      payment.status,
      payment.createdAt,
      payment.approvedAt || payment.orderDate || '',
      flattenItems(payment.items)
    ]);

    const csvString = [header, ...rows]
      .map((row) => row.map(csvEscape).join(','))
      .join('\n');

    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `approved-payments-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (!isAuthed || !sessionCode) {
      return;
    }

    const activityEvents = ['click', 'keydown', 'mousemove', 'touchstart'];
    const onActivity = () => resetSessionTimer();
    activityEvents.forEach((eventName) => window.addEventListener(eventName, onActivity));
    resetSessionTimer();

    const refresh = async () => {
      if (document.hidden) {
        return;
      }

      try {
        await Promise.all([
          loadPayments(sessionCode, appliedSearch),
          loadSummary(sessionCode),
          loadAuditLogs(sessionCode)
        ]);
      } catch {
        setError('Unable to refresh payments.');
      }
    };

    refresh();
    const interval = setInterval(refresh, 12000);
    return () => {
      clearInterval(interval);
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, onActivity));
      if (sessionTimerRef.current) {
        clearTimeout(sessionTimerRef.current);
        sessionTimerRef.current = null;
      }
    };
  }, [isAuthed, sessionCode, appliedSearch]);

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900">Admin Payments</h1>
            <p className="text-slate-600">Approve requests and issue invoices.</p>
          </div>
          <Link to="/" className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-50 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Stall
          </Link>
        </div>

        {!isAuthed ? (
          <div className="max-w-md bg-white border border-slate-200 rounded-3xl shadow-sm p-6">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6 text-amber-700" />
            </div>
            <h2 className="text-xl font-black text-slate-900 mb-2">Admin Login</h2>
            <p className="text-sm text-slate-600 mb-4">Use your private admin code.</p>
            <input
              type="password"
              value={code}
              onChange={(event) => {
                setCode(event.target.value);
                setCodeError(false);
                setError('');
              }}
              placeholder="Enter admin code"
              className={`w-full px-4 py-3 rounded-xl border bg-white shadow-sm focus:ring-2 focus:outline-none transition-colors ${
                codeError ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 focus:ring-orange-500'
              }`}
            />
            {error && <p className="text-red-500 text-xs mt-2 font-medium">{error}</p>}
            <button onClick={handleLogin} className="mt-4 w-full rounded-full bg-slate-900 text-white py-3 font-bold hover:bg-slate-800 transition-colors">
              Login
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
                <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">Pending</p>
                <p className="text-3xl font-black text-amber-900">{summary.pendingCount}</p>
              </div>
              <div className="rounded-2xl bg-green-50 border border-green-200 p-4">
                <p className="text-xs font-bold text-green-700 uppercase tracking-wide">Approved</p>
                <p className="text-3xl font-black text-green-900">{summary.approvedCount}</p>
              </div>
              <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4">
                <p className="text-xs font-bold text-rose-700 uppercase tracking-wide">Cancelled</p>
                <p className="text-3xl font-black text-rose-900">{summary.cancelledCount}</p>
              </div>
              <div className="rounded-2xl bg-blue-50 border border-blue-200 p-4">
                <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">Approved Total</p>
                <p className="text-3xl font-black text-blue-900">Rs.{summary.approvedTotal}</p>
              </div>
              <div className="rounded-2xl bg-white border border-slate-200 p-4 flex items-end">
                <button
                  onClick={handleExportCsv}
                  disabled={approvedPayments.length === 0}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 text-white py-2.5 font-bold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Download className="w-4 h-4" /> Export Approved CSV
                </button>
              </div>
              <div className="rounded-2xl bg-white border border-slate-200 p-4 flex items-end">
                <button
                  onClick={handleExportBackupCsv}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white text-slate-700 py-2.5 font-bold hover:bg-slate-50 transition-colors"
                >
                  <Download className="w-4 h-4" /> Full Backup CSV
                </button>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Search by request ID or customer name"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  className="rounded-full bg-slate-900 text-white px-5 py-2.5 font-bold hover:bg-slate-800 transition-colors"
                >
                  Search
                </button>
              </div>
              {appliedSearch && <p className="text-xs text-slate-500 mt-2">Showing results for: "{appliedSearch}"</p>}
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide mb-4">Pending Payments</h3>
              {pendingPayments.length === 0 ? (
                <p className="text-slate-500 text-sm">No pending requests.</p>
              ) : (
                <div className="space-y-3">
                  {pendingPayments.map((payment) => (
                    <div key={payment.id} className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex justify-between gap-3">
                        <div>
                          <p className="font-bold text-slate-900">{payment.customerName}</p>
                          <p className="text-xs text-slate-500">{payment.createdAt}</p>
                          <p className="text-xs text-slate-500">Request: {payment.id}</p>
                        </div>
                        <p className="text-xl font-black text-slate-900">Rs.{Number(payment.total).toFixed(2)}</p>
                      </div>

                      <ul className="mt-3 text-xs text-slate-600 space-y-1">
                        {payment.items.map((item) => (
                          <li key={`${payment.id}-${item.id}`}>
                            {item.quantity}x {item.name}
                          </li>
                        ))}
                      </ul>

                      <button onClick={() => handleApprove(payment.id)} className="mt-4 w-full rounded-full bg-green-500 text-white py-2.5 font-bold hover:bg-green-600 transition-colors">
                        Accept Payment & Send Invoice
                      </button>
                      <input
                        type="text"
                        value={cancelReasons[payment.id] || ''}
                        onChange={(event) =>
                          setCancelReasons((prev) => ({
                            ...prev,
                            [payment.id]: event.target.value
                          }))
                        }
                        placeholder="Cancellation reason (required)"
                        className="mt-2 w-full px-3 py-2 rounded-xl border border-rose-200 bg-white focus:ring-2 focus:ring-rose-500 focus:outline-none text-sm"
                      />
                      <button onClick={() => handleCancel(payment.id)} className="mt-2 w-full rounded-full bg-rose-500 text-white py-2.5 font-bold hover:bg-rose-600 transition-colors">
                        Payment Not Received
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide mb-4">Approved Payments</h3>
              {approvedPayments.length === 0 ? (
                <p className="text-slate-500 text-sm">No approved payments yet.</p>
              ) : (
                <div className="space-y-2 max-h-105 overflow-y-auto pr-1">
                  {approvedPayments.map((payment) => (
                    <div key={payment.id} className="rounded-xl border border-green-200 bg-green-50 px-3 py-2">
                      <div className="flex justify-between items-center gap-2">
                        <p className="text-sm font-bold text-green-900">{payment.customerName}</p>
                        <p className="text-sm font-black text-green-900">Rs.{Number(payment.total).toFixed(2)}</p>
                      </div>
                      <div className="text-xs text-green-800 mt-1 flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Invoice: {payment.orderId}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide mb-4">Payment Not Received</h3>
              {cancelledPayments.length === 0 ? (
                <p className="text-slate-500 text-sm">No cancelled requests.</p>
              ) : (
                <div className="space-y-2 max-h-75 overflow-y-auto pr-1">
                  {cancelledPayments.map((payment) => (
                    <div key={payment.id} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
                      <div className="flex justify-between items-center gap-2">
                        <p className="text-sm font-bold text-rose-900">{payment.customerName}</p>
                        <p className="text-sm font-black text-rose-900">Rs.{Number(payment.total).toFixed(2)}</p>
                      </div>
                      <p className="text-xs text-rose-800 mt-1">Request: {payment.id}</p>
                      {payment.cancelReason && <p className="text-xs text-rose-700 mt-1">Reason: {payment.cancelReason}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button onClick={handleLogout} className="w-full sm:w-auto px-6 py-3 rounded-full border-2 border-slate-300 text-slate-700 font-bold hover:bg-white transition-colors">
              Logout Admin
            </button>

            <div className="bg-white border border-slate-200 rounded-3xl p-6">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide mb-4">Recent Audit Log</h3>
              {auditLogs.length === 0 ? (
                <p className="text-slate-500 text-sm">No recent actions logged.</p>
              ) : (
                <div className="space-y-2 max-h-75 overflow-y-auto pr-1">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <div className="flex justify-between gap-2 text-xs">
                        <span className="font-bold text-slate-700">{log.action}</span>
                        <span className="text-slate-500">{log.createdAt}</span>
                      </div>
                      <p className="text-xs text-slate-700 mt-1">Payment: {log.paymentId}</p>
                      {log.note && <p className="text-xs text-slate-600 mt-1">{log.note}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
