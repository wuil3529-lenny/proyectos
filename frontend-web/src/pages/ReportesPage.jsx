import { useEffect, useState } from "react";
import { getProductos, crearProducto, actualizarProducto, eliminarProducto } from "../services/api";
import { formatPesoKg } from "../utils/peso";
import toast from "react-hot-toast";

const FORM_INIT = {
  nombre: "",
  cliente: "",
  molde: "",
  cavidades: "",
  peso_env_min: "",
  peso_env_max: "",
  peso_bruto_min: "",
  peso_bruto_max: "",
  temp_min: "",
  temp_max: "",
  tipo: "generico",
  resina: "",
  colorante: "",
};

// ── Modal ver detalle de producto ────────────────────────────────
function ModalVerProducto({ producto: p, onClose }) {
  const fila = (label, valor) => valor != null && valor !== "" ? (
    <div className="flex justify-between items-start gap-4 py-2 border-b border-gray-800 last:border-0">
      <span className="text-xs text-gray-500 shrink-0">{label}</span>
      <span className="text-xs text-white text-right">{valor}</span>
    </div>
  ) : null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-auto">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm my-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div>
            <h3 className="font-semibold text-white">{p.nombre}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.tipo === "exclusivo" ? "bg-purple-900/40 text-purple-400" : "bg-gray-800 text-gray-400"}`}>{p.tipo}</span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
        </div>
        <div className="px-6 py-4 space-y-0">
          <p className="text-[10px] uppercase tracking-wide text-gray-600 font-semibold mb-1">General</p>
          {fila("Cliente", p.cliente)}
          {fila("Molde", p.molde)}
          {fila("Cavidades", p.cavidades)}
          <p className="text-[10px] uppercase tracking-wide text-gray-600 font-semibold mt-3 mb-1">Pesos</p>
          {fila("Peso envase (min – max)", `${formatPesoKg(p.peso_env_min)} – ${formatPesoKg(p.peso_env_max)}`)}
          {fila("Peso bruto (min – max)", `${formatPesoKg(p.peso_bruto_min)} – ${formatPesoKg(p.peso_bruto_max)}`)}
          <p className="text-[10px] uppercase tracking-wide text-gray-600 font-semibold mt-3 mb-1">Proceso</p>
          {fila("Temperatura (min – max)", `${p.temp_min}° – ${p.temp_max}° C`)}
          {fila("Tiempo de ciclo", p.tiempo_ciclo_segundos != null ? `${p.tiempo_ciclo_segundos} seg` : null)}
          {fila("Temperatura proceso", p.temperatura_proceso != null ? `${p.temperatura_proceso} °C` : null)}
          <p className="text-[10px] uppercase tracking-wide text-gray-600 font-semibold mt-3 mb-1">Materiales</p>
          {fila("Resina", p.resina)}
          {fila("Colorante", p.colorante)}
        </div>
        <div className="px-6 pb-5">
          <button onClick={onClose} className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition-colors">Cerrar</button>
        </div>
      </div>
    </div>
  );
}

// ── Modal crear/editar producto ───────────────────────────────────
function ModalProducto({ producto, onClose, onGuardar }) {
  const esEdicion = Boolean(producto);
  // En edición: convertir pesos de kg → g para mostrar en el formulario
  const initForm = esEdicion ? {
    ...producto,
    peso_env_min: producto.peso_env_min != null ? +(producto.peso_env_min * 1000).toFixed(3) : "",
    peso_env_max: producto.peso_env_max != null ? +(producto.peso_env_max * 1000).toFixed(3) : "",
    peso_bruto_min: producto.peso_bruto_min != null ? +(producto.peso_bruto_min * 1000).toFixed(3) : "",
    peso_bruto_max: producto.peso_bruto_max != null ? +(producto.peso_bruto_max * 1000).toFixed(3) : "",
  } : FORM_INIT;
  const [form, setForm] = useState(initForm);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (parseFloat(form.peso_env_min) > parseFloat(form.peso_env_max)) {
      toast.error("Peso envase: mínimo no puede superar al máximo");
      return;
    }
    if (parseFloat(form.peso_bruto_min) > parseFloat(form.peso_bruto_max)) {
      toast.error("Peso bruto: mínimo no puede superar al máximo");
      return;
    }
    if (parseFloat(form.temp_min) > parseFloat(form.temp_max)) {
      toast.error("Temperatura: mínimo no puede superar al máximo");
      return;
    }
    setSaving(true);
    try {
      // El form maneja pesos en GRAMOS → convertir a KG para el backend
      const gToKg = (g) => parseFloat((parseFloat(g) / 1000).toFixed(6));
      const payload = {
        nombre: form.nombre,
        cliente: form.cliente,
        molde: form.molde,
        tipo: form.tipo,
        cavidades: Number(form.cavidades),
        peso_env_min: gToKg(form.peso_env_min),
        peso_env_max: gToKg(form.peso_env_max),
        peso_bruto_min: gToKg(form.peso_bruto_min),
        peso_bruto_max: gToKg(form.peso_bruto_max),
        temp_min: parseFloat(form.temp_min),
        temp_max: parseFloat(form.temp_max),
        resina: form.resina || null,
        colorante: form.colorante || null,
      };
      await onGuardar(payload);
      onClose();
    } catch (err) {
      const msg = err.response?.data?.detail ?? err.message ?? "Error al guardar producto";
      toast.error(msg, { duration: 6000 });
      console.error("Error guardando producto:", err.response?.data ?? err);
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors";
  const labelCls = "block text-xs text-gray-400 mb-1.5";

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-auto">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg my-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h3 className="font-semibold text-white">{esEdicion ? "Editar Producto" : "Nuevo Producto"}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={labelCls}>Nombre del Producto *</label>
              <input type="text" required value={form.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Ej: Envase 500ml PP" className={inputCls} />
            </div>

            <div>
              <label className={labelCls}>Cliente *</label>
              <input type="text" required value={form.cliente} onChange={(e) => set("cliente", e.target.value)} placeholder="Ej: Distribuidora XYZ" className={inputCls} />
            </div>

            <div>
              <label className={labelCls}>Molde *</label>
              <input type="text" required value={form.molde} onChange={(e) => set("molde", e.target.value)} placeholder="Ej: MOL-045A" className={inputCls} />
            </div>

            <div>
              <label className={labelCls}>Cavidades *</label>
              <input type="number" required min="1" value={form.cavidades} onChange={(e) => set("cavidades", e.target.value)} placeholder="4" className={inputCls} />
            </div>

            <div>
              <label className={labelCls}>Tipo</label>
              <select value={form.tipo} onChange={(e) => set("tipo", e.target.value)} className={inputCls}>
                <option value="generico">Genérico</option>
                <option value="exclusivo">Exclusivo</option>
              </select>
            </div>
          </div>

          {/* Peso envase */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Peso del Envase (gramos)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Mínimo (g) *</label>
                <input type="number" required step="any" min="0" value={form.peso_env_min} onChange={(e) => set("peso_env_min", e.target.value)} placeholder="Ej: 800" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Máximo (g) *</label>
                <input type="number" required step="any" min="0" value={form.peso_env_max} onChange={(e) => set("peso_env_max", e.target.value)} placeholder="Ej: 850" className={inputCls} />
              </div>
            </div>
          </div>

          {/* Peso bruto */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Peso Bruto (gramos)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Mínimo (g) *</label>
                <input type="number" required step="any" min="0" value={form.peso_bruto_min} onChange={(e) => set("peso_bruto_min", e.target.value)} placeholder="Ej: 850" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Máximo (g) *</label>
                <input type="number" required step="any" min="0" value={form.peso_bruto_max} onChange={(e) => set("peso_bruto_max", e.target.value)} placeholder="Ej: 900" className={inputCls} />
              </div>
            </div>
          </div>

          {/* Resina y Colorante */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Materiales</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Resina</label>
                <input type="text" value={form.resina} onChange={(e) => set("resina", e.target.value)} placeholder="Ej: PEAD, PEBD, PP…" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Colorante</label>
                <input type="text" value={form.colorante} onChange={(e) => set("colorante", e.target.value)} placeholder="Ej: Blanco 2%, Rojo 1%…" className={inputCls} />
              </div>
            </div>
          </div>

          {/* Temperatura */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Temperatura de Proceso (°C)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Mínima *</label>
                <input type="number" required step="0.1" value={form.temp_min} onChange={(e) => set("temp_min", e.target.value)} placeholder="220" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Máxima *</label>
                <input type="number" required step="0.1" value={form.temp_max} onChange={(e) => set("temp_max", e.target.value)} placeholder="260" className={inputCls} />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
              {saving ? "Guardando…" : esEdicion ? "Guardar cambios" : "Crear Producto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────
export default function ProductosPage() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [modal, setModal] = useState(null); // null | "crear" | "editar" | "ver"
  const [seleccionado, setSeleccionado] = useState(null);

  const cargar = async () => {
    setLoading(true);
    try {
      const r = await getProductos();
      setProductos(r.data);
    } catch {
      toast.error("Error al cargar productos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const cerrar = () => { setModal(null); setSeleccionado(null); };

  const handleCrear = async (form) => {
    await crearProducto(form);
    toast.success("Producto creado ✓");
    cargar();
  };

  const handleEditar = async (payload) => {
    const r = await actualizarProducto(seleccionado.id, payload);
    if (!r?.data?.id) throw new Error("Respuesta inesperada del servidor");
    toast.success("Producto actualizado ✓");
    await cargar();
  };

  const handleEliminar = async (p) => {
    const ok = window.confirm(`¿Eliminar el producto "${p.nombre}"? Esta acción no se puede deshacer.`);
    if (!ok) return;
    try {
      await eliminarProducto(p.id);
      toast.success("Producto eliminado");
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.detail ?? "Error al eliminar");
    }
  };

  const filtrados = productos.filter((p) => {
    const q = busqueda.toLowerCase();
    return (
      p.nombre?.toLowerCase().includes(q) ||
      p.cliente?.toLowerCase().includes(q) ||
      p.molde?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Productos</h1>
          <p className="text-gray-400 text-sm mt-0.5">{productos.length} productos registrados</p>
        </div>
        <button
          onClick={() => setModal("crear")}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <span>+</span> Nuevo Producto
        </button>
      </div>

      {/* Búsqueda */}
      <input
        type="text"
        placeholder="Buscar por nombre, cliente o molde…"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
      />

      {/* Tabla */}
      {loading ? (
        <div className="text-center py-12 text-gray-500 text-sm animate-pulse">Cargando productos…</div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-12 text-gray-500 text-sm">
          {busqueda ? "Sin resultados para esa búsqueda" : "No hay productos registrados"}
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-5 py-3">Producto</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-5 py-3 hidden md:table-cell">Cliente</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-5 py-3 hidden lg:table-cell">Molde / Cav.</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-5 py-3 hidden lg:table-cell">Peso Envase</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-5 py-3 hidden xl:table-cell">Temp (°C)</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-5 py-3">Tipo</th>
                <th className="text-right text-xs font-semibold uppercase tracking-wider text-gray-500 px-5 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filtrados.map((p) => (
                <tr key={p.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-white">{p.nombre}</p>
                  </td>
                  <td className="px-5 py-3.5 hidden md:table-cell text-gray-400">{p.cliente}</td>
                  <td className="px-5 py-3.5 hidden lg:table-cell">
                    <p className="text-gray-300 text-xs">{p.molde}</p>
                    <p className="text-gray-500 text-xs">{p.cavidades} cav.</p>
                  </td>
                  <td className="px-5 py-3.5 hidden lg:table-cell">
                    <p className="text-gray-300 text-xs">{formatPesoKg(p.peso_env_min)} – {formatPesoKg(p.peso_env_max)}</p>
                    <p className="text-gray-500 text-xs">Bruto: {formatPesoKg(p.peso_bruto_min)} – {formatPesoKg(p.peso_bruto_max)}</p>
                  </td>
                  <td className="px-5 py-3.5 hidden xl:table-cell text-gray-300 text-xs">{p.temp_min}° – {p.temp_max}°</td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      p.tipo === "exclusivo"
                        ? "bg-purple-900/40 text-purple-400"
                        : "bg-gray-800 text-gray-400"
                    }`}>
                      {p.tipo}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => { setSeleccionado(p); setModal("ver"); }}
                        className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-blue-400 text-xs rounded-lg transition-colors"
                      >
                        Ver
                      </button>
                      <button
                        onClick={() => { setSeleccionado(p); setModal("editar"); }}
                        className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleEliminar(p)}
                        className="px-3 py-1.5 bg-gray-800 hover:bg-red-900/50 text-red-400 text-xs rounded-lg transition-colors"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal === "ver" && seleccionado && (
        <ModalVerProducto producto={seleccionado} onClose={cerrar} />
      )}
      {modal === "crear" && (
        <ModalProducto onClose={cerrar} onGuardar={handleCrear} />
      )}
      {modal === "editar" && seleccionado && (
        <ModalProducto producto={seleccionado} onClose={cerrar} onGuardar={handleEditar} />
      )}
    </div>
  );
}
