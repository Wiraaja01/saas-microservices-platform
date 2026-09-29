export default function StatCard({ title, value, subtitle, icon, trend }) {
  return (
    <div className="card card-hover">
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center text-xl">
          {icon}
        </div>
        {trend && (
          <span className={trend > 0 ? 'badge-success' : 'badge-error'}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-sm text-ink-500 mb-1">{title}</p>
      <p className="text-3xl font-bold text-ink-900 mb-1">{value}</p>
      {subtitle && <p className="text-xs text-ink-400">{subtitle}</p>}
    </div>
  );
}
