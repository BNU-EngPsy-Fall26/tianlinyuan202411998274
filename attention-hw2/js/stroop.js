/* ============================================================
   实验一 · Stroop 色词任务
   复现段 base：命名颜色（字义为干扰维度）—— Stroop (1935)
   改进段 rev ：顺读汉字（ ink 颜色为干扰维度）
   理论依据：字的自动性假说 + Wickens 维度重叠理论 ——
   阅读是高度自动化加工、难以抑制，而命名颜色非自动化，
   因此预测两个方向的干扰量不对称：读字任务中的颜色干扰 ≪ 命名任务中的字义干扰。
   设计：2（任务方向，被试内，段序 AB/BA 平衡）× 2（一致性）；每段 一致12/不一致12。
   ============================================================ */
const INK = { '红': '#d6332b', '绿': '#2b9348' };
const KEYS = ['f', 'j'];
const mapLine = () => `<div class="map">F = 红 ・ J = 绿</div>`;

function stroopTrials(counts, practice) {
  const out = [];
  for (const c of ['cong', 'incon']) for (let i = 0; i < counts[c]; i++) {
    const word = pick(['红', '绿']);
    const ink = c === 'cong' ? word : (word === '红' ? '绿' : '红');
    out.push({ cond: c, word, ink, practice });
  }
  return shuffle(out);
}
const renderWord = t => `<div class="word" style="color:${INK[t.ink]}">${t.word}</div>` + mapLine();
// mode 'ink' = 按颜色按键（复现段）；'word' = 按字读按键（改进段）
const checkAns = (t, ans, mode) => {
  const truth = mode === 'ink' ? t.ink : t.word;
  return (ans.key === 'f' && truth === '红') || (ans.key === 'j' && truth === '绿');
};

const BLOCKS = {
  A: { exp: 'stroop_base', mode: 'ink', title: '第一段 · 命名颜色（复现）',
       guide: `屏幕中央会出现一个彩色汉字（<span style="color:${INK['红']};font-weight:700">红</span> 或 <span style="color:${INK['绿']};font-weight:700">绿</span>）。<br>
       <b>请忽略字的意思，只判断这个字的颜色并尽快按键</b>：<kbd>F</kbd> = 红色，<kbd>J</kbd> = 绿色。<br>
       有时字义和颜色相同（如红字“红”），有时相反（如绿字“红”）——无论如何，都按颜色按键。<br><br>正确率约 90% 时说明你在认真做：反应太快而乱按会被记录出来。` },
  B: { exp: 'stroop_reverse', mode: 'word', title: '第二段 · 顺读汉字（改进：任务方向反转）',
       guide: `刺激和上一段完全一样，但<b>规则反过来了</b>：<br>
       <b>请忽略字的颜色，只判断这个字“读出来是什么”并尽快按键</b>：<kbd>F</kbd> = 字是“红”，<kbd>J</kbd> = 字是“绿”。<br>
       这一次，字<span style="color:#888">（的颜色）</span>成了可能干扰你的维度。<br><br>
       <span class="muted">（改进假设：如果字义加工是自动的、控制不了，那么上一段会明显更慢；
       而颜色加工不自动，这一段里颜色对读字的干扰应该小得多。）</span>` },
};

let order, all = {};

async function runBlock(key) {
  const B = BLOCKS[key];
  showScreen(`<h2>${B.title}</h2><p>${B.guide}</p>
    <p class="muted">先做 4 个练习试次（不计入数据），然后正式 24 个试次。中间可随时暂停浏览器，但请保持窗口在前台。</p>
    <button class="btn btn-p" id="enter-btn">按 Enter 开始练习</button>`);
  await waitEnter();
  showPlay();
  document.getElementById('blocktitle').textContent = B.title;
  const cfg = {
    keys: KEYS, timeout: 3000, fixMs: 600,
    fixation: () => `<div class="fix">+</div>` + mapLine(),
    render: renderWord,
    check: (t, ans) => checkAns(t, ans, B.mode),
    fields: t => ({ word: t.word, ink: t.ink }),
    progress: prog,
  };
  await runTrials(stroopTrials({ cong: 2, incon: 2 }, true), cfg);   // 练习，不上传
  all[key] = await runTrials(stroopTrials({ cong: 12, incon: 12 }, false), cfg);
  document.getElementById('blocktitle').textContent = '';
}

async function finish() {
  const s = { A: summarize(all.A), B: summarize(all.B) };
  const eff = () => (typeof s.A.cong.rt === 'number' && typeof s.A.incon.rt === 'number') ? (s.A.incon.rt - s.A.cong.rt) : null;
  showScreen(`<h2>完成！你个人的结果</h2>
    <table class="st">
      <tr><th></th><th>一致（字＝色）</th><th>不一致</th><th>干扰效应</th></tr>
      <tr><td class="l"><b>命名颜色（复现）</b></td><td>${s.A.cong.rt} ms</td><td>${s.A.incon.rt} ms</td><td><b>${fmtD(eff())}</b></td></tr>
      <tr><td class="l"><b>顺读汉字（改进）</b></td><td>${s.B.cong.rt} ms</td><td>${s.B.incon.rt} ms</td><td><b>${fmtD(effB())}</b></td></tr>
      <tr><td class="l">正确率</td><td>${s.A.cong.acc}% / ${s.B.cong.acc}%</td><td>${s.A.incon.acc}% / ${s.B.incon.acc}%</td><td>—</td></tr>
    </table>
    <p class="muted">表中为“命名段一致 − 不一致”。改进预测：命名段的干扰效应应明显大于读字段。</p>
    <div class="note" id="uplist">正在上传数据……（请留在本页直到上传成功）</div>
    <a class="btn btn-o" href="analysis.html">查看全班数据 →</a> <a class="btn btn-p" href="index.html">回首页换实验</a>`);

  function effB() { return (typeof s.B.cong.rt === 'number' && typeof s.B.incon.rt === 'number') ? (s.B.incon.rt - s.B.cong.rt) : null; }
  await uploadAll();

  function fmtD(d) { return d == null ? '—' : (d > 0 ? '+' : '') + d + ' ms'; }
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
  const B = BLOCKS[key];
  try { await submitData(getNick(), B.exp, all[key], order); toast(B.exp + ' 重试成功'); location.reload(); }
  catch (e) { toast('仍然失败：' + e.message); }
}

(async function main() {
  requireNick();
  buildNav('stroop.html');
  order = pick(['AB', 'BA']);   // A=命名颜色（复现）B=顺读汉字（改进），段序被试间平衡
  showScreen(`<h2>Stroop 色词任务</h2>
    <p>你好，<b>${esc(getNick())}</b>！这个网页有两个 Stroop 变体任务，一共约 6 分钟。</p>
    <p class="muted">出处：Stroop, J. R. (1935). <i>Journal of Experimental Psychology</i>；改进部分依据自动性假说与维度重叠理论（详见 README）。</p>
    <button class="btn btn-gold" id="enter-btn">按 Enter 开始</button>`);
  await waitEnter();
  const seq = order.split('').map(x => x === 'A' ? 'A' : 'B');
  await runBlock(seq[0]);
  await runBlock(seq[1]);
  await finish();
})();
