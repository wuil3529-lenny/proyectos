const ESTADOS = {
  operativa:    { cls: "bg-gray-700/60 text-gray-300 border-gray-600/40",       label: "Operativa"     },
  planificado:  { cls: "bg-blue-900/40 text-blue-400 border-blue-800/30",       label: "Planificado"   },
  en_curso:     { cls: "bg-green-900/40 text-green-400 border-green-800/30",    label: "En Curso"      },
  parada:       { cls: "bg-purple-900/40 text-purple-400 border-purple-800/30", label: "Parada"        },
  mantenimiento:{ cls: "bg-yellow-900/40 text-yellow-400 border-yellow-800/30", label: "Mantenimiento" },
  falla:        { cls: "bg-red-900/40 text-red-400 border-red-800/30",          label: "Falla"         },
  critical:     { cls: "bg-red-500/20 text-red-400 border-red-500/30",          label: "Crítico"       },
  warning:      { cls: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", label: "Advertencia"   },
  info:         { cls: "bg-blue-500/20 text-blue-400 border-blue-500/30",       label: "Información"   },
};

export default function Badge({ value }) {
  const e = ESTADOS[value];
  const cls = e?.cls ?? "bg-gray-700 text-gray-300 border-gray-600";
  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${cls}`}>
      {e?.label ?? value}
    </span>
  );
}
