import { useEffect, useState, useRef } from "react";
import { getMaquinas, getPlan, getPedidos, getProductos, getCierresTurno, crearCierreTurno, getMediciones, crearMedicion } from "../services/api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { formatPesoG, formatPesoKg, soloKg } from "../utils/peso";

// ── Constantes ─────────────────────────────────────────────────────
const TIPOS_DEFECTO = [
  "Rebaba", "Quemado", "Deformación", "Corte incompleto",
  "Manchas", "Burbujas", "Fractura", "Peso fuera de rango",
  "Color incorrecto", "Rayaduras", "Otro",
];

const MOTIVOS_PARADA = [
  "Falla eléctrica", "Falla mecánica", "Falla neumática",
  "Mantenimiento preventivo", "Cambio de molde",
  "Falta de material", "Ajuste de proceso", "Otro",
];

// Horas de cierre en hora VE (America/Caracas UTC-4)
const TURNOS = [
  { key: "diurno",        nombre: "Diurno",         hora: 6,  horaFin: 14, label: "06:00 AM – 02:00 PM" },
  { key: "mixto",         nombre: "Mixto",          hora: 14, horaFin: 22, label: "02:00 PM – 10:00 PM" },
  { key: "nocturno",      nombre: "Nocturno",       hora: 22, horaFin: 6,  label: "10:00 PM – 06:00 AM" },
  { key: "administrativo",nombre: "Administrativo", hora: 8,  horaFin: 17, label: "08:00 AM – 05:00 PM" },
];
const CIERRES_HORAS = TURNOS.map((t) => t.horaFin);
const TURNO_NOMBRE = Object.fromEntries(TURNOS.map((t) => [t.horaFin, t.nombre]));
const TURNO_KEY = Object.fromEntries(TURNOS.map((t) => [t.horaFin, t.key]));

function ahoraVE() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Caracas" }));
}

function fechaVE(date = new Date()) {
  const d = new Date(date.toLocaleString("en-US", { timeZone: "America/Caracas" }));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function proximoCierre() {
  const now = ahoraVE();
  const h = now.getHours() * 60 + now.getMinutes();
  const cierreMin = CIERRES_HORAS.map((c) => c * 60);
  const next = cierreMin.find((c) => c > h) ?? cierreMin[0] + 24 * 60;
  const diffMs = (next - h) * 60 * 1000 - now.getSeconds() * 1000;
  const horaProxima = CIERRES_HORAS.find((c) => c * 60 === (next % (24 * 60))) ?? CIERRES_HORAS[0];
  return { diffMs, horaProxima };
}

function formatMs(ms) {
  if (ms <= 0) return "00:00:00";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

// ── Banner próximo cierre ──────────────────────────────────────────
function BannerCierre() {
  const [info, setInfo] = useState(() => proximoCierre());
  const [reloj, setReloj] = useState(() => ahoraVE());

  useEffect(() => {
    const t = setInterval(() => {
      setInfo(proximoCierre());
      setReloj(ahoraVE());
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const { diffMs, horaProxima } = info;
  const urgent = diffMs < 30 * 60 * 1000; // <30 min
  const turnoLabel = TURNO_NOMBRE[horaProxima] ?? `${horaProxima}:00`;
  const horaStr = `${String(horaProxima).padStart(2,"0")}:00 ${horaProxima < 12 ? "AM" : "PM"}`;

  return (
    <div className={`rounded-2xl border px-6 py-4 flex items-center justify-between ${
      urgent ? "bg-orange-900/20 border-orange-700/40" : "bg-gray-900 border-gray-800"
    }`}>
      <div>
        <p className="text-xs text-gray-500 mb-0.5">Próximo cierre de turno</p>
        <div className="flex items-center gap-3">
          <span className={`text-lg font-bold ${urgent ? "text-orange-400" : "text-white"}`}>
            Turno {turnoLabel}
          </span>
          <span className="text-sm text-gray-500">{horaStr}</span>
        </div>
      </div>
      <div className="text-right">
        <p className="text-xs text-gray-500 mb-0.5">Faltan</p>
        <span className={`text-2xl font-mono font-bold ${
          urgent ? "text-orange-400" : diffMs < 3600000 ? "text-yellow-400" : "text-green-400"
        }`}>
          {formatMs(diffMs)}
        </span>
      </div>
      <div className="text-right hidden md:block">
        <p className="text-xs text-gray-500 mb-0.5">Hora actual (VE)</p>
        <span className="text-lg font-mono text-gray-300">
          {reloj.toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </span>
      </div>
    </div>
  );
}


// ── Modal Cierre de Turno ─────────────────────────────────────────
function ModalCierre({ maquina, plan, medicionesExistentes = [], onClose, onGuardado }) {
  const { usuario } = useAuth();
  const now = ahoraVE();
  const h = now.getHours();
  const turnoActual = (() => {
    if (h >= 6 && h < 14) return "diurno";
    if (h >= 14 && h < 22) return "mixto";
    return "nocturno";
  })();

  const [form, setForm] = useState({
    operador_nombre: "",
    envases_buenos: "",
    turno: turnoActual,
  });
  const [defectos, setDefectos] = useState([]);
  const [paradas, setParadas] = useState([]);

  const addParada = () => setParadas((p) => [...p, { hora_inicio: "", hora_fin: "", motivo: MOTIVOS_PARADA[0] }]);
  const removeParada = (i) => setParadas((p) => p.filter((_, j) => j !== i));
  const setParada = (i, k, v) => setParadas((p) => p.map((x, j) => j === i ? { ...x, [k]: v } : x));
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const addDefecto = () => setDefectos((d) => [...d, { tipo: TIPOS_DEFECTO[0] }]);
  const removeDefecto = (i) => setDefectos((d) => d.filter((_, j) => j !== i));
  const setDefecto = (i, k, v) => setDefectos((d) => d.map((x, j) => j === i ? { ...x, [k]: v } : x));

  const totalRechazo = defectos.length;
  const totalProducido = (Number(form.envases_buenos) || 0) + totalRechazo;
  const pctRechazo = totalProducido > 0 ? ((totalRechazo / totalProducido) * 100).toFixed(1) : "0.0";

  // Total minutos de parada registrados
  const minutosParada = paradas.reduce((acc, p) => {
    if (!p.hora_inicio || !p.hora_fin) return acc;
    const [hI, mI] = p.hora_inicio.split(":").map(Number);
    const [hF, mF] = p.hora_fin.split(":").map(Number);
    let diff = (hF * 60 + mF) - (hI * 60 + mI);
    if (diff < 0) diff += 24 * 60;
    return acc + diff;
  }, 0);

  // Producción teórica: tiempo efectivo (transcurrido − paradas) × piezas/hora
  const calcTeorico = (() => {
    const ultimaMed = medicionesExistentes.find((m) => m.tiempo_ciclo_seg);
    const tiempoCiclo = ultimaMed?.tiempo_ciclo_seg;
    const cavidades = plan?.cavidades_arranque ?? ultimaMed?.cavidades ?? 1;
    if (!tiempoCiclo) return null;

    const TURNO_INICIO = { diurno: 6, mixto: 14, nocturno: 22, administrativo: 8 };
    const inicioHora = TURNO_INICIO[form.turno] ?? 6;
    const nowVE = ahoraVE();

    let inicioTurno = new Date(nowVE);
    inicioTurno.setHours(inicioHora, 0, 0, 0);
    if (inicioTurno > nowVE) inicioTurno.setDate(inicioTurno.getDate() - 1);

    let inicioProduccion = inicioTurno;
    if (plan?.hora_arranque) {
      const arranqueDate = new Date(plan.hora_arranque + (plan.hora_arranque.endsWith("Z") ? "" : "Z"));
      const arranqueVE = new Date(arranqueDate.toLocaleString("en-US", { timeZone: "America/Caracas" }));
      if (arranqueVE > inicioTurno) inicioProduccion = arranqueVE;
    }

    const minTranscurridos = Math.max(0, (nowVE - inicioProduccion) / 60000);
    const piezasPorMin = (cavidades * 60) / tiempoCiclo;
    // Teórico = tiempo total transcurrido (paradas no lo bajan, son pérdidas visibles)
    const teorico = Math.round(minTranscurridos * piezasPorMin);

    return {
      teorico,
      minTranscurridos: Math.round(minTranscurridos),
      piezasPorMin,
      cavidades,
      tiempoCiclo,
    };
  })();

  const produccionTeorica = calcTeorico?.teorico ?? null;

  // Tiempo adicional para completar el pedido por paradas
  const tiempoAdicionalMin = (() => {
    if (!calcTeorico || !plan) return null;
    const faltante = (() => {
      const medConFaltante = medicionesExistentes.find((m) => m.faltante != null);
      return medConFaltante?.faltante ?? null;
    })();
    if (faltante == null) return null;
    // Minutos extra = minutosParada × (faltante / producidoHastaAhora) — o simplemente minutosParada
    return minutosParada;
  })();

  const eficiencia = produccionTeorica && totalProducido > 0
    ? Math.min(((totalProducido / produccionTeorica) * 100).toFixed(1), 999)
    : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await crearCierreTurno({
        maquina_id: maquina.id,
        plan_id: plan?.id ?? null,
        turno: form.turno,
        fecha_turno: fechaVE(),
        operador_nombre: form.operador_nombre,
        envases_buenos: Number(form.envases_buenos),
        defectos: defectos.map((d) => ({ tipo: d.tipo, cantidad: 1 })),
        paradas: paradas.filter((p) => p.hora_inicio && p.hora_fin),
      });
      toast.success("Cierre de turno registrado ✓");
      window.dispatchEvent(new CustomEvent("datos:updated"));
      onGuardado();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail ?? "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg my-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div>
            <h3 className="font-semibold text-white">Cierre de Turno</h3>
            <p className="text-xs text-blue-400 mt-0.5">{maquina.nombre} · {plan?.producto_nombre ?? "Sin pedido asignado"}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Turno */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Turno *</label>
              <select
                value={form.turno}
                onChange={(e) => set("turno", e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              >
                {TURNOS.map((t) => (
                  <option key={t.key} value={t.key}>{t.nombre} ({t.label})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Inspector</label>
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300">
                {usuario?.nombre_completo}
              </div>
            </div>
          </div>

          {/* Operador */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Operador que trabajó en la máquina *</label>
            <input
              required
              type="text"
              value={form.operador_nombre}
              onChange={(e) => set("operador_nombre", e.target.value)}
              placeholder="Nombre completo del operador..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Envases */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Envases buenos fabricados *</label>
            <input
              required
              type="number"
              min="0"
              value={form.envases_buenos}
              onChange={(e) => set("envases_buenos", e.target.value)}
              placeholder="0"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Defectos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-400">Defectos / Rechazos</label>
              <button
                type="button"
                onClick={addDefecto}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                + Agregar defecto
              </button>
            </div>
            <div className="space-y-2">
              {defectos.map((d, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <select
                    value={d.tipo}
                    onChange={(e) => setDefecto(i, "tipo", e.target.value)}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-red-500"
                  >
                    {TIPOS_DEFECTO.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeDefecto(i)}
                    className="text-gray-600 hover:text-red-400 text-lg leading-none transition-colors"
                  >×</button>
                </div>
              ))}
              {defectos.length === 0 && (
                <p className="text-xs text-gray-600 italic">Sin defectos registrados</p>
              )}
            </div>
          </div>

          {/* Resumen */}
          {form.envases_buenos !== "" && (
            <div className="space-y-3">
              {/* Fila 1: buenos / rechazados / % rechazo */}
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Buenos</p>
                  <p className="text-lg font-bold text-green-400">{Number(form.envases_buenos) || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Rechazados</p>
                  <p className="text-lg font-bold text-red-400">{totalRechazo}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">% Rechazo</p>
                  <p className={`text-lg font-bold ${Number(pctRechazo) > 5 ? "text-orange-400" : "text-gray-300"}`}>
                    {pctRechazo}%
                  </p>
                </div>
              </div>

              {/* Fila 2: eficiencia vs teórico */}
              {produccionTeorica !== null && (
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 space-y-3">
                  <p className="text-xs text-gray-500 font-medium">Eficiencia del turno</p>

                  {/* Paradas impact */}
                  {minutosParada > 0 && (
                    <div className="bg-amber-900/20 border border-amber-700/30 rounded-lg px-3 py-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-amber-400 text-sm">⏸</span>
                          <span className="text-xs text-amber-300 font-medium">Tiempo parado</span>
                        </div>
                        <span className="text-sm font-bold text-amber-400">
                          {Math.floor(minutosParada / 60) > 0 ? `${Math.floor(minutosParada / 60)}h ` : ""}{minutosParada % 60}min
                        </span>
                      </div>
                      <p className="text-xs text-amber-600 mt-1">
                        Dejaron de producirse ~{Math.round(minutosParada * (calcTeorico?.piezasPorMin ?? 0))} envases · el pedido se extiende {minutosParada % 60 > 0 || Math.floor(minutosParada / 60) > 0 ? `${Math.floor(minutosParada / 60) > 0 ? Math.floor(minutosParada / 60) + "h " : ""}${minutosParada % 60}min` : ""} más
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Teórico</p>
                      <p className="text-lg font-bold text-blue-300">{produccionTeorica.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Reportado</p>
                      <p className="text-lg font-bold text-white">{totalProducido.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Diferencia</p>
                      <p className={`text-lg font-bold ${totalProducido >= produccionTeorica ? "text-green-400" : "text-red-400"}`}>
                        {totalProducido >= produccionTeorica ? "+" : ""}{(totalProducido - produccionTeorica).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Tiempo extra para completar pedido */}
                  {tiempoAdicionalMin > 0 && (
                    <div className="flex items-center justify-between text-xs border-t border-gray-700/50 pt-2">
                      <span className="text-gray-500">Tiempo extra al pedido por paradas</span>
                      <span className="text-amber-400 font-semibold">
                        +{Math.floor(tiempoAdicionalMin / 60) > 0 ? `${Math.floor(tiempoAdicionalMin / 60)}h ` : ""}{tiempoAdicionalMin % 60}min
                      </span>
                    </div>
                  )}

                  {/* Barra de eficiencia */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">Eficiencia</span>
                      <span className={`text-sm font-bold ${
                        Number(eficiencia) >= 90 ? "text-green-400"
                        : Number(eficiencia) >= 70 ? "text-yellow-400"
                        : "text-red-400"
                      }`}>{eficiencia}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div className={`h-2 rounded-full transition-all duration-500 ${
                        Number(eficiencia) >= 90 ? "bg-green-500"
                        : Number(eficiencia) >= 70 ? "bg-yellow-500"
                        : "bg-red-500"
                      }`} style={{ width: `${Math.min(Number(eficiencia), 100)}%` }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Paradas */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-400">Paradas de máquina</label>
              <button type="button" onClick={addParada} className="text-xs text-amber-400 hover:text-amber-300 transition-colors">
                + Agregar parada
              </button>
            </div>
            <div className="space-y-2">
              {paradas.map((p, i) => (
                <div key={i} className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-3 space-y-2">
                  <div className="flex gap-2 items-center">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">Desde</label>
                      <input type="time" value={p.hora_inicio}
                        onChange={(e) => setParada(i, "hora_inicio", e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-amber-500" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">Hasta</label>
                      <input type="time" value={p.hora_fin}
                        onChange={(e) => setParada(i, "hora_fin", e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-amber-500" />
                    </div>
                    <button type="button" onClick={() => removeParada(i)}
                      className="text-gray-600 hover:text-red-400 text-lg leading-none mt-4 transition-colors">×</button>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Motivo</label>
                    <select value={p.motivo} onChange={(e) => setParada(i, "motivo", e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-amber-500">
                      {MOTIVOS_PARADA.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  {/* Duración calculada */}
                  {p.hora_inicio && p.hora_fin && (() => {
                    const [hI, mI] = p.hora_inicio.split(":").map(Number);
                    const [hF, mF] = p.hora_fin.split(":").map(Number);
                    let minutos = (hF * 60 + mF) - (hI * 60 + mI);
                    if (minutos < 0) minutos += 24 * 60;
                    const h = Math.floor(minutos / 60);
                    const m = minutos % 60;
                    return (
                      <p className="text-xs text-amber-400">
                        ⏱ Duración: {h > 0 ? `${h}h ` : ""}{m}min
                      </p>
                    );
                  })()}
                </div>
              ))}
              {paradas.length === 0 && (
                <p className="text-xs text-gray-600 italic">Sin paradas registradas en este turno</p>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
              {saving ? "Guardando…" : "Registrar Cierre"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


// ── Modal Arranque ────────────────────────────────────────────────
function ModalArranque({ maquina, plan, pedido, producto, onClose, onGuardado }) {
  const { usuario } = useAuth();

  // Pre-cargar desde producto como guía
  const tempRef  = producto ? Math.round((producto.temp_min + producto.temp_max) / 2) : "";
  const pbRef    = producto ? ((producto.peso_bruto_min + producto.peso_bruto_max) / 2 * 1000).toFixed(1) : "";
  const pnRef    = producto ? ((producto.peso_env_min + producto.peso_env_max) / 2 * 1000).toFixed(1) : "";
  const cicloRef = maquina?.tiempo_ciclo_estandar ?? "";

  const [form, setForm] = useState({
    cavidades:        String(producto?.cavidades ?? ""),
    temperatura:      String(tempRef),
    tiempo_ciclo_seg: String(cicloRef),
    peso_neto_gramos: String(pnRef),
    peso_bruto_gramos:String(pbRef),
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await crearMedicion({
        maquina_id: maquina.id,
        plan_id: plan?.id ?? null,
        tipo: "arranque",
        cavidades: form.cavidades ? Number(form.cavidades) : null,
        temperatura: form.temperatura ? Number(form.temperatura) : null,
        tiempo_ciclo_seg: form.tiempo_ciclo_seg ? Number(form.tiempo_ciclo_seg) : null,
        peso_neto_gramos: form.peso_neto_gramos ? Number(form.peso_neto_gramos) : null,
        peso_bruto_gramos: form.peso_bruto_gramos ? Number(form.peso_bruto_gramos) : null,
      });
      toast.success("Arranque registrado ✓ — Plan en curso");
      window.dispatchEvent(new CustomEvent("datos:updated"));
      onGuardado();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail ?? "Error");
    } finally {
      setSaving(false);
    }
  };

  const campo = (label, key, placeholder, step = "0.1") => (
    <div>
      <label className="block text-xs text-gray-400 mb-1.5">{label}</label>
      <input
        type="number" min="0" step={step}
        value={form[key]}
        onChange={(e) => set(key, e.target.value)}
        placeholder={placeholder}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-green-500"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div>
            <h3 className="font-semibold text-white">Datos de Arranque</h3>
            <p className="text-xs text-green-400 mt-0.5">{maquina.nombre} · {pedido?.numero_pedido ?? (plan ? `PED-${String(plan.pedido_id).padStart(4,"0")}` : "")}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-green-900/10 border border-green-800/20 rounded-lg px-3 py-2">
            <p className="text-xs text-green-400">Al guardar, el plan pasará automáticamente a <strong>En curso</strong>.</p>
          </div>

          {/* Referencia del producto */}
          {producto && (
            <div className="bg-gray-800/60 border border-gray-700/40 rounded-lg px-3 py-2.5 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <span className="text-gray-500 col-span-2 font-medium text-gray-400 mb-0.5">Referencia: {producto.nombre}</span>
              <span className="text-gray-500">Cavidades</span><span className="text-purple-300">{producto.cavidades} cav.</span>
              <span className="text-gray-500">Temperatura</span><span className="text-red-300">{producto.temp_min}–{producto.temp_max} °C</span>
              <span className="text-gray-500">Peso neto</span><span className="text-green-300">{(producto.peso_env_min*1000).toFixed(0)}–{(producto.peso_env_max*1000).toFixed(0)} g</span>
              <span className="text-gray-500">Peso bruto</span><span className="text-green-300">{(producto.peso_bruto_min*1000).toFixed(0)}–{(producto.peso_bruto_max*1000).toFixed(0)} g</span>
              {maquina?.tiempo_ciclo_estandar && <><span className="text-gray-500">Ciclo estándar</span><span className="text-blue-300">{maquina.tiempo_ciclo_estandar} seg</span></>}
            </div>
          )}

          {campo("Cavidades del molde", "cavidades", "Ej: 2", "1")}
          {campo("Temperatura (°C)", "temperatura", "Ej: 220")}
          {campo("Tiempo de ciclo (segundos)", "tiempo_ciclo_seg", "Ej: 12.5")}
          {campo("Peso neto (gramos)", "peso_neto_gramos", "Ej: 40.00", "0.01")}
          {campo("Peso bruto (gramos)", "peso_bruto_gramos", "Ej: 45.50", "0.01")}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
              {saving ? "Guardando…" : "Registrar Arranque"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


// ── Modal Medición (ciclo + peso cada 2h) ─────────────────────────
function ModalMedicion({ maquina, plan, producto = null, medicionesExistentes = [], onClose, onGuardado }) {
  const [form, setForm] = useState({
    tiempo_ciclo_seg: "", peso_neto_gramos: "", peso_bruto_gramos: "", temperatura: "",
  });
  const [defectos, setDefectos] = useState([]);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const addDefecto = () => setDefectos((d) => [...d, { tipo: TIPOS_DEFECTO[0] }]);
  const removeDefecto = (i) => setDefectos((d) => d.filter((_, j) => j !== i));
  const setDefecto = (i, k, v) => setDefectos((d) => d.map((x, j) => j === i ? { ...x, [k]: v } : x));

  // Calcular slots de medición programados (cada 2h desde arranque) — solo los del turno en curso
  const slots = (() => {
    if (!plan?.hora_arranque) return [];
    const arranqueUTC = new Date(plan.hora_arranque + (plan.hora_arranque.endsWith("Z") ? "" : "Z"));
    const allSlots = [];
    for (let i = 1; i <= 12; i++) {
      allSlots.push(new Date(arranqueUTC.getTime() + i * 2 * 3600 * 1000));
    }

    // Turno actual en Venezuela (UTC-4)
    const getHVE = (d) => parseInt(
      new Intl.DateTimeFormat("en-US", { timeZone: "America/Caracas", hour: "2-digit", hour12: false }).format(d)
    );
    const hAhora = getHVE(new Date());
    let tStart, tEnd;
    if (hAhora >= 6 && hAhora < 14)       { tStart = 6;  tEnd = 14; }
    else if (hAhora >= 14 && hAhora < 22) { tStart = 14; tEnd = 22; }
    else                                   { tStart = 22; tEnd = 30; } // nocturno: 22-06, 30=6 del día siguiente

    return allSlots.filter((slot) => {
      const h = getHVE(slot);
      const hAdj = (tStart === 22 && h < 6) ? h + 24 : h; // ajuste wrap nocturno
      return hAdj >= tStart && hAdj < tEnd;
    });
  })();

  // Mediciones ya registradas (tipo "medicion", sin contar arranque)
  const medsRegistradas = medicionesExistentes.filter((m) => m.tipo === "medicion");

  // Un slot está "hecho" si hay una medicion cuyo fecha_registro cae en la ventana [slot-2h, slot+30min]
  const slotHecho = slots.map((slot) => {
    const ventanaInicio = slot.getTime() - 2 * 3600 * 1000;
    const ventanaFin = slot.getTime() + 30 * 60 * 1000;
    return medsRegistradas.some((m) => {
      const ts = new Date(m.fecha_registro + (m.fecha_registro.endsWith("Z") ? "" : "Z")).getTime();
      return ts >= ventanaInicio && ts <= ventanaFin;
    });
  });

  const ahoraMs = Date.now();
  // Slot actual = primer slot no hecho que ya pasó (o el próximo inmediato)
  const slotActualIdx = (() => {
    if (slots.length === 0) return -1;
    // Buscar primer slot no hecho que ya venció o está próximo (±30min)
    for (let i = 0; i < slots.length; i++) {
      if (!slotHecho[i] && slots[i].getTime() <= ahoraMs + 30 * 60 * 1000) return i;
    }
    // Si todos los pasados están hechos, apuntar al próximo futuro
    for (let i = 0; i < slots.length; i++) {
      if (!slotHecho[i]) return i;
    }
    return -1;
  })();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await crearMedicion({
        maquina_id: maquina.id,
        plan_id: plan?.id ?? null,
        tipo: "medicion",
        tiempo_ciclo_seg: form.tiempo_ciclo_seg ? Number(form.tiempo_ciclo_seg) : null,
        peso_neto_gramos: form.peso_neto_gramos ? Number(form.peso_neto_gramos) : null,
        peso_bruto_gramos: form.peso_bruto_gramos ? Number(form.peso_bruto_gramos) : null,
        temperatura: form.temperatura ? Number(form.temperatura) : null,
        defectos: defectos.map((d) => ({ tipo: d.tipo, cantidad: 1 })),
      });
      toast.success("Medición registrada ✓");
      window.dispatchEvent(new CustomEvent("datos:updated"));
      onGuardado();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail ?? "Error");
    } finally {
      setSaving(false);
    }
  };

  const campo = (label, key, placeholder, step = "0.1") => (
    <div>
      <label className="block text-xs text-gray-400 mb-1.5">{label}</label>
      <input type="number" min="0" step={step} value={form[key]}
        onChange={(e) => set(key, e.target.value)} placeholder={placeholder}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500" />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md my-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div>
            <h3 className="font-semibold text-white">Medición cada 2 horas</h3>
            <p className="text-xs text-purple-400 mt-0.5">{maquina.nombre} · {plan ? `PED-${String(plan.pedido_id).padStart(4,"0")}` : "Sin plan"}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Cronograma de mediciones */}
          {slots.length > 0 && (
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-2 font-medium">Horario de mediciones programadas</p>
              <div className="flex flex-wrap gap-1.5">
                {slots.map((slot, i) => {
                  const hecho = slotHecho[i];
                  const esCurrent = i === slotActualIdx;
                  const pasado = slot.getTime() <= ahoraMs && !hecho && !esCurrent;
                  const horaStr = slot.toLocaleTimeString("es-VE", { timeZone: "America/Caracas", hour: "2-digit", minute: "2-digit" });
                  return (
                    <span key={i} className={`text-xs px-2 py-0.5 rounded border font-mono ${
                      hecho
                        ? "bg-green-900/30 text-green-400 border-green-700/40"
                        : esCurrent
                        ? "bg-purple-600/30 text-purple-300 border-purple-500/50 font-semibold"
                        : pasado
                        ? "bg-gray-700/20 text-gray-600 border-gray-700/20"
                        : "bg-gray-800/50 text-gray-400 border-gray-700/30"
                    }`}>
                      {hecho ? "✓" : `#${i + 1}`} {horaStr}
                    </span>
                  );
                })}
              </div>
              {slotActualIdx >= 0 && (
                <p className="text-xs text-purple-400 mt-2">
                  Registrando medición <strong>#{slotActualIdx + 1}</strong> · {slots[slotActualIdx].toLocaleTimeString("es-VE", { timeZone: "America/Caracas", hour: "2-digit", minute: "2-digit" })}
                </p>
              )}
              {slotActualIdx === -1 && slots.length > 0 && (
                <p className="text-xs text-green-400 mt-2">✓ Todas las mediciones registradas</p>
              )}
            </div>
          )}

          {/* Referencia del producto — siempre desde el catálogo actual */}
          {(() => {
            const arr = medicionesExistentes.find((m) => m.tipo === "arranque");
            // Fuente primaria: producto del catálogo (actualizado); fallback: snapshot del plan
            const cavRef      = producto?.cavidades        ?? plan?.cavidades_arranque ?? null;
            const tempMinRef  = producto?.temp_min         ?? null;
            const tempMaxRef  = producto?.temp_max         ?? null;
            const tempRefFb   = plan?.temperatura_referencia ?? arr?.temperatura ?? null;
            const pesoEnvMin  = producto?.peso_env_min     ?? null; // kg
            const pesoEnvMax  = producto?.peso_env_max     ?? null;
            const pesoBrutoMin = producto?.peso_bruto_min  ?? null;
            const pesoBrutoMax = producto?.peso_bruto_max  ?? null;
            const cicloRef    = arr?.tiempo_ciclo_seg      ?? null;

            const hay = cavRef || tempMinRef || tempRefFb || cicloRef || pesoBrutoMin || pesoEnvMin;
            if (!hay) return null;

            const tempStr = tempMinRef != null && tempMaxRef != null
              ? `${tempMinRef} – ${tempMaxRef} °C`
              : tempRefFb != null ? `${tempRefFb} °C` : null;
            const pesoEnvStr = pesoEnvMin != null
              ? `${soloKg(pesoEnvMin)} – ${soloKg(pesoEnvMax)}`
              : null;
            const pesoBrutoStr = pesoBrutoMin != null
              ? `${soloKg(pesoBrutoMin)} – ${soloKg(pesoBrutoMax)}`
              : null;

            return (
              <div className="bg-blue-900/15 border border-blue-700/25 rounded-xl px-4 py-2.5">
                <p className="text-[10px] text-blue-400 uppercase tracking-wide font-semibold mb-2">Referencia del producto</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  {cavRef != null && <div><p className="text-gray-500">Cavidades</p><p className="text-white font-medium">{cavRef}</p></div>}
                  {tempStr    && <div><p className="text-gray-500">Temperatura</p><p className="text-white font-medium">{tempStr}</p></div>}
                  {cicloRef   != null && <div><p className="text-gray-500">Ciclo arranque</p><p className="text-white font-medium">{cicloRef} seg</p></div>}
                  {pesoEnvStr && <div><p className="text-gray-500">Peso envase ref.</p><p className="text-white font-medium">{pesoEnvStr}</p></div>}
                  {pesoBrutoStr && <div><p className="text-gray-500">Peso bruto ref.</p><p className="text-white font-medium">{pesoBrutoStr}</p></div>}
                </div>
              </div>
            );
          })()}

          {/* Campos técnicos */}
          <div className="grid grid-cols-2 gap-4">
            {campo("Tiempo de ciclo (seg)", "tiempo_ciclo_seg", "Ej: 12.5")}
            {campo("Temperatura (°C)", "temperatura", "Ej: 220")}
            {campo("Peso neto (gramos)", "peso_neto_gramos", "Ej: 40.00", "0.01")}
            {campo("Peso bruto (gramos)", "peso_bruto_gramos", "Ej: 45.50", "0.01")}
          </div>

          {/* Defectos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-400">Defectos / Rechazos</label>
              <button type="button" onClick={addDefecto} className="text-xs text-purple-400 hover:text-purple-300 transition-colors">
                + Agregar defecto
              </button>
            </div>
            <div className="space-y-2">
              {defectos.map((d, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <select value={d.tipo} onChange={(e) => setDefecto(i, "tipo", e.target.value)}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-red-500">
                    {TIPOS_DEFECTO.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <button type="button" onClick={() => removeDefecto(i)}
                    className="text-gray-600 hover:text-red-400 text-lg leading-none transition-colors">×</button>
                </div>
              ))}
              {defectos.length === 0 && (
                <p className="text-xs text-gray-600 italic">Sin defectos en esta medición</p>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
              {saving ? "Guardando…" : "Registrar Medición"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


// ── Cuenta regresiva arranque ─────────────────────────────────────
function CuentaRegresivaArranque({ fechaProgramada, horaProgramada }) {
  const [diff, setDiff] = useState(null);

  useEffect(() => {
    if (!fechaProgramada || !horaProgramada) return;
    const calcular = () => {
      // fecha_programada llega como "2026-04-18T00:00:00" — tomamos solo la fecha
      const soloFecha = fechaProgramada.slice(0, 10);
      const arranque = new Date(`${soloFecha}T${horaProgramada}:00-04:00`);
      setDiff(arranque.getTime() - Date.now());
    };
    calcular();
    const t = setInterval(calcular, 1000);
    return () => clearInterval(t);
  }, [fechaProgramada, horaProgramada]);

  if (diff === null) return null;

  if (diff <= 0) {
    const abs = Math.abs(diff);
    const h = Math.floor(abs / 3600000);
    const m = Math.floor((abs % 3600000) / 60000);
    const s = Math.floor((abs % 60000) / 1000);
    return (
      <span className="text-xs font-mono font-semibold text-red-400 bg-red-900/20 border border-red-700/30 px-2 py-0.5 rounded">
        ⚠ Retraso +{String(h).padStart(2,"0")}:{String(m).padStart(2,"0")}:{String(s).padStart(2,"0")}
      </span>
    );
  }

  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const urgent = diff < 2 * 3600000;
  const texto = `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;

  return (
    <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded border ${
      urgent
        ? "text-orange-400 bg-orange-900/20 border-orange-700/30"
        : "text-gray-300 bg-gray-800/60 border-gray-700/40"
    }`}>
      {urgent ? "⚡" : "🕐"} {texto}
    </span>
  );
}


// ── Helpers compartidos ───────────────────────────────────────────
function fmtHms(ms) {
  const abs = Math.abs(ms);
  const d   = Math.floor(abs / 86400000);
  const h   = Math.floor((abs % 86400000) / 3600000);
  const m   = Math.floor((abs % 3600000) / 60000);
  const s   = Math.floor((abs % 60000) / 1000);
  if (d > 0) return `${d}d ${String(h).padStart(2,"0")}h ${String(m).padStart(2,"0")}m`;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

function calcFinEstimadoMs(plan, maquina, pedido, medicionesEnCurso) {
  const arranqueBase = plan.hora_arranque
    ? new Date(plan.hora_arranque.endsWith("Z") ? plan.hora_arranque : plan.hora_arranque + "Z").getTime()
    : (plan.fecha_programada && plan.hora_programada
        ? new Date(`${plan.fecha_programada.slice(0,10)}T${plan.hora_programada}:00-04:00`).getTime()
        : null);
  if (!arranqueBase) return null;

  const cavidades   = plan.cavidades_arranque;
  const pesoBrutoKg = plan.peso_bruto_arranque;
  const ultimaMed   = (medicionesEnCurso ?? []).find((m) => m.tiempo_ciclo_seg);
  const cicloSeg    = ultimaMed?.tiempo_ciclo_seg ?? maquina?.tiempo_ciclo_estandar;
  const cantKg      = pedido?.cantidad_kg;

  if (!cavidades || !pesoBrutoKg || !cicloSeg || !cantKg) return null;
  const kgCiclo = cavidades * pesoBrutoKg;
  if (kgCiclo <= 0) return null;
  return arranqueBase + Math.ceil(cantKg / kgCiclo) * cicloSeg * 1000;
}


// ── Timer unificado: 2h antes arranque → producción → fin/sobretiempo ──
function TimerUnificado({ plan, maquina, pedido, medicionesEnCurso }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const ahora = Date.now();
  const finEstimadoMs = calcFinEstimadoMs(plan, maquina, pedido, medicionesEnCurso);

  // ── En curso ──
  if (plan.estado === "en_curso") {
    if (finEstimadoMs) {
      const diff = finEstimadoMs - ahora;
      if (diff > 0) {
        const urgente = diff < 2 * 3600000;
        return (
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-0.5">{urgente ? "⚡ Finalizando pronto" : "⏳ Finaliza en"}</p>
            <span className={`font-mono font-bold text-xl tracking-wider ${urgente ? "text-orange-400" : "text-green-400"}`}>
              {fmtHms(diff)}
            </span>
          </div>
        );
      }
      // Sobretiempo
      return (
        <div className="text-center">
          <p className="text-xs text-red-400 mb-0.5 animate-pulse">🔴 Sobretiempo</p>
          <span className="font-mono font-bold text-xl tracking-wider text-red-400">
            +{fmtHms(diff)}
          </span>
        </div>
      );
    }
    // Sin datos para estimar fin: mostrar tiempo transcurrido
    const arranqueMs = plan.hora_arranque
      ? new Date(plan.hora_arranque.endsWith("Z") ? plan.hora_arranque : plan.hora_arranque + "Z").getTime()
      : null;
    if (arranqueMs) {
      return (
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-0.5">⏱ En producción</p>
          <span className="font-mono font-bold text-xl tracking-wider text-yellow-400">
            {fmtHms(ahora - arranqueMs)}
          </span>
        </div>
      );
    }
    return null;
  }

  // ── Planificado ──
  if (!plan.fecha_programada || !plan.hora_programada) return null;
  const arranqueProgramadoMs = new Date(
    `${plan.fecha_programada.slice(0,10)}T${plan.hora_programada}:00-04:00`
  ).getTime();
  const diff = arranqueProgramadoMs - ahora;

  if (diff <= 0) {
    return (
      <div className="text-center">
        <p className="text-xs text-red-400 mb-0.5">⚠ Retraso de arranque</p>
        <span className="font-mono font-bold text-xl tracking-wider text-red-400">+{fmtHms(diff)}</span>
      </div>
    );
  }
  const color   = diff < 3600000  ? "text-orange-400" : diff < 2 * 3600000 ? "text-yellow-400" : "text-gray-400";
  const label   = diff < 3600000  ? "⚡ ¡Prepara la máquina!" : "🕐 Arranca en";
  return (
    <div className="text-center">
      <p className={`text-xs mb-0.5 ${diff < 3600000 ? "text-orange-400" : "text-gray-500"}`}>{label}</p>
      <span className={`font-mono font-bold text-xl tracking-wider ${color}`}>{fmtHms(diff)}</span>
    </div>
  );
}


// ── Tarjeta de plan (cronograma) ─────────────────────────────────
function turnoActualVE() {
  const h = new Date().toLocaleString("en-US", { timeZone: "America/Caracas", hour: "numeric", hour12: false });
  const hora = parseInt(h);
  if (hora >= 6 && hora < 14) return "diurno";
  if (hora >= 14 && hora < 22) return "mixto";
  return "nocturno";
}

function TarjetaPlan({ plan, maquina, pedido, producto = null, medicionesEnCurso, cierresDelPlan = [], pedidosEnCola = 0, onArranque, onCierre, onMedicion }) {
  const ESTADO = {
    planificado: { label: "Planificado", cls: "bg-blue-900/30 text-blue-400 border-blue-800/30", dot: "bg-blue-400" },
    en_curso:    { label: "En curso",    cls: "bg-green-900/30 text-green-400 border-green-800/30", dot: "bg-green-400 animate-pulse" },
  };
  const estado = ESTADO[plan.estado] ?? ESTADO.planificado;
  const pedNum = pedido?.numero_pedido ?? `PED-${String(plan.pedido_id).padStart(4, "0")}`;

  // ── Datos técnicos de la última medición o del arranque ──
  const lastMed     = (medicionesEnCurso ?? [])[0] ?? null;
  const enCurso     = plan.estado === "en_curso";

  // Cierre bloqueado si ya existe uno para el turno actual O si el plan está completado
  const turnoHoy = turnoActualVE();
  const cierreBloqueado = cierresDelPlan.some(c => c.turno === turnoHoy) || plan.estado === "completado";
  const cierreMotivo = plan.estado === "completado"
    ? "Producción finalizada"
    : cierresDelPlan.some(c => c.turno === turnoHoy)
      ? `Turno ${turnoHoy} ya cerrado`
      : null;

  // Fuente de verdad: producto del catálogo → fallback a snapshot del plan
  const cavidades   = producto?.cavidades       ?? plan.cavidades_arranque ?? null;
  const pesoBrutoG  = lastMed?.peso_bruto_gramos ?? (plan.peso_bruto_arranque != null ? plan.peso_bruto_arranque * 1000 : null);
  const pesoNetoG   = lastMed?.peso_neto_gramos  ?? null;
  const temperatura = lastMed?.temperatura       ?? plan?.temperatura_referencia ?? null;
  // Ciclo solo desde medición real — sin fallback al estándar de máquina
  const cicloSeg    = lastMed?.tiempo_ciclo_seg ?? null;

  // ── Progreso de envases ──
  const fabricados = plan.envases_producidos ?? 0;
  let totalEnvases = pedido?.cantidad_unidades ?? null;
  if (!totalEnvases && plan.peso_bruto_arranque && pedido?.cantidad_kg) {
    totalEnvases = Math.ceil(pedido.cantidad_kg / plan.peso_bruto_arranque);
  }
  const porcentaje = totalEnvases ? Math.min(100, Math.round((fabricados / totalEnvases) * 100)) : null;

  // Kg total real = peso_bruto actual × unidades a fabricar
  const kgTotalReal = pesoBrutoG != null && totalEnvases
    ? ((pesoBrutoG / 1000) * totalEnvases).toFixed(1)
    : pedido?.cantidad_kg ?? null;

  // ── Fin estimado para mostrar fecha/hora ──
  const finEstimadoMs = calcFinEstimadoMs(plan, maquina, pedido, medicionesEnCurso);
  const finEstimadoStr = finEstimadoMs
    ? new Date(finEstimadoMs).toLocaleString("es-VE", {
        timeZone: "America/Caracas", day: "2-digit", month: "2-digit",
        hour: "2-digit", minute: "2-digit",
      })
    : null;

  const tieneDatosTecnicos = cavidades || cicloSeg || temperatura || pesoBrutoG || pesoNetoG;

  // Últimas 2 mediciones (tipo "medicion", sin arranque)
  const ultimasMeds = (medicionesEnCurso ?? [])
    .filter((m) => m.tipo === "medicion")
    .slice(0, 2);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-col gap-3">

      {/* ── Encabezado ── */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${estado.dot}`} />
            <h3 className="font-semibold text-white text-sm">{maquina?.nombre ?? `Máq. ${plan.maquina_id}`}</h3>
            {maquina && <span className="text-xs bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">{maquina.tipo}</span>}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs text-blue-300 font-semibold">{pedNum}</span>
            {pedido?.cliente && <span className="text-xs text-gray-500 truncate">{pedido.cliente}</span>}
          </div>
          {pedido?.producto && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">{pedido.producto}</p>
          )}
          {plan.fecha_programada && (
            <p className="text-xs text-gray-600 mt-0.5">
              Arranque: {plan.fecha_programada.slice(0,10).split("-").reverse().join("/")}
              {plan.hora_programada ? ` · ${plan.hora_programada}` : ""}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
          <span className={`text-xs border px-2 py-1 rounded-lg ${estado.cls}`}>
            {estado.label}
          </span>
          {pedidosEnCola > 0 && (
            <span className="text-xs bg-gray-800 text-gray-400 border border-gray-700/50 px-2 py-0.5 rounded-lg">
              +{pedidosEnCola} en cola
            </span>
          )}
        </div>
      </div>

      {/* ── Timer central ── */}
      <div className="bg-gray-800/50 rounded-xl py-3 px-3 border border-gray-700/40">
        <TimerUnificado
          plan={plan}
          maquina={maquina}
          pedido={pedido}
          medicionesEnCurso={medicionesEnCurso}
        />
        {/* Timer para planificado con > 2h: el componente maneja todos los casos */}
      </div>

      {/* ── Progreso de envases ── */}
      {(totalEnvases !== null || fabricados > 0) && (
        <div className="bg-gray-800/40 rounded-xl px-3 py-2.5 border border-gray-700/30">
          <div className="flex justify-between items-baseline mb-1.5">
            <span className="text-xs text-gray-400">Envases fabricados</span>
            <span className="text-xs font-semibold text-white">
              {fabricados.toLocaleString()}
              {totalEnvases ? <span className="text-gray-500"> / {totalEnvases.toLocaleString()}</span> : ""}
            </span>
          </div>
          {porcentaje !== null && (
            <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  porcentaje >= 90 ? "bg-green-500" : porcentaje >= 50 ? "bg-blue-500" : "bg-purple-500"
                }`}
                style={{ width: `${porcentaje}%` }}
              />
            </div>
          )}
          {porcentaje !== null && (
            <p className="text-right text-xs text-gray-500 mt-0.5">{porcentaje}%</p>
          )}
        </div>
      )}

      {/* ── Datos técnicos ── siempre visible en en_curso, opcional en planificado si hay datos ── */}
      {(plan.estado === "en_curso" || tieneDatosTecnicos) && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 bg-gray-800/30 rounded-xl px-3 py-2.5 border border-gray-700/20 text-xs">
          <Dato label="Cavidades"   value={cavidades   != null ? cavidades               : "—"} dim={cavidades   == null} />
          <Dato label="Ciclo"       value={cicloSeg    != null ? `${cicloSeg} seg`        : "—"} dim={cicloSeg    == null} />
          <Dato label="Temperatura" value={temperatura != null ? `${temperatura} °C`      : "—"} dim={temperatura == null} />
          <Dato label="Peso bruto"  value={pesoBrutoG  != null ? formatPesoG(pesoBrutoG)  : "—"} dim={pesoBrutoG  == null} />
          <Dato label="Peso neto"   value={pesoNetoG   != null ? formatPesoG(pesoNetoG)   : "—"} dim={pesoNetoG   == null} />
          {enCurso && kgTotalReal != null && <Dato label="Kg total" value={`${kgTotalReal} kg`} />}
        </div>
      )}

      {/* ── Historial últimas 2 mediciones ── */}
      {ultimasMeds.length > 0 && (
        <div className="bg-gray-800/20 rounded-xl px-3 py-2 border border-gray-700/20 text-xs space-y-1.5">
          <p className="text-gray-500 uppercase tracking-wide text-[10px] font-semibold mb-1">Últimas mediciones</p>
          {ultimasMeds.map((m, i) => {
            const horaStr = new Date(m.fecha_registro + (m.fecha_registro?.endsWith("Z") ? "" : "Z"))
              .toLocaleTimeString("es-VE", { timeZone: "America/Caracas", hour: "2-digit", minute: "2-digit" });
            return (
              <div key={m.id} className={`flex items-center gap-2 ${i === 0 ? "text-white" : "text-gray-500"}`}>
                <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${i === 0 ? "bg-purple-400" : "bg-gray-600"}`} />
                <span className="font-mono w-10 shrink-0">{horaStr}</span>
                <span className="flex gap-3 flex-wrap">
                  {m.tiempo_ciclo_seg != null && <span>{m.tiempo_ciclo_seg}s</span>}
                  {m.peso_bruto_gramos != null && <span>{m.peso_bruto_gramos}g</span>}
                  {m.temperatura != null && <span>{m.temperatura}°C</span>}
                  {m.piezas_por_hora != null && <span className={i === 0 ? "text-purple-300" : ""}>{m.piezas_por_hora} u/h</span>}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Fecha estimada de finalización ── */}
      {plan.estado === "en_curso" && (
        <div className={`flex items-center justify-between rounded-xl px-3 py-2 border text-xs ${
          finEstimadoStr
            ? "bg-indigo-900/20 border-indigo-700/30"
            : "bg-gray-800/20 border-gray-700/20"
        }`}>
          <span className="text-gray-400">📅 Fin estimado</span>
          {finEstimadoStr
            ? <span className="font-semibold text-indigo-300">{finEstimadoStr}</span>
            : <span className="text-gray-600 italic">Registra cavidades y peso en medición</span>
          }
        </div>
      )}

      {/* ── Botones ── */}
      <div className="flex flex-col gap-2">
        {plan.hora_arranque ? (
          <div className="flex items-center justify-center gap-2 py-2.5 bg-gray-800/30 text-gray-600 text-sm font-medium rounded-xl border border-gray-700/20 cursor-not-allowed">
            <span>🚀</span> Arranque registrado
          </div>
        ) : (
          <button onClick={onArranque}
            className="flex items-center justify-center gap-2 py-2.5 bg-green-600/20 hover:bg-green-600/40 text-green-300 text-sm font-medium rounded-xl border border-green-700/30 transition-colors">
            <span>🚀</span> Arranque
          </button>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={onMedicion}
            className="flex items-center justify-center gap-2 py-2.5 bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 text-sm font-medium rounded-xl border border-purple-700/30 transition-colors">
            <span>⏱</span> Ciclo / Peso
          </button>
          <button
            onClick={enCurso && !cierreBloqueado ? onCierre : undefined}
            disabled={!enCurso || cierreBloqueado}
            title={cierreMotivo ?? ""}
            className={`flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-xl border transition-colors ${
              enCurso && !cierreBloqueado
                ? "bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border-blue-700/30"
                : "bg-gray-800/30 text-gray-600 border-gray-700/20 cursor-not-allowed"
            }`}>
            <span>📋</span> Cierre
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Fila de dato técnico ──────────────────────────────────────────
function Dato({ label, value, dim = false }) {
  return (
    <div className="flex justify-between gap-1">
      <span className="text-gray-500">{label}</span>
      <span className={dim ? "text-gray-600" : "text-gray-200 font-medium"}>{value}</span>
    </div>
  );
}


// ── Panel historial del día ───────────────────────────────────────
function HistorialHoy({ cierres, mediciones, maquinas }) {
  const [tab, setTab] = useState("cierres");
  const maqNombre = (id) => maquinas.find((m) => m.id === id)?.nombre ?? `Máq.${id}`;

  const TURNO_COLOR = {
    diurno:         "bg-yellow-900/30 text-yellow-400 border-yellow-800/30",
    mixto:          "bg-orange-900/30 text-orange-400 border-orange-800/30",
    nocturno:       "bg-blue-900/30 text-blue-400 border-blue-800/30",
    administrativo: "bg-purple-900/30 text-purple-400 border-purple-800/30",
    // legacy
    manana: "bg-yellow-900/30 text-yellow-400 border-yellow-800/30",
    tarde:  "bg-orange-900/30 text-orange-400 border-orange-800/30",
    noche:  "bg-blue-900/30 text-blue-400 border-blue-800/30",
  };
  const TURNO_LABEL = {
    diurno: "Diurno", mixto: "Mixto", nocturno: "Nocturno", administrativo: "Administrativo",
    manana: "Mañana", tarde: "Tarde", noche: "Noche",
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-white">Registros de Hoy</h2>
        <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setTab("cierres")}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${tab === "cierres" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}
          >
            Cierres ({cierres.length})
          </button>
          <button
            onClick={() => setTab("mediciones")}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${tab === "mediciones" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"}`}
          >
            Mediciones ({mediciones.length})
          </button>
        </div>
      </div>

      {tab === "cierres" ? (
        cierres.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-6">Sin cierres registrados hoy</p>
        ) : (
          <div className="space-y-3">
            {cierres.map((c) => {
              const defectosData = (() => {
                try { return JSON.parse(c.defectos || "[]"); } catch { return []; }
              })();
              const totalRechazo = defectosData.reduce((a, d) => a + d.cantidad, 0);
              const total = c.envases_buenos + totalRechazo;
              const pct = total > 0 ? ((totalRechazo / total) * 100).toFixed(1) : "0.0";

              return (
                <div key={c.id} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs border px-2 py-0.5 rounded ${TURNO_COLOR[c.turno] ?? "bg-gray-800 text-gray-400 border-gray-700"}`}>
                        {TURNO_LABEL[c.turno] ?? c.turno}
                      </span>
                      <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">{maqNombre(c.maquina_id)}</span>
                    </div>
                    <span className="text-xs text-gray-600">
                      {new Date(c.fecha_registro + "Z").toLocaleTimeString("es-VE", { timeZone: "America/Caracas", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-2">
                    <div>
                      <p className="text-xs text-gray-500">Buenos</p>
                      <p className="text-sm font-bold text-green-400">{c.envases_buenos}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Rechazados</p>
                      <p className="text-sm font-bold text-red-400">{totalRechazo}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">% Rechazo</p>
                      <p className={`text-sm font-bold ${Number(pct) > 5 ? "text-orange-400" : "text-gray-300"}`}>{pct}%</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>👷 {c.operador_nombre}</span>
                    <span>🔍 {c.inspector_nombre ?? "—"}</span>
                  </div>
                  {defectosData.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {defectosData.map((d, i) => (
                        <span key={i} className="text-xs bg-red-900/20 text-red-400 border border-red-800/20 px-2 py-0.5 rounded">
                          {d.tipo}
                        </span>
                      ))}
                    </div>
                  )}
                  {(() => {
                    try {
                      const ps = JSON.parse(c.paradas || "[]");
                      return ps.length > 0 ? (
                        <div className="mt-2 space-y-1">
                          {ps.map((p, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs text-amber-400">
                              <span>⏸</span>
                              <span>{p.hora_inicio} – {p.hora_fin}</span>
                              <span className="text-gray-500">·</span>
                              <span>{p.motivo}</span>
                            </div>
                          ))}
                        </div>
                      ) : null;
                    } catch { return null; }
                  })()}
                </div>
              );
            })}
          </div>
        )
      ) : (
        mediciones.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-6">Sin mediciones registradas hoy</p>
        ) : (
          <div className="space-y-3">
            {mediciones.map((m) => (
              <div key={m.id} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs border px-2 py-0.5 rounded font-medium ${
                      m.tipo === "arranque"
                        ? "bg-green-900/30 text-green-400 border-green-700/30"
                        : "bg-purple-900/30 text-purple-400 border-purple-700/30"
                    }`}>
                      {m.tipo === "arranque" ? "🚀 Arranque" : "⏱ Medición"}
                    </span>
                    <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">{maqNombre(m.maquina_id)}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(m.fecha_registro + "Z").toLocaleTimeString("es-VE", { timeZone: "America/Caracas", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                {/* Datos técnicos */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Tiempo ciclo</p>
                    <p className="text-sm font-semibold text-purple-300">
                      {m.tiempo_ciclo_seg != null ? `${m.tiempo_ciclo_seg} seg` : <span className="text-gray-600">—</span>}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Cavidades</p>
                    <p className="text-sm font-semibold text-yellow-300">
                      {m.cavidades != null ? m.cavidades : <span className="text-gray-600">—</span>}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Temperatura</p>
                    <p className="text-sm font-semibold text-orange-300">
                      {m.temperatura != null ? `${m.temperatura} °C` : <span className="text-gray-600">—</span>}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Piezas / hora</p>
                    <p className="text-sm font-semibold text-green-300">
                      {m.piezas_por_hora != null ? m.piezas_por_hora.toLocaleString() : <span className="text-gray-600">—</span>}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Peso neto</p>
                    <p className="text-sm font-semibold text-blue-300">
                      {m.peso_neto_gramos != null ? `${m.peso_neto_gramos} g` : m.peso_gramos != null ? `${m.peso_gramos} g` : <span className="text-gray-600">—</span>}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Peso bruto</p>
                    <p className="text-sm font-semibold text-cyan-300">
                      {m.peso_bruto_gramos != null ? `${m.peso_bruto_gramos} g` : <span className="text-gray-600">—</span>}
                    </p>
                  </div>
                  {m.faltante != null && (
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Faltante</p>
                      <p className="text-sm font-semibold text-white">{m.faltante.toLocaleString()} uds</p>
                    </div>
                  )}
                  {m.tiempo_restante_min != null && (
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Tiempo estimado</p>
                      <p className="text-sm font-semibold text-amber-300">
                        {m.tiempo_restante_min >= 60
                          ? `${Math.floor(m.tiempo_restante_min / 60)}h ${Math.round(m.tiempo_restante_min % 60)}min`
                          : `${m.tiempo_restante_min} min`}
                      </p>
                    </div>
                  )}
                </div>

                {/* Defectos */}
                {(() => {
                  try {
                    const d = JSON.parse(m.defectos || "[]");
                    return d.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1 mb-2">
                        {d.map((df, i) => (
                          <span key={i} className="text-xs bg-red-900/20 text-red-400 border border-red-800/20 px-2 py-0.5 rounded">
                            {df.tipo}: {df.cantidad}
                          </span>
                        ))}
                      </div>
                    ) : null;
                  } catch { return null; }
                })()}

                {/* Inspector */}
                <div className="text-xs text-gray-500">
                  🔍 {m.inspector_nombre ?? "—"}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}


// ── Página principal ──────────────────────────────────────────────
export default function InspectorPage() {
  const [maquinas, setMaquinas] = useState([]);
  const [planes, setPlanes] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [cierres, setCierres] = useState([]);
  const [mediciones, setMediciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalArranque, setModalArranque] = useState(null); // { maquina, plan }
  const [modalCierre, setModalCierre] = useState(null);
  const [modalMedicion, setModalMedicion] = useState(null);

  const hoy = fechaVE();

  const load = async () => {
    const [rMaq, rPlan, rPedidos, rProd, rCierres, rMed] = await Promise.allSettled([
      getMaquinas(),
      getPlan(),
      getPedidos(),
      getProductos(),
      getCierresTurno({ fecha: hoy }),
      getMediciones({ fecha: hoy }),
    ]);
    if (rMaq.status === "fulfilled") setMaquinas(rMaq.value.data);
    if (rPlan.status === "fulfilled") setPlanes(rPlan.value.data);
    if (rPedidos.status === "fulfilled") setPedidos(rPedidos.value.data);
    if (rProd.status === "fulfilled") setProductos(rProd.value.data);
    if (rCierres.status === "fulfilled") setCierres(rCierres.value.data);
    if (rMed.status === "fulfilled") setMediciones(rMed.value.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const maquinaMap   = Object.fromEntries(maquinas.map((m) => [m.id, m]));
  const pedidoMap    = Object.fromEntries(pedidos.map((p) => [p.id, p]));
  const productoMap  = Object.fromEntries(productos.map((p) => [p.id, p]));

  // Deriva el producto actual (fuente de verdad) para un plan
  const getProductoPlan = (plan) => {
    const ped = pedidoMap[plan.pedido_id];
    if (!ped) return null;
    if (ped.producto_id) return productoMap[ped.producto_id] ?? null;
    return productos.find((p) => p.nombre === ped.producto) ?? null;
  };

  // Por máquina: mostrar solo el plan activo (en_curso primero, luego el de menor orden)
  // Los demás quedan en cola
  const planesActivos = (() => {
    const activos = [];
    const cola = {};   // maquina_id -> count extras
    const visto = {};  // maquina_id -> ya tiene plan activo

    const ordenados = [...planes]
      .filter((p) => p.estado !== "completado")
      .sort((a, b) => {
        if (a.estado === "en_curso" && b.estado !== "en_curso") return -1;
        if (b.estado === "en_curso" && a.estado !== "en_curso") return  1;
        return (a.orden ?? 0) - (b.orden ?? 0);
      });

    for (const p of ordenados) {
      if (!visto[p.maquina_id]) {
        visto[p.maquina_id] = true;
        activos.push(p);
      } else {
        cola[p.maquina_id] = (cola[p.maquina_id] ?? 0) + 1;
      }
    }
    return { activos, cola };
  })();

  const cronograma = planesActivos.activos;
  const colaPorMaquina = planesActivos.cola;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Inspector de Producción</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {new Date().toLocaleDateString("es-VE", { timeZone: "America/Caracas", weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
      </div>

      {/* Banner próximo cierre */}
      <BannerCierre />

      {/* Cronograma de producción */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Cronograma de Producción ({cronograma.length} máquinas)
        </h2>
        {loading ? (
          <div className="text-gray-500 text-center py-10 animate-pulse">Cargando...</div>
        ) : cronograma.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl py-12 text-center text-gray-600">
            Sin planes de producción activos — el jefe de producción debe crear el cronograma
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {cronograma.map((plan) => {
              const maq  = maquinaMap[plan.maquina_id] ?? null;
              const cola = colaPorMaquina[plan.maquina_id] ?? 0;
              const ped  = pedidoMap[plan.pedido_id] ?? null;
              const prod = getProductoPlan(plan);
              const maqRef = maq ?? { id: plan.maquina_id, nombre: `Máq. ${plan.maquina_id}` };
              const medsDelPlan = mediciones.filter((m) => m.plan_id === plan.id);
              return (
                <TarjetaPlan
                  key={plan.id}
                  plan={plan}
                  maquina={maq}
                  pedido={ped}
                  producto={prod}
                  medicionesEnCurso={medsDelPlan}
                  cierresDelPlan={cierres.filter((c) => c.plan_id === plan.id)}
                  pedidosEnCola={cola}
                  onArranque={() => setModalArranque({ maquina: maqRef, plan, pedido: ped, producto: prod })}
                  onCierre={() => setModalCierre({ maquina: maqRef, plan, medicionesExistentes: medsDelPlan })}
                  onMedicion={() => setModalMedicion({ maquina: maqRef, plan, producto: prod, medicionesExistentes: medsDelPlan })}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Historial */}
      <HistorialHoy cierres={cierres} mediciones={mediciones} maquinas={maquinas} />

      {/* Modales */}
      {modalArranque && (
        <ModalArranque
          maquina={modalArranque.maquina}
          plan={modalArranque.plan}
          pedido={modalArranque.pedido}
          producto={modalArranque.producto}
          onClose={() => setModalArranque(null)}
          onGuardado={load}
        />
      )}
      {modalCierre && (
        <ModalCierre
          maquina={modalCierre.maquina}
          plan={modalCierre.plan}
          medicionesExistentes={modalCierre.medicionesExistentes ?? []}
          onClose={() => setModalCierre(null)}
          onGuardado={load}
        />
      )}
      {modalMedicion && (
        <ModalMedicion
          maquina={modalMedicion.maquina}
          plan={modalMedicion.plan}
          producto={modalMedicion.producto ?? null}
          medicionesExistentes={modalMedicion.medicionesExistentes ?? []}
          onClose={() => setModalMedicion(null)}
          onGuardado={load}
        />
      )}
    </div>
  );
}
