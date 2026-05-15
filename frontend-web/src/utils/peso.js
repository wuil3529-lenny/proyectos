// Peso siempre se almacena en KG en plan_produccion y en GRAMOS en mediciones_produccion.
// Regla de conversión: 1 kg = 1000 g

/** Recibe kg, devuelve "875 g / 0.875 kg" */
export function formatPesoKg(kg) {
  if (kg == null) return null;
  const g = kg * 1000;
  return `${g % 1 === 0 ? g : g.toFixed(1)} g / ${kg % 1 === 0 ? kg : kg.toFixed(3)} kg`;
}

/** Recibe gramos, devuelve "875 g / 0.875 kg" */
export function formatPesoG(g) {
  if (g == null) return null;
  const kg = g / 1000;
  return `${g % 1 === 0 ? g : g.toFixed(1)} g / ${kg % 1 === 0 ? kg : kg.toFixed(3)} kg`;
}

/** Recibe gramos, devuelve solo "875 g" */
export function soloGramos(g) {
  if (g == null) return null;
  return `${g % 1 === 0 ? g : g.toFixed(1)} g`;
}

/** Recibe kg, devuelve solo "0.875 kg" */
export function soloKg(kg) {
  if (kg == null) return null;
  return `${kg % 1 === 0 ? kg : parseFloat(kg.toFixed(3))} kg`;
}
