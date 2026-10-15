'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  AdminDropDetail,
  AdminDropListItem,
  AbuseReport,
  AbuseReportStatus,
  BlockedSource,
  AuditLogEvent,
  SystemHealthMetrics,
  StorageMetrics,
  TelemetryStatistics,
} from '@n1/shared';
import {
  Card,
  Button,
  Badge,
  Input,
  Modal,
  CodeBlock,
  Select,
} from '../../components/ui';
import {
  getAdminSession,
  adminLogout,
  listAdminDrops,
  getAdminDrop,
  deleteAdminDrop,
  listAbuseReports,
  updateAbuseReport,
  listBlockedSources,
  blockSource,
  unblockSource,
  getSystemHealth,
  getStorageMetrics,
  getTelemetryStats,
  getAuditLogs,
} from '../../lib/admin-client';
import { formatBytes } from '../../lib/utils';

type AdminTab = 'drops' | 'reports' | 'blocklist' | 'system' | 'audit';

export default function AdminDashboardPage() {
  const router = useRouter();

  // Authentication State
  const [adminUser, setAdminUser] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);

  // Active Tab
  const [activeTab, setActiveTab] = useState<AdminTab>('drops');

  // Drops State
  const [drops, setDrops] = useState<AdminDropListItem[]>([]);
  const [dropsTotal, setDropsTotal] = useState(0);
  const [dropsLoading, setDropsLoading] = useState(false);
  const [dropSearch, setDropSearch] = useState('');
  const [dropStatusFilter, setDropStatusFilter] = useState('all');
  const [dropTypeFilter, setDropTypeFilter] = useState('all');
  const [inspectedDrop, setInspectedDrop] = useState<AdminDropDetail | null>(null);
  const [deleteTargetCode, setDeleteTargetCode] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState('Admin moderation violation');
  const [isDeletingDrop, setIsDeletingDrop] = useState(false);

  // Abuse Reports State
  const [reports, setReports] = useState<AbuseReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportStatusFilter, setReportStatusFilter] = useState('all');
  const [selectedReport, setSelectedReport] = useState<AbuseReport | null>(null);
  const [reportResolutionNotes, setReportResolutionNotes] = useState('');
  const [isUpdatingReport, setIsUpdatingReport] = useState(false);

  // Blocked Sources State
  const [blockedSources, setBlockedSources] = useState<BlockedSource[]>([]);
  const [blocklistLoading, setBlocklistLoading] = useState(false);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [blockIpHash, setBlockIpHash] = useState('');
  const [blockReason, setBlockReason] = useState('Automated abuse detection');
  const [blockDurationHours, setBlockDurationHours] = useState('24');
  const [isSubmittingBlock, setIsSubmittingBlock] = useState(false);

  // System & Storage & Stats State
  const [health, setHealth] = useState<SystemHealthMetrics | null>(null);
  const [storage, setStorage] = useState<StorageMetrics | null>(null);
  const [stats, setStats] = useState<TelemetryStatistics | null>(null);
  const [systemLoading, setSystemLoading] = useState(false);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLogEvent[]>([]);
  const [auditLogsTotal, setAuditLogsTotal] = useState(0);
  const [auditLogsLoading, setAuditLogsLoading] = useState(false);
  const [auditSeverityFilter, setAuditSeverityFilter] = useState('all');

  // Flash Message
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // 1. Initial Authentication Check
  useEffect(() => {
    getAdminSession()
      .then(res => {
        setAdminUser(res.username);
        setIsVerifying(false);
      })
      .catch(() => {
        router.push('/admin/login');
      });
  }, [router]);

  // 2. Fetch Tab Data
  const loadDrops = useCallback(async () => {
    setDropsLoading(true);
    try {
      const data = await listAdminDrops({
        status: dropStatusFilter,
        type: dropTypeFilter,
        search: dropSearch.trim() || undefined,
        limit: 50,
      });
      setDrops(data.drops);
      setDropsTotal(data.total);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load drops';
      showNotification('error', msg);
    } finally {
      setDropsLoading(false);
    }
  }, [dropStatusFilter, dropTypeFilter, dropSearch]);

  const loadReports = useCallback(async () => {
    setReportsLoading(true);
    try {
      const data = await listAbuseReports(reportStatusFilter);
      setReports(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load abuse reports';
      showNotification('error', msg);
    } finally {
      setReportsLoading(false);
    }
  }, [reportStatusFilter]);

  const loadBlockedSources = useCallback(async () => {
    setBlocklistLoading(true);
    try {
      const data = await listBlockedSources();
      setBlockedSources(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load blocked sources';
      showNotification('error', msg);
    } finally {
      setBlocklistLoading(false);
    }
  }, []);

  const loadSystemData = useCallback(async () => {
    setSystemLoading(true);
    try {
      const [h, s, st] = await Promise.all([
        getSystemHealth(),
        getStorageMetrics(),
        getTelemetryStats(),
      ]);
      setHealth(h);
      setStorage(s);
      setStats(st);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load system metrics';
      showNotification('error', msg);
    } finally {
      setSystemLoading(false);
    }
  }, []);

  const loadAuditLogs = useCallback(async () => {
    setAuditLogsLoading(true);
    try {
      const data = await getAuditLogs({
        severity: auditSeverityFilter,
        limit: 50,
      });
      setAuditLogs(data.logs);
      setAuditLogsTotal(data.total);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load audit logs';
      showNotification('error', msg);
    } finally {
      setAuditLogsLoading(false);
    }
  }, [auditSeverityFilter]);

  // Trigger loads when tab changes or filters change
  useEffect(() => {
    if (isVerifying) return;
    if (activeTab === 'drops') loadDrops();
    if (activeTab === 'reports') loadReports();
    if (activeTab === 'blocklist') loadBlockedSources();
    if (activeTab === 'system') loadSystemData();
    if (activeTab === 'audit') loadAuditLogs();
  }, [activeTab, isVerifying, loadDrops, loadReports, loadBlockedSources, loadSystemData, loadAuditLogs]);

  // Inspect Drop
  const handleInspect = async (code: string) => {
    try {
      const data = await getAdminDrop(code);
      setInspectedDrop(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to inspect drop';
      showNotification('error', msg);
    }
  };

  // Delete Drop Action
  const handleDeleteDrop = async () => {
    if (!deleteTargetCode) return;
    setIsDeletingDrop(true);
    try {
      await deleteAdminDrop(deleteTargetCode, deleteReason);
      showNotification('success', `Drop ${deleteTargetCode} purged successfully.`);
      setDeleteTargetCode(null);
      if (inspectedDrop?.code === deleteTargetCode) {
        setInspectedDrop(null);
      }
      loadDrops();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete drop';
      showNotification('error', msg);
    } finally {
      setIsDeletingDrop(false);
    }
  };

  // Update Abuse Report Action
  const handleUpdateReportStatus = async (status: AbuseReportStatus) => {
    if (!selectedReport) return;
    setIsUpdatingReport(true);
    try {
      await updateAbuseReport(selectedReport.id, {
        status,
        resolutionNotes: reportResolutionNotes || undefined,
      });
      showNotification('success', `Report marked as ${status}.`);
      setSelectedReport(null);
      setReportResolutionNotes('');
      loadReports();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update report';
      showNotification('error', msg);
    } finally {
      setIsUpdatingReport(false);
    }
  };

  // Block Source Action
  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockIpHash.trim()) return;
    setIsSubmittingBlock(true);
    try {
      await blockSource({
        ipHash: blockIpHash.trim(),
        reason: blockReason.trim(),
        durationHours: blockDurationHours ? Number(blockDurationHours) : undefined,
      });
      showNotification('success', 'Source hash blocked successfully.');
      setIsBlockModalOpen(false);
      setBlockIpHash('');
      loadBlockedSources();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to block source';
      showNotification('error', msg);
    } finally {
      setIsSubmittingBlock(false);
    }
  };

  // Unblock Source Action
  const handleUnblock = async (ipHash: string) => {
    try {
      await unblockSource(ipHash);
      showNotification('success', 'Source unblocked.');
      loadBlockedSources();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to unblock source';
      showNotification('error', msg);
    }
  };

  // Logout
  const handleLogout = async () => {
    await adminLogout();
    router.push('/admin/login');
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-[#07070a] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-n1-purple border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-n1-text-secondary font-mono tracking-wider">
            AUTHENTICATING ADMIN CONSOLE...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen -mt-24 -mb-16 bg-[#07070a] text-n1-text-primary pb-20 selection:bg-n1-purple selection:text-white">
      {/* Top Notification Toast */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div
            className={`px-4 py-3 rounded-xl border shadow-2xl flex items-center gap-2.5 text-xs font-medium backdrop-blur-xl ${
              notification.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-current animate-ping" />
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Admin Header */}
      <header className="border-b border-n1-border bg-[#0b0b11]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-n1-purple/20 border border-n1-purple/40 flex items-center justify-center text-n1-purple-light font-black text-sm">
              N1
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-tight text-white">Console</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-rose-500/10 border border-rose-500/30 text-rose-400">
                  Private
                </span>
              </div>
              <p className="text-[11px] text-n1-text-muted font-mono">
                System Moderation & Architecture Telemetry
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-n1-text-secondary bg-[#12121a] px-3 py-1.5 rounded-lg border border-n1-border">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Operator:</span>
              <span className="text-white font-semibold">{adminUser}</span>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                if (activeTab === 'drops') loadDrops();
                if (activeTab === 'reports') loadReports();
                if (activeTab === 'blocklist') loadBlockedSources();
                if (activeTab === 'system') loadSystemData();
                if (activeTab === 'audit') loadAuditLogs();
                showNotification('success', 'Data refreshed.');
              }}
              className="gap-1.5 text-xs"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Sync</span>
            </Button>

            <Button
              variant="danger"
              size="sm"
              onClick={handleLogout}
              className="gap-1.5 text-xs"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Logout</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="flex border-b border-n1-border overflow-x-auto space-x-2 pb-px">
          {[
            { id: 'drops', label: 'Drops Moderation', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
            { id: 'reports', label: 'Abuse Reports', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
            { id: 'blocklist', label: 'Blocked Sources', icon: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636' },
            { id: 'system', label: 'System & Storage', icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z' },
            { id: 'audit', label: 'Security Audit Logs', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AdminTab)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-n1-purple text-n1-purple-light bg-n1-purple/5 rounded-t-lg'
                  : 'border-transparent text-n1-text-secondary hover:text-white hover:border-n1-border'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
              </svg>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Tab Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* ====================================================
            TAB 1: DROPS MODERATION
        ==================================================== */}
        {activeTab === 'drops' && (
          <div className="space-y-6">
            {/* Filter / Search Bar */}
            <Card variant="glass" className="p-4 border-n1-border flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex-1 w-full flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Input
                    placeholder="Search by Drop code (e.g. 8A3F9X)..."
                    value={dropSearch}
                    onChange={e => setDropSearch(e.target.value)}
                    className="font-mono text-xs uppercase"
                  />
                </div>

                <div className="w-full sm:w-44">
                  <Select
                    value={dropStatusFilter}
                    onChange={e => setDropStatusFilter(e.target.value)}
                    options={[
                      { value: 'all', label: 'All Statuses' },
                      { value: 'active', label: 'Active Only' },
                      { value: 'expired', label: 'Expired Only' },
                      { value: 'view_limit_reached', label: 'View Limit Reached' },
                      { value: 'deleted', label: 'Deleted / Purged' },
                    ]}
                  />
                </div>

                <div className="w-full sm:w-36">
                  <Select
                    value={dropTypeFilter}
                    onChange={e => setDropTypeFilter(e.target.value)}
                    options={[
                      { value: 'all', label: 'All Types' },
                      { value: 'file', label: 'Files' },
                      { value: 'text', label: 'Encrypted Text' },
                    ]}
                  />
                </div>
              </div>

              <div className="text-xs text-n1-text-secondary font-mono shrink-0">
                Total Drops: <span className="text-white font-bold">{dropsTotal}</span>
              </div>
            </Card>

            {/* Drops Table */}
            <Card variant="glass" className="overflow-hidden border-n1-border">
              {dropsLoading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3">
                  <div className="w-6 h-6 border-2 border-n1-purple border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-n1-text-secondary font-mono">Querying drops...</span>
                </div>
              ) : drops.length === 0 ? (
                <div className="py-16 text-center text-xs text-n1-text-secondary font-mono">
                  No drops matched the filter query.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#12121a] text-n1-text-muted font-mono uppercase tracking-wider border-b border-n1-border">
                      <tr>
                        <th className="p-3.5">Code</th>
                        <th className="p-3.5">Type</th>
                        <th className="p-3.5">Size</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5">Views</th>
                        <th className="p-3.5">Protection</th>
                        <th className="p-3.5">Expires</th>
                        <th className="p-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-n1-border/40 font-mono">
                      {drops.map(item => (
                        <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-3.5 font-bold text-white tracking-widest">{item.code}</td>
                          <td className="p-3.5">
                            <span className="capitalize text-n1-text-secondary">{item.type}</span>
                            {item.fileCount > 0 && ` (${item.fileCount})`}
                          </td>
                          <td className="p-3.5 text-n1-text-secondary">{formatBytes(item.totalSizeBytes)}</td>
                          <td className="p-3.5">
                            <Badge
                              variant={
                                item.status === 'active'
                                  ? 'success'
                                  : item.status === 'expired'
                                  ? 'warning'
                                  : 'error'
                              }
                              size="sm"
                            >
                              {item.status}
                            </Badge>
                          </td>
                          <td className="p-3.5 text-n1-text-secondary">
                            {item.viewCount}
                            {item.viewLimit ? ` / ${item.viewLimit}` : ''}
                          </td>
                          <td className="p-3.5">
                            {item.hasPassword ? (
                              <span className="text-amber-400 font-semibold">🔒 Yes</span>
                            ) : (
                              <span className="text-n1-text-muted">None</span>
                            )}
                          </td>
                          <td className="p-3.5 text-n1-text-muted">
                            {new Date(item.expiresAt).toLocaleString()}
                          </td>
                          <td className="p-3.5 text-right space-x-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleInspect(item.code)}
                              className="text-xs px-2.5 py-1"
                            >
                              Inspect
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => {
                                setDeleteTargetCode(item.code);
                                setDeleteReason('Admin moderation purge');
                              }}
                              className="text-xs px-2.5 py-1"
                            >
                              Delete
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ====================================================
            TAB 2: ABUSE REPORTS
        ==================================================== */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <Card variant="glass" className="p-4 border-n1-border flex items-center justify-between">
              <div className="w-56">
                <Select
                  value={reportStatusFilter}
                  onChange={e => setReportStatusFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Statuses' },
                    { value: 'pending', label: 'Pending Only' },
                    { value: 'reviewed', label: 'Reviewed' },
                    { value: 'resolved', label: 'Resolved' },
                    { value: 'dismissed', label: 'Dismissed' },
                  ]}
                />
              </div>
              <div className="text-xs text-n1-text-secondary font-mono">
                Total Reports: <span className="text-white font-bold">{reports.length}</span>
              </div>
            </Card>

            <Card variant="glass" className="overflow-hidden border-n1-border">
              {reportsLoading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3">
                  <div className="w-6 h-6 border-2 border-n1-purple border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-n1-text-secondary font-mono">Loading abuse reports...</span>
                </div>
              ) : reports.length === 0 ? (
                <div className="py-16 text-center text-xs text-n1-text-secondary font-mono">
                  No abuse reports found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#12121a] text-n1-text-muted font-mono uppercase tracking-wider border-b border-n1-border">
                      <tr>
                        <th className="p-3.5">Drop Code</th>
                        <th className="p-3.5">Reason</th>
                        <th className="p-3.5">Reporter IP Hash</th>
                        <th className="p-3.5">Description</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5">Created</th>
                        <th className="p-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-n1-border/40 font-mono">
                      {reports.map(rep => (
                        <tr key={rep.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-3.5 font-bold text-white tracking-widest">{rep.dropCode}</td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 uppercase text-[10px]">
                              {rep.reason}
                            </span>
                          </td>
                          <td className="p-3.5 text-n1-text-secondary" title={rep.reporterIpHash}>
                            {rep.reporterIpHash.slice(0, 12)}...
                          </td>
                          <td className="p-3.5 text-n1-text-primary max-w-xs truncate" title={rep.description}>
                            {rep.description || 'No description provided'}
                          </td>
                          <td className="p-3.5">
                            <Badge
                              variant={
                                rep.status === 'pending'
                                  ? 'warning'
                                  : rep.status === 'resolved'
                                  ? 'success'
                                  : 'muted'
                              }
                              size="sm"
                            >
                              {rep.status}
                            </Badge>
                          </td>
                          <td className="p-3.5 text-n1-text-muted">
                            {new Date(rep.createdAt).toLocaleString()}
                          </td>
                          <td className="p-3.5 text-right space-x-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleInspect(rep.dropCode)}
                              className="text-xs px-2.5 py-1"
                            >
                              Inspect Drop
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => {
                                setSelectedReport(rep);
                                setReportResolutionNotes(rep.resolutionNote || '');
                              }}
                              className="text-xs px-2.5 py-1"
                            >
                              Review
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ====================================================
            TAB 3: BLOCKED SOURCES
        ==================================================== */}
        {activeTab === 'blocklist' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white">Blocked Source Signatures</h2>
                <p className="text-xs text-n1-text-secondary">
                  Requests originating from matching SHA-256 IP hashes are rejected with HTTP 403.
                </p>
              </div>

              <Button
                variant="danger"
                size="sm"
                onClick={() => setIsBlockModalOpen(true)}
                className="gap-1.5 text-xs"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Add Source Block</span>
              </Button>
            </div>

            <Card variant="glass" className="overflow-hidden border-n1-border">
              {blocklistLoading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3">
                  <div className="w-6 h-6 border-2 border-n1-purple border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-n1-text-secondary font-mono">Loading blocklist...</span>
                </div>
              ) : blockedSources.length === 0 ? (
                <div className="py-16 text-center text-xs text-n1-text-secondary font-mono">
                  No active source blocks registered.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#12121a] text-n1-text-muted font-mono uppercase tracking-wider border-b border-n1-border">
                      <tr>
                        <th className="p-3.5">SHA-256 IP Signature</th>
                        <th className="p-3.5">Reason</th>
                        <th className="p-3.5">Blocked By</th>
                        <th className="p-3.5">Blocked At</th>
                        <th className="p-3.5">Expires</th>
                        <th className="p-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-n1-border/40 font-mono">
                      {blockedSources.map(bs => (
                        <tr key={bs.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-3.5 text-rose-300 font-bold tracking-wider">{bs.ipHash}</td>
                          <td className="p-3.5 text-n1-text-primary">{bs.reason}</td>
                          <td className="p-3.5 text-n1-text-secondary">{bs.blockedBy}</td>
                          <td className="p-3.5 text-n1-text-muted">
                            {new Date(bs.blockedAt).toLocaleString()}
                          </td>
                          <td className="p-3.5 text-n1-text-muted">
                            {bs.expiresAt ? new Date(bs.expiresAt).toLocaleString() : 'Permanent'}
                          </td>
                          <td className="p-3.5 text-right">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleUnblock(bs.ipHash)}
                              className="text-xs px-2.5 py-1 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                            >
                              Unblock
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ====================================================
            TAB 4: SYSTEM & STORAGE & STATS
        ==================================================== */}
        {activeTab === 'system' && (
          <div className="space-y-6">
            {systemLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <div className="w-6 h-6 border-2 border-n1-purple border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-n1-text-secondary font-mono">Reading system telemetry...</span>
              </div>
            ) : (
              <>
                {/* System Health Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card variant="glass" className="p-4 border-n1-border">
                    <span className="text-[11px] font-mono uppercase text-n1-text-muted">System State</span>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${health?.status === 'healthy' ? 'bg-emerald-400' : 'bg-rose-400'} animate-pulse`} />
                      <span className="text-lg font-bold text-white capitalize">{health?.status || 'Unknown'}</span>
                    </div>
                    <span className="text-[11px] text-n1-text-muted font-mono mt-1 block">
                      Uptime: {Math.floor((health?.uptimeSeconds || 0) / 3600)}h {Math.floor(((health?.uptimeSeconds || 0) % 3600) / 60)}m
                    </span>
                  </Card>

                  <Card variant="glass" className="p-4 border-n1-border">
                    <span className="text-[11px] font-mono uppercase text-n1-text-muted">MongoDB Connection</span>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-emerald-400" />
                      <span className="text-lg font-bold text-white capitalize">{health?.database.status || 'Connected'}</span>
                    </div>
                    <span className="text-[11px] text-n1-text-muted font-mono mt-1 block">
                      Latency: <span className="text-emerald-400">{health?.database.latencyMs}ms</span>
                    </span>
                  </Card>

                  <Card variant="glass" className="p-4 border-n1-border">
                    <span className="text-[11px] font-mono uppercase text-n1-text-muted">Memory Allocation</span>
                    <div className="mt-2 text-lg font-bold text-white font-mono">
                      {formatBytes(health?.memory.heapUsedBytes || 0)}
                    </div>
                    <span className="text-[11px] text-n1-text-muted font-mono mt-1 block">
                      RSS: {formatBytes(health?.memory.rssBytes || 0)}
                    </span>
                  </Card>

                  <Card variant="glass" className="p-4 border-n1-border">
                    <span className="text-[11px] font-mono uppercase text-n1-text-muted">Cleanup Engine</span>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${health?.worker.active ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                      <span className="text-lg font-bold text-white">
                        {health?.worker.active ? 'Running' : 'Standby'}
                      </span>
                    </div>
                    <span className="text-[11px] text-n1-text-muted font-mono mt-1 block">
                      Interval: every {health?.worker.intervalSeconds}s
                    </span>
                  </Card>
                </div>

                {/* Storage & Volume Usage */}
                <Card variant="glass" className="p-6 border-n1-border space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">Physical Storage Blob Metrics</h3>
                      <p className="text-xs text-n1-text-secondary font-mono mt-0.5">
                        Storage Mount: <span className="text-n1-purple-light">{storage?.rootPathMasked || '/data/n1-storage/...'}</span>
                      </p>
                    </div>
                    <span className="text-xs font-mono px-3 py-1 rounded bg-[#12121a] border border-n1-border text-emerald-400">
                      Disk Bound: Safe
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    <div className="p-4 rounded-xl bg-[#12121a] border border-n1-border">
                      <span className="text-[11px] text-n1-text-muted font-mono">Total Disk Usage</span>
                      <p className="text-xl font-bold text-white font-mono mt-1">
                        {formatBytes(storage?.totalSizeBytes || 0)}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-[#12121a] border border-n1-border">
                      <span className="text-[11px] text-n1-text-muted font-mono">Physical Stored Blobs</span>
                      <p className="text-xl font-bold text-white font-mono mt-1">
                        {storage?.fileCount || 0} files
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-[#12121a] border border-n1-border">
                      <span className="text-[11px] text-n1-text-muted font-mono">Runtime Engine</span>
                      <p className="text-xl font-bold text-white font-mono mt-1">
                        Node {health?.nodeVersion || 'v22.x'}
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Platform Telemetry Stats */}
                <Card variant="glass" className="p-6 border-n1-border space-y-4">
                  <h3 className="text-sm font-bold text-white">Platform Usage Telemetry</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-[#12121a] border border-n1-border">
                      <span className="text-[11px] text-n1-text-muted font-mono">Total Drops Created</span>
                      <p className="text-xl font-bold text-white font-mono mt-1">{stats?.totalDropsCreated || 0}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-[#12121a] border border-n1-border">
                      <span className="text-[11px] text-n1-text-muted font-mono">Active Drops</span>
                      <p className="text-xl font-bold text-emerald-400 font-mono mt-1">{stats?.activeDropsCount || 0}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-[#12121a] border border-n1-border">
                      <span className="text-[11px] text-n1-text-muted font-mono">Expired Drops</span>
                      <p className="text-xl font-bold text-amber-400 font-mono mt-1">{stats?.expiredDropsCount || 0}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-[#12121a] border border-n1-border">
                      <span className="text-[11px] text-n1-text-muted font-mono">Burn-On-Read Drops</span>
                      <p className="text-xl font-bold text-rose-400 font-mono mt-1">{stats?.burnedDropsCount || 0}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-[#12121a] border border-n1-border">
                      <span className="text-[11px] text-n1-text-muted font-mono">File Drops</span>
                      <p className="text-xl font-bold text-white font-mono mt-1">{stats?.fileDropsCount || 0}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-[#12121a] border border-n1-border">
                      <span className="text-[11px] text-n1-text-muted font-mono">Text Drops</span>
                      <p className="text-xl font-bold text-white font-mono mt-1">{stats?.textDropsCount || 0}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-[#12121a] border border-n1-border">
                      <span className="text-[11px] text-n1-text-muted font-mono">Total Views Logged</span>
                      <p className="text-xl font-bold text-white font-mono mt-1">{stats?.totalViewsCount || 0}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-[#12121a] border border-n1-border">
                      <span className="text-[11px] text-n1-text-muted font-mono">Blocked Sources</span>
                      <p className="text-xl font-bold text-rose-400 font-mono mt-1">{stats?.blockedSourcesCount || 0}</p>
                    </div>
                  </div>
                </Card>
              </>
            )}
          </div>
        )}

        {/* ====================================================
            TAB 5: SECURITY AUDIT LOGS
        ==================================================== */}
        {activeTab === 'audit' && (
          <div className="space-y-6">
            <Card variant="glass" className="p-4 border-n1-border flex items-center justify-between">
              <div className="w-56">
                <Select
                  value={auditSeverityFilter}
                  onChange={e => setAuditSeverityFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Severities' },
                    { value: 'info', label: 'Info' },
                    { value: 'warn', label: 'Warning' },
                    { value: 'security', label: 'Security' },
                    { value: 'critical', label: 'Critical' },
                  ]}
                />
              </div>
              <div className="text-xs text-n1-text-secondary font-mono">
                Total Audit Events: <span className="text-white font-bold">{auditLogsTotal}</span>
              </div>
            </Card>

            <Card variant="glass" className="overflow-hidden border-n1-border">
              {auditLogsLoading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3">
                  <div className="w-6 h-6 border-2 border-n1-purple border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-n1-text-secondary font-mono">Loading audit logs...</span>
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="py-16 text-center text-xs text-n1-text-secondary font-mono">
                  No security audit events recorded.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#12121a] text-n1-text-muted uppercase tracking-wider border-b border-n1-border">
                      <tr>
                        <th className="p-3.5">Timestamp</th>
                        <th className="p-3.5">Severity</th>
                        <th className="p-3.5">Event</th>
                        <th className="p-3.5">Actor</th>
                        <th className="p-3.5">Target</th>
                        <th className="p-3.5">Action Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-n1-border/40">
                      {auditLogs.map(log => (
                        <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-3.5 text-n1-text-muted whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="p-3.5">
                            <Badge
                              variant={
                                log.severity === 'critical' || log.severity === 'security'
                                  ? 'error'
                                  : log.severity === 'warn'
                                  ? 'warning'
                                  : 'muted'
                              }
                              size="sm"
                            >
                              {log.severity}
                            </Badge>
                          </td>
                          <td className="p-3.5 text-white font-bold">{log.eventType}</td>
                          <td className="p-3.5 text-n1-purple-light">{log.adminUser}</td>
                          <td className="p-3.5 text-n1-text-secondary">{log.targetId || '-'}</td>
                          <td className="p-3.5 text-n1-text-secondary">
                            <div>{log.action}</div>
                            {log.details && (
                              <pre className="text-[10px] text-n1-text-muted mt-1 max-w-sm truncate">
                                {JSON.stringify(log.details)}
                              </pre>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}
      </main>

      {/* ====================================================
          MODAL 1: INSPECT DROP (STRICTLY REDACTED SECRETS)
      ==================================================== */}
      <Modal
        isOpen={Boolean(inspectedDrop)}
        onClose={() => setInspectedDrop(null)}
        title={`Inspect Drop: ${inspectedDrop?.code || ''}`}
        size="lg"
      >
        {inspectedDrop && (
          <div className="space-y-6 text-left">
            {/* Quick Metadata Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-[#12121a] border border-n1-border">
                <span className="text-[10px] font-mono uppercase text-n1-text-muted">Type</span>
                <p className="text-xs font-bold text-white capitalize mt-0.5">{inspectedDrop.type}</p>
              </div>

              <div className="p-3 rounded-lg bg-[#12121a] border border-n1-border">
                <span className="text-[10px] font-mono uppercase text-n1-text-muted">Status</span>
                <p className="text-xs font-bold text-white capitalize mt-0.5">{inspectedDrop.status}</p>
              </div>

              <div className="p-3 rounded-lg bg-[#12121a] border border-n1-border">
                <span className="text-[10px] font-mono uppercase text-n1-text-muted">Total Size</span>
                <p className="text-xs font-bold text-white font-mono mt-0.5">
                  {formatBytes(inspectedDrop.totalSizeBytes)}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#12121a] border border-n1-border">
                <span className="text-[10px] font-mono uppercase text-n1-text-muted">Views</span>
                <p className="text-xs font-bold text-white font-mono mt-0.5">
                  {inspectedDrop.viewCount}
                  {inspectedDrop.viewLimit ? ` / ${inspectedDrop.viewLimit}` : ''}
                </p>
              </div>
            </div>

            {/* Timestamps & Security Details */}
            <div className="p-4 rounded-xl bg-[#0f0f17] border border-n1-border space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-n1-text-muted">Created:</span>
                <span className="text-white">{new Date(inspectedDrop.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-n1-text-muted">Expires:</span>
                <span className="text-white">{new Date(inspectedDrop.expiresAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-n1-text-muted">Password Protected:</span>
                <span className="text-white">{inspectedDrop.hasPassword ? 'Yes (Hash Redacted)' : 'No'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-n1-text-muted">Burn After Reading:</span>
                <span className="text-white">{inspectedDrop.burnAfterReading ? 'Enabled' : 'Disabled'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-n1-text-muted">Creator IP Hash:</span>
                <span className="text-n1-purple-light">{inspectedDrop.ipHash}</span>
              </div>
            </div>

            {/* Text Content (if encrypted text drop) */}
            {inspectedDrop.textContent && (
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-n1-text-secondary">Text Payload</span>
                <div className="max-h-48 overflow-y-auto">
                  <CodeBlock
                    code={inspectedDrop.textContent}
                    filename="drop-content.txt"
                    language="text"
                  />
                </div>
              </div>
            )}

            {/* Files List (Without raw server filesystem paths!) */}
            {inspectedDrop.files && inspectedDrop.files.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-medium text-n1-text-secondary">
                  Files ({inspectedDrop.files.length})
                </span>
                <div className="divide-y divide-n1-border rounded-xl border border-n1-border overflow-hidden">
                  {inspectedDrop.files.map(file => (
                    <div key={file.id} className="p-3 bg-[#12121a] flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold text-white">{file.originalName}</p>
                        <p className="text-[11px] text-n1-text-muted font-mono mt-0.5">
                          {formatBytes(file.fileSizeBytes)} • {file.mimeType}
                        </p>
                      </div>
                      <span className="text-[10px] font-mono text-n1-text-muted" title={file.checksum}>
                        SHA-256: {file.checksum.slice(0, 10)}...
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-n1-border">
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  setDeleteTargetCode(inspectedDrop.code);
                  setDeleteReason('Admin inspection removal');
                }}
              >
                Purge Drop Permanently
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => setInspectedDrop(null)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ====================================================
          MODAL 2: DELETE / PURGE CONFIRMATION
      ==================================================== */}
      <Modal
        isOpen={Boolean(deleteTargetCode)}
        onClose={() => setDeleteTargetCode(null)}
        title={`Purge Drop: ${deleteTargetCode}`}
        size="sm"
      >
        <div className="space-y-4 text-left">
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-1">
            <p className="font-bold text-rose-400">⚠️ Irreversible Deletion</p>
            <p>
              This will permanently delete the Drop metadata and all physical stored file blobs from disk.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-n1-text-secondary mb-1.5">
              Reason for Deletion
            </label>
            <Input
              value={deleteReason}
              onChange={e => setDeleteReason(e.target.value)}
              placeholder="e.g. Terms of Service violation"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setDeleteTargetCode(null)}
              disabled={isDeletingDrop}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDeleteDrop}
              disabled={isDeletingDrop}
            >
              {isDeletingDrop ? 'Purging...' : 'Confirm Purge'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ====================================================
          MODAL 3: REVIEW ABUSE REPORT
      ==================================================== */}
      <Modal
        isOpen={Boolean(selectedReport)}
        onClose={() => setSelectedReport(null)}
        title={`Review Abuse Report: ${selectedReport?.dropCode}`}
        size="md"
      >
        {selectedReport && (
          <div className="space-y-4 text-left text-xs">
            <div className="p-3 rounded-lg bg-[#12121a] border border-n1-border space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-n1-text-muted">Reason:</span>
                <span className="text-rose-400 uppercase font-bold">{selectedReport.reason}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-n1-text-muted">Reporter Hash:</span>
                <span className="text-n1-text-secondary">{selectedReport.reporterIpHash}</span>
              </div>
              <div>
                <span className="text-n1-text-muted">Description:</span>
                <p className="text-white mt-1 font-sans">{selectedReport.description || 'None'}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-n1-text-secondary mb-1.5">
                Resolution Notes
              </label>
              <Input
                value={reportResolutionNotes}
                onChange={e => setReportResolutionNotes(e.target.value)}
                placeholder="Action taken or justification..."
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-n1-border">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setBlockIpHash(selectedReport.reporterIpHash);
                  setIsBlockModalOpen(true);
                }}
              >
                Block Reporter Hash
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleUpdateReportStatus('dismissed')}
                  disabled={isUpdatingReport}
                >
                  Dismiss
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleUpdateReportStatus('resolved')}
                  disabled={isUpdatingReport}
                >
                  Resolve
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ====================================================
          MODAL 4: BLOCK SOURCE FORM
      ==================================================== */}
      <Modal
        isOpen={isBlockModalOpen}
        onClose={() => setIsBlockModalOpen(false)}
        title="Block Abusive Source"
        size="sm"
      >
        <form onSubmit={handleCreateBlock} className="space-y-4 text-left text-xs">
          <div>
            <label className="block font-medium text-n1-text-secondary mb-1.5">
              SHA-256 IP Signature Hash
            </label>
            <Input
              value={blockIpHash}
              onChange={e => setBlockIpHash(e.target.value)}
              placeholder="e.g. 9f86d081884c7d659a2feaa0c55ad015..."
              required
              className="font-mono text-xs"
            />
          </div>

          <div>
            <label className="block font-medium text-n1-text-secondary mb-1.5">
              Block Reason
            </label>
            <Input
              value={blockReason}
              onChange={e => setBlockReason(e.target.value)}
              placeholder="e.g. Automated DoS attempt"
              required
            />
          </div>

          <div>
            <label className="block font-medium text-n1-text-secondary mb-1.5">
              Duration (Hours, leave empty for permanent)
            </label>
            <Input
              type="number"
              value={blockDurationHours}
              onChange={e => setBlockDurationHours(e.target.value)}
              placeholder="24"
              min="1"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-n1-border">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsBlockModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              size="sm"
              disabled={isSubmittingBlock}
            >
              {isSubmittingBlock ? 'Enforcing...' : 'Enforce Block'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
