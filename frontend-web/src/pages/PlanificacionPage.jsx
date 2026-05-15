import { useEffect, useState, useRef } from "react";
import { getPedidos, getMaquinas, getPlan, asignarPlan, actualizarPlan, quitarPlan, getProductos, getMateriales, getDirectorio } from "../services/api";
import Badge from "../components/Badge";
import toast from "react-hot-toast";
import { formatPesoKg } from "../utils/peso";

const ESTADO_PLAN = {
  planificado: { label: "Planificado", color: "bg-blue-900/30 text-blue-400 border-blue-700/30" },
  en_curso:    { label: "En curso",    color: "bg-green-900/30 text-green-400 border-green-700/30" },
  completado:  { label: "Completado",  color: "bg-green-900/30 text-green-400 border-green-700/30" },
};

// ── Modal asignar pedido a máquina ────────────────────────────────
function ModalAsignar({ pedido, maquinas, producto, materiales, onClose, onGuardar }) {
  // FIFO: ordenar por fecha_ingreso ascendente (más antiguo primero)
  const fifo = (lista) => [...lista].sort((a, b) => new Date(a.fecha_ingreso) - new Date(b.fecha_ingreso));

  const materiasPrimas = fifo(materiales.filter(m => m.categoria === "Materia Prima" && m.stock_disponible > 0));
  const colorantes     = fifo(materiales.filter(m => m.categoria === "Colorante"    && m.stock_disponible > 0));

  const [maquina_id, setMaquinaId]     = useState("");
  const [material_id, setMaterialId]   = useState(String(materiasPrimas[0]?.id ?? ""));
  const [colorante_id, setColoranteId] = useState(String(colorantes[0]?.id ?? ""));
  const [fecha_programada, setFecha]   = useState("");
  const [hora_programada, setHora]     = useState("");
  const [notas, setNotas]            = useState("");
  const [saving, setSaving]          = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!maquina_id) { toast.error("Selecciona una máquina"); return; }
    setSaving(true);
    try {
      const matSelec = materiales.find(m => m.id === Number(material_id));
      const colSelec = materiales.find(m => m.id === Number(colorante_id));
      // Pre-cargar datos técnicos del producto (el inspector puede ajustarlos en arranque)
      const pbPromedio = producto
        ? ((producto.peso_bruto_min + producto.peso_bruto_max) / 2)
        : null;
      const tempPromedio = producto
        ? ((producto.temp_min + producto.temp_max) / 2)
        : null;

      await onGuardar({
        pedido_id: pedido.id,
        maquina_id: Number(maquina_id),
        material_id: material_id ? Number(material_id) : null,
        resina_asignada: matSelec?.nombre ?? null,
        colorante_asignado: colSelec?.nombre ?? null,
        fecha_programada: fecha_programada || null,
        hora_programada: hora_programada || null,
        notas: notas || null,
        // Del catálogo de producto
        cavidades_arranque: producto?.cavidades ?? null,
        peso_bruto_arranque: pbPromedio,
        temperatura_referencia: tempPromedio,
      });
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail ?? "Error al asignar");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500";

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div>
            <h3 className="font-semibold text-white text-sm">Asignar a producción</h3>
            <p className="text-xs text-gray-500 mt-0.5">{pedido.numero_pedido} — {pedido.cliente}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Ficha de producción */}
          <div className="bg-gray-800/60 border border-gray-700 rounded-lg px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Requerimientos</span>
              {pedido.prioridad === "urgente" && (
                <span className="text-xs bg-red-900/40 text-red-400 border border-red-700/40 px-2 py-0.5 rounded-full font-semibold">🔴 URGENTE</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              <span className="text-gray-500">Producto</span>
              <span className="text-white font-medium">{pedido.producto}</span>

              <span className="text-gray-500">Unidades</span>
              <span className="text-white">{pedido.cantidad_unidades?.toLocaleString() ?? "—"} u</span>

              <span className="text-gray-500">Total kg</span>
              <span className="text-blue-400 font-semibold">{pedido.cantidad_kg?.toLocaleString()} kg</span>

              {producto?.resina && <>
                <span className="text-gray-500">Resina</span>
                <span className="text-yellow-400">{producto.resina}</span>
              </>}

              {producto?.colorante && <>
                <span className="text-gray-500">Colorante</span>
                <span className="text-yellow-400">{producto.colorante}</span>
              </>}

              <span className="text-gray-500">Entrega</span>
              <span className={`${new Date(pedido.fecha_entrega) < new Date() ? "text-red-400" : "text-gray-300"}`}>
                {new Date(pedido.fecha_entrega).toLocaleDateString("es-VE", { timeZone: "America/Caracas" })}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Máquina *</label>
            <select required value={maquina_id} onChange={(e) => setMaquinaId(e.target.value)} className={inputCls}>
              <option value="">Seleccionar máquina…</option>
              {maquinas.filter(m => m.estado === "operativa").map(m => (
                <option key={m.id} value={m.id}>{m.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-gray-400">Materia prima</label>
              <span className="text-xs text-amber-500 font-medium">↑ FIFO — más antiguo primero</span>
            </div>
            <select value={material_id} onChange={(e) => setMaterialId(e.target.value)} className={inputCls}>
              <option value="">Sin asignar…</option>
              {materiasPrimas.map((m, i) => (
                <option key={m.id} value={m.id}>
                  {i === 0 ? "★ " : ""}{m.nombre} — {(m.stock_disponible ?? 0).toLocaleString("es-VE")} {m.unidad ?? ""}{m.fecha_ingreso ? ` · ingreso ${m.fecha_ingreso.slice(0,10)}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-gray-400">Colorante</label>
              {colorantes.length > 0 && <span className="text-xs text-amber-500 font-medium">↑ FIFO</span>}
            </div>
            {colorantes.length === 0 ? (
              <div className={`${inputCls} text-gray-600 cursor-not-allowed`}>No hay colorantes disponibles</div>
            ) : (
              <select value={colorante_id} onChange={(e) => setColoranteId(e.target.value)} className={inputCls}>
                <option value="">Sin colorante…</option>
                {colorantes.map((m, i) => (
                  <option key={m.id} value={m.id}>
                    {i === 0 ? "★ " : ""}{m.nombre} — {(m.stock_disponible ?? 0).toLocaleString("es-VE")} {m.unidad ?? ""}{m.fecha_ingreso ? ` · ingreso ${m.fecha_ingreso.slice(0,10)}` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Fecha programada</label>
              <input type="date" value={fecha_programada} onChange={(e) => setFecha(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Hora estipulada</label>
              <input type="time" value={hora_programada} onChange={(e) => setHora(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Notas</label>
            <textarea rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Instrucciones especiales…" className={`${inputCls} resize-none`} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg">
              {saving ? "Asignando…" : "Asignar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal Ver orden de producción (solo lectura) ──────────────────
function ModalIniciar({ planItem, pedido, producto, maquina, onClose }) {
  const fila = (label, val, color = "text-white") => val != null ? (
    <><span className="text-gray-500">{label}</span><span className={`font-medium ${color}`}>{val}</span></>
  ) : null;

  // Estimados estáticos con datos del producto
  const cav      = producto?.cavidades;
  const pbKg     = producto?.peso_bruto_max;
  const segCiclo = maquina?.tiempo_ciclo_estandar;
  const cantKg   = pedido?.cantidad_kg;
  const kgCiclo  = cav && pbKg ? cav * pbKg : null;
  const ciclosTot = kgCiclo && cantKg ? Math.ceil(cantKg / kgCiclo) : null;
  const segTot    = ciclosTot && segCiclo ? ciclosTot * segCiclo : null;
  const durFmt    = segTot ? (() => {
    const h = Math.floor(segTot / 3600), m = Math.floor((segTot % 3600) / 60);
    return h > 0 ? `${h}h ${m}min` : `${m}min`;
  })() : null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md my-4">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div>
            <h3 className="font-semibold text-white">Orden de Producción</h3>
            <p className="text-xs text-gray-500 mt-0.5">{pedido?.numero_pedido} · {pedido?.cliente} · {maquina?.nombre}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
        </div>

        <div className="p-5 space-y-4">

          {/* Pedido */}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Pedido</p>
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              {fila("Cliente",         pedido?.cliente)}
              {fila("Producto",        pedido?.producto)}
              {fila("Unidades",        pedido?.cantidad_unidades ? `${pedido.cantidad_unidades.toLocaleString()} u` : null, "text-blue-400")}
              {fila("Kg a fabricar",   cantKg ? `${cantKg.toLocaleString()} kg` : null,  "text-blue-400")}
              {fila("Hora estipulada", planItem?.hora_programada,                         "text-orange-400")}
              {fila("Fecha arranque",  planItem?.fecha_programada ? planItem.fecha_programada.slice(0,10).split("-").reverse().join("/") : null, "text-gray-300")}
            </div>
          </div>

          {/* Ficha del producto */}
          {producto && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Ficha de producto</p>
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                {fila("Molde",       producto.molde)}
                {fila("Cavidades",   `${producto.cavidades} cav.`,                            "text-purple-300")}
                {fila("Peso neto",   `${producto.peso_env_min} – ${producto.peso_env_max} kg`, "text-green-300")}
                {fila("Peso bruto",  `${producto.peso_bruto_min} – ${producto.peso_bruto_max} kg`, "text-green-300")}
                {fila("Temperatura", `${producto.temp_min} – ${producto.temp_max} °C`,        "text-red-300")}
                {fila("Resina",      planItem?.resina_asignada  ?? producto.resina,            "text-yellow-400")}
                {fila("Colorante",   planItem?.colorante_asignado ?? producto.colorante,       "text-yellow-400")}
              </div>
            </div>
          )}

          {/* Estimados de producción */}
          {durFmt && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Estimados</p>
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                {fila("Kg por ciclo",      `${kgCiclo.toFixed(3)} kg`,           "text-blue-400")}
                {fila("Ciclos totales",    ciclosTot.toLocaleString(),            "text-green-400")}
                {segCiclo && fila("Ciclo máquina", `${segCiclo} s/ciclo`,        "text-gray-300")}
                {fila("Duración est.",     durFmt,                                "text-orange-400")}
              </div>
            </div>
          )}

          <button onClick={onClose}
            className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-xl transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal Completar producción ────────────────────────────────────
function ModalCompletar({ planItem, pedido, directorio, onClose, onCompletar }) {
  const inputCls = "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500";

  const [envases, setEnvases]       = useState("");
  const [rechazo, setRechazo]       = useState("0");
  const [inspProd, setInspProd]     = useState("");
  const [inspCal, setInspCal]       = useState("");
  const [personal, setPersonal]     = useState([]);   // [{id,nombre,rol}]
  const [busqueda, setBusqueda]     = useState("");
  const [saving, setSaving]         = useState(false);

  const disponibles = directorio.filter(u =>
    !personal.find(p => p.id === u.id) &&
    u.id !== Number(inspProd) && u.id !== Number(inspCal) &&
    (busqueda === "" || u.nombre_completo.toLowerCase().includes(busqueda.toLowerCase()) || u.rol.includes(busqueda.toLowerCase()))
  );

  const addPersonal = (u) => { setPersonal(prev => [...prev, { id: u.id, nombre: u.nombre_completo, rol: u.rol }]); setBusqueda(""); };
  const removePersonal = (id) => setPersonal(prev => prev.filter(p => p.id !== id));

  const rolLabel = (rol) => rol.replace(/_/g, " ");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onCompletar(planItem.id, {
        estado: "completado",
        hora_finalizacion: new Date().toISOString(),
        envases_producidos: envases ? Number(envases) : null,
        kg_consumidos: envases && planItem.peso_bruto_arranque
          ? (() => {
              const buenos = Number(envases);
              const rechazados = Math.round(buenos * Number(rechazo || 0) / 100);
              return Number(((buenos + rechazados) * planItem.peso_bruto_arranque).toFixed(3));
            })()
          : null,
        indice_rechazo: rechazo !== "" ? Number(rechazo) : null,
        inspector_produccion_id: inspProd ? Number(inspProd) : null,
        inspector_calidad_id: inspCal ? Number(inspCal) : null,
        personal_adicional: personal.length ? JSON.stringify(personal) : null,
      });
      onClose();
    } catch { } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md my-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div>
            <h3 className="font-semibold text-white text-sm">Completar producción</h3>
            <p className="text-xs text-gray-500 mt-0.5">{pedido?.numero_pedido} — {pedido?.cliente}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* Producción */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Producción</p>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Envases buenos fabricados *</label>
              <input type="number" required min="0" step="1" value={envases}
                onChange={e => setEnvases(e.target.value)}
                placeholder={pedido?.cantidad_unidades ?? "0"} className={inputCls} />
            </div>
            <div className="mt-3">
              <label className="block text-xs text-gray-400 mb-1.5">Índice de rechazo (%)</label>
              <input type="number" min="0" max="100" step="0.1" value={rechazo}
                onChange={e => setRechazo(e.target.value)}
                className={inputCls} />
            </div>

            {/* Desglose automático */}
            {envases && (
              <div className="bg-gray-800/60 border border-gray-700 rounded-lg px-4 py-3 space-y-1.5 text-xs mt-1">
                {(() => {
                  const buenos     = Number(envases);
                  const rechazados = Math.round(buenos * Number(rechazo || 0) / 100);
                  const total      = buenos + rechazados;
                  const pesoBruto  = planItem.peso_bruto_arranque;
                  const kgTotal    = pesoBruto ? (total * pesoBruto).toFixed(3) : null;
                  const kgBuenos   = pesoBruto ? (buenos * pesoBruto).toFixed(3) : null;
                  const kgRechazo  = pesoBruto ? (rechazados * pesoBruto).toFixed(3) : null;
                  return (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Envases buenos</span>
                        <span className="text-green-400 font-semibold">{buenos.toLocaleString()} u{kgBuenos ? ` · ${kgBuenos} kg` : ""}</span>
                      </div>
                      {rechazados > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Rechazados</span>
                          <span className="text-red-400 font-semibold">{rechazados.toLocaleString()} u{kgRechazo ? ` · ${kgRechazo} kg` : ""}</span>
                        </div>
                      )}
                      {kgTotal && (
                        <div className="flex justify-between border-t border-gray-700 pt-1.5 mt-0.5">
                          <span className="text-gray-300 font-semibold">Kg consumidos totales</span>
                          <span className="text-blue-400 font-bold">{kgTotal} kg</span>
                        </div>
                      )}
                      {!pesoBruto && (
                        <p className="text-yellow-600">Kg se calculará cuando molino registre el peso bruto</p>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Inspectores */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Inspectores</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Inspector de producción</label>
                <select value={inspProd} onChange={e => setInspProd(e.target.value)} className={inputCls}>
                  <option value="">Sin asignar…</option>
                  {directorio.filter(u => ["jefe_produccion","inspector_produccion","molinero"].includes(u.rol)).map(u => (
                    <option key={u.id} value={u.id}>{u.nombre_completo} — {rolLabel(u.rol)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Inspector de calidad</label>
                <select value={inspCal} onChange={e => setInspCal(e.target.value)} className={inputCls}>
                  <option value="">Sin asignar…</option>
                  {directorio.filter(u => ["jefe_calidad","inspector_calidad"].includes(u.rol)).map(u => (
                    <option key={u.id} value={u.id}>{u.nombre_completo} — {rolLabel(u.rol)}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Personal adicional */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Personal que participó</p>
            {personal.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {personal.map(p => (
                  <span key={p.id} className="flex items-center gap-1 text-xs bg-gray-800 border border-gray-700 text-gray-300 px-2 py-1 rounded-full">
                    {p.nombre}
                    <button type="button" onClick={() => removePersonal(p.id)} className="text-gray-500 hover:text-red-400 ml-0.5">×</button>
                  </span>
                ))}
              </div>
            )}
            <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar y agregar personal…" className={inputCls} />
            {busqueda && disponibles.length > 0 && (
              <div className="mt-1 bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
                {disponibles.slice(0, 5).map(u => (
                  <button type="button" key={u.id} onClick={() => addPersonal(u)}
                    className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-gray-700 flex justify-between">
                    <span>{u.nombre_completo}</span>
                    <span className="text-gray-500">{rolLabel(u.rol)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg">
              {saving ? "Guardando…" : "Completar producción"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal Detalle producción completada ──────────────────────────
function ModalDetalle({ planItem, pedido, producto, maquina, directorio, onClose }) {
  const fmt = (iso) => {
    if (!iso) return "—";
    const s = iso.endsWith("Z") ? iso : iso + "Z";
    return new Date(s).toLocaleString("es-VE", { timeZone: "America/Caracas", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  // Tiempos
  const arranque    = planItem.hora_arranque ? new Date(planItem.hora_arranque.endsWith("Z") ? planItem.hora_arranque : planItem.hora_arranque + "Z") : null;
  const fin         = planItem.hora_finalizacion ? new Date(planItem.hora_finalizacion.endsWith("Z") ? planItem.hora_finalizacion : planItem.hora_finalizacion + "Z") : null;
  const durSegReal  = arranque && fin ? Math.floor((fin - arranque) / 1000) : null;
  const durFmt = (s) => { if (!s) return "—"; const h = Math.floor(s/3600), m = Math.floor((s%3600)/60); return h > 0 ? `${h}h ${m}min` : `${m}min`; };

  // Ciclos y kg reales
  const kgCiclo    = planItem.cavidades_arranque && planItem.peso_bruto_arranque ? planItem.cavidades_arranque * planItem.peso_bruto_arranque : null;
  const ciclosEst  = kgCiclo && pedido?.cantidad_kg ? Math.ceil(pedido.cantidad_kg / kgCiclo) : null;
  const segCicloMaq = maquina?.tiempo_ciclo_estandar;
  const durEstSeg  = ciclosEst && segCicloMaq ? ciclosEst * segCicloMaq : null;

  // Cumplimiento de fecha
  const fechaEntrega = pedido?.fecha_entrega ? new Date(pedido.fecha_entrega.endsWith("Z") ? pedido.fecha_entrega : pedido.fecha_entrega + "Z") : null;
  let cumplimiento = null;
  if (fin && fechaEntrega) {
    const diffMs = fechaEntrega - fin;
    const diffH  = Math.round(diffMs / 3600000);
    if (diffH >= 0) cumplimiento = { ok: true,  label: `Entregado ${diffH >= 24 ? Math.floor(diffH/24)+"d " : ""}${diffH%24}h antes` };
    else            cumplimiento = { ok: false, label: `Retrasado ${Math.abs(diffH) >= 24 ? Math.floor(Math.abs(diffH)/24)+"d " : ""}${Math.abs(diffH)%24}h` };
  }

  // Comparar arranque real vs estipulado
  let puntualidad = null;
  if (arranque && planItem.fecha_programada && planItem.hora_programada) {
    const estStr = planItem.fecha_programada.slice(0,10) + "T" + planItem.hora_programada + ":00Z";
    const est    = new Date(estStr);
    const diffM  = Math.round((arranque - est) / 60000);
    if (Math.abs(diffM) <= 5)    puntualidad = { ok: true,  label: "Arrancó puntual" };
    else if (diffM > 0) puntualidad = { ok: false, label: `Arrancó ${diffM}min tarde` };
    else                puntualidad = { ok: true,  label: `Arrancó ${Math.abs(diffM)}min antes` };
  }

  // Personal
  const inspProd = planItem.inspector_produccion_id ? directorio.find(u => u.id === planItem.inspector_produccion_id) : null;
  const inspCal  = planItem.inspector_calidad_id    ? directorio.find(u => u.id === planItem.inspector_calidad_id)    : null;
  const personal = planItem.personal_adicional ? (() => { try { return JSON.parse(planItem.personal_adicional); } catch { return []; } })() : [];

  const Fila = ({ label, value, color }) => (
    <div className="flex justify-between items-center py-1.5 border-b border-gray-800/50">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-xs font-medium ${color ?? "text-gray-200"}`}>{value ?? "—"}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg my-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div>
            <h3 className="font-semibold text-white">Detalle de producción</h3>
            <p className="text-xs text-gray-500 mt-0.5">{pedido?.numero_pedido} — {pedido?.cliente}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">×</button>
        </div>

        <div className="p-6 space-y-5 text-sm">

          {/* Cumplimiento */}
          {(cumplimiento || puntualidad) && (
            <div className="flex gap-3">
              {cumplimiento && (
                <div className={`flex-1 rounded-lg px-3 py-2.5 text-xs font-semibold text-center border ${cumplimiento.ok ? "bg-green-900/20 border-green-700/30 text-green-400" : "bg-red-900/20 border-red-700/30 text-red-400"}`}>
                  {cumplimiento.ok ? "✓" : "✗"} {cumplimiento.label}
                </div>
              )}
              {puntualidad && (
                <div className={`flex-1 rounded-lg px-3 py-2.5 text-xs font-semibold text-center border ${puntualidad.ok ? "bg-blue-900/20 border-blue-700/30 text-blue-400" : "bg-orange-900/20 border-orange-700/30 text-orange-400"}`}>
                  {puntualidad.label}
                </div>
              )}
            </div>
          )}

          {/* Pedido info */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Pedido</p>
            <Fila label="Producto"        value={pedido?.producto} />
            <Fila label="Unidades pedido" value={pedido?.cantidad_unidades?.toLocaleString() + " u"} />
            <Fila label="Kg pedido"       value={pedido?.cantidad_kg?.toLocaleString() + " kg"} />
          </div>

          {/* TIEMPOS — arriba */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Tiempos</p>
            <Fila label="Fecha entrega requerida"  value={pedido?.fecha_entrega ? new Date(pedido.fecha_entrega).toLocaleDateString("es-VE") : null} />
            <Fila label="Hora estipulada arranque" value={planItem.fecha_programada && planItem.hora_programada ? planItem.fecha_programada.slice(0,10) + " " + planItem.hora_programada : null} />
            <Fila label="Arranque real"            value={fmt(planItem.hora_arranque)} color="text-yellow-400" />
            <Fila label="Finalización"             value={fmt(planItem.hora_finalizacion)} color="text-green-400" />
            <Fila label="Duración real"            value={durFmt(durSegReal)} />
            <Fila label="Duración estimada"        value={durFmt(durEstSeg)} color="text-gray-400" />
          </div>

          {/* REFERENCIA DEL PRODUCTO — encima de datos técnicos */}
          {producto && (
            <div className="bg-gray-800/40 border border-gray-700/40 rounded-lg px-3 py-2.5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Referencia del producto</p>
              <Fila label="Cavidades ref."   value={producto.cavidades} />
              <Fila label="Peso neto ref."   value={`${(producto.peso_env_min * 1000).toFixed(0)}–${(producto.peso_env_max * 1000).toFixed(0)} g`} color="text-gray-400" />
              <Fila label="Peso bruto ref."  value={`${(producto.peso_bruto_min * 1000).toFixed(0)}–${(producto.peso_bruto_max * 1000).toFixed(0)} g`} color="text-gray-400" />
              <Fila label="Temperatura ref." value={`${producto.temp_min}–${producto.temp_max} °C`} color="text-gray-400" />
            </div>
          )}

          {/* DATOS TÉCNICOS — bloque unificado */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Datos técnicos</p>

            <Fila label="Máquina"          value={maquina?.nombre} />
            {producto?.molde && <Fila label="Molde" value={producto.molde} />}
            <Fila label="Ciclo"            value={segCicloMaq ? segCicloMaq + " s/ciclo" : null} />
            <Fila label="Cavidades"        value={planItem.cavidades_arranque} />
            <Fila label="Peso bruto"       value={formatPesoKg(planItem.peso_bruto_arranque)} />
            <Fila label="Kg por ciclo"     value={kgCiclo ? kgCiclo.toFixed(3) + " kg" : null} />
            <Fila label="Ciclos estimados" value={ciclosEst?.toLocaleString()} />
            <Fila label="Resina"           value={planItem.resina_asignada} color="text-yellow-400" />
            <Fila label="Colorante"        value={planItem.colorante_asignado} color="text-yellow-400" />

            {/* Resultados de producción */}
            <div className="mt-3 pt-3 border-t border-gray-800/50">
              {(() => {
                const buenos     = planItem.envases_producidos || 0;
                const rechazados = Math.round(buenos * (planItem.indice_rechazo || 0) / 100);
                const total      = buenos + rechazados;
                const kgReal     = planItem.peso_bruto_arranque ? Number((total * planItem.peso_bruto_arranque).toFixed(3)) : null;
                return (<>
                  <Fila label="Envases fabricados"  value={buenos ? buenos.toLocaleString() + " u" : null} color="text-green-400" />
                  <Fila label="Índice de rechazo"   value={planItem.indice_rechazo != null ? `${planItem.indice_rechazo}% ≈ ${rechazados} u rechazadas` : null} color={planItem.indice_rechazo > 5 ? "text-red-400" : "text-gray-200"} />
                  <Fila label="Kg consumidos"       value={kgReal ? kgReal.toLocaleString("es-VE") + " kg" : planItem.kg_consumidos ? planItem.kg_consumidos.toLocaleString("es-VE") + " kg" : null} color="text-blue-400" />
                </>);
              })()}
            </div>

          </div>

          {/* Personal */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Personal del turno</p>
            <Fila label="Inspector producción" value={inspProd ? inspProd.nombre_completo : null} />
            <Fila label="Inspector calidad"    value={inspCal  ? inspCal.nombre_completo  : null} />
            {personal.length > 0 && (
              <div className="pt-1.5">
                <p className="text-xs text-gray-500 mb-1.5">Personal adicional</p>
                <div className="flex flex-wrap gap-1.5">
                  {personal.map((p, i) => (
                    <span key={i} className="text-xs bg-gray-800 border border-gray-700 text-gray-300 px-2 py-0.5 rounded-full">
                      {p.nombre} <span className="text-gray-600">· {p.rol?.replace(/_/g," ")}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>

        <div className="px-6 pb-5">
          <button onClick={onClose} className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Countdown en_curso ────────────────────────────────────────────
function CuentaRegresiva({ planItem, pedido, maquina }) {
  const calcFin = () => {
    if (!planItem.hora_arranque || !planItem.cavidades_arranque || !planItem.peso_bruto_arranque || !maquina?.tiempo_ciclo_estandar || !pedido?.cantidad_kg) return null;
    const kgCiclo = (planItem.cavidades_arranque * planItem.peso_bruto_arranque);
    if (kgCiclo <= 0) return null;
    const ciclos = Math.ceil(pedido.cantidad_kg / kgCiclo);
    const durSeg = ciclos * maquina.tiempo_ciclo_estandar;
    const inicio = new Date(planItem.hora_arranque.endsWith("Z") ? planItem.hora_arranque : planItem.hora_arranque + "Z");
    return new Date(inicio.getTime() + durSeg * 1000);
  };

  const [restante, setRestante] = useState(() => {
    const fin = calcFin();
    return fin ? Math.max(0, Math.floor((fin - Date.now()) / 1000)) : null;
  });

  useEffect(() => {
    const fin = calcFin();
    if (!fin) return;
    const id = setInterval(() => setRestante(Math.max(0, Math.floor((fin - Date.now()) / 1000))), 1000);
    return () => clearInterval(id);
  }, [planItem.hora_arranque, planItem.cavidades_arranque, planItem.peso_bruto_arranque]);

  if (restante === null) return null;

  const h = Math.floor(restante / 3600);
  const m = Math.floor((restante % 3600) / 60);
  const s = restante % 60;
  const fmt = h > 0
    ? `${h}h ${String(m).padStart(2,"0")}m ${String(s).padStart(2,"0")}s`
    : `${String(m).padStart(2,"0")}m ${String(s).padStart(2,"0")}s`;
  const urgente = restante < 1800; // < 30 min
  const terminado = restante === 0;

  return (
    <span className={`text-xs font-mono font-semibold ${terminado ? "text-green-400 animate-pulse" : urgente ? "text-red-400" : "text-orange-400"}`}>
      {terminado ? "⏱ Listo" : `⏱ ${fmt}`}
    </span>
  );
}

// ── Countdown al arranque programado (planificado) ────────────────
function CuentaRegresivaArranque({ fecha_programada, hora_programada }) {
  const calcFin = () => {
    if (!fecha_programada || !hora_programada) return null;
    return new Date(`${fecha_programada.slice(0,10)}T${hora_programada}:00`);
  };

  const [restante, setRestante] = useState(() => {
    const fin = calcFin();
    return fin ? Math.floor((fin - Date.now()) / 1000) : null;
  });

  useEffect(() => {
    const fin = calcFin();
    if (!fin) return;
    const id = setInterval(() => setRestante(Math.floor((fin - Date.now()) / 1000)), 1000);
    return () => clearInterval(id);
  }, [fecha_programada, hora_programada]);

  if (restante === null) return null;

  if (restante <= 0) {
    return <span className="text-xs font-mono font-semibold text-yellow-400 animate-pulse">⚡ Hora de arrancar</span>;
  }

  const dias = Math.floor(restante / 86400);
  const h    = Math.floor((restante % 86400) / 3600);
  const m    = Math.floor((restante % 3600) / 60);
  const s    = restante % 60;
  const fmt  = dias > 0
    ? `${dias}d ${h}h ${String(m).padStart(2,"0")}m`
    : h > 0
    ? `${h}h ${String(m).padStart(2,"0")}m ${String(s).padStart(2,"0")}s`
    : `${String(m).padStart(2,"0")}m ${String(s).padStart(2,"0")}s`;
  const urgente = restante < 7200;

  return (
    <span className={`text-xs font-mono font-semibold ${urgente ? "text-orange-400" : "text-gray-400"}`}>
      🕐 {fmt}
    </span>
  );
}

// ── Página principal ──────────────────────────────────────────────
export default function PlanificacionPage() {
  const [pedidos, setPedidos]       = useState([]);
  const [maquinas, setMaquinas]     = useState([]);
  const [plan, setPlan]             = useState([]);
  const [productos, setProductos]   = useState([]);
  const [materiales, setMateriales]   = useState([]);
  const [directorio, setDirectorio]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [modalPedido, setModalPedido]       = useState(null);
  const [modalIniciar, setModalIniciar]     = useState(null);
  const [modalCompletar, setModalCompletar] = useState(null);
  const [modalDetalle, setModalDetalle]     = useState(null);
  const [modalEditar, setModalEditar]       = useState(null);
  const [tabCronograma, setTabCronograma]   = useState("activos");

  const cargar = async () => {
    try {
      const [rPed, rMaq, rPlan, rProd, rMat, rDir] = await Promise.all([getPedidos(), getMaquinas(), getPlan(), getProductos(), getMateriales(), getDirectorio()]);
      setPedidos(rPed.data);
      setMaquinas(rMaq.data.filter(m => !/^test/i.test(m.nombre) && m.estado !== "mantenimiento" && m.estado !== "falla"));
      setPlan(rPlan.data);
      setProductos(rProd.data);
      setMateriales(rMat.data);
      setDirectorio(rDir.data);
    } catch {
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const handleAsignar = async (data) => {
    await asignarPlan(data);
    toast.success("Pedido asignado a producción ✓");
    cargar();
  };

  const cambiarEstado = async (planId, data) => {
    try {
      await actualizarPlan(planId, typeof data === "string" ? { estado: data } : data);
      toast.success("Estado actualizado");
      cargar();
    } catch { toast.error("Error al actualizar"); }
  };

  const quitar = async (planId) => {
    try {
      await quitarPlan(planId);
      toast.success("Quitado del plan");
      cargar();
    } catch { toast.error("Error al quitar"); }
  };

  // Pedidos pendientes o en_proceso sin plan asignado, ordenados urgente primero luego fecha
  const pedidosEnPlan = new Set(plan.map(p => p.pedido_id));
  const pedidosPendientes = pedidos
    .filter(p => (p.estado === "en_espera" || p.estado === "pendiente" || p.estado === "en_proceso") && !pedidosEnPlan.has(p.id))
    .sort((a, b) => {
      if (a.prioridad === "urgente" && b.prioridad !== "urgente") return -1;
      if (b.prioridad === "urgente" && a.prioridad !== "urgente") return 1;
      return new Date(a.fecha_entrega) - new Date(b.fecha_entrega);
    });

  // Estadísticas
  const urgentes   = pedidos.filter(p => p.prioridad === "urgente" && p.estado === "en_espera").length;
  const pendientes = pedidos.filter(p => p.estado === "en_espera").length;
  const maqOperativas = maquinas.filter(m => m.estado === "operativa").length;
  const enCurso = plan.filter(p => p.estado === "en_curso").length;

  // Mapa para lookups rápidos
  const maqMap = Object.fromEntries(maquinas.map(m => [m.id, m]));
  const pedMap = Object.fromEntries(pedidos.map(p => [p.id, p]));

  if (loading) return <div className="p-6 text-gray-400 animate-pulse">Cargando planificación…</div>;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Planificación</h1>
        <p className="text-gray-400 text-sm mt-0.5">Control de producción por orden de urgencia</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Urgentes",          value: urgentes,      color: "text-red-400",    bg: "border-red-800/30" },
          { label: "Pendientes",        value: pendientes,    color: "text-yellow-400", bg: "border-yellow-800/30" },
          { label: "Máq. disponibles",   value: maqOperativas, color: "text-green-400",  bg: "border-green-800/30" },
          { label: "En producción",     value: enCurso,       color: "text-blue-400",   bg: "border-blue-800/30" },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`bg-gray-900 border ${bg} rounded-xl p-4`}>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-400 mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Cola de producción (sin asignar) ── */}
        <div className="lg:col-span-1 space-y-3">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
            Cola de pedidos
            <span className="ml-2 text-gray-600 font-normal normal-case">sin asignar</span>
          </h2>

          {pedidosPendientes.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl py-8 text-center text-gray-600 text-sm">
              Sin pedidos pendientes
            </div>
          ) : (
            pedidosPendientes.map((p, idx) => (
              <div
                key={p.id}
                className={`bg-gray-900 border rounded-xl p-4 space-y-2 ${
                  p.prioridad === "urgente" ? "border-red-700/50" : "border-gray-800"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-600">#{idx + 1}</span>
                    {p.prioridad === "urgente" && (
                      <span className="text-xs bg-red-900/40 text-red-400 border border-red-700/40 px-2 py-0.5 rounded-full font-semibold">🔴 URGENTE</span>
                    )}
                  </div>
                  <span className="text-xs font-mono text-blue-400 bg-gray-800 px-2 py-0.5 rounded">{p.numero_pedido}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{p.cliente}</p>
                  <p className="text-xs text-gray-400">{p.producto}</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{p.cantidad_unidades?.toLocaleString()} u</span>
                  <span>·</span>
                  <span>{p.cantidad_kg?.toLocaleString()} kg</span>
                  <span>·</span>
                  <span className={new Date(p.fecha_entrega) < new Date() ? "text-red-400" : ""}>
                    {new Date(p.fecha_entrega).toLocaleDateString("es-VE", { timeZone: "America/Caracas" })}
                  </span>
                </div>
                <button
                  onClick={() => setModalPedido(p)}
                  className="w-full mt-1 py-1.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 text-xs font-semibold rounded-lg border border-blue-600/30 transition-colors"
                >
                  + Asignar a máquina
                </button>
              </div>
            ))
          )}
        </div>

        {/* ── Estado de máquinas + cronograma ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Máquinas */}
          <div>
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Estado de máquinas</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {maquinas.map(m => {
                const asignados = plan.filter(pl => pl.maquina_id === m.id && pl.estado !== "completado");
                return (
                  <div key={m.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-medium text-white truncate">{m.nombre}</p>
                      <Badge value={m.estado} />
                    </div>
                    <p className="text-xs text-gray-500">
                      {asignados.length > 0
                        ? <span className="text-blue-400">{asignados.length} pedido{asignados.length > 1 ? "s" : ""} asignado{asignados.length > 1 ? "s" : ""}</span>
                        : <span className="text-gray-600">Sin asignación</span>
                      }
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cronograma / plan */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Cronograma de producción</h2>
              <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-lg p-1">
                {[
                  { key: "activos",    label: "Activos",     count: plan.filter(p => p.estado !== "completado").length },
                  { key: "completados",label: "Completados", count: plan.filter(p => p.estado === "completado").length },
                ].map(({ key, label, count }) => (
                  <button key={key} onClick={() => setTabCronograma(key)}
                    className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                      tabCronograma === key
                        ? key === "completados" ? "bg-green-700 text-white" : "bg-blue-600 text-white"
                        : "text-gray-400 hover:text-white"
                    }`}>
                    {label}
                    {count > 0 && <span className={`text-xs px-1 rounded ${tabCronograma === key ? "bg-white/20" : "bg-gray-700"}`}>{count}</span>}
                  </button>
                ))}
              </div>
            </div>

            {(() => {
              const items = plan
                .filter(p => tabCronograma === "activos" ? p.estado !== "completado" : p.estado === "completado")
                .map(pl => ({ ...pl, pedido: pedMap[pl.pedido_id], maquina: maqMap[pl.maquina_id] }))
                .sort((a, b) => {
                  if (tabCronograma === "completados") return new Date(b.hora_finalizacion ?? 0) - new Date(a.hora_finalizacion ?? 0);
                  const aUrg = a.pedido?.prioridad === "urgente" ? 0 : 1;
                  const bUrg = b.pedido?.prioridad === "urgente" ? 0 : 1;
                  return aUrg - bUrg || a.orden - b.orden;
                });

              if (items.length === 0) return (
                <div className="bg-gray-900 border border-gray-800 rounded-xl py-10 text-center text-gray-600 text-sm">
                  {tabCronograma === "activos" ? "Sin pedidos activos — asigna pedidos de la cola" : "Sin producciones completadas aún"}
                </div>
              );

              return (
                <div className="space-y-2">
                  {items.map((pl) => {
                    const ep = ESTADO_PLAN[pl.estado] ?? ESTADO_PLAN.planificado;
                    return (
                      <div key={pl.id} className={`bg-gray-900 border rounded-xl p-4 flex items-center gap-4 ${pl.estado === "completado" ? "border-green-900/30" : "border-gray-800"}`}>
                        <div className="shrink-0 text-center w-14">
                          {pl.pedido?.prioridad === "urgente" && pl.estado !== "completado" && <div className="text-xs text-red-400 mb-0.5">🔴</div>}
                          <span className="text-xs font-mono text-blue-400">{pl.pedido?.numero_pedido ?? `#${pl.pedido_id}`}</span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{pl.pedido?.cliente ?? "—"}</p>
                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5 flex-wrap">
                            <span>{pl.pedido?.producto}</span>
                            {pl.maquina && <span className="text-gray-600">· {pl.maquina.nombre}</span>}
                            {pl.estado === "completado" && pl.hora_finalizacion && (
                              <span className="text-green-600">· Completado {new Date(pl.hora_finalizacion + "Z").toLocaleString("es-VE", { timeZone: "America/Caracas", day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" })}</span>
                            )}
                            {pl.estado !== "completado" && pl.fecha_programada && (
                              <span>· {pl.fecha_programada.slice(0,10).split("-").reverse().join("/")}{pl.hora_programada ? ` ${pl.hora_programada}` : ""}</span>
                            )}
                          </div>
                          {pl.estado === "completado" && pl.envases_producidos && (
                            <div className="flex gap-3 mt-1 text-xs">
                              <span className="text-green-400">{pl.envases_producidos.toLocaleString()} envases</span>
                              {pl.indice_rechazo > 0 && <span className="text-red-400">{pl.indice_rechazo}% rechazo</span>}
                            </div>
                          )}
                          {pl.notas && pl.estado !== "completado" && <p className="text-xs text-gray-600 mt-0.5 truncate">{pl.notas}</p>}
                        </div>

                        <div className="shrink-0 flex flex-col items-end gap-2">
                          <div className="flex items-center gap-2">
                            {pl.estado === "planificado" && pl.fecha_programada && pl.hora_programada && (
                              <CuentaRegresivaArranque fecha_programada={pl.fecha_programada} hora_programada={pl.hora_programada} />
                            )}
                            {pl.estado === "en_curso" && (
                              <CuentaRegresiva planItem={pl} pedido={pedMap[pl.pedido_id]} maquina={maqMap[pl.maquina_id]} />
                            )}
                            <span className={`text-xs font-medium border px-2 py-0.5 rounded-full ${ep.color}`}>{ep.label}</span>
                          </div>
                          <div className="flex gap-1">
                            {pl.estado === "planificado" && (
                              <button onClick={() => setModalIniciar(pl)} className="text-xs px-2 py-1 bg-yellow-600/20 text-yellow-400 border border-yellow-600/30 rounded-lg hover:bg-yellow-600/40">
                                Ver
                              </button>
                            )}
                            {pl.estado === "en_curso" && (
                              <button onClick={() => setModalIniciar(pl)} className="text-xs px-2 py-1 bg-yellow-600/20 text-yellow-400 border border-yellow-600/30 rounded-lg hover:bg-yellow-600/40">
                                Ver
                              </button>
                            )}
                            {pl.estado !== "completado" && (
                              <button onClick={() => setModalEditar(pl)} className="text-xs px-2 py-1 bg-gray-700/50 text-gray-300 border border-gray-600/40 rounded-lg hover:bg-gray-600/60">
                                ✎
                              </button>
                            )}
                            {pl.estado === "completado" && (
                              <button onClick={() => setModalDetalle(pl)} className="text-xs px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white border border-gray-700 rounded-lg">
                                Ver más
                              </button>
                            )}
                            {pl.estado !== "completado" && (
                              <button onClick={() => quitar(pl.id)} className="text-xs px-2 py-1 bg-gray-800 text-gray-500 border border-gray-700 rounded-lg hover:text-red-400">
                                ✕
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

        </div>
      </div>

      {modalPedido && (
        <ModalAsignar
          pedido={modalPedido}
          maquinas={maquinas}
          producto={productos.find(p => p.id === modalPedido.producto_id) ?? null}
          materiales={materiales}
          onClose={() => setModalPedido(null)}
          onGuardar={handleAsignar}
        />
      )}

      {modalDetalle && (
        <ModalDetalle
          planItem={modalDetalle}
          pedido={pedMap[modalDetalle.pedido_id]}
          producto={productos.find(p => p.id === pedMap[modalDetalle.pedido_id]?.producto_id) ?? null}
          maquina={maqMap[modalDetalle.maquina_id] ?? null}
          directorio={directorio}
          onClose={() => setModalDetalle(null)}
        />
      )}

      {modalCompletar && (
        <ModalCompletar
          planItem={modalCompletar}
          pedido={pedMap[modalCompletar.pedido_id]}
          directorio={directorio}
          onClose={() => setModalCompletar(null)}
          onCompletar={cambiarEstado}
        />
      )}

      {modalIniciar && (
        <ModalIniciar
          planItem={modalIniciar}
          pedido={pedMap[modalIniciar.pedido_id]}
          producto={productos.find(p => p.id === pedMap[modalIniciar.pedido_id]?.producto_id) ?? null}
          maquina={maqMap[modalIniciar.maquina_id] ?? null}
          onClose={() => setModalIniciar(null)}
          onIniciar={cambiarEstado}
        />
      )}

      {modalEditar && (
        <ModalEditarPlan
          planItem={modalEditar}
          pedido={pedMap[modalEditar.pedido_id]}
          maquinas={maquinas}
          materiales={materiales}
          onClose={() => setModalEditar(null)}
          onGuardar={async (id, data) => { await cambiarEstado(id, data); setModalEditar(null); }}
        />
      )}
    </div>
  );
}

// ── Modal Editar Plan ─────────────────────────────────────────────
function ModalEditarPlan({ planItem, pedido, maquinas, materiales, onClose, onGuardar }) {
  const [fecha, setFecha]         = useState(planItem.fecha_programada?.slice(0,10) ?? "");
  const [hora, setHora]           = useState(planItem.hora_programada ?? "");
  const [maquina, setMaquina]     = useState(planItem.maquina_id ?? "");
  const [material, setMaterial]   = useState(planItem.material_id ?? "");
  const [colorante, setColorante] = useState(planItem.colorante_asignado ?? "");
  const [notas, setNotas]         = useState(planItem.notas ?? "");
  const [saving, setSaving]       = useState(false);

  const inputCls = "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors";

  const materiasPrimas = materiales.filter(m => m.categoria === "Materia Prima" && m.stock_disponible > 0);
  const colorantes     = materiales.filter(m => m.categoria === "Colorante" && m.stock_disponible > 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onGuardar(planItem.id, {
        fecha_programada:  fecha || null,
        hora_programada:   hora || null,
        maquina_id:        maquina ? Number(maquina) : null,
        material_id:       material ? Number(material) : null,
        colorante_asignado: colorante || null,
        notas:             notas || null,
      });
    } catch { } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div>
            <h3 className="font-semibold text-white text-sm">Editar plan de producción</h3>
            <p className="text-xs text-gray-500 mt-0.5">{pedido?.numero_pedido} — {pedido?.cliente}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Fecha programada</label>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Hora programada</label>
              <input type="time" value={hora} onChange={e => setHora(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Máquina</label>
            <select value={maquina} onChange={e => setMaquina(e.target.value)} className={inputCls}>
              <option value="">Sin cambio</option>
              {maquinas.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Materia prima</label>
            <select value={material} onChange={e => setMaterial(e.target.value)} className={inputCls}>
              <option value="">Sin cambio</option>
              {materiasPrimas.map(m => <option key={m.id} value={m.id}>{m.nombre} ({m.stock_disponible} {m.unidad})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Colorante</label>
            <select value={colorante} onChange={e => setColorante(e.target.value)} className={inputCls}>
              <option value="">Sin colorante</option>
              {colorantes.map(m => <option key={m.id} value={m.nombre}>{m.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Notas</label>
            <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} className={inputCls + " resize-none"} placeholder="Observaciones..." />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition-colors">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
