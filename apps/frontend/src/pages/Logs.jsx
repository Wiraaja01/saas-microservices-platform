import { useEffect, useState } from 'react';
import { analyticsApi } from '../api/client';

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    analyticsApi
      .summary()
      .then((res) => setLogs(res.data.recentLogs))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = logs.filter((log) => {
    if (filter === 'success') return log.statusCode < 400;
    if (filter === 'error') return log.statusCode >= 400;
    return true;
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Usage Logs</h1>
        <p className="text-gray-500">Recent API requests across all your keys</p>
      </div>

      <div className="card mb-6">
        <div className="flex gap-2">
          {['all', 'success', 'error'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === f
                  ? 'bg-brand-500/10 text-brand-400 border border-brand-500/30'
                  : 'text-gray-400 hover:bg-dark-700 border border-transparent'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        {loading ? (
          <p className="text-gray-500">Loading logs...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">📝</p>
            <p className="text-gray-500">No logs available</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-dark-600">
                  <th className="pb-3 font-medium">Endpoint</th>
                  <th className="pb-3 font-medium">Method</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Latency</th>
                  <th className="pb-3 font-medium">Model</th>
                  <th className="pb-3 font-medium">Tokens</th>
                  <th className="pb-3 font-medium">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => (
                  <tr key={log.id} className="border-b border-dark-700/50 last:border-0 hover:bg-dark-700/30">
                    <td className="py-3 font-mono text-xs text-gray-300">{log.endpoint}</td>
                    <td className="py-3">
                      <span className="text-xs font-mono text-brand-400">{log.method}</span>
                    </td>
                    <td className="py-3">
                      <span className={log.statusCode < 400 ? 'badge-success' : 'badge-error'}>
                        {log.statusCode}
                      </span>
                    </td>
                    <td className="py-3 text-gray-400">{log.latencyMs} ms</td>
                    <td className="py-3 text-gray-400 text-xs">{log.model || '-'}</td>
                    <td className="py-3 text-gray-400">{log.tokensUsed}</td>
                    <td className="py-3 text-gray-500 text-xs">
                      {new Date(log.createdAt).toLocaleString()}
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
