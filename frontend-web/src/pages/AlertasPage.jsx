import { useEffect, useState, useRef } from "react";
import { getAlertas, resolverAlerta, crearAlerta, getMaquinas } from "../services/api";
import Badge from "../components/Badge";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

const PUEDE_RESOLVER = ["admin", "jefe_produccion", "jefe_calidad"];

// ── Countdown ─────────────────────────────────────────────────────
function Countdown({ fechaGeneracion, horasEstimadas }) {
  const [restante, setRestante] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    const calcular = () => {
      // Añadir Z para forzar parsing como UTC (backend devuelve sin zona horaria)
      const fechaUTC = fechaGeneracion.endsWith("Z") ? fechaGeneracion : fechaGeneracion + "Z";
      const inicio = new Date(fechaUTC).getTime();
      const limite = inicio + horasEstimadas * 3600 * 1000;
      setRestante(limite - Date.now());
    };
    calcular();
    ref.current = setInterval(calcular, 1000);
    return () => clearInterval(ref.current);
  }, [fechaGeneracion, horasEstimadas]);

  if (restante === null) return null;

  if (restante <= 0) {
    return (
      <span className="text-xs font-medium text-red-400 bg-red-900/30 border border-red-700/40 px-2 py-0.5 rounded">
        ⏰ Tiempo vencido
      </span>
    );
  }

  const d = Math.floor(restante / 86400000);
  const h = Math.floor((restante % 86400000) / 3600000);
  const m = Math.floor((restante % 3600000) / 60000);
  const s = Math.floor((restante % 60000) / 1000);

  const texto = d > 0
    ? `${d}d ${h}h ${m.toString().padStart(2,"0")}m`
    : h > 0
    ? `${h}h ${m.toString().padStart(2,"0")}m ${s.toString().padStart(2,"0")}s`
    : `${m}m ${s.toString().padStart(2,"0")}s`;

  const pct = Math.max(0, Math.min(100, (restante / (horasEstimadas * 3600000)) * 100));
  const color = pct > 50 ? "text-green-400" : pct > 20 ? "text-yellow-400" : "text-red-400";
  const bg    = pct > 50 ? "bg-green-900/20 border-green-700/30" : pct > 20 ? "bg-yellow-900/20 border-yellow-700/30" : "bg-red-900/20 border-red-700/30";

  return (
    <span className={`text-xs font-medium ${color} ${bg} border px-2 py-0.5 rounded`}>
      ⏱ {texto}
    </span>
  );
}


// ── Modal crear alerta ────────────────────────────────────────────
function ModalNuevaAlerta({ maquinas, onClose, onCreada }) {
  const [form, setForm] = useState({
    descripcion: "",
    nivel: "warning",
    tipo: "",
    maquina_id: "",
    tipo_rechazo: "",
    tiempo_estimado_horas: "",
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await crearAlerta({
        descripcion: form.descripcion,
        nivel: form.nivel,
        tipo: form.tipo || (form.tipo_rechazo ? "falla" : "general"),
        maquina_id: form.maquina_id ? Number(form.maquina_id) : null,
        tipo_rechazo: form.tipo_rechazo || null,
        tiempo_estimado_horas: form.tiempo_estimado_horas ? Number(form.tiempo_estimado_horas) : null,
      });
      toast.success("Alerta creada ✓");
      onCreada();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail ?? "Error al crear alerta");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h3 className="font-semibold text-white">Nueva Alerta</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Descripción *</label>
            <textarea
              required
              rows={2}
              value={form.descripcion}
              onChange={(e) => set("descripcion", e.target.value)}
              placeholder="Describe el problema o situación..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Nivel *</label>
              <select
                value={form.nivel}
                onChange={(e) => set("nivel", e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="info">Información</option>
                <option value="warning">Advertencia</option>
                <option value="critical">Crítico</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Máquina</label>
              <select
                value={form.maquina_id}
                onChange={(e) => set("maquina_id", e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="">Sin máquina</option>
                {maquinas.map((m) => (
                  <option key={m.id} value={m.id}>{m.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Tipo de Falla</label>
              <input
                type="text"
                value={form.tipo_rechazo}
                onChange={(e) => set("tipo_rechazo", e.target.value)}
                placeholder="Ej: falla eléctrica..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Tiempo estimado (horas)</label>
              <input
                type="number"
                min="1"
                value={form.tiempo_estimado_horas}
                onChange={(e) => set("tiempo_estimado_horas", e.target.value)}
                placeholder="Ej: 48"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="bg-blue-900/20 border border-blue-800/30 rounded-lg p-3">
            <p className="text-xs text-blue-400">
              🤖 La IA asignará esta alerta automáticamente al responsable según el tipo y nivel.
            </p>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
              {saving ? "Creando…" : "Crear Alerta"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal resolver ────────────────────────────────────────────────
function ModalResolver({ alerta, maquinaNombre, onClose, onConfirmar }) {
  const { usuario } = useAuth();
  const [notas, setNotas] = useState("");
  const [saving, setSaving] = useState(false);
  const [ahora, setAhora] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!notas.trim()) return;
    setSaving(true);
    await onConfirmar(alerta.id, notas.trim());
    setSaving(false);
  };

  const horaVE = ahora.toLocaleString("es-VE", { timeZone: "America/Caracas" });

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h3 className="font-semibold text-white">Resolver Alerta</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Descripción */}
          <div className="bg-gray-800/60 border border-gray-700 rounded-lg px-4 py-3">
            <p className="text-xs text-gray-500 mb-0.5">Descripción de la falla</p>
            <p className="text-sm text-gray-200">{alerta.descripcion}</p>
          </div>

          {/* Datos del evento */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-800/40 border border-gray-700/50 rounded-lg px-3 py-2.5">
              <p className="text-xs text-gray-500 mb-0.5">Equipo afectado</p>
              <p className="text-sm text-blue-300 font-medium">
                {alerta.maquina_id ? maquinaNombre(alerta.maquina_id) : <span className="text-gray-600 italic">Sin equipo</span>}
              </p>
            </div>
            <div className="bg-gray-800/40 border border-gray-700/50 rounded-lg px-3 py-2.5">
              <p className="text-xs text-gray-500 mb-0.5">Resuelto por</p>
              <p className="text-sm text-white font-medium truncate">{usuario?.nombre_completo ?? usuario?.email}</p>
            </div>
            <div className="col-span-2 bg-gray-800/40 border border-gray-700/50 rounded-lg px-3 py-2.5 flex items-center justify-between">
              <p className="text-xs text-gray-500">Hora de resolución</p>
              <p className="text-sm text-green-400 font-mono font-medium">{horaVE}</p>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">¿Cómo se resolvió? *</label>
            <textarea
              required
              rows={3}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Describe la acción tomada para resolver la alerta..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-green-500 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving || !notas.trim()} className="flex-1 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
              {saving ? "Resolviendo…" : "Confirmar Resolución"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


// ── Tarjeta de alerta ─────────────────────────────────────────────
function AlertaCard({ a, maquinaNombre, onResolver, puedeResolver }) {
  const nivelIcon = { critical: "🔴", warning: "🟡", info: "🔵" };
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 flex items-start gap-4">
      <span className="text-xl mt-0.5">{nivelIcon[a.nivel] ?? "⚪"}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center flex-wrap gap-2 mb-1">
          <Badge value={a.nivel} />
          {a.tipo && <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">{a.tipo}</span>}
          {a.tipo_rechazo && (
            <span className="text-xs bg-red-900/30 text-red-400 border border-red-800/30 px-2 py-0.5 rounded">
              Falla: {a.tipo_rechazo}
            </span>
          )}
          {a.maquina_id && (
            <span className="text-xs bg-gray-800 text-blue-400 px-2 py-0.5 rounded">
              {maquinaNombre(a.maquina_id)}
            </span>
          )}
          {a.tiempo_estimado_horas && (
            <Countdown fechaGeneracion={a.fecha_generacion} horasEstimadas={a.tiempo_estimado_horas} />
          )}
        </div>
        <p className="text-sm text-gray-200">{a.descripcion}</p>
        <p className="text-xs text-gray-500 mt-1">
          {new Date(a.fecha_generacion + "Z").toLocaleString("es-VE", { timeZone: "America/Caracas" })}
        </p>
      </div>
      {puedeResolver && (
        <button
          onClick={() => onResolver(a.id)}
          className="shrink-0 bg-green-600/20 hover:bg-green-600/40 text-green-400 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors border border-green-600/30"
        >
          Resolver
        </button>
      )}
    </div>
  );
}

function ResueltaCard({ a, maquinaNombre }) {
  const [expandida, setExpandida] = useState(false);
  const nivelIcon = { critical: "🔴", warning: "🟡", info: "🔵" };
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-start gap-4 opacity-80">
      <span className="text-xl mt-0.5">{nivelIcon[a.nivel] ?? "⚪"}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center flex-wrap gap-2 mb-1">
          <Badge value={a.nivel} />
          {a.tipo && <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">{a.tipo}</span>}
          {a.tipo_rechazo && (
            <span className="text-xs bg-gray-800 text-gray-400 border border-gray-700 px-2 py-0.5 rounded">
              Falla: {a.tipo_rechazo}
            </span>
          )}
          {a.maquina_id && (
            <span className="text-xs bg-gray-800 text-blue-400 px-2 py-0.5 rounded">
              {maquinaNombre(a.maquina_id)}
            </span>
          )}
          <span className="text-xs bg-green-900/30 text-green-400 border border-green-800/30 px-2 py-0.5 rounded">
            ✓ Resuelta
          </span>
        </div>
        <p className="text-sm text-gray-300">{a.descripcion}</p>
        <p className="text-xs text-gray-600 mt-1">
          Creada: {new Date(a.fecha_generacion + "Z").toLocaleString("es-VE", { timeZone: "America/Caracas" })}
        </p>

        {/* Botón expandir */}
        <button
          onClick={() => setExpandida((v) => !v)}
          className="mt-2 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          <span className={`transition-transform duration-200 ${expandida ? "rotate-90" : ""}`}>▶</span>
          {expandida ? "Ocultar información" : "Más información"}
        </button>

        {/* Panel de resolución */}
        {expandida && (
          <div className="mt-2 bg-gray-800/60 border border-gray-700/50 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-24 shrink-0">Resuelto por:</span>
              <span className="text-xs text-white font-medium">
                {a.nombre_resolvio ?? <span className="text-gray-600 italic">No registrado</span>}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-24 shrink-0">Hora resolución:</span>
              <span className="text-xs text-green-400">
                {a.fecha_resolucion
                  ? new Date(a.fecha_resolucion + "Z").toLocaleString("es-VE", { timeZone: "America/Caracas" })
                  : <span className="text-gray-600 italic">—</span>}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-xs text-gray-500 w-24 shrink-0 pt-0.5">Acción tomada:</span>
              <span className="text-xs text-gray-200">
                {a.notas_resolucion ?? <span className="text-gray-600 italic">Sin notas registradas</span>}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────
export default function AlertasPage() {
  const [alertas, setAlertas] = useState([]);
  const [maquinas, setMaquinas] = useState([]);
  const [tab, setTab] = useState("activas"); // "activas" | "realizadas"
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [alertaAResolver, setAlertaAResolver] = useState(null);
  const { usuario } = useAuth();

  const maquinaNombre = (id) => {
    const m = maquinas.find((m) => m.id === id || m.id === Number(id));
    return m ? m.nombre : `Máq. ${id}`;
  };

  const load = () =>
    getAlertas(false)
      .then((r) => setAlertas(r.data))
      .catch(() => toast.error("Error al cargar alertas"))
      .finally(() => setLoading(false));

  useEffect(() => {
    Promise.all([getMaquinas(), load()])
      .then(([r]) => setMaquinas(r.data));
  }, []);

  const resolver = async (id, notas) => {
    try {
      await resolverAlerta(id, notas);
      toast.success("Alerta resuelta ✓");
      setAlertaAResolver(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail ?? "Error");
    }
  };

  const activas    = alertas.filter((a) => !a.resuelta);
  const realizadas = alertas.filter((a) => a.resuelta);
  const puedeResolver = PUEDE_RESOLVER.includes(usuario?.rol);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Alertas</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Nueva Alerta
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
        <button
          onClick={() => setTab("activas")}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            tab === "activas"
              ? "bg-red-600/20 text-red-400 border border-red-600/30"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Activas
          {activas.length > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">
              {activas.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("realizadas")}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            tab === "realizadas"
              ? "bg-green-600/20 text-green-400 border border-green-600/30"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Realizadas
          {realizadas.length > 0 && (
            <span className="bg-gray-600 text-gray-300 text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">
              {realizadas.length}
            </span>
          )}
        </button>
      </div>

      {/* Contenido */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-gray-400 animate-pulse py-8 text-center">Cargando...</div>
        ) : tab === "activas" ? (
          activas.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl py-12 text-center text-gray-500">
              ✅ Sin alertas activas
            </div>
          ) : (
            activas.map((a) => (
              <AlertaCard
                key={a.id}
                a={a}
                maquinaNombre={maquinaNombre}
                onResolver={(id) => setAlertaAResolver(a)}
                puedeResolver={puedeResolver}
              />
            ))
          )
        ) : (
          realizadas.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl py-12 text-center text-gray-500">
              Sin alertas realizadas
            </div>
          ) : (
            realizadas.map((a) => (
              <ResueltaCard key={a.id} a={a} maquinaNombre={maquinaNombre} />
            ))
          )
        )}
      </div>

      {showModal && (
        <ModalNuevaAlerta
          maquinas={maquinas}
          onClose={() => setShowModal(false)}
          onCreada={load}
        />
      )}

      {alertaAResolver && (
        <ModalResolver
          alerta={alertaAResolver}
          maquinaNombre={maquinaNombre}
          onClose={() => setAlertaAResolver(null)}
          onConfirmar={resolver}
        />
      )}
    </div>
  );
}
