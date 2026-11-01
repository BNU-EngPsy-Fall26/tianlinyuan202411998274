/* ============================================================
   实验二 · 视觉搜索
   复现段 base：特征搜索（灰字母里找 O）vs 联合搜索（红/绿 O/X 里找 红O）
       —— Treisman & Gelade (1980) 特征整合理论 FIT；Treisman & Souther (1979)
   改进段 prev：只做联合搜索，但操纵目标出现率（高 75% / 低 25%）
       —— SEEV 模型（Salience-Effort-Expectancy-Value）中的期望因子：
          目标越罕见 → 每次试次“大概不会有”的先验越强 → 漏报（miss）上升、判断变慢。
          现实对应：机场安检低流行率效应（Wolfe et al., 2007）。
   设计：每段 24/40 试次；段序 AB/BA 被试间平衡；条件试次数精确、随机呈现。
   ============================================================ */
const RED = '#d6332b', GREEN = '#2b9348', GRAY = '#3a414c';
const KEYS = [' ', 'k'];
const mapLine = () => `<div class="map">空格 = 目标出现 ・ K = 没有目标</div>`;

/* 8 个等距位置（圆周） */
function slots() {
  const out = [];
  for (let i = 0; i < 8; i++) {
    const a = (i + 0.5) * Math.PI / 4;
    out.push({ x: 210 + 150 * Math.cos(a), y: 210 + 150 * Math.sin(a) });
  }
  return out;
}
const DIST_CONJ = [`<b style="color:${RED}">X</b>`, `<b style="color:${GREEN}">O</b>`, `<b style="color:${GREEN}">X</b>`];

function renderSearch(t) {
  const P = slots(), order8 = shuffle([0, 1, 2, 3, 4, 5, 6, 7]);
  const items = [];
  for (let i = 0; i < 8; i++) {
    const p = P[order8[i]];
    let html;
    if (t.cond === 'feature') {
      html = (t.target && i === 0) ? `<b style="color:${GRAY}">O</b>` : `<b style="color:${GRAY}">X</b>`;
    } else { // conjunction（含出现率段）
      if (t.target && i === 0) html = `<b style="color:${RED}">O</b>`;
      else html = pick(DIST_CONJ);
    }
    items.push(`<span class="item" style="left:${p.x}px;top:${p.y}px">${html}</span>`);
  }
  const goal = t.cond === 'feature' ? `<b style="color:${GRAY}">O</b>` : `<b style="color:${RED}">红O</b>`;
  return `<div class="searchfield">${items.join('')}</div>` +
         `<div class="map">目标 = ${goal}　・　空格 = 有 ・ K = 没有</div>`;
}

/* trials: [{cond, target}] 精确条件计数后整体随机 */
function searchTrials(spec, practice) {
  const list = [];
  for (const [cond, nPresent, nAbsent] of spec) {
    for (let i = 0; i < nPresent; i++) list.push({ cond, target: 1, practice });
    for (let i = 0; i < nAbsent; i++) list.push({ cond, target: 0, practice });
  }
  return shuffle(list);
}

const BLOCKS = {
  A: { exp: 'search_base', title: '第一段 · 特征搜索 vs 联合搜索（复现）',
       n: 24,
       guide: `屏幕上会随机出现 8 个字母（O 或 X）。<br>
       · <b>灰色字段</b>：目标是 <b>O</b>——只要形状这一“特征”不同就能找到。<br>
       · <b>彩色字段</b>：目标是 <b style="color:${RED}">红色的 O</b>——要同时结合“颜色 + 形状”两个特征；干扰项里有 红X、绿O、绿X。<br>
       有目标 → 按<b>空格</b>；没有目标 → 按 <kbd>K</kbd>。两种段会混在一起随机出现，请尽量<b>又快又准</b>。` },
  B: { exp: 'search_prevalence', title: '第二段 · 目标出现率操纵（改进：SEEV 期望因子）',
       n: 40,
       guide: `这一段全部是联合搜索（找 <b style="color:${RED}">红O</b>），规则不变：<b>空格</b>=有，<kbd>K</kbd>=没有。<br>
       不过——<b>有的时候目标很常出现，有的时候很少出现</b>，两段随机混在一起，你不需要猜“这次会不会有”，照常又快又准地反应即可。<br>
       <span class="muted">（改进假设：出现得越少的事，人越容易当成“没有”——罕见目标应更常漏报。）</span>` },
};

let order, all = {};

async function runBlock(key) {
  const B = BLOCKS[key];
  showScreen(`<h2>${B.title}</h2><p>${B.guide}</p>
    <p class="muted">先做几个练习（不计入数据），然后正式 ${B.n} 个试次。</p>
    <button class="btn btn-p" id="enter-btn">按 Enter 开始练习</button>`);
  await waitEnter();
  showPlay();
  document.getElementById('blocktitle').textContent = B.title;
  const cfg = {
    keys: KEYS, timeout: 3500, fixMs: 500,
    fixation: () => `<div class="fix">+</div>` + mapLine(),
    render: renderSearch,
    check: (t, ans) => t.target ? ans.key === ' ' : ans.key === 'k',
    fields: t => ({ target: t.target }),
    progress: prog,
  };
  const practiceSpec = key === 'A'
    ? [['feature', 1, 1], ['conjunction', 1, 1]]
    : [['low', 1, 2], ['high', 1, 1]];
  await runTrials(searchTrials(practiceSpec, true), cfg);
  const realSpec = key === 'A'
    ? [['feature', 8, 4], ['conjunction', 8, 4]]
    : [['high', 16, 4], ['low', 4, 16]];
  all[key] = await runTrials(searchTrials(realSpec, false), cfg);
  document.getElementById('blocktitle').textContent = '';
}

async function finish() {
  const sA = summarize(all.A), sB = summarize(all.B);
  const miss = (cond) => {
    const tg = all.B.filter(r => r.cond === cond && r.target === 1);
    return tg.length ? Math.round(100 * tg.filter(r => !r.correct).length / tg.length) : '—';
  };
  showScreen(`<h2>完成！你个人的结果</h2>
    <table class="st">
      <tr><th></th><th>平均 RT（正确试次）</th><th>正确率</th></tr>
      <tr><td class="l">特征搜索</td><td>${sA.feature.rt} ms</td><td>${sA.feature.acc}%</td></tr>
      <tr><td class="l">联合搜索</td><td>${sA.conjunction.rt} ms</td><td>${sA.conjunction.acc}%</td></tr>
      <tr><td class="l">高出现率（75%）</td><td>${sB.high.rt} ms</td><td>漏报率 ${miss('high')}%</td></tr>
      <tr><td class="l">低出现率（25%）</td><td>${sB.low.rt} ms</td><td>漏报率 ${miss('low')}%</td></tr>
    </table>
    <p class="muted">预测：联合搜索慢于特征搜索；低出现率的漏报率高于高出现率。（注：低出现率段只有 4 个有目标试次，个人层面漏报波动大，看全班聚合更稳。）</p>
    <div class="note" id="uplist">正在上传数据……（请留在本页直到上传成功）</div>
    <a class="btn btn-o" href="analysis.html">查看全班数据 →</a> <a class="btn btn-p" href="index.html">回首页换实验</a>`);
  await uploadAll();
}

async function uploadAll() {
  const box = document.getElementById('uplist');
  box.innerHTML = '';
  for (const key of ['A', 'B']) {
    const B = BLOCKS[key];
    const row = document.createElement('div');
    row.textContent = `${B.exp}：上传中…`;
    box.appendChild(row);
    try {
      const r = await submitData(getNick(), B.exp, all[key], order);
      row.textContent = `${B.exp}：✓ 已上传（全班已有 ${r.participants} 名被试的数据）`;
    } catch (e) {
      row.innerHTML = `${B.exp}：✗ 上传失败（${esc(e.message)}）<button class="btn btn-o btn-s" onclick="retryUpload('${key}')">重试</button>`;
    }
  }
}
async function retryUpload(key) {
  try { await submitData(getNick(), BLOCKS[key].exp, all[key], order); toast(BLOCKS[key].exp + ' 重试成功'); location.reload(); }
  catch (e) { toast('仍然失败：' + e.message); }
}

(async function main() {
  requireNick();
  buildNav('search.html');
  order = pick(['AB', 'BA']);   // A=复现段 B=出现率改进段
  showScreen(`<h2>视觉搜索</h2>
    <p>你好，<b>${esc(getNick())}</b>！这个网页有两段搜索任务，一共约 8 分钟。</p>
    <p class="muted">出处：Treisman &amp; Gelade (1980, <i>Cognitive Psychology</i>)；Treisman &amp; Souther (1979)；改进依据 Wickens 的 SEEV 模型与 Wolfe 等人的目标流行率研究（详见 README）。</p>
    <button class="btn btn-gold" id="enter-btn">按 Enter 开始</button>`);
  await waitEnter();
  await runBlock(order[0]);
  await runBlock(order[1]);
  await finish();
})();
