export default function StatCard({ label, value, sub, color = "blue", icon }) {
  const colors = {
    blue:   "from-blue-600/20 to-blue-900/10 border-blue-800/50 text-blue-400",
    green:  "from-green-600/20 to-green-900/10 border-green-800/50 text-green-400",
    yellow: "from-yellow-600/20 to-yellow-900/10 border-yellow-800/50 text-yellow-400",
    red:    "from-red-600/20 to-red-900/10 border-red-800/50 text-red-400",
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-xl p-5`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</span>
        {icon && <span className="text-xl">{icon}</span>}
      </div>
      <p className={`text-3xl font-bold ${colors[color].split(" ")[3]}`}>{value ?? "—"}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}
