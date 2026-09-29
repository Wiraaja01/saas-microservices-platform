import { useEffect, useState } from 'react';
import { keysApi, playgroundApi } from '../api/client';

export default function Playground() {
  const [keys, setKeys] = useState([]);
  const [selectedKey, setSelectedKey] = useState('');
  const [model, setModel] = useState('gpt-3.5-turbo');
  const [prompt, setPrompt] = useState('Hello! Tell me a fun fact about Indonesia.');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [latency, setLatency] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    keysApi.list().then((res) => {
      const activeKeys = res.data.keys.filter((k) => k.isActive);
      setKeys(activeKeys);
      if (activeKeys.length > 0) setSelectedKey(activeKeys[0].key);
    });
  }, []);

  const handleSend = async () => {
    if (!selectedKey) {
      setError('Please create an API key first');
      return;
    }
    setLoading(true);
    setError('');
    setResponse(null);
    const start = Date.now();

    try {
      const res = await playgroundApi.chat(selectedKey, {
        model,
        messages: [{ role: 'user', content: prompt }],
      });
      setLatency(Date.now() - start);
      setResponse(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-ink-900 mb-2">Playground</h1>
        <p className="text-ink-500">Test your API keys with live requests</p>
      </div>

      {keys.length === 0 ? (
        <div className="card border-yellow-200 bg-yellow-50">
          <p className="text-yellow-800">
            ⚠️ You don't have any active API keys yet. Create one in the{' '}
            <a href="/keys" className="underline font-medium">API Keys</a> page first.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-lg font-semibold text-ink-900 mb-4">Request</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-2">API Key</label>
                <select className="input-field" value={selectedKey} onChange={(e) => setSelectedKey(e.target.value)}>
                  {keys.map((k) => (
                    <option key={k.id} value={k.key}>
                      {k.name} ({k.key.slice(0, 12)}...)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-700 mb-2">Model</label>
                <select className="input-field" value={model} onChange={(e) => setModel(e.target.value)}>
                  <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
                  <option value="gpt-4">gpt-4</option>
                  <option value="claude-3-sonnet">claude-3-sonnet</option>
                  <option value="gemini-pro">gemini-pro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-700 mb-2">Prompt</label>
                <textarea
                  className="input-field font-mono text-sm"
                  rows={8}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
              </div>

              <button onClick={handleSend} className="btn-primary w-full" disabled={loading}>
                {loading ? 'Sending...' : '▶ Send Request'}
              </button>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-ink-900">Response</h2>
              {latency !== null && <span className="badge-success"> {latency} ms</span>}
            </div>

            {response ? (
              <div className="space-y-4">
                <div className="bg-ink-50 border border-ink-200 rounded-lg p-4">
                  <p className="text-xs text-ink-500 mb-2">Assistant:</p>
                  <p className="text-ink-900 whitespace-pre-wrap">
                    {response.choices?.[0]?.message?.content}
                  </p>
                </div>

                <details className="bg-ink-50 border border-ink-200 rounded-lg">
                  <summary className="p-3 text-sm text-ink-500 cursor-pointer hover:text-ink-800">
                    Raw JSON Response
                  </summary>
                  <pre className="p-4 text-xs font-mono text-ink-700 overflow-x-auto border-t border-ink-200">
                    {JSON.stringify(response, null, 2)}
                  </pre>
                </details>

                {response.usage && (
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div className="bg-ink-50 border border-ink-200 rounded-lg p-3 text-center">
                      <p className="text-ink-500 text-xs mb-1">Prompt</p>
                      <p className="text-ink-900 font-semibold">{response.usage.prompt_tokens}</p>
                    </div>
                    <div className="bg-ink-50 border border-ink-200 rounded-lg p-3 text-center">
                      <p className="text-ink-500 text-xs mb-1">Completion</p>
                      <p className="text-ink-900 font-semibold">{response.usage.completion_tokens}</p>
                    </div>
                    <div className="bg-brand-50 border border-brand-200 rounded-lg p-3 text-center">
                      <p className="text-brand-600 text-xs mb-1">Total</p>
                      <p className="text-brand-700 font-semibold">{response.usage.total_tokens}</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-16">
                <p className="text-4xl mb-3"> Hello </p>
                <p className="text-ink-500 text-sm">
                  Send a request to see the response here
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}