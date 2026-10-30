export const nf = (v, d = 2) =>
  v == null || Number.isNaN(v)
    ? "–"
    : v.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });

export const pc = (v, d = 1) =>
  v == null || Number.isNaN(v) ? "–" : nf(v * 100, d) + "%";

export const sg = (v, d = 2, inv = false) => {
  if (v == null || Number.isNaN(v)) return "–";
  const isGood = inv ? v <= 0 : v >= 0;
  const arw = isGood ? "▲ " : "▼ ";
  return arw + (v < 0 ? "−" : "+") + nf(Math.abs(v), d);
};

export const sp = (v, d = 1, inv = false) => {
  if (v == null || Number.isNaN(v)) return "–";
  const isGood = inv ? v <= 0 : v >= 0;
  const arw = isGood ? "▲ " : "▼ ";
  return arw + (v < 0 ? "−" : "+") + nf(Math.abs(v * 100), d) + " pp";
};

export const brl = (v, d = 0) =>
  v == null || Number.isNaN(v) ? "–" : "R$ " + nf(v, d);

export const barColor = (pct, isMet) => {
  if (isMet || pct >= 100) return "#22C55E"; // Verde forte: >= 100% da meta
  if (pct >= 97) return "#A3E635";           // Verde leve (lima): 97% a 99% da meta
  if (pct >= 94) return "#FACC15";           // Amarelo/Ouro: 94% a 96% da meta
  if (pct >= 88) return "#FB923C";           // Laranja: 88% a 93% da meta
  return "#EF4444";                          // Vermelho: < 88% da meta
};

export const curMonthBadge = () => {
  const d = new Date();
  const M = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
  return `${M[d.getMonth()]}/${d.getFullYear()}`;
};

export const curMonthHeader = () => {
  const d = new Date();
  const M = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `Meta ${M[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`;
};
