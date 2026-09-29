import Sidebar from './Sidebar.jsx';

export default function Layout({ children }) {
  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden bg-ink-50/40">
        <div className="max-w-7xl mx-auto p-8">{children}</div>
      </main>
    </div>
  );
}
