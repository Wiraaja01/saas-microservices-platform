import { useEffect, useState } from 'react';
import { keysApi } from '../api/client';

export default function ApiKeys() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [revealedKey, setRevealedKey] = useState(null);

  const fetchKeys = async () => {
    try {
      const res = await keysApi.list();
      setKeys(res.data.keys);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchKeys(); }, []);

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    setCreating(true);
    try {
      const res = await keysApi.create({ name: newKeyName });
      setRevealedKey(res.data.apiKey.key);
      setNewKeyName('');
      fetchKeys();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create key');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id) => {
    if (!confirm('Revoke this API key? This action cannot be undone.')) return;
    try {
      await keysApi.revoke(id);
      fetchKeys();
    } catch (err) {
      alert('Failed to revoke key');
    }
  };

  const copyToClipboard = (text) => navigator.clipboard.writeText(text);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-ink-900 mb-2">API Keys</h1>
        <p className="text-ink-500">Manage your API keys for authentication</p>
      </div>

      {revealedKey && (
        <div className="card mb-6 border-brand-200 bg-brand-50">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <h3 className="font-semibold text-brand-700 mb-1">Save this key now</h3>
              <p className="text-sm text-ink-600 mb-3">
                This is the only time you'll see the full key. Store it safely.
              </p>
              <div className="flex items-center gap-2 bg-white border border-brand-200 rounded-lg p-3">
                <code className="flex-1 font-mono text-sm text-brand-700 break-all">
                  {revealedKey}
                </code>
                <button onClick={() => copyToClipboard(revealedKey)} className="btn-secondary text-xs">
                  Copy
                </button>
              </div>
              <button onClick={() => setRevealedKey(null)} className="mt-3 text-xs text-ink-500 hover:text-ink-700">
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-ink-900 mb-4">Create New Key</h2>
        <div className="flex gap-3">
          <input
            type="text"
            className="input-field flex-1"
            placeholder="e.g., Production App"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
          />
          <button onClick={handleCreate} className="btn-primary" disabled={creating}>
            {creating ? 'Creating...' : '+ Generate'}
          </button>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-ink-900 mb-4">Your Keys ({keys.length})</h2>
        {loading ? (
          <p className="text-ink-500">Loading...</p>
        ) : keys.length === 0 ? (
          <p className="text-ink-500 text-center py-8">No API keys yet. Create your first one above.</p>
        ) : (
          <div className="space-y-3">
            {keys.map((key) => (
              <div key={key.id} className="flex items-center justify-between p-4 bg-ink-50 border border-ink-200 rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <p className="font-medium text-ink-900">{key.name}</p>
                    {key.isActive ? (
                      <span className="badge-success">Active</span>
                    ) : (
                      <span className="badge-error">Revoked</span>
                    )}
                  </div>
                  <code className="font-mono text-xs text-ink-500">
                    {key.key.slice(0, 12)}••••••••••••{key.key.slice(-4)}
                  </code>
                  <p className="text-xs text-ink-400 mt-1">
                    Created {new Date(key.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {key.isActive && (
                  <button onClick={() => handleRevoke(key.id)} className="btn-danger">
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
