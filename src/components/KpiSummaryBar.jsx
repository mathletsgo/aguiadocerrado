import React from 'react';
import {
  Trophy,
  Layers,
  Scale,
  Combine,
  Target,
  TrendingUp,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Filter
} from 'lucide-react';
import { nf, pc, sg, sp } from '../utils/formatters';

export default function KpiSummaryBar({
  activeTab,
  rows,
  totalObj,
  regTargets,
  quickFilter,
  setQuickFilter
}) {
  const TC = regTargets.cupomMisto ?? 0.30;
  const TP = regTargets.paridade ?? 0.55;

  const validRows = rows.filter((r) => r.c !== 'Total');
  const totalStores = validRows.length || 1;

  // Cálculos para Cupom Misto
  const cmStores = validRows.filter((r) => r.cm != null);
  const cmMetCount = validRows.filter((r) => r.dc != null && r.dc >= 0).length;
  const cmMetPct = Math.round((cmMetCount / (cmStores.length || 1)) * 100);
  const top1Cm = [...cmStores].sort((a, b) => (b.cm ?? 0) - (a.cm ?? 0))[0];
  const topEvCm = [...cmStores]
    .filter((r) => r.evCm != null && r.evCm > 0.0005)
    .sort((a, b) => (b.evCm ?? 0) - (a.evCm ?? 0))[0];

  // Cálculos para Paridade
  const pStores = validRows.filter((r) => r.p != null);
  const pMetCount = validRows.filter((r) => r.dp != null && r.dp >= 0).length;
  const pMetPct = Math.round((pMetCount / (pStores.length || 1)) * 100);
  const top1P = [...pStores].sort((a, b) => (b.p ?? 0) - (a.p ?? 0))[0];
  const topEvP = [...pStores]
    .filter((r) => r.evP != null && r.evP > 0.0005)
    .sort((a, b) => (b.evP ?? 0) - (a.evP ?? 0))[0];

  // Cálculos para Conjunto (Cupom Misto & Paridade)
  const bothCount = validRows.filter((r) => r.statusCmParid === 'both').length;
  const cmOnlyCount = validRows.filter((r) => r.statusCmParid === 'cm_only').length;
  const pOnlyCount = validRows.filter((r) => r.statusCmParid === 'p_only').length;
  const noneCount = validRows.filter((r) => r.statusCmParid === 'none').length;
  const bothPct = Math.round((bothCount / totalStores) * 100);
  const top1Dual = [...validRows].sort((a, b) => (b.dualScore ?? 0) - (a.dualScore ?? 0))[0];

  return (
    <div className="bc-kpi-section">
      {/* 4 CARDS DE TRANSMISSÃO ESPORTIVA */}
      <div className="bc-kpi-grid">
        {/* CASO 1: ABA CONJUNTA (CM & PARIDADE) */}
        {activeTab === 'cm_paridade' && (
          <>
            {/* CARD 1: DUPLO OURO / ELITE */}
            <div className="bc-kpi-card gold-border">
              <div className="bc-kpi-icon-wrap gold-icon">
                <Sparkles size={22} />
              </div>
              <div className="bc-kpi-info">
                <span className="bc-kpi-label">DUPLO OURO · AMBAS AS METAS</span>
                <div className="bc-kpi-val-row">
                  <b className="bc-kpi-num gold-text">{bothCount} Lojas</b>
                  <span className="bc-kpi-badge gold-bg">{bothPct}% da Rede</span>
                </div>
                <div className="bc-kpi-sub">
                  CM &ge; {pc(TC, 0)} &amp; Paridade &ge; {nf(TP)}
                </div>
              </div>
            </div>

            {/* CARD 2: REGIONAL CONSOLIDADA */}
            <div className="bc-kpi-card">
              <div className="bc-kpi-icon-wrap">
                <Combine size={22} />
              </div>
              <div className="bc-kpi-info">
                <span className="bc-kpi-label">CONSOLIDADO REGIONAL</span>
                <div className="bc-kpi-dual-values">
                  <div className="bc-kpi-dual-item">
                    <span className="bc-kpi-sub-title">C. MISTO</span>
                    <b className={`bc-kpi-num-sm ${totalObj.dc >= 0 ? 'g' : 'b'}`}>
                      {pc(totalObj.cm)}
                    </b>
                    <small className={totalObj.dc >= 0 ? 'g' : 'b'}>
                      {sp(totalObj.dc)}
                    </small>
                  </div>
                  <div className="bc-kpi-divider" />
                  <div className="bc-kpi-dual-item">
                    <span className="bc-kpi-sub-title">PARIDADE</span>
                    <b className={`bc-kpi-num-sm ${totalObj.dp >= 0 ? 'g' : 'b'}`}>
                      {nf(totalObj.p)}
                    </b>
                    <small className={totalObj.dp >= 0 ? 'g' : 'b'}>
                      {sg(totalObj.dp)}
                    </small>
                  </div>
                </div>
                <div className="bc-kpi-sub">
                  Metas: CM {pc(TC, 0)} | Paridade {nf(TP)}
                </div>
              </div>
            </div>

            {/* CARD 3: DIAGNÓSTICO DA REGIONAL */}
            <div className="bc-kpi-card">
              <div className="bc-kpi-icon-wrap">
                <Target size={22} />
              </div>
              <div className="bc-kpi-info">
                <span className="bc-kpi-label">PANORAMA DE ENTREGAS</span>
                <div className="bc-kpi-val-row">
                  <div className="bc-kpi-mini-stats">
                    <span className="badge-chip cm-chip" title="Bateram apenas Cupom Misto">
                      🟡 {cmOnlyCount} só CM
                    </span>
                    <span className="badge-chip p-chip" title="Bateram apenas Paridade">
                      🔵 {pOnlyCount} só Parid.
                    </span>
                    <span className="badge-chip bad-chip" title="Abaixo em ambas as metas">
                      🔴 {noneCount} em Atenção
                    </span>
                  </div>
                </div>
                <div className="bc-kpi-sub">
                  {bothCount + cmOnlyCount + pOnlyCount} de {totalStores} lojas entregam ao menos 1 meta
                </div>
              </div>
            </div>

            {/* CARD 4: LÍDER GERAL */}
            <div className="bc-kpi-card">
              <div className="bc-kpi-icon-wrap trophy-icon">
                <Trophy size={22} />
              </div>
              <div className="bc-kpi-info">
                <span className="bc-kpi-label">1º LUGAR NO RANKING</span>
                <div className="bc-kpi-val-row">
                  <b className="bc-kpi-num">CE - {top1Dual?.c || '–'}</b>
                  {top1Dual?.statusCmParid === 'both' && (
                    <span className="bc-kpi-badge gold-bg">Líder Elite</span>
                  )}
                </div>
                <div className="bc-kpi-sub">
                  CM: {pc(top1Dual?.cm)} · Paridade: {nf(top1Dual?.p)}
                </div>
              </div>
            </div>
          </>
        )}

        {/* CASO 2: ABA RANKING CUPOM MISTO */}
        {activeTab === 'cm' && (
          <>
            {/* CARD 1: REGIONAL CUPOM MISTO */}
            <div className="bc-kpi-card">
              <div className="bc-kpi-icon-wrap">
                <Layers size={22} />
              </div>
              <div className="bc-kpi-info">
                <span className="bc-kpi-label">REGIONAL CUPOM MISTO</span>
                <div className="bc-kpi-val-row">
                  <b className={`bc-kpi-num ${totalObj.dc >= 0 ? 'g' : 'b'}`}>
                    {pc(totalObj.cm)}
                  </b>
                  <span className={`bc-kpi-badge ${totalObj.dc >= 0 ? 'green-bg' : 'red-bg'}`}>
                    {sp(totalObj.dc)} vs {pc(TC, 0)}
                  </span>
                </div>
                <div className="bc-kpi-sub">
                  {totalObj.dc >= 0 ? 'Meta Regional Entregue 🎯' : 'Déficit na Meta Regional ⚠'}
                </div>
              </div>
            </div>

            {/* CARD 2: EFICIÊNCIA DA REDE */}
            <div className="bc-kpi-card">
              <div className="bc-kpi-icon-wrap">
                <Target size={22} />
              </div>
              <div className="bc-kpi-info">
                <span className="bc-kpi-label">ADERÊNCIA DA REDE</span>
                <div className="bc-kpi-val-row">
                  <b className="bc-kpi-num">{cmMetCount} de {cmStores.length} Lojas</b>
                  <span className={`bc-kpi-badge ${cmMetPct >= 50 ? 'green-bg' : 'red-bg'}`}>
                    {cmMetPct}% na Meta
                  </span>
                </div>
                <div className="bc-kpi-bar-track">
                  <div
                    className="bc-kpi-bar-fill"
                    style={{
                      width: `${cmMetPct}%`,
                      background: cmMetPct >= 50 ? '#22C55E' : '#EF4444'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* CARD 3: LÍDER CUPOM MISTO */}
            <div className="bc-kpi-card">
              <div className="bc-kpi-icon-wrap trophy-icon">
                <Trophy size={22} />
              </div>
              <div className="bc-kpi-info">
                <span className="bc-kpi-label">1º LUGAR · CUPOM MISTO</span>
                <div className="bc-kpi-val-row">
                  <b className="bc-kpi-num">CE - {top1Cm?.c || '–'}</b>
                  <span className="bc-kpi-badge green-bg">{pc(top1Cm?.cm)}</span>
                </div>
                <div className="bc-kpi-sub">
                  Diferença da meta: {sp(top1Cm?.dc)}
                </div>
              </div>
            </div>

            {/* CARD 4: MAIOR EVOLUÇÃO */}
            <div className="bc-kpi-card">
              <div className="bc-kpi-icon-wrap">
                <TrendingUp size={22} />
              </div>
              <div className="bc-kpi-info">
                <span className="bc-kpi-label">MAIOR EVOLUÇÃO (▲)</span>
                <div className="bc-kpi-val-row">
                  <b className="bc-kpi-num">
                    {topEvCm ? `CE - ${topEvCm.c}` : '–'}
                  </b>
                  {topEvCm && (
                    <span className="bc-kpi-badge green-bg">
                      +{nf(topEvCm.evCm * 100, 1)} pp
                    </span>
                  )}
                </div>
                <div className="bc-kpi-sub">
                  {topEvCm ? `Atual: ${pc(topEvCm.cm)} vs Anterior: ${pc(topEvCm.prevCm)}` : 'Sem comparativo anterior'}
                </div>
              </div>
            </div>
          </>
        )}

        {/* CASO 3: ABA RANKING PARIDADE */}
        {activeTab === 'paridade' && (
          <>
            {/* CARD 1: REGIONAL PARIDADE */}
            <div className="bc-kpi-card">
              <div className="bc-kpi-icon-wrap">
                <Scale size={22} />
              </div>
              <div className="bc-kpi-info">
                <span className="bc-kpi-label">REGIONAL PARIDADE</span>
                <div className="bc-kpi-val-row">
                  <b className={`bc-kpi-num ${totalObj.dp >= 0 ? 'g' : 'b'}`}>
                    {nf(totalObj.p)}
                  </b>
                  <span className={`bc-kpi-badge ${totalObj.dp >= 0 ? 'green-bg' : 'red-bg'}`}>
                    {sg(totalObj.dp)} vs {nf(TP)}
                  </span>
                </div>
                <div className="bc-kpi-sub">
                  {totalObj.dp >= 0 ? 'Meta Regional Entregue 🎯' : 'Déficit na Meta Regional ⚠'}
                </div>
              </div>
            </div>

            {/* CARD 2: EFICIÊNCIA DA REDE */}
            <div className="bc-kpi-card">
              <div className="bc-kpi-icon-wrap">
                <Target size={22} />
              </div>
              <div className="bc-kpi-info">
                <span className="bc-kpi-label">ADERÊNCIA DA REDE</span>
                <div className="bc-kpi-val-row">
                  <b className="bc-kpi-num">{pMetCount} de {pStores.length} Lojas</b>
                  <span className={`bc-kpi-badge ${pMetPct >= 50 ? 'green-bg' : 'red-bg'}`}>
                    {pMetPct}% na Meta
                  </span>
                </div>
                <div className="bc-kpi-bar-track">
                  <div
                    className="bc-kpi-bar-fill"
                    style={{
                      width: `${pMetPct}%`,
                      background: pMetPct >= 50 ? '#22C55E' : '#EF4444'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* CARD 3: LÍDER PARIDADE */}
            <div className="bc-kpi-card">
              <div className="bc-kpi-icon-wrap trophy-icon">
                <Trophy size={22} />
              </div>
              <div className="bc-kpi-info">
                <span className="bc-kpi-label">1º LUGAR · PARIDADE</span>
                <div className="bc-kpi-val-row">
                  <b className="bc-kpi-num">CE - {top1P?.c || '–'}</b>
                  <span className="bc-kpi-badge green-bg">{nf(top1P?.p)}</span>
                </div>
                <div className="bc-kpi-sub">
                  Diferença da meta: {sg(top1P?.dp)}
                </div>
              </div>
            </div>

            {/* CARD 4: MAIOR EVOLUÇÃO */}
            <div className="bc-kpi-card">
              <div className="bc-kpi-icon-wrap">
                <TrendingUp size={22} />
              </div>
              <div className="bc-kpi-info">
                <span className="bc-kpi-label">MAIOR EVOLUÇÃO (▲)</span>
                <div className="bc-kpi-val-row">
                  <b className="bc-kpi-num">
                    {topEvP ? `CE - ${topEvP.c}` : '–'}
                  </b>
                  {topEvP && (
                    <span className="bc-kpi-badge green-bg">
                      +{nf(topEvP.evP, 2)}
                    </span>
                  )}
                </div>
                <div className="bc-kpi-sub">
                  {topEvP ? `Atual: ${nf(topEvP.p)} vs Anterior: ${nf(topEvP.prevP)}` : 'Sem comparativo anterior'}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* BARRA DE FILTROS RÁPIDOS */}
      <div className="bc-filter-bar" data-html2canvas-ignore="true">
        <div className="bc-filter-label">
          <Filter size={14} />
          <span>FILTRAR VISÃO:</span>
        </div>
        <div className="bc-filter-pills">
          <button
            type="button"
            className={`filter-pill ${quickFilter === 'all' ? 'active' : ''}`}
            onClick={() => setQuickFilter('all')}
          >
            Todas as Lojas ({validRows.length})
          </button>

          {activeTab === 'cm_paridade' && (
            <>
              <button
                type="button"
                className={`filter-pill gold-pill ${quickFilter === 'both' ? 'active' : ''}`}
                onClick={() => setQuickFilter('both')}
              >
                🌟 Ambas Batidas ({bothCount})
              </button>
              <button
                type="button"
                className={`filter-pill cm-pill ${quickFilter === 'cm_only' ? 'active' : ''}`}
                onClick={() => setQuickFilter('cm_only')}
              >
                🟡 Só Cupom Misto ({cmOnlyCount})
              </button>
              <button
                type="button"
                className={`filter-pill p-pill ${quickFilter === 'p_only' ? 'active' : ''}`}
                onClick={() => setQuickFilter('p_only')}
              >
                🔵 Só Paridade ({pOnlyCount})
              </button>
              <button
                type="button"
                className={`filter-pill bad-pill ${quickFilter === 'gap' ? 'active' : ''}`}
                onClick={() => setQuickFilter('gap')}
              >
                🔴 Em Atenção ({noneCount})
              </button>
            </>
          )}

          {activeTab === 'cm' && (
            <>
              <button
                type="button"
                className={`filter-pill green-pill ${quickFilter === 'met' ? 'active' : ''}`}
                onClick={() => setQuickFilter('met')}
              >
                ✓ Meta Batida ({cmMetCount})
              </button>
              <button
                type="button"
                className={`filter-pill bad-pill ${quickFilter === 'gap' ? 'active' : ''}`}
                onClick={() => setQuickFilter('gap')}
              >
                ⚠ Abaixo da Meta ({cmStores.length - cmMetCount})
              </button>
            </>
          )}

          {activeTab === 'paridade' && (
            <>
              <button
                type="button"
                className={`filter-pill green-pill ${quickFilter === 'met' ? 'active' : ''}`}
                onClick={() => setQuickFilter('met')}
              >
                ✓ Meta Batida ({pMetCount})
              </button>
              <button
                type="button"
                className={`filter-pill bad-pill ${quickFilter === 'gap' ? 'active' : ''}`}
                onClick={() => setQuickFilter('gap')}
              >
                ⚠ Abaixo da Meta ({pStores.length - pMetCount})
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
