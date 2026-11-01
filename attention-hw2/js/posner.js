/* ============================================================
   实验三 · Posner 外周线索任务
   复现段 base：线索—目标间隔 SOA = 150 ms —— Posner (1980)
       预测：有效线索（cue 与目标同侧）比无效线索快 10–30 ms（外周线索的自动定向）
   改进段 ior ：SOA = 800 ms —— Posner & Cohen (1984) 的时间进程 / 返回抑制（IOR）
       预测：易化消失甚至反转（刚去过的位置被抑制）；
       结合 SEEV：线索 50% 无预测性 → 无法形成期望，长间隔下线索价值归零。
   设计：2（SOA 段，被试内，段序 AB/BA 平衡）× 2（有效性，各 12 试次，精确平衡）；
       线索侧与目标侧随机，注视点全程保持。
   ============================================================ */
const KEYS = ['f', 'j'];
const mapLine = () => `<div class="map">F = 左框 ・ J = 右框</div>`;

function boxes(cueSide, flash) {
  return `<div class="posner">` +
    `<div class="box l${flash && cueSide === 'L' ? ' cuing' : ''}"></div>` +
    `<div class="box r${flash && cueSide === 'R' ? ' cuing' : ''}"></div>` +
    `<div class="fix">+</div>${mapLine()}</div>`;
}

function posnerTrials(nValid, nInvalid, practice) {
  const out = [];
  for (let i = 0; i < nValid; i++) {
    const cue = pick(['L', 'R']);
    out.push({ cond: 'valid', cue, side: cue, practice });
  }
  for (let i = 0; i < nInvalid; i++) {
    const cue = pick(['L', 'R']);
    out.push({ cond: 'invalid', cue, side: cue === 'L' ? 'R' : 'L', practice });
  }
  return shuffle(out);
}

const BLOCKS = {
  A: { exp: 'posner_base', soa: 150, title: '第一段 · 线索后很快出现目标（SOA=150ms，复现）',
       guide: `屏幕左右各有一个方框。保持<b>注视中央的“＋”</b>，眼珠不要跟线索动。<br>
       有时某个方框会<b>闪一下</b>，随后（很快）某个方框里出现一个<b>黑色圆点</b>：<br>
       圆点在左框 → 按 <kbd>F</kbd>；在右框 → 按 <kbd>J</kbd>。请又快又准。<br>
       <span class="muted">线索有 50% 概率指向错误位置，所以不要刻意“押宝”。</span>` },
  B: { exp: 'posner_ior', soa: 800, title: '第二段 · 线索后隔很久才出现目标（SOA=800ms，改进）',
       guide: `规则和第一段完全一样，只是<b>闪光之后要等更久</b>圆点才会出现。<br>
       继续注视“＋”，圆点出现后尽快按 <kbd>F</kbd>（左）/ <kbd>J</kbd>（右）。<br>
       <span class="muted">（改进假设：注意会自动“去过又回来”，刚去过的位置反而被抑制——
       如果是这样，这一段里线索指错位置时你可能反而更快。）</span>` },
};

let order, all = {};

async function runBlock(key) {
  const B = BLOCKS[key];
  showScreen(`<h2>${B.title}</h2><p>${B.guide}</p>
    <p class="muted">先做 4 个练习试次（不计入数据），然后正式 24 个试次。</p>
    <button class="btn btn-p" id="enter-btn">按 Enter 开始练习</button>`);
  await waitEnter();
  showPlay();
  document.getElementById('blocktitle').textContent = B.title;
  const cfg = {
    keys: KEYS, timeout: 3000, fixMs: 700,
    fixation: () => boxes(null, false),
    preTrial: async t => {                    // 线索事件：闪 100ms，再等剩余 SOA
      stage(boxes(t.cue, true));
      await sleep(100);
      stage(boxes(t.cue, false));
      await sleep(B.soa - 100);
    },
    render: t => boxes(null, false).replace(`class="box ${t.side.toLowerCase()}"`, `class="box ${t.side.toLowerCase()}"><div class="dot"></div>`),
    check: (t, ans) => (ans.key === 'f' && t.side === 'L') || (ans.key === 'j' && t.side === 'R'),
    fields: t => ({ cue: t.cue, side: t.side, soa: B.soa }),
    progress: prog,
  };
  await runTrials(posnerTrials(2, 2, true), cfg);
  all[key] = await runTrials(posnerTrials(12, 12, false), cfg);
  document.getElementById('blocktitle').textContent = '';
}

async function finish() {
  const sA = summarize(all.A), sB = summarize(all.B);
  const d = (s) => (typeof s.valid.rt === 'number' && typeof s.invalid.rt === 'number') ? (s.invalid.rt - s.valid.rt) : null;
  showScreen(`<h2>完成！你个人的结果</h2>
    <table class="st">
      <tr><th></th><th>有效线索（同侧）</th><th>无效线索（异侧）</th><th>线索易化 = 无效−有效</th></tr>
      <tr><td class="l"><b>SOA 150ms（复现）</b></td><td>${sA.valid.rt} ms</td><td>${sA.invalid.rt} ms</td><td><b>${fmt(d(sA))}</b></td></tr>
      <tr><td class="l"><b>SOA 800ms（改进）</b></td><td>${sB.valid.rt} ms</td><td>${sB.invalid.rt} ms</td><td><b>${fmt(d(sB))}</b></td></tr>
    </table>
    <p class="muted">预测：第一段易化为正（有效更快）；第二段接近 0 或转负（返回抑制）。正确率：${sA.valid.acc}%/${sA.invalid.acc}% 与 ${sB.valid.acc}%/${sB.invalid.acc}%。</p>
    <div class="note" id="uplist">正在上传数据……（请留在本页直到上传成功）</div>
    <a class="btn btn-o" href="analysis.html">查看全班数据 →</a> <a class="btn btn-p" href="index.html">回首页换实验</a>`);
  await uploadAll();
  function fmt(v) { return v == null ? '—' : (v > 0 ? '+' : '') + Math.round(v) + ' ms'; }
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
  buildNav('posner.html');
  order = pick(['AB', 'BA']);   // A=SOA150 复现 B=SOA800 改进
  showScreen(`<h2>Posner 空间线索任务</h2>
    <p>你好，<b>${esc(getNick())}</b>！这个网页考察“注意是如何被环境线索自动调动的”，两段共约 5 分钟。</p>
    <p class="muted">出处：Posner, S. (1980, <i>Quarterly Journal of Experimental Psychology</i>)；Posner &amp; Cohen (1984)；改进依据返回抑制的时间进程理论与 SEEV 期望因子（详见 README）。</p>
    <button class="btn btn-gold" id="enter-btn">按 Enter 开始</button>`);
  await waitEnter();
  await runBlock(order[0]);
  await runBlock(order[1]);
  await finish();
})();
