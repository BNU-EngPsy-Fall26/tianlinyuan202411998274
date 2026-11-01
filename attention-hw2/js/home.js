/* 首页：昵称设置 */
buildNav('index.html');
const inp = document.getElementById('in-nick');
inp.value = getNick();
document.getElementById('btn-nick').onclick = () => {
  if (!inp.value.trim()) { toast('昵称不能为空'); return; }
  setNick(inp.value);
  buildNav('index.html');
  toast('已保存：' + getNick());
};
inp.addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('btn-nick').click(); });
if (location.search.includes('need=1')) {
  document.getElementById('nick-card').style.borderColor = 'var(--gold)';
  document.getElementById('nick-card').style.borderWidth = '2px';
  inp.focus();
}
