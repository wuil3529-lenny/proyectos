import { useEffect, useState } from "react";
import { getMateriales, crearMaterial, actualizarMaterial, eliminarMaterial, consumirMaterial } from "../services/api";
import toast from "react-hot-toast";

function hoy() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Caracas" });
}

function apiError(err, fallback = "Error inesperado") {
  const detail = err?.response?.data?.detail;
  if (Array.isArray(detail)) return detail.map(e => e.msg ?? String(e)).join(", ");
  if (typeof detail === "string") return detail;
  return fallback;
}

function ModalConsumir({ material, onClose, onConsumir }) {
  const [cantidad, setCantidad] = useState("");
  const [saving, setSaving] = useState(false);
  const inputCls = "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onConsumir(Number(cantidad));
      onClose();
    } catch (err) {
      toast.error(apiError(err, "Error al registrar consumo"));
    } finally { setSaving(false); }
  };

  const pct = material.stock_inicial > 0
    ? Math.max(0, ((material.stock_disponible - Number(cantidad || 0)) / material.stock_inicial) * 100)
    : 0;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-xs">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div>
            <h3 className="font-semibold text-white text-sm">Registrar consumo</h3>
            <p className="text-xs text-gray-500 mt-0.5">{material.nombre}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-gray-800/60 rounded-lg px-4 py-3 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Disponible</span>
              <span className="text-white font-semibold">{material.stock_disponible ?? 0} {material.unidad ?? ""}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-1.5">
              <div className="bg-green-500 h-1.5 rounded-full transition-all"
                style={{ width: `${pct}%` }} />
            </div>
            {cantidad && (
              <p className="text-xs text-yellow-400">
                Quedará: {Math.max(0, (material.stock_disponible ?? 0) - Number(cantidad))} {material.unidad ?? ""}
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Cantidad consumida *</label>
            <div className="flex gap-2">
              <input type="number" required min="0.01" step="any" value={cantidad}
                onChange={e => setCantidad(e.target.value)}
                placeholder="0" className={inputCls} />
              {material.unidad && (
                <span className="flex items-center px-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 text-sm">{material.unidad}</span>
              )}
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg">
              {saving ? "Guardando…" : "Descontar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ModalMaterial({ material, onClose, onGuardar }) {
  const esEdicion = Boolean(material);
  const [form, setForm] = useState(esEdicion
    ? {
        nombre:        material.nombre,
        categoria:     material.categoria ?? "",
        proveedor:     material.proveedor ?? "",
        stock_inicial: material.stock_inicial ?? "",
        unidad:        material.unidad ?? "",
        fecha_ingreso: material.fecha_ingreso ?? "",
        numero_lote:   material.numero_lote ?? "",
      }
    : {
        nombre: "", categoria: "", proveedor: "",
        stock_inicial: "", unidad: "",
        fecha_ingreso: hoy(), numero_lote: "",
      }
  );
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        stock_inicial: form.stock_inicial !== "" ? Number(form.stock_inicial) : null,
      };
      await onGuardar(payload);
      onClose();
    } catch (err) {
      toast.error(apiError(err, "Error al guardar"));
    } finally { setSaving(false); }
  };

  const inputCls = "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500";

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h3 className="font-semibold text-white">{esEdicion ? "Editar material" : "Nuevo material"}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Nombre *</label>
            <input type="text" required value={form.nombre} onChange={e => set("nombre", e.target.value)}
              placeholder="Ej: Resina PEAD, Guantes nitrilo, Cartón corrugado…"
              className={inputCls} />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Categoría</label>
            <select value={form.categoria} onChange={e => set("categoria", e.target.value)} className={inputCls}>
              <option value="">Seleccionar categoría…</option>
              {["Materia Prima","Colorante","Mecánica","Matricería","Papelería","Oficina","Mantenimiento"].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Proveedor</label>
            <input type="text" value={form.proveedor} onChange={e => set("proveedor", e.target.value)}
              placeholder="Nombre del proveedor…" className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Cantidad recibida</label>
              <input type="text" inputMode="numeric" value={
                form.stock_inicial === "" ? "" : Number(String(form.stock_inicial).replace(/\./g, "")).toLocaleString("es-VE")
              }
                onChange={e => {
                  const raw = e.target.value.replace(/\./g, "").replace(/[^0-9]/g, "");
                  set("stock_inicial", raw === "" ? "" : Number(raw));
                }}
                placeholder="0" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Unidad</label>
              <select value={form.unidad} onChange={e => set("unidad", e.target.value)} className={inputCls}>
                <option value="Unidad">Unidad</option>
                <option value="Kilogramos">Kilogramos</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Fecha de ingreso</label>
              <input type="date" value={form.fecha_ingreso} onChange={e => set("fecha_ingreso", e.target.value)}
                className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Número de lote</label>
              <input type="text" value={form.numero_lote} onChange={e => set("numero_lote", e.target.value)}
                placeholder="LOT-2026-001" className={inputCls} />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg">
              {saving ? "Guardando…" : esEdicion ? "Guardar" : "Agregar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TarjetaMaterial({ m, agotado, onConsumir, onEditar, onToggle, onEliminar }) {
  return (
    <div className={`bg-gray-900 border rounded-xl p-4 space-y-3 ${agotado ? "border-red-900/40" : m.activo ? "border-gray-800" : "border-gray-800 opacity-50"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{m.nombre}</p>
          {m.proveedor && <p className="text-xs text-gray-500 mt-0.5 truncate">{m.proveedor}</p>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {agotado && (
            <span className="text-xs bg-red-900/30 text-red-400 border border-red-800/40 px-2 py-0.5 rounded-full">Agotado</span>
          )}
          {m.categoria && (
            <span className="text-xs bg-gray-800 text-gray-400 border border-gray-700 px-2 py-0.5 rounded-full">{m.categoria}</span>
          )}
        </div>
      </div>

      {m.stock_inicial != null && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Disponible</span>
            <span className={`font-semibold ${
              agotado ? "text-red-400"
              : (m.stock_disponible / m.stock_inicial) > 0.5 ? "text-green-400"
              : (m.stock_disponible / m.stock_inicial) > 0.2 ? "text-yellow-400"
              : "text-red-400"
            }`}>
              {(m.stock_disponible ?? 0).toLocaleString("es-VE")} / {(m.stock_inicial ?? 0).toLocaleString("es-VE")} {m.unidad ?? ""}
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-1.5">
            <div className={`h-1.5 rounded-full transition-all ${
              agotado ? "bg-red-600"
              : (m.stock_disponible / m.stock_inicial) > 0.5 ? "bg-green-500"
              : (m.stock_disponible / m.stock_inicial) > 0.2 ? "bg-yellow-500"
              : "bg-red-500"
            }`} style={{ width: `${agotado ? 0 : Math.max(0, Math.min(100, (m.stock_disponible / m.stock_inicial) * 100))}%` }} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        {m.fecha_ingreso && (
          <><span className="text-gray-500">Fecha ingreso</span><span className="text-gray-300">{m.fecha_ingreso}</span></>
        )}
        {m.numero_lote && (
          <><span className="text-gray-500">N° lote</span><span className="text-blue-400 font-mono">{m.numero_lote}</span></>
        )}
      </div>

      <div className="flex items-center gap-2 pt-1">
        {!agotado && m.stock_inicial != null && (
          <button onClick={() => onConsumir(m)}
            className="flex-1 py-1.5 bg-orange-900/20 hover:bg-orange-900/40 text-orange-400 text-xs rounded-lg border border-orange-800/30 transition-colors">
            − Consumo
          </button>
        )}
        <button onClick={() => onEditar(m)}
          className="flex-1 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg transition-colors">
          Editar
        </button>
        <button onClick={() => onToggle(m)}
          className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${
            m.activo
              ? "bg-gray-800 text-gray-400 border-gray-700 hover:border-yellow-600/50 hover:text-yellow-400"
              : "bg-green-900/20 text-green-400 border-green-700/30 hover:bg-green-900/40"
          }`}>
          {m.activo ? "Desactivar" : "Activar"}
        </button>
        <button onClick={() => onEliminar(m)}
          className="px-3 py-1.5 bg-gray-800 hover:bg-red-900/30 text-red-400 text-xs rounded-lg border border-gray-700 hover:border-red-700/40">
          ✕
        </button>
      </div>
    </div>
  );
}

export default function MaterialesPage() {
  const [materiales, setMateriales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [modalConsumir, setModalConsumir] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [tab, setTab] = useState("disponibles");

  const cargar = () =>
    getMateriales()
      .then(r => setMateriales(r.data))
      .catch(() => toast.error("Error al cargar materiales"))
      .finally(() => setLoading(false));

  useEffect(() => { cargar(); }, []);

  const handleGuardar = async (form) => {
    if (modal === "nuevo") {
      await crearMaterial(form);
      toast.success("Material registrado ✓");
    } else {
      await actualizarMaterial(modal.id, form);
      toast.success("Material actualizado ✓");
    }
    cargar();
  };

  const handleEliminar = async (m) => {
    if (!window.confirm(`¿Eliminar "${m.nombre}"?`)) return;
    try {
      await eliminarMaterial(m.id);
      toast.success("Material eliminado");
      cargar();
    } catch (err) { toast.error(apiError(err, "Error al eliminar")); }
  };

  const handleToggle = async (m) => {
    try {
      await actualizarMaterial(m.id, { activo: !m.activo });
      cargar();
    } catch (err) { toast.error(apiError(err, "Error al actualizar")); }
  };

  const handleConsumir = async (cantidad) => {
    await consumirMaterial(modalConsumir.id, cantidad);
    toast.success("Consumo registrado ✓");
    cargar();
  };

  const isAgotado = m => m.stock_inicial != null && (m.stock_disponible ?? 0) <= 0;

  const disponibles = materiales.filter(m => !isAgotado(m) && (
    !busqueda || m.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (m.numero_lote ?? "").toLowerCase().includes(busqueda.toLowerCase())
  ));
  const agotados = materiales.filter(m => isAgotado(m) && (
    !busqueda || m.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (m.numero_lote ?? "").toLowerCase().includes(busqueda.toLowerCase())
  ));

  const activos = materiales.filter(m => m.activo && !isAgotado(m)).length;
  const totalAgotados = materiales.filter(isAgotado).length;
  const lista = tab === "disponibles" ? disponibles : agotados;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Materiales</h1>
          <p className="text-gray-400 text-sm mt-0.5">Inventario de materiales recibidos en logística</p>
        </div>
        <button onClick={() => setModal("nuevo")}
          className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          + Nuevo Material
        </button>
      </div>

      {/* KPI + búsqueda */}
      <div className="flex items-center gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-3 flex items-center gap-3">
          <p className="text-2xl font-bold text-blue-400">{activos}</p>
          <p className="text-xs text-gray-400">Materiales<br/>activos</p>
        </div>
        <div className="bg-gray-900 border border-red-900/30 rounded-xl px-5 py-3 flex items-center gap-3">
          <p className="text-2xl font-bold text-red-400">{totalAgotados}</p>
          <p className="text-xs text-gray-400">Materiales<br/>agotados</p>
        </div>
        <div className="flex-1 max-w-xs">
          <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o lote…"
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
        <button onClick={() => setTab("disponibles")}
          className={`px-4 py-2 text-sm rounded-lg transition-colors font-medium ${
            tab === "disponibles"
              ? "bg-blue-600 text-white"
              : "text-gray-400 hover:text-white"
          }`}>
          Disponibles ({disponibles.length})
        </button>
        <button onClick={() => setTab("agotados")}
          className={`px-4 py-2 text-sm rounded-lg transition-colors font-medium flex items-center gap-2 ${
            tab === "agotados"
              ? "bg-red-700 text-white"
              : "text-gray-400 hover:text-white"
          }`}>
          Agotados
          {totalAgotados > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === "agotados" ? "bg-red-600" : "bg-red-900/50 text-red-400"}`}>
              {totalAgotados}
            </span>
          )}
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-gray-400 animate-pulse py-8 text-center">Cargando…</div>
      ) : lista.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl py-12 text-center text-gray-500">
          {tab === "agotados" ? "Sin materiales agotados — buen trabajo" : busqueda ? "Sin resultados para la búsqueda" : "Sin materiales registrados — agrega el primer ingreso"}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {lista.map(m => (
            <TarjetaMaterial key={m.id} m={m} agotado={tab === "agotados"}
              onConsumir={setModalConsumir}
              onEditar={setModal}
              onToggle={handleToggle}
              onEliminar={handleEliminar}
            />
          ))}
        </div>
      )}

      {modal && (
        <ModalMaterial
          material={modal === "nuevo" ? null : modal}
          onClose={() => setModal(null)}
          onGuardar={handleGuardar}
        />
      )}

      {modalConsumir && (
        <ModalConsumir
          material={modalConsumir}
          onClose={() => setModalConsumir(null)}
          onConsumir={handleConsumir}
        />
      )}
    </div>
  );
}
