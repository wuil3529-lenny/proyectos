import { useEffect, useState } from "react";
import { getPedidos, crearPedido, actualizarPedido, eliminarPedido, getProductos } from "../services/api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

const ROLES_VENTAS = ["jefe_ventas", "vendedor"];

const ESTADOS = [
  { value: "en_espera",   label: "En Espera",   color: "bg-gray-700/60 text-gray-300 border-gray-600/40" },
  { value: "planificado", label: "Planificado", color: "bg-blue-900/40 text-blue-400 border-blue-800/30" },
  { value: "en_curso",    label: "En Curso",    color: "bg-green-900/40 text-green-400 border-green-800/30" },
  { value: "completado",  label: "Completado",  color: "bg-green-700/40 text-green-300 border-green-600/30" },
  { value: "entregado",   label: "Entregado",   color: "bg-emerald-900/40 text-emerald-400 border-emerald-800/30" },
  { value: "cancelado",   label: "Cancelado",   color: "bg-red-900/40 text-red-400 border-red-800/30" },
];

const estadoInfo = (val) => ESTADOS.find((e) => e.value === val) ?? ESTADOS[0];

const hoy = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Caracas" });

const FORM_INIT = {
  cliente: "",
  producto: "",
  cantidad_kg: "",
  fecha_entrega: hoy(),
  observaciones: "",
  prioridad: "normal",
  estado: "en_espera",
};

// ── Modal crear / editar pedido ───────────────────────────────────
function ModalPedido({ pedido, productos, onClose, onGuardar }) {
  const esEdicion = Boolean(pedido);

  const numeroPedido = esEdicion
    ? pedido.numero_pedido
    : `PED-${Math.floor(1000 + Math.random() * 9000)}`;

  const [form, setForm] = useState(esEdicion ? {
    cliente: pedido.cliente,
    producto: pedido.producto,
    producto_id: pedido.producto_id ?? "",
    cantidad_unidades: pedido.cantidad_unidades ?? "",
    fecha_entrega: pedido.fecha_entrega ? pedido.fecha_entrega.slice(0, 10) : "",
    observaciones: pedido.observaciones ?? "",
    prioridad: pedido.prioridad ?? "normal",
    estado: pedido.estado,
  } : { ...FORM_INIT });

  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Producto seleccionado del catálogo
  const prodSel = productos.find((p) => p.id === Number(form.producto_id));

  // Peso bruto máximo por unidad
  const pesoBrutoUnit = prodSel ? prodSel.peso_bruto_max : null;

  // kg calculados
  const kgCalculados = pesoBrutoUnit && form.cantidad_unidades
    ? (Number(form.cantidad_unidades) * pesoBrutoUnit).toFixed(2)
    : null;

  const handleProductoChange = (id) => {
    const p = productos.find((x) => x.id === Number(id));
    if (p) {
      setForm((f) => ({
        ...f,
        producto_id: id,
        producto: p.nombre,
        cliente: p.cliente,
      }));
    } else {
      set("producto_id", id);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!kgCalculados && !esEdicion) {
      toast.error("Selecciona un producto y cantidad de unidades");
      return;
    }
    setSaving(true);
    try {
      await onGuardar({
        numero_pedido: numeroPedido,
        cliente: form.cliente,
        producto: form.producto,
        producto_id: form.producto_id ? Number(form.producto_id) : null,
        cantidad_unidades: form.cantidad_unidades ? Number(form.cantidad_unidades) : null,
        cantidad_kg: kgCalculados ? parseFloat(kgCalculados) : (pedido?.cantidad_kg ?? 0),
        fecha_entrega: form.fecha_entrega,
        observaciones: form.observaciones || null,
        prioridad: form.prioridad,
        estado: form.estado,
      });
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail ?? "Error al guardar pedido");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors";
  const labelCls = "block text-xs text-gray-400 mb-1.5";

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h3 className="font-semibold text-white">{esEdicion ? `Editar ${pedido.numero_pedido ?? "Pedido"}` : "Nuevo Pedido"}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Número de pedido */}
          <div className="flex items-center gap-3 bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5">
            <span className="text-xs text-gray-500">N° Pedido</span>
            <span className="text-sm font-mono font-semibold text-blue-400">{numeroPedido}</span>
            {esEdicion && <span className="ml-auto text-xs text-gray-600">asignado</span>}
          </div>

          {/* Producto desde catálogo */}
          <div>
            <label className={labelCls}>Producto *</label>
            {productos.length > 0 ? (
              <select
                required
                value={form.producto_id}
                onChange={(e) => handleProductoChange(e.target.value)}
                className={inputCls}
              >
                <option value="">Seleccionar producto…</option>
                {productos.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre} — {p.cliente}</option>
                ))}
              </select>
            ) : (
              <input type="text" required value={form.producto} onChange={(e) => set("producto", e.target.value)} placeholder="Ej: Envase 500ml" className={inputCls} />
            )}
          </div>

          {/* Cantidad unidades + kg calculados */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Cantidad (unidades) *</label>
              <input
                type="number"
                required
                min="1"
                step="1"
                value={form.cantidad_unidades}
                onChange={(e) => set("cantidad_unidades", e.target.value)}
                placeholder="Ej: 1000"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Total kg (calculado)</label>
              <div className={`${inputCls} bg-gray-700/50 text-gray-300 flex items-center`}>
                {kgCalculados
                  ? <span>{Number(kgCalculados).toLocaleString()} kg</span>
                  : <span className="text-gray-600">— selecciona producto</span>
                }
              </div>
            </div>
          </div>

          {/* Cliente auto-rellenado */}
          <div>
            <label className={labelCls}>Cliente *</label>
            <input type="text" required value={form.cliente} onChange={(e) => set("cliente", e.target.value)} placeholder="Se completa al seleccionar producto" className={inputCls} />
          </div>

          {/* Fecha entrega + Prioridad */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Fecha de entrega *</label>
              <input type="date" required value={form.fecha_entrega} onChange={(e) => set("fecha_entrega", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Prioridad *</label>
              <div className="flex gap-2 mt-0.5">
                <button
                  type="button"
                  onClick={() => set("prioridad", "normal")}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-semibold border transition-colors ${
                    form.prioridad === "normal"
                      ? "bg-blue-600/20 text-blue-400 border-blue-600/40"
                      : "bg-gray-800 text-gray-500 border-gray-700 hover:border-gray-600"
                  }`}
                >
                  Normal
                </button>
                <button
                  type="button"
                  onClick={() => set("prioridad", "urgente")}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-semibold border transition-colors ${
                    form.prioridad === "urgente"
                      ? "bg-red-600/20 text-red-400 border-red-600/40"
                      : "bg-gray-800 text-gray-500 border-gray-700 hover:border-gray-600"
                  }`}
                >
                  🔴 Urgente
                </button>
              </div>
            </div>
          </div>

          {/* Estado (solo edición) */}
          {esEdicion && (
            <div>
              <label className={labelCls}>Estado</label>
              <select value={form.estado} onChange={(e) => set("estado", e.target.value)} className={inputCls}>
                {ESTADOS.map((e) => (
                  <option key={e.value} value={e.value}>{e.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Observaciones */}
          <div>
            <label className={labelCls}>Observaciones</label>
            <textarea rows={2} value={form.observaciones} onChange={(e) => set("observaciones", e.target.value)} placeholder="Detalles adicionales..." className={`${inputCls} resize-none`} />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
              {saving ? "Guardando…" : esEdicion ? "Guardar cambios" : "Crear Pedido"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────
export default function PedidosPage() {
  const { usuario } = useAuth();
  const esVentas = ROLES_VENTAS.includes(usuario?.rol);
  const esAdmin = usuario?.rol === "admin";
  const puedeGestionar = esVentas || esAdmin;

  const [pedidos, setPedidos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [modal, setModal] = useState(null);
  const [seleccionado, setSeleccionado] = useState(null);

  const cargar = () => {
    setLoading(true);
    getPedidos()
      .then((r) => setPedidos(r.data))
      .catch(() => toast.error("Error al cargar pedidos"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargar();
    getProductos().then((r) => setProductos(r.data)).catch(() => {});
  }, []);

  const cerrar = () => { setModal(null); setSeleccionado(null); };

  const handleCrear = async (form) => {
    await crearPedido(form);
    toast.success("Pedido creado ✓");
    cargar();
  };

  const handleEditar = async (form) => {
    await actualizarPedido(seleccionado.id, form);
    toast.success("Pedido actualizado ✓");
    cargar();
  };

  const handleEliminar = async (p) => {
    const ok = window.confirm(`¿Eliminar el pedido de "${p.cliente}"?`);
    if (!ok) return;
    try {
      await eliminarPedido(p.id);
      toast.success("Pedido eliminado");
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.detail ?? "Error al eliminar");
    }
  };

  const filtrados = pedidos.filter((p) => {
    const q = busqueda.toLowerCase();
    const matchQ = !q || p.cliente?.toLowerCase().includes(q) || p.producto?.toLowerCase().includes(q);
    const matchE = !filtroEstado || p.estado === filtroEstado;
    return matchQ && matchE;
  });

  // Totales por estado
  const totales = ESTADOS.reduce((acc, e) => {
    acc[e.value] = pedidos.filter((p) => p.estado === e.value).length;
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Pedidos</h1>
          <p className="text-gray-400 text-sm mt-0.5">Gestión de pedidos de clientes</p>
        </div>
        {puedeGestionar && (
          <button
            onClick={() => setModal("crear")}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <span>+</span> Nuevo Pedido
          </button>
        )}
      </div>

      {/* Resumen por estado */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {ESTADOS.map((e) => (
          <button
            key={e.value}
            onClick={() => setFiltroEstado(filtroEstado === e.value ? "" : e.value)}
            className={`rounded-xl p-3 border text-left transition-all ${
              filtroEstado === e.value ? e.color + " border-current" : "bg-gray-900 border-gray-800 hover:border-gray-700"
            }`}
          >
            <p className="text-2xl font-bold text-white">{totales[e.value]}</p>
            <p className="text-xs text-gray-400 mt-0.5">{e.label}</p>
          </button>
        ))}
      </div>

      {/* Búsqueda */}
      <input
        type="text"
        placeholder="Buscar por cliente o producto…"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500"
      />

      {/* Tabla */}
      {loading ? (
        <div className="text-center py-12 text-gray-500 text-sm animate-pulse">Cargando pedidos…</div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-12 text-gray-500 text-sm">
          {busqueda || filtroEstado ? "Sin resultados" : "No hay pedidos registrados"}
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-5 py-3">N° Pedido</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-5 py-3">Cliente</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-5 py-3 hidden md:table-cell">Producto</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-5 py-3 hidden lg:table-cell">Unidades</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-5 py-3 hidden lg:table-cell">kg</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-5 py-3 hidden lg:table-cell">Entrega</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-5 py-3">Estado</th>
                {puedeGestionar && <th className="text-right text-xs font-semibold uppercase tracking-wider text-gray-500 px-5 py-3">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filtrados.map((p, idx) => {
                const ei = estadoInfo(p.estado);
                return (
                  <tr key={p.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-mono bg-gray-800 text-blue-400 px-2 py-0.5 rounded">
                        {p.numero_pedido ?? `#${idx + 1}`}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-white">{p.cliente}</p>
                      {p.observaciones && <p className="text-xs text-gray-500 truncate max-w-[180px]">{p.observaciones}</p>}
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell text-gray-300">{p.producto}</td>
                    <td className="px-5 py-3.5 hidden lg:table-cell text-gray-300">
                      {p.cantidad_unidades ? p.cantidad_unidades.toLocaleString() + " u" : "—"}
                    </td>
                    <td className="px-5 py-3.5 hidden lg:table-cell text-gray-300">{p.cantidad_kg?.toLocaleString()} kg</td>
                    <td className="px-5 py-3.5 hidden lg:table-cell text-gray-400 text-xs">
                      {p.fecha_entrega ? new Date(p.fecha_entrega).toLocaleDateString("es-ES") : "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border w-fit ${ei.color}`}>{ei.label}</span>
                        {p.prioridad === "urgente" && (
                          <span className="text-xs text-red-400 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Urgente
                          </span>
                        )}
                      </div>
                    </td>
                    {puedeGestionar && (
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => { setSeleccionado(p); setModal("editar"); }}
                            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleEliminar(p)}
                            className="px-3 py-1.5 bg-gray-800 hover:bg-red-900/50 text-red-400 text-xs rounded-lg"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal === "crear" && <ModalPedido productos={productos} onClose={cerrar} onGuardar={handleCrear} />}
      {modal === "editar" && seleccionado && <ModalPedido pedido={seleccionado} productos={productos} onClose={cerrar} onGuardar={handleEditar} />}
    </div>
  );
}
