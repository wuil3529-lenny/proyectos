import { useEffect, useState } from "react";
import { getUsuarios, crearUsuario, actualizarUsuario, resetearPassword, desactivarUsuario } from "../services/api";
import toast from "react-hot-toast";

const ROLES = [
  "admin", "jefe_produccion", "inspector_produccion",
  "jefe_calidad", "inspector_calidad", "jefe_tecnico",
  "tecnico", "jefe_logistica", "operario_logistica",
  "jefe_ventas", "vendedor", "molinero",
];

const ROL_LABELS = {
  admin: "Administrador",
  jefe_produccion: "Jefe de Producción",
  inspector_produccion: "Inspector de Producción",
  jefe_calidad: "Jefe de Calidad",
  inspector_calidad: "Inspector de Calidad",
  jefe_tecnico: "Jefe Técnico",
  tecnico: "Técnico",
  jefe_logistica: "Jefe de Logística",
  operario_logistica: "Operario Logística",
  jefe_ventas: "Jefe de Ventas",
  vendedor: "Vendedor",
  molinero: "Molinero",
};

const VACIO_FORM = {
  nombre_usuario: "", password: "", nombre_completo: "", rol: "inspector_produccion", departamento: "",
};

// ── Modal crear / editar usuario ─────────────────────────────────
function ModalUsuario({ usuario, onClose, onGuardar }) {
  const esEdicion = Boolean(usuario);
  const [form, setForm] = useState(
    esEdicion
      ? { nombre_completo: usuario.nombre_completo, rol: usuario.rol, departamento: usuario.departamento }
      : VACIO_FORM
  );
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onGuardar(form);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail ?? "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h3 className="font-semibold text-white">
            {esEdicion ? "Editar usuario" : "Nuevo usuario"}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors text-xl leading-none">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Nombre completo</label>
            <input
              type="text"
              required
              value={form.nombre_completo}
              onChange={(e) => set("nombre_completo", e.target.value)}
              placeholder="Ej: Carlos Mendez"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {!esEdicion && (
            <>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Nombre de usuario *</label>
                <input
                  type="text"
                  required
                  value={form.nombre_usuario}
                  onChange={(e) => set("nombre_usuario", e.target.value)}
                  placeholder="Ej: cmendez"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Contraseña (mín. 8 caracteres)</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Cargo / Rol</label>
            <select
              value={form.rol}
              onChange={(e) => set("rol", e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{ROL_LABELS[r] ?? r}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Departamento</label>
            <input
              type="text"
              required
              value={form.departamento}
              onChange={(e) => set("departamento", e.target.value)}
              placeholder="Ej: Producción, Calidad, Sistemas…"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {saving ? "Guardando…" : esEdicion ? "Guardar cambios" : "Crear usuario"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal reset contraseña ────────────────────────────────────────
function ModalPassword({ usuario, onClose }) {
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await resetearPassword(usuario.id, password);
      toast.success(`Contraseña de ${usuario.nombre_completo} actualizada`);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail ?? "Error al resetear contraseña");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h3 className="font-semibold text-white">Resetear contraseña</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors text-xl leading-none">
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-gray-400">
            Nueva contraseña para <span className="text-white font-medium">{usuario.nombre_completo}</span>
          </p>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Nueva contraseña (mín. 8 caracteres)"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
          />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {saving ? "Actualizando…" : "Actualizar contraseña"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────
export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [modal, setModal] = useState(null); // null | "crear" | "editar" | "password"
  const [seleccionado, setSeleccionado] = useState(null);

  const cargar = () => {
    setLoading(true);
    getUsuarios()
      .then((r) => setUsuarios(r.data))
      .catch(() => toast.error("Error al cargar usuarios"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  const abrirEditar = (u) => { setSeleccionado(u); setModal("editar"); };
  const abrirPassword = (u) => { setSeleccionado(u); setModal("password"); };
  const cerrar = () => { setModal(null); setSeleccionado(null); };

  const handleCrear = async (form) => {
    await crearUsuario(form);
    toast.success("Usuario creado correctamente");
    cargar();
  };

  const handleEditar = async (form) => {
    await actualizarUsuario(seleccionado.id, form);
    toast.success("Usuario actualizado");
    cargar();
  };

  const handleToggleActivo = async (u) => {
    if (u.activo) {
      const ok = window.confirm(`¿Desactivar a ${u.nombre_completo}? No podrá iniciar sesión.`);
      if (!ok) return;
      try {
        await desactivarUsuario(u.id);
        toast.success("Usuario desactivado");
        cargar();
      } catch (err) {
        toast.error(err.response?.data?.detail ?? "Error");
      }
    } else {
      try {
        await actualizarUsuario(u.id, { activo: true });
        toast.success("Usuario reactivado");
        cargar();
      } catch (err) {
        toast.error(err.response?.data?.detail ?? "Error");
      }
    }
  };

  const filtrados = usuarios.filter((u) => {
    const q = busqueda.toLowerCase();
    return (
      u.nombre_completo.toLowerCase().includes(q) ||
      (u.nombre_usuario ?? "").toLowerCase().includes(q) ||
      u.rol.toLowerCase().includes(q) ||
      u.departamento.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Gestión de Usuarios</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {usuarios.filter((u) => u.activo).length} activos · {usuarios.length} total
          </p>
        </div>
        <button
          onClick={() => setModal("crear")}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <span>+</span> Nuevo usuario
        </button>
      </div>

      {/* Búsqueda */}
      <input
        type="text"
        placeholder="Buscar por nombre, usuario, cargo o departamento…"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
      />

      {/* Tabla */}
      {loading ? (
        <div className="text-center py-12 text-gray-500 text-sm animate-pulse">Cargando usuarios…</div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-12 text-gray-500 text-sm">
          {busqueda ? "Sin resultados para esa búsqueda" : "No hay usuarios registrados"}
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-5 py-3">Usuario</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-5 py-3 hidden md:table-cell">Cargo</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-5 py-3 hidden lg:table-cell">Depto.</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-5 py-3">Estado</th>
                <th className="text-right text-xs font-semibold uppercase tracking-wider text-gray-500 px-5 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filtrados.map((u) => (
                <tr key={u.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                        {u.nombre_completo[0]}
                      </div>
                      <div>
                        <p className="font-medium text-white">{u.nombre_completo}</p>
                        <p className="text-xs text-gray-500">@{u.nombre_usuario ?? u.email ?? "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 hidden md:table-cell">
                    <span className="px-2 py-1 bg-gray-800 text-gray-300 rounded text-xs">
                      {ROL_LABELS[u.rol] ?? u.rol}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 hidden lg:table-cell text-gray-400">{u.departamento}</td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        u.activo
                          ? "bg-green-900/40 text-green-400"
                          : "bg-gray-800 text-gray-500"
                      }`}
                    >
                      {u.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => abrirEditar(u)}
                        className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => abrirPassword(u)}
                        className="px-3 py-1.5 bg-gray-800 hover:bg-orange-900/60 text-orange-400 text-xs rounded-lg transition-colors"
                      >
                        Contraseña
                      </button>
                      <button
                        onClick={() => handleToggleActivo(u)}
                        className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                          u.activo
                            ? "bg-gray-800 hover:bg-red-900/50 text-red-400"
                            : "bg-gray-800 hover:bg-green-900/50 text-green-400"
                        }`}
                      >
                        {u.activo ? "Desactivar" : "Activar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modales */}
      {modal === "crear" && (
        <ModalUsuario onClose={cerrar} onGuardar={handleCrear} />
      )}
      {modal === "editar" && seleccionado && (
        <ModalUsuario usuario={seleccionado} onClose={cerrar} onGuardar={handleEditar} />
      )}
      {modal === "password" && seleccionado && (
        <ModalPassword usuario={seleccionado} onClose={cerrar} />
      )}
    </div>
  );
}
