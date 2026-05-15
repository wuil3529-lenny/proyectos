import { useEffect, useState } from "react";
import { getMaquinas, actualizarMaquina } from "../services/api";
import Badge from "../components/Badge";
import toast from "react-hot-toast";

const ESTADOS_MAQ = {
  operativa:    { label: "Operativa",     cls: "bg-gray-700/60 text-gray-300 border-gray-600/40",       dot: "bg-gray-400"   },
  planificado:  { label: "Planificado",   cls: "bg-blue-900/40 text-blue-400 border-blue-800/30",       dot: "bg-blue-400"   },
  en_curso:     { label: "En Curso",      cls: "bg-green-900/40 text-green-400 border-green-800/30",    dot: "bg-green-400"  },
  parada:       { label: "Parada",        cls: "bg-purple-900/40 text-purple-400 border-purple-800/30", dot: "bg-purple-400" },
  mantenimiento:{ label: "Mantenimiento", cls: "bg-yellow-900/40 text-yellow-400 border-yellow-800/30", dot: "bg-yellow-400" },
  falla:        { label: "Falla",         cls: "bg-red-900/40 text-red-400 border-red-800/30",          dot: "bg-red-400"    },
};

export default function MaquinasPage() {
  const [maquinas, setMaquinas] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () =>
    getMaquinas()
      .then((r) => setMaquinas(r.data.filter((m) => !/^test/i.test(m.nombre?.trim()))))
      .catch(() => toast.error("Error al cargar máquinas"))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const cambiarEstado = async (id, estado) => {
    try {
      await actualizarMaquina(id, { estado });
      toast.success(`Estado actualizado: ${estado}`);
      load();
    } catch {
      toast.error("Error al actualizar");
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Máquinas</h1>
        <p className="text-gray-400 text-sm mt-0.5">{maquinas.length} máquinas registradas</p>
      </div>

      {loading ? (
        <div className="text-gray-400 animate-pulse">Cargando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {maquinas.map((m) => (
            <div key={m.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-white">{m.nombre}</h3>
                  <p className="text-xs text-gray-500">{m.tipo}</p>
                </div>
                {(() => { const cfg = ESTADOS_MAQ[m.estado] ?? ESTADOS_MAQ.operativa; return <span className={`text-xs font-medium border px-2 py-0.5 rounded-full ${cfg.cls}`}>{cfg.label}</span>; })()}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 mb-4">
                <div>
                  <span className="block text-gray-600">Ciclo estándar</span>
                  <span className="text-white font-medium">{m.tiempo_ciclo_estandar}s</span>
                </div>
                <div>
                  <span className="block text-gray-600">Total ciclos</span>
                  <span className="text-white font-medium">{m.ciclos_totales.toLocaleString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { key: "operativa",     label: "Operativa",     act: "text-gray-300 border-gray-500 bg-gray-700",          manual: true  },
                  { key: "planificado",   label: "Planificado",   act: "text-blue-300 border-blue-600 bg-blue-900/50",        manual: false, resp: "Planificación" },
                  { key: "en_curso",      label: "En Curso",      act: "text-green-300 border-green-600 bg-green-900/50",     manual: false, resp: "Inspector (arranque)" },
                  { key: "parada",        label: "Parada",        act: "text-purple-300 border-purple-600 bg-purple-900/50",  manual: false, resp: "Inspector" },
                  { key: "mantenimiento", label: "Mantenimiento", act: "text-yellow-300 border-yellow-600 bg-yellow-900/50",  manual: true  },
                  { key: "falla",         label: "Falla",         act: "text-red-300 border-red-600 bg-red-900/50",           manual: true  },
                ].map(({ key, label, act, manual, resp }) => (
                  <button
                    key={key}
                    onClick={() => {
                      if (m.estado === key) return;
                      if (!manual) {
                        toast.error(`Solo puede cambiar este estado: ${resp}`);
                        return;
                      }
                      cambiarEstado(m.id, key);
                    }}
                    className={`text-xs py-1.5 rounded-md border transition-colors ${
                      m.estado === key
                        ? act + " cursor-default"
                        : manual
                          ? "text-gray-400 border-gray-700 bg-gray-800 hover:bg-gray-700"
                          : "text-gray-600 border-gray-800 bg-gray-900 cursor-not-allowed opacity-50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
