/* ============================================================
   注意实验室 · 作业二 —— 共用工具
   项目码（公开，写进网页）：78HV39
   下载密钥（保密）：只在课程平台"我的项目"里，绝不写进代码
   数据接口：POST /api/hw2/submit 收试次；GET /api/hw2/data 读全班（自动匿名）
   ============================================================ */
const LAB = 'https://attention-lab-production.up.railway.app';
const PROJECT = '78HV39';

const sleep = ms => new Promise(r => setTimeout(r, ms));

/* —— 被试昵称（localStorage 全站共用；要求：昵称或编号，不要真实姓名学号）—— */
function getNick() { return (localStorage.getItem('hw2_nick') || '').trim(); }
function setNick(n) { localStorage.setItem('hw2_nick', (n || '').trim().slice(0, 24)); }
function requireNick() { if (!getNick()) location.href = 'index.html?need=1'; }

/* —— 随机与条件平衡：按 spec 精确控制每条件试次数，再整体随机呈现 —— */
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function buildTrials(pairs) { const out = []; for (const t of pairs) out.push(Object.assign({}, t)); return shuffle(out); }
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

/* —— 按键等待：rt 从挂起监听时计（监听与刺激呈现同一 tick 挂起，误差 < 1 帧 ≈ 16ms）—— */
function waitKeydown(keys, timeout) {
  return new Promise(resolve => {
    let done = false; const t0 = performance.now();
    function onKey(e) {
      if (e.repeat) return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (!keys.includes(k)) return;
      e.preventDefault();
      finish({ key: k, rt: performance.now() - t0, timeout: false });
    }
    function finish(r) { if (done) return; done = true; clearTimeout(timer); document.removeEventListener('keydown', onKey); resolve(r); }
    const timer = setTimeout(() => finish({ key: null, rt: null, timeout: true }), timeout);
    document.addEventListener('keydown', onKey);
  });
}

/* —— 上传 / 读取 —— */
async function submitData(participant, experiment, trials, condition = '') {
  const res = await fetch(LAB + '/api/hw2/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      project: PROJECT,
      experiment,                       // 'stroop_base' 等小写+下划线
      participant,                        // 昵称
      condition,                          // 段序 AB / BA（被试间平衡）
      trials,
      meta: { ua: navigator.userAgent.slice(0, 80), w: innerWidth, h: innerHeight },
    }),
  });
  const r = await res.json();
  if (!r.ok) throw new Error(r.msg || ('HTTP ' + res.status));
  return r;
}
async function loadAll(experiment) {
  const r = await (await fetch(`${LAB}/api/hw2/data?project=${PROJECT}&experiment=${encodeURIComponent(experiment)}`)).json();
  if (!r.ok) throw new Error(r.msg || '读取失败');
  return r.records || [];
}

/* —— 页面框架 —— */
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function buildNav(active) {
  const links = [['index.html', '首页'], ['stroop.html', 'Stroop'], ['search.html', '视觉搜索'], ['posner.html', 'Posner 提示'], ['analysis.html', '全班数据']];
  document.getElementById('topnav').innerHTML =
    `<a class="brand" href="index.html">注意 · 复现与改进</a>` +
    links.map(([h, t]) => `<a href="${h}" class="${h === active ? 'on' : ''}">${t}</a>`).join('') +
    `<span class="spacer"></span><span class="nick">${getNick() ? '被试：' + esc(getNick()) : '请先在首页填昵称'}</span>`;
}
function stage(html) { const el = document.getElementById('stage'); if (el) el.innerHTML = html; }
function showScreen(html) {
  const app = document.getElementById('app');
  app.innerHTML = `<div class="card screen">${html}</div>`;
  app.style.display = '';
  document.getElementById('play').style.display = 'none';
}
function showPlay() {
  document.getElementById('app').style.display = 'none';
  document.getElementById('play').style.display = '';
}
function prog(i, n, practice) {
  const f = document.getElementById('pfill'), l = document.getElementById('plabel');
  if (f) f.style.width = (100 * (i + 1) / n) + '%';
  if (l) l.textContent = (practice ? '练习 · ' : '') + `第 ${i + 1} / ${n} 个试次`;
}

/* —— 通用逐试次循环：注视点 →（可选前导事件）→ 挂起计时并呈现刺激 → 反馈 → 空屏 ——
   cfg: { keys, timeout, fixMs, fbMs, gapMs, fixation(t)->html, preTrial?(t), render(t)->html,
          check(t, ans)->bool, fields?(t, ans)->附加字段, progress(i,n,practice) } —— */
async function runTrials(trials, cfg) {
  const recs = [];
  for (let i = 0; i < trials.length; i++) {
    const t = trials[i];
    if (cfg.progress) cfg.progress(i, trials.length, t.practice);
    stage(cfg.fixation ? cfg.fixation(t) : '<div class="fix">+</div>');
    await sleep(cfg.fixMs || 600);
    if (cfg.preTrial) await cfg.preTrial(t);          // Posner 的线索事件在目标呈现之前
    const p = waitKeydown(cfg.keys, cfg.timeout || 3000);
    stage(cfg.render(t));                              // 刺激呈现与计时起点同帧
    const ans = await p;
    const ok = !!ans.key && !!cfg.check(t, ans);
    stage(cfg.render(t) + (ans.timeout ? '<span class="fb bad">太慢了</span>' : ok ? '<span class="fb ok">✓</span>' : '<span class="fb bad">✗</span>'));
    await sleep(cfg.fbMs || 550);
    stage('');
    await sleep(cfg.gapMs || 320);
    recs.push(Object.assign(
      { trial: i, cond: t.cond, rt: ans.timeout ? null : Math.round(ans.rt), correct: ok ? 1 : 0, practice: !!t.practice },
      cfg.fields ? cfg.fields(t, ans) : {}
    ));
  }
  return recs;
}

/* 知情同意屏（slide 技术要求："先显示知情同意"）——勾选后才可进入 */
function consentGate(expName, minutes) {
  return new Promise(res => {
    showScreen(`
      <h2>知情同意书</h2>
      <p><b>${expName}</b> 是课程演示实验（工程心理学 · 作业二），全过程约 <b>${minutes} 分钟</b>。</p>
      <div class="note">
        · <b>目的</b>：复现并改进一个经典注意实验；数据仅用于课程作业与课堂匿名分析。<br>
        · <b>自愿</b>：参与完全自愿，随时关闭页面即可退出，没有任何后果。<br>
        · <b>记录什么</b>：按键反应时、对错、刺激参数；姓名位置请填<b>匿名编号或昵称</b>，<b>不收集</b>真实姓名、学号（服务器另记录浏览器版本与屏幕分辨率用于数据质量检查）。<br>
        · <b>谁能看到</b>：课程收数平台与作业作者；课堂展示界面中自动匿名（P01、P02…）。
      </div>
      <label style="display:flex;gap:10px;align-items:center;margin:14px 0;font-size:15px;cursor:pointer">
        <input type="checkbox" id="agree" style="width:18px;height:18px"> 我已阅读以上内容，自愿参加本实验。
      </label>
      <button class="btn btn-p" id="enter-btn" disabled>同意并开始</button>
      <p class="muted" style="margin-top:10px">不同意可直接关闭页面，或返回首页换别的实验。</p>`);
    const chk = document.getElementById('agree'), btn = document.getElementById('enter-btn');
    chk.onchange = () => { btn.disabled = !chk.checked; };
    btn.onclick = () => { if (!btn.disabled) res(); };
  });
}

/* 屏幕停留：按 Enter 或点按钮继续 */
function waitEnter() {
  return new Promise(res => {
    const done = () => { document.removeEventListener('keydown', onKey); res(); };
    const onKey = e => { if (e.key === 'Enter') done(); };
    document.addEventListener('keydown', onKey);
    setTimeout(() => { const b = document.getElementById('enter-btn'); if (b) b.addEventListener('click', done); }, 0);
  });
}

/* 按条件汇总（用于个人结果页） */
function summarize(recs) {
  const g = {};
  for (const r of recs) (g[r.cond] = g[r.cond] || []).push(r);
  const out = {};
  for (const [c, arr] of Object.entries(g)) {
    const ok = arr.filter(x => x.correct && x.rt != null);
    out[c] = {
      n: arr.length,
      acc: Math.round(100 * arr.reduce((s, x) => s + x.correct, 0) / arr.length),
      rt: ok.length ? Math.round(ok.reduce((s, x) => s + x.rt, 0) / ok.length) : '—',
    };
  }
  return out;
}

function toast(m) {
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = m;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}
