import React, { useState, useEffect, useMemo, useRef } from 'react';
import html2canvas from 'html2canvas';
import {
  Trophy,
  Layers,
  Scale,
  Combine,
  LayoutGrid,
  PackageX,
  Smartphone,
  TrendingUp,
  Settings,
  Upload,
  Camera,
  Calendar,
  MapPin,
  Target,
  BarChart3,
  Ticket,
  FileSpreadsheet,
  Sparkles
} from 'lucide-react';
import { DEFAULT_META_IPC, DEFAULT_REGIONAL_TARGETS } from './data/metas';
import { parseWorkbookBuffer } from './utils/excelParser';
import {
  nf,
  pc,
  sg,
  sp,
  brl,
  barColor,
  curMonthBadge,
  curMonthHeader
} from './utils/formatters';
import {
  getProcessedLogos,
  logoCentauroRaw,
  logoRegionalRaw
} from './utils/logoProcessor';
import KpiSummaryBar from './components/KpiSummaryBar';

const HIST_KEY = 'aguias_ipc_history_v1';
const META_STORAGE_KEY = 'aguias_ipc_metas_v1';
const REG_STORAGE_KEY = 'aguias_reg_targets_v1';

const TABS = [
  { id: 'ipc', label: 'Ranking de IPC', prefix: 'RANKING POR', hl: 'IPC', foco: 'FOCO NO IPC', icon: Trophy },
  { id: 'cm', label: 'Ranking Cupom Misto', prefix: 'RANKING', hl: 'CUPOM MISTO', foco: 'FOCO NO CUPOM MISTO', icon: Layers },
  { id: 'paridade', label: 'Ranking de Paridade', prefix: 'RANKING POR', hl: 'PARIDADE', foco: 'FOCO NA PARIDADE', icon: Scale },
  { id: 'cm_paridade', label: 'Cupom Misto & Paridade', prefix: 'RANKING', hl: 'CM & PARIDADE', foco: 'FOCO EM CM & PARIDADE', icon: Combine },
  { id: 'placar', label: 'Placar de Lojas (Geral)', prefix: 'PLACAR DE', hl: 'LOJAS', foco: 'FOCO NOS KPIS', icon: LayoutGrid },
  { id: 'ruptura', label: 'Ranking de Ruptura', prefix: 'RANKING DE', hl: 'RUPTURA', foco: 'CONTROLE DE RUPTURA', icon: PackageX },
  { id: 'vendas', label: 'Vendas & NPS', prefix: 'RANKING', hl: 'VENDAS & NPS', foco: 'FOCO EM VENDAS & NPS', icon: TrendingUp },
  { id: 'metas', label: 'Metas', prefix: 'CONFIGURAÇÃO DE', hl: 'METAS', foco: 'METAS', icon: Settings }
];

const SORT_OPTIONS = {
  ipc: [
    { value: 'd', label: 'Ordenar: Diferença do IPC' },
    { value: 'ipc', label: 'IPC' },
    { value: 'ev', label: 'Evolução do IPC (▲/▼)' },
    { value: 'cm', label: 'Cupom Misto' },
    { value: 'p', label: 'Paridade' }
  ],
  cm: [
    { value: 'cm', label: 'Ordenar: % Cupom Misto' },
    { value: 'dc', label: 'Diferença Cupom Misto' },
    { value: 'evCm', label: 'Evolução Cupom Misto (▲/▼)' }
  ],
  paridade: [
    { value: 'p', label: 'Ordenar: Paridade' },
    { value: 'dp', label: 'Diferença da Paridade' },
    { value: 'evP', label: 'Evolução da Paridade (▲/▼)' }
  ],
  cm_paridade: [
    { value: 'dualScore', label: 'Ordenar: Ambas Batidas (Elite 🌟)' },
    { value: 'cm', label: 'Ordenar: % Cupom Misto' },
    { value: 'dc', label: 'Diferença Cupom Misto' },
    { value: 'p', label: 'Ordenar: Paridade' },
    { value: 'dp', label: 'Diferença da Paridade' },
    { value: 'evCm', label: 'Maior Evolução CM (▲)' },
    { value: 'evP', label: 'Maior Evolução Paridade (▲)' }
  ],
  placar: [
    { value: 'cNum', label: 'Ordenar: Código da Loja (CE)' },
    { value: 'kpisCount', label: 'Ordenar: Qtd. KPIs Entregues' },
    { value: 'desvioPct', label: 'Ordenar: Desvio % Venda' },
    { value: 'cresc', label: 'Ordenar: Crescimento %' },
    { value: 'ipc', label: 'Ordenar: IPC' }
  ],
  ruptura: [
    { value: 'rupEx3', label: 'Ordenar: % Ruptura EX3' },
    { value: 'rupVa', label: '% Ruptura V.A.' },
    { value: 'rupAvg', label: 'Média Geral Ruptura' }
  ],
  vendas: [
    { value: 'at', label: 'Ordenar: % Atingimento Meta' },
    { value: 'v', label: 'Venda Total (R$)' },
    { value: 'sss', label: 'Crescimento SSS %' },
    { value: 'npsGestao', label: 'NPS Gestão Loja' },
    { value: 'futebol', label: '% Personalização Futebol' }
  ]
};

function PodioCell({ pos, isMet = false, isZ4 = false }) {
  if (!pos) return <>–</>;
  const cls =
    pos === 1 ? 'pod-1'
      : pos === 2 ? 'pod-2'
      : pos === 3 ? 'pod-3'
      : isZ4 ? 'pod-z4'
      : isMet ? 'pod-top'
      : 'pod-mid';
  const title = pos <= 3 ? `${pos}º Lugar` : undefined;
  return (
    <span className={`pod ${cls}`} title={title}>
      <b>
        {pos}
        <sup>º</sup>
      </b>
    </span>
  );
}

function EvBadge({ ev, prevVal, isPct = false }) {
  if (ev == null) return null;
  const fmt = isPct ? (v) => nf(Math.abs(v) * 100, 1) + ' pp' : (v) => nf(Math.abs(v), 2);
  const prevTxt = prevVal != null ? (isPct ? pc(prevVal) : nf(prevVal)) : '';
  const tip = prevTxt ? `Anterior: ${prevTxt}` : '';
  const thresh = isPct ? 0.0005 : 0.001;
  if (ev > thresh) return <span className="ev up" title={tip}>▲ +{fmt(ev)}</span>;
  if (ev < -thresh) return <span className="ev dn" title={tip}>▼ −{fmt(ev)}</span>;
  return <span className="ev eq" title={tip}>= 0,00</span>;
}

function MetricBarCell({
  val,
  target,
  ev,
  prevVal,
  isPct = false,
  inverse = false,
  showBar = true
}) {
  if (val == null || target == null) {
    return (
      <div className="ic">
        <b>–</b>
      </div>
    );
  }
  const r = inverse ? (val <= 0 ? 1 : target / val) : val / target;
  const w = Math.min(100, Math.max(8, r * 100));
  const isMet = inverse ? val <= target : Math.round(val * 100) >= Math.round(target * 100);
  const pct = !isMet ? Math.min(99, Math.floor(r * 100)) : Math.round(r * 100);
  const col = barColor(pct, isMet);

  return (
    <div className="ic" title={`Atingimento da meta: ${nf(r * 100, 1)}%`}>
      <b>{isPct ? pc(val, 1) : nf(val, 2)}</b>
      <EvBadge ev={ev} prevVal={prevVal} isPct={isPct} />
      {showBar && (
        <>
          <span className="lb">
            <i style={{ width: `${w}%`, background: col }} />
          </span>
          <em style={{ color: col }}>{pct}%</em>
        </>
      )}
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('ipc');
  const [metaIpc, setMetaIpc] = useState(() => {
    try {
      const saved = localStorage.getItem(META_STORAGE_KEY);
      return saved ? { ...DEFAULT_META_IPC, ...JSON.parse(saved) } : DEFAULT_META_IPC;
    } catch {
      return DEFAULT_META_IPC;
    }
  });
  const [regTargets, setRegTargets] = useState(() => {
    try {
      const saved = localStorage.getItem(REG_STORAGE_KEY);
      return saved ? { ...DEFAULT_REGIONAL_TARGETS, ...JSON.parse(saved) } : DEFAULT_REGIONAL_TARGETS;
    } catch {
      return DEFAULT_REGIONAL_TARGETS;
    }
  });

  const [history, setHistory] = useState(() => {
    try {
      const raw = localStorage.getItem(HIST_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [activeHistId, setActiveHistId] = useState(() =>
    history.length ? history[0].id : null
  );
  const [cmpId, setCmpId] = useState('auto');
  const [sortBy, setSortBy] = useState('d');
  const [desc, setDesc] = useState(true);
  const [statusMsg, setStatusMsg] = useState('');
  const [quickFilter, setQuickFilter] = useState('all');
  const [printing, setPrinting] = useState(false);
  const [logos, setLogos] = useState({
    centauroWhite: logoCentauroRaw,
    regionalClean: logoRegionalRaw
  });
  const printRef = useRef(null);

  useEffect(() => {
    getProcessedLogos().then((res) => {
      if (res) setLogos(res);
    });
  }, []);

  // Ao trocar de aba, seleciona a ordenação padrão ideal daquela aba
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setQuickFilter('all');
    if (tabId === 'ipc') {
      setSortBy('d');
      setDesc(true);
    } else if (tabId === 'cm_paridade') {
      setSortBy('dualScore');
      setDesc(true);
    } else if (tabId === 'cm') {
      setSortBy('cm');
      setDesc(true);
    } else if (tabId === 'paridade') {
      setSortBy('p');
      setDesc(true);
    } else if (tabId === 'placar') {
      setSortBy('cNum');
      setDesc(false);
    } else if (tabId === 'ruptura') {
      setSortBy('rupEx3');
      setDesc(false); // Ruptura: menor primeiro!
    } else if (tabId === 'vendas') {
      setSortBy('at');
      setDesc(true);
    }
  };

  useEffect(() => {
    try {
      localStorage.setItem(HIST_KEY, JSON.stringify(history));
    } catch {}
  }, [history]);

  useEffect(() => {
    try {
      localStorage.setItem(META_STORAGE_KEY, JSON.stringify(metaIpc));
    } catch {}
  }, [metaIpc]);

  useEffect(() => {
    try {
      localStorage.setItem(REG_STORAGE_KEY, JSON.stringify(regTargets));
    } catch {}
  }, [regTargets]);

  // Drag & Drop global
  useEffect(() => {
    const onDragOver = (e) => {
      e.preventDefault();
      document.body.classList.add('dragover');
    };
    const onDragLeave = (e) => {
      if (e.relatedTarget == null) document.body.classList.remove('dragover');
    };
    const onDrop = (e) => {
      e.preventDefault();
      document.body.classList.remove('dragover');
      if (e.dataTransfer?.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
    };
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  });

  const activeItem = useMemo(
    () => history.find((h) => h.id === activeHistId) || null,
    [history, activeHistId]
  );

  const prevItem = useMemo(() => {
    if (!history.length || !activeHistId || cmpId === 'none') return null;
    if (cmpId !== 'auto') return history.find((h) => h.id === cmpId) || null;
    const idx = history.findIndex((h) => h.id === activeHistId);
    return idx >= 0 && idx + 1 < history.length ? history[idx + 1] : null;
  }, [history, activeHistId, cmpId]);

  const handleFileUpload = (file) => {
    if (!file) return;
    setStatusMsg(`Carregando "${file.name}"...`);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = parseWorkbookBuffer(
          e.target.result,
          metaIpc,
          regTargets.ipcRegional
        );
        if (!parsed) {
          alert(
            'Não foi possível localizar as colunas de Loja / Indicadores nessa planilha. Verifique o arquivo selecionado.'
          );
          setStatusMsg('Erro ao ler planilha');
          return;
        }
        const now = new Date();
        const dateStr =
          now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) +
          ' ' +
          now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const entry = {
          id: String(Date.now()),
          fileName: file.name,
          sheetName: parsed.sheetName,
          date: dateStr,
          periodBadge: parsed.periodBadge,
          periodSub: parsed.periodSub || '01/10 a 28/10',
          periodText: parsed.periodText,
          stores: parsed.stores,
          totalRow: parsed.totalRow
        };
        const nextHist = [entry, ...history].slice(0, 20);
        setHistory(nextHist);
        setActiveHistId(entry.id);
        setStatusMsg(`✓ ${file.name} (${parsed.stores.length} lojas carregadas)`);
      } catch (err) {
        console.error(err);
        alert('Erro ao processar o arquivo: ' + err.message);
        setStatusMsg('Erro ao ler arquivo');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const deleteHistoryItem = (id, e) => {
    e.stopPropagation();
    const next = history.filter((h) => h.id !== id);
    setHistory(next);
    if (activeHistId === id) {
      setActiveHistId(next.length ? next[0].id : null);
    }
  };

  const clearHistory = () => {
    setHistory([]);
    setActiveHistId(null);
    setStatusMsg('');
  };

  const handleEditPeriod = () => {
    const cur = activeItem?.periodSub || '01/10 a 28/10';
    const nv = prompt('Informe o período analisado (ex: 01/10 a 28/10):', cur);
    if (nv && nv.trim() && activeItem) {
      setHistory((prev) =>
        prev.map((h) => (h.id === activeItem.id ? { ...h, periodSub: nv.trim() } : h))
      );
    }
  };

  const handleExportImage = async () => {
    if (!printRef.current || printing) return;
    try {
      setPrinting(true);
      setStatusMsg('Gerando imagem em Alta Resolução...');

      // Escala 2x é o "sweet spot" ideal para o WhatsApp:
      // Imagens com largura entre 1600px e 2400px NÃO sofrem compressão destrutiva do WhatsApp Web/Mobile
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        backgroundColor: '#06090F',
        useCORS: true,
        logging: false,
        imageTimeout: 0,
        windowWidth: 1440
      });
      const per = (activeItem?.periodSub || 'out-2026')
        .replace(/[^\w\d]+/g, '-')
        .replace(/^-|-$/g, '');
      const fname = `Ranking-${activeTab.toUpperCase()}-Aguias-do-Cerrado-${per}.png`;

      // Download do arquivo PNG original sem perda
      const link = document.createElement('a');
      link.download = fname;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();

      // Copia para a área de transferência
      canvas.toBlob(
        async (blob) => {
          if (blob && navigator.clipboard && window.ClipboardItem) {
            try {
              await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
              setStatusMsg('📸 Imagem salva e copiada! Dica: No WhatsApp, envie como Foto ou Documento para 100% de nitidez.');
            } catch {
              setStatusMsg('📸 Imagem baixada em alta qualidade!');
            }
          } else {
            setStatusMsg('📸 Imagem baixada em alta qualidade!');
          }
        },
        'image/png',
        1.0
      );
    } catch (err) {
      console.error(err);
      alert('Erro ao gerar imagem: ' + err.message);
    } finally {
      setPrinting(false);
    }
  };

  // Prepara os dados calculados das lojas e da Regional
  const { rows, totalObj } = useMemo(() => {
    const rawStores = activeItem?.stores
      ? activeItem.stores
      : Object.entries(metaIpc).map(([c, mi]) => ({ c, mi }));

    const TC = regTargets.cupomMisto ?? 0.30;
    const TP = regTargets.paridade ?? 0.55;
    const T_EX3 = regTargets.rupturaEx3 ?? 0.023;
    const T_VA = regTargets.rupturaVa ?? 0.010;
    const T_CK = regTargets.ckoutMovel ?? 0.35;
    const T_EM = regTargets.capEmail ?? 0.60;
    const T_EE = regTargets.eePct ?? 0.035;
    const T_NPS = regTargets.npsLoja ?? 0.92;
    const T_NPS_OMS = regTargets.npsOms ?? 0.58;
    const T_PERS = regTargets.personalizacao ?? 0.023;
    const T_CONV = regTargets.conversao ?? 0.18;

    const enrich = (s, isTotal = false) => {
      const mi = isTotal ? regTargets.ipcRegional : (metaIpc[s.c] ?? s.mi ?? regTargets.ipcRegional);
      const rIpc = s.ipc != null ? Math.round(s.ipc * 100) / 100 : null;
      const rMi = mi != null ? Math.round(mi * 100) / 100 : null;
      const d = rIpc != null && rMi != null ? Math.round((rIpc - rMi) * 100) / 100 : null;
      const ok = s.ipc != null && (s.cm != null || s.p != null);
      const st = !ok ? 'nd' : rIpc > rMi ? 'ac' : rIpc === rMi ? 'mt' : 'ab';

      const prevS = isTotal
        ? prevItem?.totalRow
        : prevItem?.stores?.find((p) => p.c === s.c);

      const rPrevIpc = prevS?.ipc != null ? Math.round(prevS.ipc * 100) / 100 : null;
      const ev = rIpc != null && rPrevIpc != null ? Math.round((rIpc - rPrevIpc) * 100) / 100 : null;
      const evCm = s.cm != null && prevS?.cm != null ? s.cm - prevS.cm : null;
      const evP = s.p != null && prevS?.p != null ? s.p - prevS.p : null;
      const evEx3 = s.rupEx3 != null && prevS?.rupEx3 != null ? s.rupEx3 - prevS.rupEx3 : null;
      const evCk = s.ckout != null && prevS?.ckout != null ? s.ckout - prevS.ckout : null;
      const evAt = s.at != null && prevS?.at != null ? s.at - prevS.at : null;

      const dc = s.cm != null ? s.cm - TC : null;
      const dp = s.p != null ? s.p - TP : null;
      const dEx3 = s.rupEx3 != null ? s.rupEx3 - T_EX3 : null;
      const dVa = s.rupVa != null ? s.rupVa - T_VA : null;
      const rupAvg =
        s.rupEx3 != null && s.rupVa != null ? (s.rupEx3 + s.rupVa) / 2 : (s.rupEx3 ?? s.rupVa ?? null);
      const dCk = s.ckout != null ? s.ckout - T_CK : null;
      const dEm = s.capEmail != null ? s.capEmail - T_EM : null;
      const dEe = s.ee != null ? s.ee - T_EE : null;
      const dNps = s.npsGestao != null ? s.npsGestao - T_NPS : null;
      const dNpsOms = s.npsOms != null ? s.npsOms - T_NPS_OMS : null;
      const dPers = s.futebol != null ? s.futebol - T_PERS : null;

      // Avaliação dos 13 KPIs do Placar Geral de Lojas
      const kpiDesvio = s.desvioPct != null && s.v != null ? s.desvioPct >= 0 : null;
      const kpiCresc = s.cresc != null ? s.cresc >= 0 : null;
      const kpiIpc = rIpc != null && rMi != null && s.v != null ? rIpc >= rMi : null;
      const kpiConv =
        s.crescConv != null
          ? s.crescConv >= 0
          : s.conv != null && s.v != null
          ? s.conv >= T_CONV
          : null;
      const kpiPers = s.futebol != null ? s.futebol >= T_PERS : null;
      const kpiEx3 = s.rupEx3 != null && s.v != null ? s.rupEx3 <= T_EX3 : null;
      const kpiParid = s.p != null && s.v != null ? s.p >= TP : null;
      const kpiCm = s.cm != null && s.v != null ? s.cm >= TC : null;
      const kpiNpsLoja = s.npsGestao != null ? s.npsGestao >= T_NPS : null;
      const kpiNpsOms = s.npsOms != null ? s.npsOms >= T_NPS_OMS : null;
      const kpiCkout = s.ckout != null && s.v != null ? s.ckout >= T_CK : null;
      const kpiEmail = s.capEmail != null && s.v != null ? s.capEmail >= T_EM : null;
      const kpiVa = s.rupVa != null && s.v != null ? s.rupVa <= T_VA : null;

      const cmOk = s.cm != null && TC != null ? s.cm >= TC : false;
      const pOk = s.p != null && TP != null ? s.p >= TP : false;
      const bothOk = cmOk && pOk;
      const statusCmParid = bothOk ? 'both' : cmOk ? 'cm_only' : pOk ? 'p_only' : 'none';
      const dualScore =
        (bothOk ? 10000 : 0) +
        (cmOk ? 2000 : 0) +
        (pOk ? 1000 : 0) +
        ((s.cm ?? 0) * 100) +
        ((s.p ?? 0) * 10);

      const kpiFlags = [
        kpiDesvio,
        kpiCresc,
        kpiIpc,
        kpiConv,
        kpiPers,
        kpiEx3,
        kpiParid,
        kpiCm,
        kpiNpsLoja,
        kpiNpsOms,
        kpiCkout,
        kpiEmail,
        kpiVa
      ];
      const validKpis = kpiFlags.filter((k) => k !== null).length;
      const kpisCount = validKpis >= 4 ? kpiFlags.filter((k) => k === true).length : null;

      return {
        ...s,
        cNum: parseInt(s.c, 10) || 9999,
        mi,
        d,
        ok,
        st,
        ev,
        prevIpc: prevS?.ipc ?? null,
        evCm,
        prevCm: prevS?.cm ?? null,
        evP,
        prevP: prevS?.p ?? null,
        evEx3,
        prevEx3: prevS?.rupEx3 ?? null,
        evCk,
        prevCk: prevS?.ckout ?? null,
        evAt,
        prevAt: prevS?.at ?? null,
        dc,
        dp,
        cmOk,
        pOk,
        bothOk,
        statusCmParid,
        dualScore,
        dEx3,
        dVa,
        rupAvg,
        dCk,
        dEm,
        dEe,
        dNps,
        dNpsOms,
        dPers,
        kpiDesvio,
        kpiCresc,
        kpiIpc,
        kpiConv,
        kpiPers,
        kpiEx3,
        kpiParid,
        kpiCm,
        kpiNpsLoja,
        kpiNpsOms,
        kpiCkout,
        kpiEmail,
        kpiVa,
        kpisCount
      };
    };

    const list = rawStores.map((s) => enrich(s, false));

    // Define a posição fixa (#) conforme o indicador principal da aba ativa
    const rankSorted = [...list].sort((a, b) => {
      if (activeTab === 'ipc') {
        return (a.d == null) - (b.d == null) || (b.d ?? 0) - (a.d ?? 0) || (b.ipc ?? 0) - (a.ipc ?? 0);
      }
      if (activeTab === 'cm_paridade') {
        return (
          (b.dualScore ?? 0) - (a.dualScore ?? 0) ||
          (b.cm ?? 0) - (a.cm ?? 0) ||
          (b.p ?? 0) - (a.p ?? 0)
        );
      }
      if (activeTab === 'cm') {
        return (a.cm == null) - (b.cm == null) || (b.cm ?? 0) - (a.cm ?? 0) || (b.p ?? 0) - (a.p ?? 0);
      }
      if (activeTab === 'paridade') {
        return (a.p == null) - (b.p == null) || (b.p ?? 0) - (a.p ?? 0) || (b.cm ?? 0) - (a.cm ?? 0);
      }
      if (activeTab === 'placar') {
        return (a.kpisCount == null) - (b.kpisCount == null) || (b.kpisCount ?? 0) - (a.kpisCount ?? 0);
      }
      if (activeTab === 'ruptura') {
        // Ruptura: menor é melhor!
        return (a.rupEx3 == null) - (b.rupEx3 == null) || (a.rupEx3 ?? 99) - (b.rupEx3 ?? 99);
      }
      return (a.at == null) - (b.at == null) || (b.at ?? 0) - (a.at ?? 0);
    });

    rankSorted.forEach((x, idx) => {
      const hasVal =
        activeTab === 'ipc'
          ? x.d != null
          : activeTab === 'cm_paridade'
          ? (x.cm != null || x.p != null)
          : activeTab === 'cm'
          ? x.cm != null
          : activeTab === 'paridade'
          ? x.p != null
          : activeTab === 'placar'
          ? x.kpisCount != null
          : activeTab === 'ruptura'
          ? x.rupEx3 != null
          : x.at != null;
      x.pos = hasVal ? idx + 1 : null;
    });

    // Aplica a ordenação escolhida pelo usuário
    const displaySorted = [...rankSorted].sort((x, y) => {
      const vx = x[sortBy];
      const vy = y[sortBy];
      if ((vx == null) !== (vy == null)) return (vx == null) - (vy == null);
      return desc ? (vy ?? 0) - (vx ?? 0) : (vx ?? 0) - (vy ?? 0);
    });

    const tot = enrich(activeItem?.totalRow || { c: 'Total' }, true);
    return { rows: displaySorted, totalObj: tot };
  }, [activeItem, prevItem, metaIpc, regTargets, activeTab, sortBy, desc]);

  // Filtra as linhas conforme o seletor rápido
  const filteredRows = useMemo(() => {
    if (quickFilter === 'all') return rows;
    if (activeTab === 'cm') {
      if (quickFilter === 'met') return rows.filter((r) => r.dc != null && r.dc >= 0);
      if (quickFilter === 'gap') return rows.filter((r) => r.dc != null && r.dc < 0);
    }
    if (activeTab === 'paridade') {
      if (quickFilter === 'met') return rows.filter((r) => r.dp != null && r.dp >= 0);
      if (quickFilter === 'gap') return rows.filter((r) => r.dp != null && r.dp < 0);
    }
    if (activeTab === 'cm_paridade') {
      if (quickFilter === 'both') return rows.filter((r) => r.statusCmParid === 'both');
      if (quickFilter === 'cm_only') return rows.filter((r) => r.statusCmParid === 'cm_only');
      if (quickFilter === 'p_only') return rows.filter((r) => r.statusCmParid === 'p_only');
      if (quickFilter === 'gap') return rows.filter((r) => r.statusCmParid === 'none');
    }
    return rows;
  }, [rows, quickFilter, activeTab]);

  const currentTabInfo = TABS.find((t) => t.id === activeTab) || TABS[0];
  const periodSub = activeItem?.periodSub || (activeItem ? '01/10 a 28/10' : '–');

  // Estatísticas para os Cards Laterais Broadcast ("DESEMPENHO GERAL" e Card Principal)
  const sideStats = useMemo(() => {
    const total = rows.length || 1;
    let above = 0;
    let near = 0;
    let below = 0;

    rows.forEach((x) => {
      let ratio = null;
      let isMet = false;
      if (activeTab === 'ipc') {
        if (x.ipc != null && x.mi) {
          ratio = x.ipc / x.mi;
          isMet = x.st === 'ac' || x.st === 'mt';
        }
      } else if (activeTab === 'cm' || activeTab === 'cm_paridade') {
        if (x.cm != null && regTargets.cupomMisto) {
          ratio = x.cm / regTargets.cupomMisto;
          isMet = x.dc >= 0;
        }
      } else if (activeTab === 'paridade') {
        if (x.p != null && regTargets.paridade) {
          ratio = x.p / regTargets.paridade;
          isMet = x.dp >= 0;
        }
      } else if (activeTab === 'ruptura') {
        if (x.rupEx3 != null && regTargets.rupturaEx3) {
          ratio = x.rupEx3 <= 0 ? 1 : regTargets.rupturaEx3 / x.rupEx3;
          isMet = x.dEx3 <= 0;
        }
      } else if (activeTab === 'vendas') {
        if (x.at != null) {
          ratio = x.at;
          isMet = x.at >= 1;
        }
      }

      if (ratio == null) return;
      if (isMet) above++;
      else if (ratio >= 0.94) near++;
      else below++;
    });

    const ipcRegPct =
      totalObj.ipc != null && regTargets.ipcRegional
        ? Math.round((totalObj.ipc / regTargets.ipcRegional) * 100)
        : null;

    const validRanked = [...rows]
      .filter((r) => r.pos != null)
      .sort((a, b) => a.pos - b.pos);
    const top3 = validRanked.slice(0, 3);
    const bottom4 = validRanked.length >= 7 ? validRanked.slice(-4) : [];

    const fmtStoreMetric = (x) => {
      if (activeTab === 'ipc') {
        return { val: nf(x.ipc), dif: sg(x.d), ok: (x.d ?? -1) >= 0 };
      }
      if (activeTab === 'cm' || activeTab === 'cm_paridade') {
        return { val: pc(x.cm), dif: sp(x.dc), ok: (x.dc ?? -1) >= 0 };
      }
      if (activeTab === 'paridade') {
        return { val: nf(x.p), dif: sg(x.dp), ok: (x.dp ?? -1) >= 0 };
      }
      if (activeTab === 'ruptura') {
        return { val: pc(x.rupEx3), dif: sp(x.dEx3, 1, true), ok: (x.dEx3 ?? 1) <= 0 };
      }
      return { val: pc(x.at), dif: brl(x.v, 0), ok: (x.at ?? 0) >= 1 };
    };

    return {
      above,
      near,
      below,
      abovePct: Math.round((above / total) * 100),
      nearPct: Math.round((near / total) * 100),
      belowPct: Math.round((below / total) * 100),
      ipcRegPct,
      top3,
      bottom4,
      fmtStoreMetric
    };
  }, [rows, activeTab, regTargets, totalObj]);

  return (
    <>
      {/* Menu de Navegação entre os Dashboards */}
      <nav className="dash-nav" aria-label="Menu de Rankings">
        <div className="dash-nav-in">
          <div className="nav-brand">
            <img
              src={logos.regionalClean}
              alt="Águias do Cerrado"
              className="nav-brand-shield"
            />
            <span>PLACAR DE LOJAS</span>
          </div>
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                className={`nav-tab ${activeTab === t.id ? 'active' : ''}`}
                onClick={() => handleTabChange(t.id)}
              >
                <Icon />
                {t.label}
              </button>
            );
          })}
        </div>
      </nav>

      <main className={activeTab === 'placar' ? 'wide' : ''}>
        {/* Painel de Controle Superior (Fora da área de print) */}
        <div className="ctrl-panel">
          <div className="bar">
            <input
              type="file"
              id="file-in"
              accept=".xlsx,.xls,.xlsb,.csv"
              hidden
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleFileUpload(e.target.files[0]);
                  e.target.value = '';
                }
              }}
            />
            <label className="up-btn" htmlFor="file-in">
              <Upload />
              Anexar planilha
            </label>

            {activeItem && activeTab !== 'metas' && (
              <>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  aria-label="Ordenar"
                >
                  {(SORT_OPTIONS[activeTab] || SORT_OPTIONS.ipc).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  className="btn-sort-dir"
                  onClick={() => setDesc((d) => !d)}
                >
                  {desc ? 'Maior primeiro' : 'Menor primeiro'}
                </button>

                <select
                  value={cmpId}
                  onChange={(e) => setCmpId(e.target.value)}
                  aria-label="Comparar evolução com"
                >
                  <option value="auto">Comparar: Planilha anterior</option>
                  <option value="none">Sem comparativo (▲/▼)</option>
                  {history
                    .filter((h) => h.id !== activeHistId)
                    .map((h) => (
                      <option key={h.id} value={h.id}>
                        Comparar c/: {h.fileName} ({h.date})
                      </option>
                    ))}
                </select>

                <button
                  type="button"
                  className="prt-btn"
                  onClick={handleExportImage}
                  disabled={printing}
                >
                  <Camera />
                  {printing ? 'Gerando imagem HD...' : 'Salvar imagem (WhatsApp)'}
                </button>
              </>
            )}

            <span className="up-status">
              {statusMsg ||
                (activeItem
                  ? `✓ ${activeItem.fileName} (${activeItem.stores.length} lojas)`
                  : '')}
            </span>
          </div>

          <div className="hist-box">
            <span className="hist-lbl">Histórico de planilhas:</span>
            <div className="hist-list">
              {!history.length ? (
                <span style={{ fontSize: 13, color: 'var(--mut)' }}>
                  Nenhuma planilha anexada ainda
                </span>
              ) : (
                history.map((h) => (
                  <div
                    key={h.id}
                    className={`hist-item ${h.id === activeHistId ? 'on' : ''}`}
                    onClick={() => setActiveHistId(h.id)}
                    title={`Clique para visualizar (${h.sheetName})`}
                  >
                    <span>
                      <b>{h.fileName}</b>{' '}
                      <small>
                        ({h.date}
                        {h.totalRow?.ipc != null ? ` · IPC ${nf(h.totalRow.ipc)}` : ''})
                      </small>
                    </span>
                    <button
                      type="button"
                      className="hist-del"
                      onClick={(e) => deleteHistoryItem(h.id, e)}
                      title="Remover do histórico"
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
            {history.length > 0 && (
              <button type="button" className="hist-clr" onClick={clearHistory}>
                Limpar histórico
              </button>
            )}
          </div>
        </div>

        {/* Aba de Configuração de Metas */}
        {activeTab === 'metas' ? (
          <div className="cfg-card">
            <div className="rk-head" style={{ marginBottom: 14 }}>
              <h2>
                Configuração de Metas <small>/// Salvas automaticamente no navegador</small>
              </h2>
              <button
                type="button"
                onClick={() => {
                  setMetaIpc(DEFAULT_META_IPC);
                  setRegTargets(DEFAULT_REGIONAL_TARGETS);
                }}
              >
                Restaurar metas padrão
              </button>
            </div>

            <h3>Metas Regionais</h3>
            <div className="cfg-grid" style={{ marginBottom: 22 }}>
              <div className="cfg-field">
                <label>Meta IPC Regional</label>
                <input
                  type="number"
                  step="0.01"
                  value={regTargets.ipcRegional}
                  onChange={(e) =>
                    setRegTargets((p) => ({ ...p, ipcRegional: parseFloat(e.target.value) || 0 }))
                  }
                />
              </div>
              <div className="cfg-field">
                <label>Meta Cupom Misto (%)</label>
                <input
                  type="number"
                  step="1"
                  value={Math.round(regTargets.cupomMisto * 100)}
                  onChange={(e) =>
                    setRegTargets((p) => ({
                      ...p,
                      cupomMisto: (parseFloat(e.target.value) || 0) / 100
                    }))
                  }
                />
              </div>
              <div className="cfg-field">
                <label>Meta Paridade</label>
                <input
                  type="number"
                  step="0.01"
                  value={regTargets.paridade}
                  onChange={(e) =>
                    setRegTargets((p) => ({ ...p, paridade: parseFloat(e.target.value) || 0 }))
                  }
                />
              </div>
              <div className="cfg-field">
                <label>Teto Ruptura EX3 (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={+(regTargets.rupturaEx3 * 100).toFixed(1)}
                  onChange={(e) =>
                    setRegTargets((p) => ({
                      ...p,
                      rupturaEx3: (parseFloat(e.target.value) || 0) / 100
                    }))
                  }
                />
              </div>
              <div className="cfg-field">
                <label>Teto Ruptura V.A. (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={+(regTargets.rupturaVa * 100).toFixed(1)}
                  onChange={(e) =>
                    setRegTargets((p) => ({
                      ...p,
                      rupturaVa: (parseFloat(e.target.value) || 0) / 100
                    }))
                  }
                />
              </div>
              <div className="cfg-field">
                <label>Meta Checkout Móvel (%)</label>
                <input
                  type="number"
                  step="1"
                  value={Math.round(regTargets.ckoutMovel * 100)}
                  onChange={(e) =>
                    setRegTargets((p) => ({
                      ...p,
                      ckoutMovel: (parseFloat(e.target.value) || 0) / 100
                    }))
                  }
                />
              </div>
              <div className="cfg-field">
                <label>Meta Captura E-mail (%)</label>
                <input
                  type="number"
                  step="1"
                  value={Math.round((regTargets.capEmail ?? 0.60) * 100)}
                  onChange={(e) =>
                    setRegTargets((p) => ({
                      ...p,
                      capEmail: (parseFloat(e.target.value) || 0) / 100
                    }))
                  }
                />
              </div>
              <div className="cfg-field">
                <label>Meta NPS Loja (%)</label>
                <input
                  type="number"
                  step="1"
                  value={Math.round((regTargets.npsLoja ?? 0.92) * 100)}
                  onChange={(e) =>
                    setRegTargets((p) => ({
                      ...p,
                      npsLoja: (parseFloat(e.target.value) || 0) / 100
                    }))
                  }
                />
              </div>
              <div className="cfg-field">
                <label>Meta NPS OMS (%)</label>
                <input
                  type="number"
                  step="1"
                  value={Math.round((regTargets.npsOms ?? 0.58) * 100)}
                  onChange={(e) =>
                    setRegTargets((p) => ({
                      ...p,
                      npsOms: (parseFloat(e.target.value) || 0) / 100
                    }))
                  }
                />
              </div>
              <div className="cfg-field">
                <label>Meta Conversão (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={+((regTargets.conversao ?? 0.18) * 100).toFixed(1)}
                  onChange={(e) =>
                    setRegTargets((p) => ({
                      ...p,
                      conversao: (parseFloat(e.target.value) || 0) / 100
                    }))
                  }
                />
              </div>
              <div className="cfg-field">
                <label>Meta Personalização (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={+((regTargets.personalizacao ?? 0.023) * 100).toFixed(1)}
                  onChange={(e) =>
                    setRegTargets((p) => ({
                      ...p,
                      personalizacao: (parseFloat(e.target.value) || 0) / 100
                    }))
                  }
                />
              </div>
              <div className="cfg-field">
                <label>Meta Qtd. KPIs</label>
                <input
                  type="number"
                  step="1"
                  value={regTargets.kpisMin ?? 7}
                  onChange={(e) =>
                    setRegTargets((p) => ({
                      ...p,
                      kpisMin: parseInt(e.target.value, 10) || 0
                    }))
                  }
                />
              </div>
            </div>

            <h3>Metas Individuais de IPC por Loja</h3>
            <div className="cfg-grid">
              {Object.entries(metaIpc).map(([code, val]) => (
                <div key={code} className="cfg-field">
                  <label>Loja {code}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={val}
                    onChange={(e) =>
                      setMetaIpc((p) => ({ ...p, [code]: parseFloat(e.target.value) || 0 }))
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        ) : !activeItem ? (
          /* TELA INICIAL: PEDE PARA ANEXAR A PLANILHA NA PRIMEIRA VEZ */
          <div className="hero-empty-state">
            <div className="hero-shield-wrap">
              <img
                src={logos.regionalClean}
                alt="Águias do Cerrado"
                className="hero-shield"
              />
            </div>
            <div className="hero-title-box">
              <h1 className="hero-title">
                PLACAR DE LOJAS <span className="hl">ÁGUIAS DO CERRADO</span>
              </h1>
              <p className="hero-sub">
                Painel oficial de rankings e indicadores da Regional Centauro.
                Anexe a planilha para carregar automaticamente todos os rankings com visual de transmissão esportiva.
              </p>
            </div>

            <div
              className="hero-dropzone-card"
              onClick={() => document.getElementById('file-in')?.click()}
            >
              <div className="hero-icon-bubble">
                <FileSpreadsheet size={38} />
              </div>
              <h3 className="hero-card-title">ANEXAR PLANILHA DE INDICADORES</h3>
              <p className="hero-card-desc">
                Arraste o arquivo <b>Painel de Indicadores Lojas.xlsx</b> aqui ou clique no botão abaixo para selecionar do computador.
              </p>
              <label htmlFor="file-in" className="hero-upload-btn" onClick={(e) => e.stopPropagation()}>
                <Upload size={20} />
                SELECIONAR PLANILHA EXCEL
              </label>
            </div>

            <div className="hero-features-grid">
              <div className="hero-feat-card">
                <div className="hero-feat-title">
                  <Trophy size={18} />
                  <span>13 KPIs AUTOMATIZADOS</span>
                </div>
                <p className="hero-feat-desc">
                  IPC, Cupom Misto, Paridade, Ruptura, Conversão, NPS e Vendas calculados instantaneamente com pódio e Z4.
                </p>
              </div>

              <div className="hero-feat-card">
                <div className="hero-feat-title">
                  <Sparkles size={18} />
                  <span>CUPOM MISTO &amp; PARIDADE</span>
                </div>
                <p className="hero-feat-desc">
                  Visão com selo Duplo Ouro, barras de atingimento da meta e filtros rápidos por status de entrega.
                </p>
              </div>

              <div className="hero-feat-card">
                <div className="hero-feat-title">
                  <Camera size={18} />
                  <span>PRONTO PARA O WHATSAPP</span>
                </div>
                <p className="hero-feat-desc">
                  Gere imagens em altíssima definição (HD) prontas para copiar (Ctrl+V) e compartilhar com a equipe.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Área Limpa de Print Broadcast Esportivo Centauro */
          <>
            <div className="print-area" id="print-area" ref={printRef}>
              {/* TOPO BROADCAST CENTAURO - DESIGN ESPORTIVO / FUTEBOL */}
              <div className="bc-header">
                <div className="bc-brand-wrap">
                  {/* Bloco de Logos: Centauro Oficial + Escudo Águias */}
                  <div className="bc-logo-cluster">
                    <img
                      src={logos.centauroWhite}
                      alt="Centauro"
                      className="bc-centauro-img"
                    />
                    <div className="bc-logo-sep" />
                    <div className="bc-shield-badge">
                      <img
                        src={logos.regionalClean}
                        alt="Águias do Cerrado"
                        className="bc-regional-shield"
                      />
                    </div>
                  </div>

                  {/* Título da Transmissão */}
                  <div className="bc-title-box">
                    <div className="bc-champ-badge">
                      <span className="bc-live-dot" />
                      <span>CAMPEONATO REGIONAL · CENTAURO</span>
                      <span className="bc-pill-tag">2026</span>
                    </div>

                    <h2 className="bc-title">
                      {currentTabInfo.prefix}{' '}
                      <span className="hl">{currentTabInfo.hl}</span>
                    </h2>

                    <div className="bc-sub-row">
                      <span className="bc-sub-team">
                        <MapPin size={13} />
                        ÁGUIAS DO CERRADO
                      </span>
                      <span className="bc-sub-dot">•</span>
                      <span className="bc-sub-motto">
                        MAIS ESPORTE PARA TODOS
                      </span>
                    </div>
                  </div>
                </div>

                {/* Lado Direito: Placar de Tempo / Rodada */}
                <div className="bc-right">
                  <div
                    className="bc-period-card"
                    onClick={handleEditPeriod}
                    title="Clique para ajustar a rodada/período"
                  >
                    <div className="bc-period-top">
                      <span className="bc-period-indicator" />
                      <span>RODADA / PERÍODO</span>
                    </div>
                    <div className="bc-period-body">
                      <Calendar size={18} />
                      <b>{periodSub}</b>
                    </div>
                  </div>
                </div>
              </div>

              {/* CARDS DE RESUMO BROADCAST PARA CUPOM MISTO E PARIDADE */}
              {(activeTab === 'cm' || activeTab === 'paridade' || activeTab === 'cm_paridade') && (
                <KpiSummaryBar
                  activeTab={activeTab}
                  rows={rows}
                  totalObj={totalObj}
                  regTargets={regTargets}
                  quickFilter={quickFilter}
                  setQuickFilter={setQuickFilter}
                />
              )}

              {/* CORPO PRINCIPAL BROADCAST: TABELA + PAINEL LATERAL */}
              <div className={`bc-body ${activeTab === 'placar' ? 'full' : ''}`}>
                <div className="tw">
                  {/* 1. TABELA DE RANKING DE IPC */}
                  {activeTab === 'ipc' && (
                    <table>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Loja</th>
                          <th>IPC</th>
                          <th>{curMonthHeader()}</th>
                          <th>Dif.</th>
                          <th>Cupom misto</th>
                          <th>Dif. {pc(regTargets.cupomMisto, 0)}</th>
                          <th>Paridade</th>
                          <th>Dif. {nf(regTargets.paridade)}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((x, idx) => {
                          const isTop3 = idx < 3;
                          const isTop3End = rows.length >= 6 && idx === 2;
                          const isZ4Start = rows.length >= 8 && idx === rows.length - 4;
                          const isZ4 = rows.length >= 8 && idx >= rows.length - 4;
                          const isIpcOk = x.st === 'ac' || x.st === 'mt';
                          const prevOk =
                            idx > 0 && (rows[idx - 1].st === 'ac' || rows[idx - 1].st === 'mt');
                          const isZoneSep = idx > 3 && prevOk && !isIpcOk && !isZ4Start;
                          return (
                            <tr
                              key={x.c}
                              className={`${x.st} ${isTop3 ? 'top3-row' : ''} ${
                                isTop3End ? 'top3-end' : ''
                              } ${isZoneSep ? 'zone-sep' : ''} ${
                                isZ4Start ? 'z4-start' : ''
                              } ${isZ4 ? 'z4' : ''}`}
                            >
                              <td>
                                <PodioCell pos={x.pos} isMet={isIpcOk} isZ4={isZ4} />
                              </td>
                              <td className={isIpcOk ? 'cell-ok' : ''}>
                                <b>{x.c}</b>
                              </td>
                              <td className={isIpcOk ? 'cell-ok' : ''}>
                                <MetricBarCell
                                  val={x.ipc}
                                  target={x.mi}
                                  ev={x.ev}
                                  prevVal={x.prevIpc}
                                />
                              </td>
                              <td>{nf(x.mi)}</td>
                              <td className={x.d == null ? '' : x.d < 0 ? 'b' : 'g'}>
                                {sg(x.d)}
                              </td>
                              <td>
                                {pc(x.cm)}
                              </td>
                              <td className={x.dc == null ? '' : x.dc < 0 ? 'b' : 'g'}>
                                {sp(x.dc)}
                              </td>
                              <td>
                                {nf(x.p)}
                              </td>
                              <td className={x.dp == null ? '' : x.dp < 0 ? 'b' : 'g'}>
                                {sg(x.dp)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td>–</td>
                          <td>
                            <b>REGIONAL</b>
                          </td>
                          <td>
                            <MetricBarCell
                              val={totalObj.ipc}
                              target={regTargets.ipcRegional}
                              ev={totalObj.ev}
                              prevVal={totalObj.prevIpc}
                            />
                          </td>
                          <td>{nf(regTargets.ipcRegional)}</td>
                          <td
                            className={
                              totalObj.d == null ? '' : totalObj.d < 0 ? 'b' : 'g'
                            }
                          >
                            {sg(totalObj.d)}
                          </td>
                          <td
                            className={
                              totalObj.dc != null && totalObj.dc >= 0 ? 'g' : ''
                            }
                          >
                            {pc(totalObj.cm)}
                          </td>
                          <td
                            className={
                              totalObj.dc == null ? '' : totalObj.dc < 0 ? 'b' : 'g'
                            }
                          >
                            {sp(totalObj.dc)}
                          </td>
                          <td
                            className={
                              totalObj.dp != null && totalObj.dp >= 0 ? 'g' : ''
                            }
                          >
                            {nf(totalObj.p)}
                          </td>
                          <td
                            className={
                              totalObj.dp == null ? '' : totalObj.dp < 0 ? 'b' : 'g'
                            }
                          >
                            {sg(totalObj.dp)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  )}

                  {/* 2. TABELA DE RANKING DE CUPOM MISTO (Aprimorada) */}
                  {activeTab === 'cm' && (
                    <table>
                      <thead>
                        <tr>
                          <th style={{ width: 62 }}>#</th>
                          <th style={{ width: 80 }}>Loja</th>
                          <th style={{ width: 140, textAlign: 'center' }}>Status</th>
                          <th>Cupom Misto</th>
                          <th style={{ width: 110 }}>Meta Regional</th>
                          <th style={{ width: 110 }}>Dif. pp</th>
                          <th style={{ width: 120 }}>Atingimento</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRows.length === 0 ? (
                          <tr>
                            <td colSpan={7} style={{ textAlign: 'center', padding: '28px', color: '#94A3B8' }}>
                              Nenhuma loja encontrada para o filtro selecionado.
                            </td>
                          </tr>
                        ) : (
                          filteredRows.map((x, idx) => {
                            const isTop3 = idx < 3 && quickFilter === 'all';
                            const isTop3End = filteredRows.length >= 6 && idx === 2 && quickFilter === 'all';
                            const isZ4Start = filteredRows.length >= 8 && idx === filteredRows.length - 4 && quickFilter === 'all';
                            const isZ4 = filteredRows.length >= 8 && idx >= filteredRows.length - 4 && quickFilter === 'all';
                            const cmOk = x.dc != null && x.dc >= 0;
                            const atingPct = x.cm != null && regTargets.cupomMisto ? Math.round((x.cm / regTargets.cupomMisto) * 100) : null;
                            return (
                              <tr
                                key={x.c}
                                className={`${cmOk ? 'ac' : 'ab'} ${isTop3 ? 'top3-row' : ''} ${
                                  isTop3End ? 'top3-end' : ''
                                } ${isZ4Start ? 'z4-start' : ''} ${isZ4 ? 'z4' : ''}`}
                              >
                                <td>
                                  <PodioCell pos={x.pos} isMet={cmOk} isZ4={isZ4} />
                                </td>
                                <td className={cmOk ? 'cell-ok' : ''}>
                                  <b>{x.c}</b>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <span className={`cm-tag ${cmOk ? 'cm-tag-cm-ok' : 'cm-tag-bad'}`}>
                                    {cmOk ? '✓ META ENTREGUE' : '⚠ ABAIXO DA META'}
                                  </span>
                                </td>
                                <td className={cmOk ? 'cell-ok' : ''}>
                                  <MetricBarCell
                                    val={x.cm}
                                    target={regTargets.cupomMisto}
                                    ev={x.evCm}
                                    prevVal={x.prevCm}
                                    isPct
                                    showBar={true}
                                  />
                                </td>
                                <td>{pc(regTargets.cupomMisto, 0)}</td>
                                <td className={x.dc == null ? '' : x.dc < 0 ? 'b' : 'g'}>
                                  {sp(x.dc)}
                                </td>
                                <td className={cmOk ? 'g' : 'b'}>
                                  {atingPct != null ? `${atingPct}%` : '–'}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td>–</td>
                          <td>
                            <b>REGIONAL</b>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`cm-tag ${totalObj.dc != null && totalObj.dc >= 0 ? 'cm-tag-cm-ok' : 'cm-tag-bad'}`}>
                              {totalObj.dc != null && totalObj.dc >= 0 ? '✓ META ENTREGUE' : '⚠ ABAIXO DA META'}
                            </span>
                          </td>
                          <td className={totalObj.dc != null && totalObj.dc >= 0 ? 'g' : ''}>
                            <MetricBarCell
                              val={totalObj.cm}
                              target={regTargets.cupomMisto}
                              ev={totalObj.evCm}
                              prevVal={totalObj.prevCm}
                              isPct
                              showBar={true}
                            />
                          </td>
                          <td>{pc(regTargets.cupomMisto, 0)}</td>
                          <td
                            className={
                              totalObj.dc == null ? '' : totalObj.dc < 0 ? 'b' : 'g'
                            }
                          >
                            {sp(totalObj.dc)}
                          </td>
                          <td className={totalObj.dc != null && totalObj.dc >= 0 ? 'g' : 'b'}>
                            {totalObj.cm != null && regTargets.cupomMisto ? `${Math.round((totalObj.cm / regTargets.cupomMisto) * 100)}%` : '–'}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  )}

                  {/* 3. TABELA DE RANKING DE PARIDADE (Aprimorada) */}
                  {activeTab === 'paridade' && (
                    <table>
                      <thead>
                        <tr>
                          <th style={{ width: 62 }}>#</th>
                          <th style={{ width: 80 }}>Loja</th>
                          <th style={{ width: 140, textAlign: 'center' }}>Status</th>
                          <th>Paridade</th>
                          <th style={{ width: 110 }}>Meta Regional</th>
                          <th style={{ width: 110 }}>Diferença</th>
                          <th style={{ width: 120 }}>Atingimento</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRows.length === 0 ? (
                          <tr>
                            <td colSpan={7} style={{ textAlign: 'center', padding: '28px', color: '#94A3B8' }}>
                              Nenhuma loja encontrada para o filtro selecionado.
                            </td>
                          </tr>
                        ) : (
                          filteredRows.map((x, idx) => {
                            const isTop3 = idx < 3 && quickFilter === 'all';
                            const isTop3End = filteredRows.length >= 6 && idx === 2 && quickFilter === 'all';
                            const isZ4Start = filteredRows.length >= 8 && idx === filteredRows.length - 4 && quickFilter === 'all';
                            const isZ4 = filteredRows.length >= 8 && idx >= filteredRows.length - 4 && quickFilter === 'all';
                            const pOk = x.dp != null && x.dp >= 0;
                            const atingPct = x.p != null && regTargets.paridade ? Math.round((x.p / regTargets.paridade) * 100) : null;
                            return (
                              <tr
                                key={x.c}
                                className={`${pOk ? 'ac' : 'ab'} ${isTop3 ? 'top3-row' : ''} ${
                                  isTop3End ? 'top3-end' : ''
                                } ${isZ4Start ? 'z4-start' : ''} ${isZ4 ? 'z4' : ''}`}
                              >
                                <td>
                                  <PodioCell pos={x.pos} isMet={pOk} isZ4={isZ4} />
                                </td>
                                <td className={pOk ? 'cell-ok' : ''}>
                                  <b>{x.c}</b>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <span className={`cm-tag ${pOk ? 'cm-tag-p-ok' : 'cm-tag-bad'}`}>
                                    {pOk ? '✓ META ENTREGUE' : '⚠ ABAIXO DA META'}
                                  </span>
                                </td>
                                <td className={pOk ? 'cell-ok' : ''}>
                                  <MetricBarCell
                                    val={x.p}
                                    target={regTargets.paridade}
                                    ev={x.evP}
                                    prevVal={x.prevP}
                                    showBar={true}
                                  />
                                </td>
                                <td>{nf(regTargets.paridade)}</td>
                                <td className={x.dp == null ? '' : x.dp < 0 ? 'b' : 'g'}>
                                  {sg(x.dp)}
                                </td>
                                <td className={pOk ? 'g' : 'b'}>
                                  {atingPct != null ? `${atingPct}%` : '–'}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td>–</td>
                          <td>
                            <b>REGIONAL</b>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`cm-tag ${totalObj.dp != null && totalObj.dp >= 0 ? 'cm-tag-p-ok' : 'cm-tag-bad'}`}>
                              {totalObj.dp != null && totalObj.dp >= 0 ? '✓ META ENTREGUE' : '⚠ ABAIXO DA META'}
                            </span>
                          </td>
                          <td className={totalObj.dp != null && totalObj.dp >= 0 ? 'g' : ''}>
                            <MetricBarCell
                              val={totalObj.p}
                              target={regTargets.paridade}
                              ev={totalObj.evP}
                              prevVal={totalObj.prevP}
                              showBar={true}
                            />
                          </td>
                          <td>{nf(regTargets.paridade)}</td>
                          <td
                            className={
                              totalObj.dp == null ? '' : totalObj.dp < 0 ? 'b' : 'g'
                            }
                          >
                            {sg(totalObj.dp)}
                          </td>
                          <td className={totalObj.dp != null && totalObj.dp >= 0 ? 'g' : 'b'}>
                            {totalObj.p != null && regTargets.paridade ? `${Math.round((totalObj.p / regTargets.paridade) * 100)}%` : '–'}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  )}

                  {/* 4. TABELA DE RANKING CUPOM MISTO & PARIDADE JUNTOS (Aprimorada) */}
                  {activeTab === 'cm_paridade' && (
                    <table>
                      <thead>
                        <tr>
                          <th style={{ width: 62 }}>#</th>
                          <th style={{ width: 80 }}>Loja</th>
                          <th style={{ width: 140, textAlign: 'center' }}>Conquista</th>
                          <th>Cupom Misto</th>
                          <th style={{ width: 95 }}>Meta CM</th>
                          <th style={{ width: 95 }}>Dif. CM</th>
                          <th>Paridade</th>
                          <th style={{ width: 95 }}>Meta Parid.</th>
                          <th style={{ width: 95 }}>Dif. Parid.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRows.length === 0 ? (
                          <tr>
                            <td colSpan={9} style={{ textAlign: 'center', padding: '28px', color: '#94A3B8' }}>
                              Nenhuma loja encontrada para o filtro selecionado.
                            </td>
                          </tr>
                        ) : (
                          filteredRows.map((x, idx) => {
                            const isTop3 = idx < 3 && quickFilter === 'all';
                            const isTop3End = filteredRows.length >= 6 && idx === 2 && quickFilter === 'all';
                            const isZ4Start = filteredRows.length >= 8 && idx === filteredRows.length - 4 && quickFilter === 'all';
                            const isZ4 = filteredRows.length >= 8 && idx >= filteredRows.length - 4 && quickFilter === 'all';
                            const cmOk = x.dc != null && x.dc >= 0;
                            const pOk = x.dp != null && x.dp >= 0;
                            const bothOk = cmOk && pOk;
                            return (
                              <tr
                                key={x.c}
                                className={`${bothOk ? 'ac' : cmOk || pOk ? 'mt' : 'ab'} ${
                                  isTop3 ? 'top3-row' : ''
                                } ${isTop3End ? 'top3-end' : ''} ${
                                  isZ4Start ? 'z4-start' : ''
                                } ${isZ4 ? 'z4' : ''}`}
                              >
                                <td>
                                  <PodioCell pos={x.pos} isMet={bothOk} isZ4={isZ4} />
                                </td>
                                <td className={bothOk ? 'cell-ok' : ''}>
                                  <b>{x.c}</b>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  {x.statusCmParid === 'both' ? (
                                    <span className="cm-tag cm-tag-both">🌟 DUPLO OURO</span>
                                  ) : x.statusCmParid === 'cm_only' ? (
                                    <span className="cm-tag cm-tag-cm">🟡 SÓ C. MISTO</span>
                                  ) : x.statusCmParid === 'p_only' ? (
                                    <span className="cm-tag cm-tag-p">🔵 SÓ PARIDADE</span>
                                  ) : (
                                    <span className="cm-tag cm-tag-bad">⚠ EM ATENÇÃO</span>
                                  )}
                                </td>
                                <td className={cmOk ? 'cell-ok' : ''}>
                                  <MetricBarCell
                                    val={x.cm}
                                    target={regTargets.cupomMisto}
                                    ev={x.evCm}
                                    prevVal={x.prevCm}
                                    isPct
                                    showBar={true}
                                  />
                                </td>
                                <td>{pc(regTargets.cupomMisto, 0)}</td>
                                <td className={x.dc == null ? '' : x.dc < 0 ? 'b' : 'g'}>
                                  {sp(x.dc)}
                                </td>
                                <td className={pOk ? 'cell-ok' : ''}>
                                  <MetricBarCell
                                    val={x.p}
                                    target={regTargets.paridade}
                                    ev={x.evP}
                                    prevVal={x.prevP}
                                    showBar={true}
                                  />
                                </td>
                                <td>{nf(regTargets.paridade)}</td>
                                <td className={x.dp == null ? '' : x.dp < 0 ? 'b' : 'g'}>
                                  {sg(x.dp)}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td>–</td>
                          <td>
                            <b>REGIONAL</b>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {totalObj.statusCmParid === 'both' ? (
                              <span className="cm-tag cm-tag-both">🌟 DUPLO OURO</span>
                            ) : totalObj.statusCmParid === 'cm_only' ? (
                              <span className="cm-tag cm-tag-cm">🟡 SÓ C. MISTO</span>
                            ) : totalObj.statusCmParid === 'p_only' ? (
                              <span className="cm-tag cm-tag-p">🔵 SÓ PARIDADE</span>
                            ) : (
                              <span className="cm-tag cm-tag-bad">⚠ EM ATENÇÃO</span>
                            )}
                          </td>
                          <td className={totalObj.dc != null && totalObj.dc >= 0 ? 'g' : ''}>
                            <MetricBarCell
                              val={totalObj.cm}
                              target={regTargets.cupomMisto}
                              ev={totalObj.evCm}
                              prevVal={totalObj.prevCm}
                              isPct
                              showBar={true}
                            />
                          </td>
                          <td>{pc(regTargets.cupomMisto, 0)}</td>
                          <td
                            className={
                              totalObj.dc == null ? '' : totalObj.dc < 0 ? 'b' : 'g'
                            }
                          >
                            {sp(totalObj.dc)}
                          </td>
                          <td className={totalObj.dp != null && totalObj.dp >= 0 ? 'g' : ''}>
                            <MetricBarCell
                              val={totalObj.p}
                              target={regTargets.paridade}
                              ev={totalObj.evP}
                              prevVal={totalObj.prevP}
                              showBar={true}
                            />
                          </td>
                          <td>{nf(regTargets.paridade)}</td>
                          <td
                            className={
                              totalObj.dp == null ? '' : totalObj.dp < 0 ? 'b' : 'g'
                            }
                          >
                            {sg(totalObj.dp)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  )}

                {/* 5. TABELA DE PLACAR DE LOJAS (GERAL — TODAS AS MÉTRICAS) */}
                {activeTab === 'placar' && (
                  <>
                    <div className="placar-banner">
                      PLACAR DE LOJAS CENTAURO — {activeItem?.periodBadge || curMonthBadge()}
                    </div>
                    <table className="placar-table">
                      <thead>
                        <tr>
                          <th className="th-gray">Loja</th>
                          <th className="th-gray">Qtd. KPIs</th>
                          <th className="th-red">Venda</th>
                          <th className="th-red">Meta</th>
                          <th className="th-desvio">Desvio%</th>
                          <th className="th-red">Cresc%</th>
                          <th className="th-green">IPC</th>
                          <th className="th-green">
                            {rows.some((r) => r.crescConv != null)
                              ? 'Cresc. Conv. pp'
                              : '% Conv.'}
                          </th>
                          <th className="th-green">Personaliz.</th>
                          <th className="th-green">Rup. EX3</th>
                          <th className="th-green">Paridade</th>
                          <th className="th-green">C. Misto</th>
                          <th className="th-green">NPS Loja</th>
                          <th className="th-green">NPS OMS</th>
                          <th className="th-red">% CMO Móvel</th>
                          <th className="th-red">% Cap. E-mail</th>
                          <th className="th-red">Rup. V.A.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((x) => {
                          const kpiMin = regTargets.kpisMin ?? 7;
                          const isZerada =
                            (!x.v || x.v <= 0) &&
                            x.ipc == null &&
                            x.cm == null &&
                            x.p == null;

                          return (
                            <tr key={x.c} className={isZerada ? 'pl-row-zerada' : ''}>
                              <td
                                className={`pl-store ${
                                  !isZerada && x.kpisCount != null && x.kpisCount >= kpiMin
                                    ? 'pl-store-ok'
                                    : ''
                                }`}
                              >
                                CE - {parseInt(x.c, 10) || x.c}
                              </td>
                              <td
                                className={`pl-kpi ${
                                  isZerada || x.kpisCount == null
                                    ? 'pl-neutral'
                                    : x.kpisCount >= kpiMin
                                    ? 'pl-ok'
                                    : 'pl-bad'
                                }`}
                              >
                                {isZerada || x.kpisCount == null ? '–' : x.kpisCount}
                              </td>
                              <td>{x.v != null && x.v > 0 ? nf(x.v, 2) : '–'}</td>
                              <td>{x.mv != null && x.mv > 0 ? nf(x.mv, 2) : '–'}</td>
                              <td
                                className={
                                  isZerada || x.desvioPct == null
                                    ? 'pl-neutral'
                                    : x.desvioPct >= 0
                                    ? 'desvio-pos'
                                    : 'desvio-neg'
                                }
                              >
                                {isZerada || x.desvioPct == null
                                  ? '–'
                                  : (x.desvioPct > 0 ? '+' : '') + pc(x.desvioPct, 1)}
                              </td>
                              <td
                                className={
                                  isZerada || x.kpiCresc == null
                                    ? 'pl-neutral'
                                    : x.kpiCresc
                                    ? 'pl-ok'
                                    : 'pl-bad'
                                }
                              >
                                {x.cresc != null ? pc(x.cresc, 2) : '–'}
                              </td>
                              <td
                                className={
                                  isZerada || x.kpiIpc == null
                                    ? 'pl-neutral'
                                    : x.kpiIpc
                                    ? 'pl-ok'
                                    : 'pl-bad'
                                }
                              >
                                {x.ipc != null ? nf(x.ipc, 2) : '–'}
                              </td>
                              <td
                                className={
                                  isZerada || x.kpiConv == null
                                    ? 'pl-neutral'
                                    : x.kpiConv
                                    ? 'pl-ok'
                                    : 'pl-bad'
                                }
                              >
                                {x.crescConv != null
                                  ? nf(x.crescConv, 2)
                                  : x.conv != null
                                  ? pc(x.conv, 1)
                                  : '–'}
                              </td>
                              <td
                                className={
                                  isZerada || x.kpiPers == null
                                    ? 'pl-neutral'
                                    : x.kpiPers
                                    ? 'pl-ok'
                                    : 'pl-bad'
                                }
                              >
                                {x.futebol != null ? pc(x.futebol, 1) : '–'}
                              </td>
                              <td
                                className={
                                  isZerada || x.kpiEx3 == null
                                    ? 'pl-neutral'
                                    : x.kpiEx3
                                    ? 'pl-ok'
                                    : 'pl-bad'
                                }
                              >
                                {x.rupEx3 != null ? pc(x.rupEx3, 1) : '–'}
                              </td>
                              <td
                                className={
                                  isZerada || x.kpiParid == null
                                    ? 'pl-neutral'
                                    : x.kpiParid
                                    ? 'pl-ok'
                                    : 'pl-bad'
                                }
                              >
                                {x.p != null ? nf(x.p, 2) : '–'}
                              </td>
                              <td
                                className={
                                  isZerada || x.kpiCm == null
                                    ? 'pl-neutral'
                                    : x.kpiCm
                                    ? 'pl-ok'
                                    : 'pl-bad'
                                }
                              >
                                {x.cm != null ? pc(x.cm, 1) : '–'}
                              </td>
                              <td
                                className={
                                  isZerada || x.kpiNpsLoja == null
                                    ? 'pl-neutral'
                                    : x.kpiNpsLoja
                                    ? 'pl-ok'
                                    : 'pl-bad'
                                }
                              >
                                {x.npsGestao != null ? pc(x.npsGestao, 0) : '–'}
                              </td>
                              <td
                                className={
                                  isZerada || x.kpiNpsOms == null
                                    ? 'pl-neutral'
                                    : x.kpiNpsOms
                                    ? 'pl-ok'
                                    : 'pl-bad'
                                }
                              >
                                {x.npsOms != null ? pc(x.npsOms, 0) : '–'}
                              </td>
                              <td
                                className={
                                  isZerada || x.kpiCkout == null
                                    ? 'pl-neutral'
                                    : x.kpiCkout
                                    ? 'pl-ok'
                                    : 'pl-bad'
                                }
                              >
                                {x.ckout != null ? pc(x.ckout, 0) : '–'}
                              </td>
                              <td
                                className={
                                  isZerada || x.kpiEmail == null
                                    ? 'pl-neutral'
                                    : x.kpiEmail
                                    ? 'pl-ok'
                                    : 'pl-bad'
                                }
                              >
                                {x.capEmail != null ? pc(x.capEmail, 0) : '–'}
                              </td>
                              <td
                                className={
                                  isZerada || x.kpiVa == null
                                    ? 'pl-neutral'
                                    : x.kpiVa
                                    ? 'pl-ok'
                                    : 'pl-bad'
                                }
                              >
                                {x.rupVa != null ? pc(x.rupVa, 1) : '–'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td>Regional</td>
                          <td
                            className={
                              totalObj.kpisCount != null &&
                              totalObj.kpisCount >= (regTargets.kpisMin ?? 7)
                                ? 'pl-ok'
                                : 'pl-bad'
                            }
                          >
                            {totalObj.kpisCount ?? ''}
                          </td>
                          <td>{totalObj.v != null ? nf(totalObj.v, 2) : '–'}</td>
                          <td>{totalObj.mv != null ? nf(totalObj.mv, 2) : '–'}</td>
                          <td
                            className={
                              totalObj.desvioPct != null
                                ? totalObj.desvioPct >= 0
                                  ? 'desvio-pos'
                                  : 'desvio-neg'
                                : ''
                            }
                          >
                            {totalObj.desvioPct != null
                              ? (totalObj.desvioPct > 0 ? '+' : '') + pc(totalObj.desvioPct, 1)
                              : '–'}
                          </td>
                          <td>{totalObj.cresc != null ? pc(totalObj.cresc, 2) : '–'}</td>
                          <td>{totalObj.ipc != null ? nf(totalObj.ipc, 2) : '–'}</td>
                          <td>
                            {totalObj.crescConv != null
                              ? nf(totalObj.crescConv, 2)
                              : totalObj.conv != null
                              ? pc(totalObj.conv, 1)
                              : '–'}
                          </td>
                          <td>{totalObj.futebol != null ? pc(totalObj.futebol, 1) : '–'}</td>
                          <td>{totalObj.rupEx3 != null ? pc(totalObj.rupEx3, 1) : '–'}</td>
                          <td>{totalObj.p != null ? nf(totalObj.p, 2) : '–'}</td>
                          <td>{totalObj.cm != null ? pc(totalObj.cm, 1) : '–'}</td>
                          <td>{totalObj.npsGestao != null ? pc(totalObj.npsGestao, 0) : '–'}</td>
                          <td>{totalObj.npsOms != null ? pc(totalObj.npsOms, 0) : '–'}</td>
                          <td>{totalObj.ckout != null ? pc(totalObj.ckout, 0) : '–'}</td>
                          <td>{totalObj.capEmail != null ? pc(totalObj.capEmail, 0) : '–'}</td>
                          <td>{totalObj.rupVa != null ? pc(totalObj.rupVa, 1) : '–'}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </>
                )}

                  {/* 6. TABELA DE RANKING DE RUPTURA (Menor é melhor) */}
                  {activeTab === 'ruptura' && (
                    <table>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Loja</th>
                          <th>% Ruptura EX3</th>
                          <th>Teto EX3</th>
                          <th>Desvio EX3</th>
                          <th>% Ruptura V.A.</th>
                          <th>Teto V.A.</th>
                          <th>Desvio V.A.</th>
                          <th>Média Ruptura</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((x, idx) => {
                          const isTop3 = idx < 3;
                          const isTop3End = rows.length >= 6 && idx === 2;
                          const isZ4Start = rows.length >= 8 && idx === rows.length - 4;
                          const isZ4 = rows.length >= 8 && idx >= rows.length - 4;
                          const ex3Ok = x.dEx3 != null && x.dEx3 <= 0;
                          const vaOk = x.dVa != null && x.dVa <= 0;
                          return (
                            <tr
                              key={x.c}
                              className={`${ex3Ok ? 'ac' : 'ab'} ${isTop3 ? 'top3-row' : ''} ${
                                isTop3End ? 'top3-end' : ''
                              } ${isZ4Start ? 'z4-start' : ''} ${isZ4 ? 'z4' : ''}`}
                            >
                              <td>
                                <PodioCell pos={x.pos} isMet={ex3Ok} isZ4={isZ4} />
                              </td>
                              <td className={ex3Ok ? 'cell-ok' : ''}>
                                <b>{x.c}</b>
                              </td>
                              <td className={ex3Ok ? 'cell-ok' : ''}>
                                <MetricBarCell
                                  val={x.rupEx3}
                                  target={regTargets.rupturaEx3}
                                  ev={x.evEx3}
                                  prevVal={x.prevEx3}
                                  isPct
                                  inverse
                                />
                              </td>
                              <td>{pc(regTargets.rupturaEx3, 1)}</td>
                              <td className={x.dEx3 == null ? '' : x.dEx3 > 0 ? 'b' : 'g'}>
                                {sp(x.dEx3, 1, true)}
                              </td>
                              <td className={vaOk ? 'cell-ok' : ''}>
                                {pc(x.rupVa, 1)}
                              </td>
                              <td>{pc(regTargets.rupturaVa, 1)}</td>
                              <td className={x.dVa == null ? '' : x.dVa > 0 ? 'b' : 'g'}>
                                {sp(x.dVa, 1, true)}
                              </td>
                              <td>{pc(x.rupAvg, 1)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td>–</td>
                          <td>
                            <b>REGIONAL</b>
                          </td>
                          <td>
                            <MetricBarCell
                              val={totalObj.rupEx3}
                              target={regTargets.rupturaEx3}
                              ev={totalObj.evEx3}
                              prevVal={totalObj.prevEx3}
                              isPct
                              inverse
                            />
                          </td>
                          <td>{pc(regTargets.rupturaEx3, 1)}</td>
                          <td
                            className={
                              totalObj.dEx3 == null ? '' : totalObj.dEx3 > 0 ? 'b' : 'g'
                            }
                          >
                            {sp(totalObj.dEx3, 1, true)}
                          </td>
                          <td>{pc(totalObj.rupVa, 1)}</td>
                          <td>{pc(regTargets.rupturaVa, 1)}</td>
                          <td
                            className={
                              totalObj.dVa == null ? '' : totalObj.dVa > 0 ? 'b' : 'g'
                            }
                          >
                            {sp(totalObj.dVa, 1, true)}
                          </td>
                          <td>{pc(totalObj.rupAvg, 1)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  )}

                  {/* 8. TABELA DE RANKING DE VENDAS & NPS */}
                  {activeTab === 'vendas' && (
                    <table>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Loja</th>
                          <th>% Atingimento Venda</th>
                          <th>Venda Total</th>
                          <th>Meta Mês</th>
                          <th>Cresc. SSS %</th>
                          <th>NPS Gestão</th>
                          <th>NPS LF</th>
                          <th>% Futebol</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((x, idx) => {
                          const isTop3 = idx < 3;
                          const isTop3End = rows.length >= 6 && idx === 2;
                          const isZ4Start = rows.length >= 8 && idx === rows.length - 4;
                          const isZ4 = rows.length >= 8 && idx >= rows.length - 4;
                          const atOk = x.at != null && x.at >= 1;
                          const npsOk = x.dNps != null && x.dNps >= 0;
                          return (
                            <tr
                              key={x.c}
                              className={`${atOk ? 'ac' : 'ab'} ${isTop3 ? 'top3-row' : ''} ${
                                isTop3End ? 'top3-end' : ''
                              } ${isZ4Start ? 'z4-start' : ''} ${isZ4 ? 'z4' : ''}`}
                            >
                              <td>
                                <PodioCell pos={x.pos} isMet={atOk} isZ4={isZ4} />
                              </td>
                              <td className={atOk ? 'cell-ok' : ''}>
                                <b>{x.c}</b>
                              </td>
                              <td className={atOk ? 'cell-ok' : ''}>
                                <MetricBarCell
                                  val={x.at}
                                  target={1}
                                  ev={x.evAt}
                                  prevVal={x.prevAt}
                                  isPct
                                />
                              </td>
                              <td>{brl(x.v, 0)}</td>
                              <td>{brl(x.mv, 0)}</td>
                              <td className={x.sss == null ? '' : x.sss < 0 ? 'b' : 'g'}>
                                {pc(x.sss)}
                              </td>
                              <td className={npsOk ? 'cell-ok' : ''}>
                                {pc(x.npsGestao)}
                              </td>
                              <td>{pc(x.npsLf)}</td>
                              <td>{pc(x.futebol)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td>–</td>
                          <td>
                            <b>REGIONAL</b>
                          </td>
                          <td>
                            <MetricBarCell
                              val={totalObj.at}
                              target={1}
                              ev={totalObj.evAt}
                              prevVal={totalObj.prevAt}
                              isPct
                            />
                          </td>
                          <td>{brl(totalObj.v, 0)}</td>
                          <td>{brl(totalObj.mv, 0)}</td>
                          <td
                            className={
                              totalObj.sss == null ? '' : totalObj.sss < 0 ? 'b' : 'g'
                            }
                          >
                            {pc(totalObj.sss)}
                          </td>
                          <td>{pc(totalObj.npsGestao)}</td>
                          <td>{pc(totalObj.npsLf)}</td>
                          <td>–</td>
                        </tr>
                      </tfoot>
                    </table>
                  )}
                </div>
              </div>

              {/* RODAPÉ BROADCAST CENTAURO */}
              <div className="bc-footer">
                <div className="bc-footer-left">
                  <img
                    src={logos.centauroWhite}
                    alt="Centauro"
                    className="bc-footer-centauro"
                  />
                  <span>|</span>
                  <span>MAIS ESPORTE PARA TODOS</span>
                </div>
                <div className="bc-footer-center">
                  <span className="dev-tag">DEV</span>
                  <span>Programado e desenvolvido por <b>Mateus · CE 99</b></span>
                </div>
                <div className="bc-footer-right">
                  <img
                    src={logos.regionalClean}
                    alt="Águias do Cerrado"
                    className="bc-footer-shield"
                  />
                  <span>ÁGUIAS DO CERRADO</span>
                </div>
              </div>
            </div>

            <div className="note">
              {activeItem
                ? `Pódio: 1º Ouro, 2º Prata e 3º Bronze · Linha vermelha tracejada separa as últimas 4 lojas (Z4 - Zona de Atenção).${
                    prevItem
                      ? ` Comparativo de evolução (▲/▼) calculado em relação a "${prevItem.fileName}" (${prevItem.date}).`
                      : ''
                  }`
                : 'Anexe a planilha "Painel de Indicadores Lojas.xlsx" no botão acima ou arraste o arquivo para a tela para alimentar automaticamente todos os rankings.'}
            </div>
          </>
        )}
      </main>

      <footer className="page-dev-footer">
        <span>Programado e desenvolvido por <b>Mateus · CE 99</b></span>
      </footer>
    </>
  );
}
