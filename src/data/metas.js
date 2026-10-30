// Apenas as metas (sem resultados fixos) ficam salvas no código do projeto
export const DEFAULT_META_IPC = {
  "0273": 2.30,
  "0025": 2.26,
  "0109": 2.11,
  "0296": 2.16,
  "0234": 2.35,
  "0237": 2.36,
  "0139": 2.20,
  "0280": 2.29,
  "0037": 2.16,
  "0099": 2.16,
  "0092": 2.10,
  "0291": 2.39,
  "0266": 2.16,
  "0094": 2.10,
  "0182": 2.10,
  "0106": 2.06,
  "0088": 2.12,
  "0023": 1.95
};

export const DEFAULT_REGIONAL_TARGETS = {
  ipcRegional: 2.21,
  cupomMisto: 0.30,
  paridade: 0.55,
  conversao: 0.18,        // Meta: >= 18%
  rupturaEx3: 0.023,      // Teto: <= 2,3%
  rupturaVa: 0.010,       // Teto: <= 1,0%
  ckoutMovel: 0.35,       // Meta: >= 35%
  capEmail: 0.60,         // Meta: >= 60%
  eePct: 0.035,           // Meta: >= 3,5%
  npsLoja: 0.92,          // Meta: >= 92%
  npsOms: 0.58,           // Meta: >= 58%
  personalizacao: 0.023,  // Meta: >= 2,3%
  kpisMin: 7              // Meta Qtd. KPIs: >= 7
};
