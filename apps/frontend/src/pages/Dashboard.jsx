import { useEffect, useState } from 'react';
import { analyticsApi } from '../api/client';
import StatCard from '../components/Statcard.jsx';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [daily, setDaily] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([analyticsApi.summary(), analyticsApi.daily()])
      .then(([s, d]) => {
        setSummary(s.data);
        setDaily(d.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-ink-500">Loading dashboard...</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-ink-900 mb-2">Dashboard</h1>
        <p className="text-ink-500">Overview of your API usage and performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard title="Total Requests" value={summary?.totalRequests?.toLocaleString() || '0'} subtitle="All time" icon="📊" />
        <StatCard title="Avg Latency" value={`${summary?.avgLatencyMs || 0} ms`} subtitle="Last 100 requests" icon="⚡" />
        <StatCard title="Tokens Used" value={summary?.totalTokens?.toLocaleString() || '0'} subtitle="Last 100 requests" icon="🎯" />
      </div>

      <div className="card mb-8">
        <h2 className="text-lg font-semibold text-ink-900 mb-6">Requests (Last 7 Days)</h2>
        {daily.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: 12 }} />
              <YAxis stroke="#64748b" style={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  color: '#0f172a',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#2563eb"
                strokeWidth={2}
                dot={{ fill: '#2563eb', r: 4 }}
                activeDot={{ r: 6, fill: '#1d4ed8' }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-ink-500 text-center py-12">
            No data yet. Make your first API request to see analytics.
          </p>
        )}
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-ink-900 mb-4">Recent Activity</h2>
        {summary?.recentLogs?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-500 border-b border-ink-200">
                  <th className="pb-3 font-medium">Endpoint</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Latency</th>
                  <th className="pb-3 font-medium">Model</th>
                  <th className="pb-3 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {summary.recentLogs.slice(0, 5).map((log) => (
                  <tr key={log.id} className="border-b border-ink-100 last:border-0">
                    <td className="py-3 font-mono text-xs text-ink-700">{log.endpoint}</td>
                    <td className="py-3">
                      <span className={log.statusCode < 400 ? 'badge-success' : 'badge-error'}>
                        {log.statusCode}
                      </span>
                    </td>
                    <td className="py-3 text-ink-600">{log.latencyMs} ms</td>
                    <td className="py-3 text-ink-600">{log.model || '-'}</td>
                    <td className="py-3 text-ink-500 text-xs">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-ink-500 text-center py-8">No recent activity</p>
        )}
      </div>
    </div>
  );
}
