import React, { useEffect, useState } from 'react';
import { adminApi } from '../services/api';
import { FileText, Search, ShieldCheck, Eye, Terminal } from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDiff, setSelectedDiff] = useState<any | null>(null);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const data = await adminApi.admin.getAuditLogs(100, 0);
      setLogs(data);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      log.actor_role.toLowerCase().includes(q) ||
      (log.affected_entity_type && log.affected_entity_type.toLowerCase().includes(q)) ||
      (log.actor_id && log.actor_id.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="micro-label text-emerald-700 dark:text-[#D7FF35]">TAMPER-EVIDENT GOVERNANCE</span>
          <h1 className="text-2xl sm:text-4xl font-light text-slate-900 dark:text-white tracking-tight">
            Municipal Audit Logs
          </h1>
          <p className="text-xs text-slate-600 dark:text-[#A7B9A8] mt-1 max-w-2xl">
            Append-only audit trail capturing every privileged action, doorstep activation, weighment receipt,
            and reward schedule alteration with full actor attribution and client IP.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 dark:text-[#A7B9A8]/60 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search action or actor..."
            className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#041B15] border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#A7B9A8]/40 focus:outline-none focus:border-emerald-600 dark:focus:border-[#D7FF35]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-3xl bg-white dark:bg-[#0D4935] border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm dark:shadow-xl">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase font-mono tracking-wider text-slate-600 dark:text-[#A7B9A8]">
            Audit Trail ({filteredLogs.length} events)
          </span>
          <span className="text-[10px] font-mono text-slate-500 dark:text-[#A7B9A8]/70">Immutable Audit Logs</span>
        </div>

        {loading ? (
          <div className="p-16 text-center text-slate-600 dark:text-[#A7B9A8]">
            <div className="w-8 h-8 border-2 border-emerald-600 dark:border-[#D7FF35] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs font-mono">Loading audit trail...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-16 text-center text-slate-600 dark:text-[#A7B9A8]">
            <p className="text-sm font-medium text-slate-900 dark:text-white">No audit records found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-800 dark:text-[#F4F7F0]">
              <thead className="bg-slate-100 dark:bg-[#062B20] border-b border-slate-200 dark:border-white/10 text-slate-700 dark:text-[#A7B9A8] uppercase font-mono text-[10px] tracking-wider">
                <tr>
                  <th scope="col" className="px-6 py-3.5">Timestamp (UTC)</th>
                  <th scope="col" className="px-6 py-3.5">Actor / Role</th>
                  <th scope="col" className="px-6 py-3.5">Action</th>
                  <th scope="col" className="px-6 py-3.5">Affected Entity</th>
                  <th scope="col" className="px-6 py-3.5">IP Address</th>
                  <th scope="col" className="px-6 py-3.5 text-center">Diff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition">
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-slate-600 dark:text-[#A7B9A8] text-[11px]">
                      {new Date(log.timestamp).toISOString().replace('T', ' ').slice(0, 19)}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          log.actor_role === 'SUPER_ADMIN'
                            ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-500/30'
                            : log.actor_role === 'SUPERVISOR'
                            ? 'bg-emerald-100 dark:bg-[#D7FF35]/15 text-emerald-800 dark:text-[#D7FF35] border border-emerald-300 dark:border-[#D7FF35]/30'
                            : 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-[#A7B9A8]'
                        }`}
                      >
                        {log.actor_role}
                      </span>
                      <div className="text-[10px] text-slate-500 dark:text-[#A7B9A8]/70 font-mono mt-0.5">
                        {log.actor_id ? log.actor_id.slice(0, 8) : 'SYSTEM'}
                      </div>
                    </td>

                    <td className="px-6 py-4 font-mono font-semibold text-slate-900 dark:text-white">
                      {log.action}
                    </td>

                    <td className="px-6 py-4 font-mono text-slate-600 dark:text-[#A7B9A8] text-[11px]">
                      {log.affected_entity_type}: {log.affected_entity_id?.slice(0, 8) || '—'}
                    </td>

                    <td className="px-6 py-4 font-mono text-slate-500 dark:text-[#A7B9A8]/70 text-[11px]">
                      {log.ip_address || 'internal'}
                    </td>

                    <td className="px-6 py-4 text-center">
                      {log.diff ? (
                        <button
                          type="button"
                          onClick={() => setSelectedDiff(log)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/5 dark:hover:bg-white/10 dark:text-[#F4F7F0] dark:hover:text-white transition"
                          title="View audit diff payload"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      ) : (
                        <span className="text-slate-400 dark:text-[#A7B9A8]/50">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Diff Inspection Modal */}
      {selectedDiff && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/50 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="w-full max-w-xl rounded-3xl bg-white dark:bg-[#0D4935] border border-slate-200 dark:border-white/15 p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-emerald-600 dark:text-[#D7FF35]" />
                <h3 className="text-lg font-light text-slate-900 dark:text-white">Audit Event Payload</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDiff(null)}
                className="text-slate-500 hover:text-slate-800 dark:text-[#A7B9A8] dark:hover:text-white text-xs font-mono"
              >
                &times; Close
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200 dark:border-white/5">
                <span className="text-slate-500 dark:text-[#A7B9A8]">Action:</span>
                <span className="font-mono text-slate-900 dark:text-white font-bold">{selectedDiff.action}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200 dark:border-white/5">
                <span className="text-slate-500 dark:text-[#A7B9A8]">Event ID:</span>
                <span className="font-mono text-slate-800 dark:text-[#F4F7F0]">{selectedDiff.id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200 dark:border-white/5">
                <span className="text-slate-500 dark:text-[#A7B9A8]">Timestamp:</span>
                <span className="font-mono text-slate-800 dark:text-[#F4F7F0]">{selectedDiff.timestamp}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-800 dark:text-[#F4F7F0]">Recorded State Diff</span>
              <pre className="p-4 rounded-2xl bg-slate-900 dark:bg-[#041B15] border border-slate-800 dark:border-white/10 text-emerald-400 dark:text-[#D7FF35] font-mono text-[11px] overflow-x-auto max-h-72">
                {JSON.stringify(selectedDiff.diff, null, 2)}
              </pre>
            </div>

            <button
              type="button"
              onClick={() => setSelectedDiff(null)}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-white/10 dark:hover:bg-white/15 dark:text-white text-xs font-semibold transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
