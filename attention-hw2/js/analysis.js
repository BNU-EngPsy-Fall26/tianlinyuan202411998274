/* ============================================================
   全班数据分析页
   对 6 个 experiment（3 复现 + 3 改进）分别：
   · 剔除条件试次 <10 的不完整记录（如自测数据）
   · 每被试每条件求正确试次平均 RT → 跨被试平均（更稳健）
   · 两个条件都被试内配对求差 → Cohen's dz
   · 搜索出现率段额外计算漏报率（有目标试次上按“没有”的比例）
   · 对照原文献典型值，判定每个预测是否成立
   ============================================================ */
const META = [
  { exp: 'stroop_base', title: '① Stroop · 命名颜色（复现）', src: 'Stroop (1935)；MacLeod (1991) 元分析',
    a: 'cong', b: 'incon', aL: '一致', bL: '不一致', diffL: '干扰效应 = 不一致 − 一致',
    expect: d => d > 0, lit: '口头报告典型 +100~150 ms；键控反应通常 +20~80 ms' },
  { exp: 'stroop_reverse', title: '② Stroop · 顺读汉字（改进 · 自动性不对称）', src: '依据自动性假说 + 维度重叠理论',
    a: 'cong', b: 'incon', aL: '一致', bL: '不一致', diffL: '干扰效应 = 不一致 − 一致',
    expect: d => d > 0, lit: '预测干扰方向不对称：本段效应应明显小于 ①', pairWith: 'stroop_base' },
  { exp: 'search_base', title: '③ 视觉搜索 · 特征 vs 联合（复现 FIT）', src: 'Treisman & Souther (1979)；Treisman & Gelade (1980)',
    a: 'feature', b: 'conjunction', aL: '特征搜索', bL: '联合搜索', diffL: '联合 − 特征',
    expect: d => d > 0, lit: '联合搜索斜率 ~20–30 ms/项 vs 特征 <10 ms/项（本实验固定 8 项，直接比总 RT）' },
  { exp: 'search_prevalence', title: '④ 视觉搜索 · 目标出现率（改进 · SEEV 期望）', src: 'Wolfe et al. (2007) 低流行率漏报',
    a: 'high', b: 'low', aL: '高出现率 75%', bL: '低出现率 25%', diffL: '低 − 高（RT）',
    expect: d => d > 0, lit: '罕见目标漏报率约为常见目标的 2–4 倍；本页同时看漏报率', miss: true },
  { exp: 'posner_base', title: '⑤ Posner · SOA 150ms（复现）', src: 'Posner (1980)',
    a: 'valid', b: 'invalid', aL: '有效线索', bL: '无效线索', diffL: '易化 = 无效 − 有效',
    expect: d => d > 0, lit: '外周线索短 SOA 下典型 10–30 ms 易化' },
  { exp: 'posner_ior', title: '⑥ Posner · SOA 800ms（改进 · IOR 时间进程）', src: 'Posner & Cohen (1984)',
    a: 'valid', b: 'invalid', aL: '有效线索', bL: '无效线索', diffL: '无效 − 有效',
    expect: d => d <= 0, lit: '预测易化消失或反转（返回抑制）：差值 ≤ 0' },
];

function condStats(arr) {   // arr = 一名被试某一条件的试次
  const ok = arr.filter(x => x.correct && x.rt > 150 && x.rt < 3000);
  const rt = ok.length ? ok.reduce((s, x) => s + x.rt, 0) / ok.length : null;
  const tg = arr.filter(x => x.target === 1);
  const miss = tg.length ? 100 * tg.filter(x => !x.correct).length / tg.length : null;
  return { rt, acc: 100 * arr.filter(x => x.correct).length / arr.length, n: arr.length, miss };
}

async function renderExp(m) {
  const recs = await loadAll(m.exp);
  const perP = new Map(); let excluded = 0;
  for (const r of recs) {
    let tr = r.trials; if (typeof tr === 'string') { try { tr = JSON.parse(tr); } catch (e) { continue; } }
    if (!Array.isArray(tr)) continue;
    const g = {};
    for (const x of tr) (g[x.cond] = g[x.cond] || []).push(x);
    if (!g[m.a] || !g[m.b] || g[m.a].length < 10 || g[m.b].length < 10) { excluded++; continue; }
    if (perP.has(r.participant)) continue;                     // 同一昵称取首次完整记录
    perP.set(r.participant, { [m.a]: condStats(g[m.a]), [m.b]: condStats(g[m.b]) });
  }
  const n = perP.size;
  const P = [...perP.values()];
  const mean = k => { const v = P.map(p => p[k].rt).filter(x => x != null); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };
  const acc = k => P.length ? P.reduce((s, p) => s + p[k].acc, 0) / P.length : null;
  const rtA = mean(m.a), rtB = mean(m.b);
  const diffs = P.map(p => (p[m.a].rt != null && p[m.b].rt != null) ? p[m.b].rt - p[m.a].rt : null).filter(x => x != null);
  const dBar = diffs.length ? diffs.reduce((s, x) => s + x, 0) / diffs.length : null;
  const sd = diffs.length > 1 ? Math.sqrt(diffs.reduce((s, x) => s + (x - dBar) ** 2, 0) / (diffs.length - 1)) : null;
  const dz = (sd && sd > 0) ? dBar / sd : null;
  const missA = (() => { const v = P.map(p => p[m.a].miss).filter(x => x != null); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; })();
  const missB = (() => { const v = P.map(p => p[m.b].miss).filter(x => x != null); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; })();

  let verdict;
  if (n === 0 || dBar == null) verdict = `<span class="verdict wait">等待数据（有效被试 ${n} / 达标需 ≥5）</span>`;
  else {
    const okp = m.expect(dBar);
    const mo = Math.abs(dBar) < 10;
    verdict = okp ? `<span class="verdict yes">✓ 预测成立</span>（${m.diffL} = ${sign(dBar)} ms${dz != null ? `，d<sub>z</sub> = ${dz.toFixed(2)}` : ''}${mo ? '，但幅度很小（≈0）' : ''}）`
                  : `<span class="verdict no">✗ 未复现预期方向</span>（${m.diffL} = ${sign(dBar)} ms${dz != null ? `，d<sub>z</sub> = ${dz.toFixed(2)}` : ''}）`;
  }
  const scale = Math.max(rtA || 0, rtB || 0, 1);
  const bar = (label, v, alt) => `<div class="abar${alt ? ' alt' : ''}"><span class="lbl">${label}</span><span class="fill" style="width:${v == null ? 0 : Math.round(620 * v / scale)}px;background:var(--${alt ? 'gold' : 'navy'})"></span><span class="num">${v == null ? '—' : Math.round(v) + ' ms'}</span></div>`;

  return `<div class="card">
    <h2>${m.title}</h2>
    <p class="muted" style="margin-top:-6px">出处：${m.src} ｜ 有效被试 <b>${n}</b> 人${n >= 5 ? ' ✓（≥5 达标）' : ''}，剔除不完整记录 ${excluded} 条 ｜ 收数接口共 ${recs.length} 条</p>
    ${bar(m.aL + ' 平均RT', rtA, false)}
    ${bar(m.bL + ' 平均RT', rtB, true)}
    <table class="st" style="max-width:640px">
      <tr><th></th><th>${m.aL}</th><th>${m.bL}</th></tr>
      <tr><td class="l">跨被试平均 RT</td><td>${rtA == null ? '—' : Math.round(rtA) + ' ms'}</td><td>${rtB == null ? '—' : Math.round(rtB) + ' ms'}</td></tr>
      <tr><td class="l">正确率</td><td>${acc(m.a) == null ? '—' : acc(m.a).toFixed(1) + '%'}</td><td>${acc(m.b) == null ? '—' : acc(m.b).toFixed(1) + '%'}</td></tr>
      ${m.miss ? `<tr><td class="l">漏报率（有目标却按“没有”）</td><td>${missA == null ? '—' : missA.toFixed(1) + '%'}</td><td>${missB == null ? '—' : missB.toFixed(1) + '%'}</td></tr>` : ''}
      <tr><td class="l">${m.diffL}（逐人配对平均）</td><td colspan="2"><b>${dBar == null ? '—' : sign(dBar) + ' ms'}</b>${dz != null ? `　d<sub>z</sub> = ${dz.toFixed(2)}` : ''}</td></tr>
    </table>
    <p>${verdict}</p>
    <p class="muted">文献对照：${m.lit}</p>
  </div>`;
}

const sign = v => (v > 0 ? '+' : '') + Math.round(v);

(async function main() {
  buildNav('analysis.html');
  const box = document.getElementById('secs');
  box.innerHTML = '';
  for (const m of META) {
    const holder = document.createElement('div');
    holder.innerHTML = `<div class="card"><h2>${m.title}</h2><p class="muted">读取中……</p></div>`;
    box.appendChild(holder);
    try { holder.innerHTML = await renderExp(m); }
    catch (e) { holder.innerHTML = `<div class="card"><h2>${m.title}</h2><p class="verdict no">读取失败：${esc(e.message)}</p></div>`; }
  }
})();
