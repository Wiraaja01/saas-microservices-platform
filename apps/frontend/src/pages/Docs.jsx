export default function Docs() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">API Documentation</h1>
        <p className="text-gray-500">Integrate LinkForge AI into your applications</p>
      </div>

      <div className="space-y-6">
        <div className="card">
          <h2 className="text-xl font-semibold text-white mb-4">🔐 Authentication</h2>
          <p className="text-gray-400 mb-4">
            All API requests require an API key in the <code className="text-brand-400 bg-dark-900 px-1.5 py-0.5 rounded">x-api-key</code> header.
          </p>
          <pre className="bg-dark-900 border border-dark-600 rounded-lg p-4 text-xs font-mono text-gray-300 overflow-x-auto">
{`curl -X POST http://localhost:5000/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: sk-your-api-key-here" \\
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`}
          </pre>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold text-white mb-4">💬 Chat Completions</h2>
          <p className="text-gray-400 mb-4">
            <span className="badge-success mr-2">POST</span>
            <code className="text-brand-400">/v1/chat/completions</code>
          </p>

          <h3 className="text-sm font-semibold text-gray-300 mb-3 mt-6">Request Body</h3>
          <div className="bg-dark-900 border border-dark-600 rounded-lg p-4 mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-dark-600">
                  <th className="pb-2">Field</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Description</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-dark-700/50">
                  <td className="py-2 font-mono text-brand-400">model</td>
                  <td className="py-2 text-gray-400">string</td>
                  <td className="py-2 text-gray-400">Model ID (e.g., gpt-3.5-turbo)</td>
                </tr>
                <tr>
                  <td className="py-2 font-mono text-brand-400">messages</td>
                  <td className="py-2 text-gray-400">array</td>
                  <td className="py-2 text-gray-400">Array of message objects</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-sm font-semibold text-gray-300 mb-3">Rate Limits</h3>
          <p className="text-gray-400 text-sm">
            Default limit is <span className="text-brand-400">100 requests / 60 seconds</span> per API key. 
            Response headers include <code className="text-brand-400">X-RateLimit-Remaining</code> and <code className="text-brand-400">X-RateLimit-Limit</code>.
          </p>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold text-white mb-4">📊 Response Format</h2>
          <pre className="bg-dark-900 border border-dark-600 rounded-lg p-4 text-xs font-mono text-gray-300 overflow-x-auto">
{`{
  "id": "chatcmpl-1708392000000",
  "object": "chat.completion",
  "created": 1708392000,
  "model": "gpt-3.5-turbo",
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant",
      "content": "Hello! How can I help you today?"
    },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 20,
    "total_tokens": 30
  }
}`}
          </pre>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold text-white mb-4">⚠️ Error Codes</h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-3">
              <span className="badge-error">401</span>
              <span className="text-gray-400">Missing or invalid API key</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="badge-error">403</span>
              <span className="text-gray-400">API key revoked or inactive</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="badge-error">429</span>
              <span className="text-gray-400">Rate limit exceeded</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="badge-error">500</span>
              <span className="text-gray-400">Internal server error</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
