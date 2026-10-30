import * as XLSX from 'xlsx';

const norm = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export function toNum(v) {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  let s = String(v).trim();
  if (!s || s === "-" || s === "–" || /^#/.test(s)) return null;
  const isPct = s.endsWith("%");
  s = s.replace(/[%R$\s]/gi, "");
  if (s.includes(",") && s.includes(".")) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (s.includes(",")) {
    s = s.replace(",", ".");
  }
  const n = parseFloat(s);
  if (!Number.isFinite(n)) return null;
  return isPct ? n / 100 : n;
}

export function normStoreCode(v, metaIpcMap) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const nl = norm(s);
  if (/^(total|total geral|regiao|regional|media|aguias)/.test(nl)) return "Total";
  const m =
    s.match(/(?:^|\b(?:loja|filial|ce)\s*[-–]?\s*)0*(\d{1,4})(?:\b|\s*-)/i) ||
    s.match(/^0*(\d{1,4})$/);
  if (m) {
    const code = m[1].padStart(4, "0");
    if ((metaIpcMap && metaIpcMap[code] != null) || m[0].trim() === s) return code;
  }
  return null;
}

export function parseSheetRows(rows, metaIpcMap, regionalTargetIpc) {
  if (!rows || !rows.length) return null;
  let storeCol = -1;
  let bestCount = 0;
  const maxCols = Math.max(...rows.slice(0, 50).map((r) => (r ? r.length : 0)), 0);

  for (let c = 0; c < Math.min(maxCols, 8); c++) {
    let cnt = 0;
    for (let r = 0; r < rows.length; r++) {
      const code = normStoreCode(rows[r]?.[c], metaIpcMap);
      if (code && code !== "Total" && metaIpcMap[code] != null) cnt++;
    }
    if (cnt > bestCount) {
      bestCount = cnt;
      storeCol = c;
    }
  }
  if (storeCol === -1) {
    for (let c = 0; c < Math.min(maxCols, 5); c++) {
      let cnt = 0;
      for (let r = 0; r < rows.length; r++) {
        const code = normStoreCode(rows[r]?.[c], metaIpcMap);
        if (code && code !== "Total") cnt++;
      }
      if (cnt >= 3 && cnt > bestCount) {
        bestCount = cnt;
        storeCol = c;
      }
    }
  }
  if (storeCol === -1) return null;

  const firstStoreRow = rows.findIndex((r) => {
    const code = normStoreCode(r?.[storeCol], metaIpcMap);
    return code && code !== "Total";
  });
  if (firstStoreRow === -1) return null;

  const hStart = Math.max(0, firstStoreRow - 3);
  const headers = [];
  for (let c = 0; c < maxCols; c++) {
    const parts = [];
    for (let r = hStart; r < firstStoreRow; r++) {
      const cell = rows[r]?.[c];
      if (cell != null && String(cell).trim() !== "") parts.push(norm(cell));
    }
    headers[c] = parts.join(" ");
  }

  const findCol = (matchFn) => {
    for (let c = 0; c < maxCols; c++) {
      if (c === storeCol) continue;
      if (matchFn(headers[c] || "", c)) return c;
    }
    return -1;
  };

  // Identifica todas as colunas de indicadores da planilha Power BI / Excel / Placar
  let colIPC = findCol((h) => /\bipc\b/.test(h) && !/meta|dif|gap|falta|obj/.test(h));
  let colMetaIPC = findCol((h) => /meta.*ipc|ipc.*meta/.test(h));
  let colCM = findCol((h) => /(cupom\s*misto|cupons\s*misto|c\.?\s*misto|\bcm\b|misto)/.test(h) && !/meta|dif|gap|falta|30/.test(h));
  let colP = findCol((h) => /parid/.test(h) && !/meta|dif|gap|falta|0,?55/.test(h));
  let colV = findCol((h) => /(vlr\s*venda\s*lf\+ee\+oms|^venda$|vlr\s*venda|realizado|faturamento)/.test(h) && !/meta/.test(h));
  let colVlf = findCol((h) => /vlr\s*venda\s*lf\+ee$/.test(h));
  let colEe = findCol((h) => /%\s*ee\b/.test(h));
  let colOms = findCol((h) => /vlr\s*oms/.test(h));
  let colMv = findCol((h) => /^vlr\s*meta$|^meta$/.test(h) || (/meta/.test(h) && /venda|vlr/.test(h)));
  let colMetaMes = findCol((h) => /^meta\s*mes\s*atual/.test(h));
  let colDesvioPct = findCol((h) => /%\s*desvio\s*meta|desvio\s*%/.test(h));
  let colAt = findCol((h) => /ating/.test(h));
  let colCresc = findCol((h) => /cresc.*mdsaa|^crescimento\s*%$/.test(h));
  let colSss = findCol((h) => /sss/.test(h));
  let colCrescConv = findCol((h) => /cresc.*convers/.test(h));
  let colConv = findCol((h) => /convers/.test(h) && !/cresc/.test(h));
  let colTkm = findCol((h) => /\btkm\b|ticket/.test(h));
  let colPm = findCol((h) => /preco\s*medio/.test(h));
  let colIt = findCol((h) => /(?:^|\b|_)(itens|item|pecas|qtd[_\s]*iten|qtd[_\s]*item)(?:\b|_|$)/.test(h));
  let colCp = findCol((h) => /(?:^|\b|_)(cupons|cupom|atendimentos|boletas|clientes)(?:\b|_|$)/.test(h) && !/misto|medio|email|captura|ckout/.test(h));
  let colRupEx3 = findCol((h) => /ruptura\s*ex3/.test(h));
  let colRupVa = findCol((h) => /ruptura\s*v\.?a|^ruptura$/.test(h));
  let colCapEmail = findCol((h) => /cap.*e-?mail/.test(h) && (/%/.test(h) || !/qtd|cupons/.test(h)));
  let colQtdEmail = findCol((h) => /cupons.*email|qtd.*email/.test(h));
  let colCkout = findCol((h) => /(ckout|checkout|cmo)\s*movel/.test(h) && (/%|uso/.test(h) || !/qtd/.test(h)));
  let colQtdCkout = findCol((h) => /qtd.*ckout|qtd.*checkout/.test(h));
  let colNpsLf = findCol((h) => /nps\s*lf/.test(h));
  let colNpsOms = findCol((h) => /nps\s*oms/.test(h));
  let colNpsGestao = findCol((h) => /nps\s*gestao|nps\s*loja/.test(h));
  let colRespNps = findCol((h) => /respondentes\s*nps/.test(h));
  let colFutebol = findCol((h) => /futebol|personaliz/.test(h));

  // Fallback posicional caso seja planilha de 11 colunas simples
  if (colIPC === -1 && colCM === -1 && colP === -1 && maxCols - storeCol >= 9) {
    colV = storeCol + 1;
    colMv = storeCol + 2;
    colAt = storeCol + 3;
    colCM = storeCol + 6;
    colP = storeCol + 7;
    colIPC = storeCol + 8;
    if (maxCols - storeCol >= 11) {
      colIt = storeCol + 9;
      colCp = storeCol + 10;
    }
  }

  const normPct = (val) => (val != null && Math.abs(val) > 1.5 ? val / 100 : val);

  const stores = [];
  let totalRow = null;

  for (let r = firstStoreRow; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;
    const code = normStoreCode(row[storeCol], metaIpcMap);
    if (!code) continue;

    const getVal = (col) => (col !== -1 ? toNum(row[col]) : null);

    let ipc = getVal(colIPC);
    let cm = normPct(getVal(colCM));
    let p = getVal(colP);
    if (p != null && p > 5) p = p / 100;
    let v = getVal(colV);
    let vLf = getVal(colVlf);
    let ee = normPct(getVal(colEe));
    let oms = getVal(colOms);
    let mv = getVal(colMv) ?? getVal(colMetaMes);
    let desvioPct = normPct(getVal(colDesvioPct));
    let at = normPct(getVal(colAt));
    if (desvioPct == null && v != null && mv != null && mv > 0) {
      desvioPct = (v - mv) / mv;
    } else if (desvioPct == null && at != null) {
      desvioPct = at - 1;
    }
    if (at == null && v != null && mv != null && mv > 0) {
      at = v / mv;
    }
    let cresc = normPct(getVal(colCresc));
    let sss = normPct(getVal(colSss));
    let crescConv = getVal(colCrescConv);
    let conv = normPct(getVal(colConv));
    let tkm = getVal(colTkm);
    let pm = getVal(colPm);
    let it = getVal(colIt);
    let cp = getVal(colCp);
    let rupEx3 = normPct(getVal(colRupEx3));
    let rupVa = normPct(getVal(colRupVa));
    let capEmail = normPct(getVal(colCapEmail));
    let qtdEmail = getVal(colQtdEmail);
    let ckout = normPct(getVal(colCkout));
    let qtdCkout = getVal(colQtdCkout);
    let npsLf = normPct(getVal(colNpsLf));
    let npsOms = normPct(getVal(colNpsOms));
    let npsGestao = normPct(getVal(colNpsGestao));
    let respNps = normPct(getVal(colRespNps));
    let futebol = normPct(getVal(colFutebol));
    let miSheet = getVal(colMetaIPC);

    if (ipc == null && it != null && cp != null && cp > 0) ipc = it / cp;

    const obj = {
      c: code,
      mi: code === "Total" ? regionalTargetIpc : (metaIpcMap[code] ?? miSheet ?? regionalTargetIpc),
      ipc,
      cm,
      p,
      v,
      vLf,
      ee,
      oms,
      mv,
      desvioPct,
      at,
      cresc: cresc ?? sss,
      sss: sss ?? cresc,
      crescConv,
      conv,
      tkm,
      pm,
      it,
      cp,
      rupEx3,
      rupVa,
      capEmail,
      qtdEmail,
      ckout,
      qtdCkout,
      npsLf,
      npsOms,
      npsGestao: npsGestao ?? npsLf,
      respNps,
      futebol
    };

    if (code === "Total") {
      totalRow = obj;
    } else {
      stores.push(obj);
    }
  }

  const validMetrics = stores.filter((s) => s.ipc != null || s.cm != null || s.p != null || s.v != null).length;
  if (!stores.length || validMetrics === 0) return null;

  if (!totalRow) {
    totalRow = { c: "Total", mi: regionalTargetIpc };
  }
  const avg = (key) => {
    const arr = stores.filter((s) => s[key] != null);
    return arr.length ? arr.reduce((a, s) => a + s[key], 0) / arr.length : null;
  };
  const sum = (key) => {
    const arr = stores.filter((s) => s[key] != null);
    return arr.length ? arr.reduce((a, s) => a + s[key], 0) : null;
  };

  if (totalRow.it == null) totalRow.it = sum("it");
  if (totalRow.cp == null) totalRow.cp = sum("cp");
  if (totalRow.v == null) totalRow.v = sum("v");
  if (totalRow.mv == null) totalRow.mv = sum("mv");
  if (totalRow.oms == null) totalRow.oms = sum("oms");
  if (totalRow.ipc == null) {
    totalRow.ipc = totalRow.it && totalRow.cp ? totalRow.it / totalRow.cp : avg("ipc");
  }
  if (totalRow.cm == null) totalRow.cm = avg("cm");
  if (totalRow.p == null) totalRow.p = avg("p");
  if (totalRow.rupEx3 == null) totalRow.rupEx3 = avg("rupEx3");
  if (totalRow.rupVa == null) totalRow.rupVa = avg("rupVa");
  if (totalRow.ckout == null) totalRow.ckout = avg("ckout");
  if (totalRow.capEmail == null) totalRow.capEmail = avg("capEmail");
  if (totalRow.ee == null) totalRow.ee = avg("ee");
  if (totalRow.at == null) totalRow.at = totalRow.v && totalRow.mv ? totalRow.v / totalRow.mv : avg("at");
  if (totalRow.desvioPct == null) {
    totalRow.desvioPct =
      totalRow.v && totalRow.mv ? (totalRow.v - totalRow.mv) / totalRow.mv : avg("desvioPct");
  }
  if (totalRow.cresc == null) totalRow.cresc = avg("cresc");
  if (totalRow.sss == null) totalRow.sss = avg("sss");
  if (totalRow.crescConv == null) totalRow.crescConv = avg("crescConv");
  if (totalRow.futebol == null) totalRow.futebol = avg("futebol");
  if (totalRow.npsGestao == null) totalRow.npsGestao = avg("npsGestao");
  if (totalRow.npsLf == null) totalRow.npsLf = avg("npsLf");
  if (totalRow.npsOms == null) totalRow.npsOms = avg("npsOms");
  if (totalRow.conv == null) totalRow.conv = avg("conv");
  if (totalRow.tkm == null) totalRow.tkm = avg("tkm");
  if (totalRow.pm == null) totalRow.pm = avg("pm");

  // Extrai período dos filtros do Power BI no final da planilha
  let periodBadge = null;
  let periodSub = null;
  let periodText = null;
  const M = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
  for (let r = rows.length - 1; r >= 0; r--) {
    const txt = String(rows[r]?.[0] ?? "");
    const m = txt.match(/(\d{2})\/(\d{2})\/(\d{4}).*?antes\s+de\s+(\d{2})\/(\d{2})\/(\d{4})/i);
    if (m) {
      const d1 = m[1];
      const m1 = parseInt(m[2], 10);
      const y1 = m[3];
      const endDt = new Date(parseInt(m[6], 10), parseInt(m[5], 10) - 1, parseInt(m[4], 10));
      endDt.setDate(endDt.getDate() - 1);
      const d2 = String(endDt.getDate()).padStart(2, "0");
      const m2 = String(endDt.getMonth() + 1).padStart(2, "0");
      periodBadge = `${M[m1 - 1] || m[2]}/${y1}`;
      periodSub = `${d1}/${m[2]} a ${d2}/${m2}`;
      periodText = `${d1}/${m[2]} a ${d2}/${m2}/${y1}`;
      break;
    }
  }

  return {
    stores,
    totalRow,
    periodBadge,
    periodSub,
    periodText,
    score: validMetrics * 10 + (colIPC !== -1 ? 5 : 0) + (colCM !== -1 ? 5 : 0) + (colP !== -1 ? 5 : 0)
  };
}

export function parseWorkbookBuffer(arrayBuffer, metaIpcMap, regionalTargetIpc) {
  const data = new Uint8Array(arrayBuffer);
  const wb = XLSX.read(data, { type: "array" });
  let best = null;
  let bestSheetName = "";
  const sheetNames = [...wb.SheetNames].sort((a, b) => (/loja/i.test(b) ? 1 : 0) - (/loja/i.test(a) ? 1 : 0));
  for (const name of sheetNames) {
    const ws = wb.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
    const parsed = parseSheetRows(rows, metaIpcMap, regionalTargetIpc);
    if (parsed && (!best || parsed.score > best.score)) {
      best = parsed;
      bestSheetName = name;
    }
  }
  if (!best) return null;
  return { ...best, sheetName: bestSheetName };
}
