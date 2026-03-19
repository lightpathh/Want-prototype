// ---- ツールチップ共通初期化 ----
// refEl: 位置計算の基準要素（省略時はbtn）
function initTooltip(btnId, tipId, refEl) {
  const btn = document.getElementById(btnId);
  const tip = document.getElementById(tipId);
  if (!btn || !tip) return;

  function positionTip() {
    const ref    = (refEl || btn).getBoundingClientRect();
    const centerX = ref.left + ref.width / 2;
    const tipW   = tip.offsetWidth || 260;
    const margin = 8;
    const left   = Math.min(
      Math.max(centerX - tipW / 2, margin),
      window.innerWidth - tipW - margin
    );
    tip.style.left = left + 'px';
    tip.style.top  = (ref.bottom + 8) + 'px';
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const opening = !tip.classList.contains('open');
    tip.classList.toggle('open');
    if (opening) positionTip();
  });
  window.addEventListener('resize',  () => { if (tip.classList.contains('open')) positionTip(); });
  window.addEventListener('scroll',  () => { if (tip.classList.contains('open')) positionTip(); }, { passive: true });
}

// 全ツールチップをまとめて初期化
// gaugeTooltip だけはバーの中央を基準にするため refEl を渡す
initTooltip('gaugeHelpBtn',           'gaugeTooltip',         document.querySelector('.e-bar-container'));
initTooltip('calcSectionTooltipBtn',  'calcSectionTooltip');
initTooltip('resultHelpBtn',          'resultTooltip');
initTooltip('kTooltipBtn',            'kTooltip');

// ツールチップを閉じるグローバルクリックハンドラ（1つに集約）
document.addEventListener('click', () => {
  document.querySelectorAll('.gauge-tooltip.open').forEach(t => t.classList.remove('open'));
});

// ---- 定数 ----
const STORAGE_KEY = 'Want_history_v1';
const THEME_KEY = 'theme_mode';
const SORT_MODE_KEY = 'Want_sort_mode';
const TUTORIAL_KEY = 'tutorialDone';
const LANG_KEY = 'lang';
const EPS = 1e-5;
const MIN_E = 1 / 7;  // バー表示下限
const MID_E = 1;      // 均衡点
const MAX_E = 7;      // バー表示上限

// ---- モジュールレベルの状態（localStorage 読み取りをキャッシュ） ----
let _currentLang = (() => { try { return localStorage.getItem(LANG_KEY) || 'ja'; } catch(e) { return 'ja'; } })();
let _sortMode = (() => { try { return localStorage.getItem(SORT_MODE_KEY) || 'time'; } catch(e) { return 'time'; } })();

// ---- 翻訳辞書 ----
const TRANSLATIONS = {
  ja: {
    'install-btn':'📲 インストール','app-title':'Want - 心理コスパ計算器','app-subtitle':'買い物などの意思決定をサポートします！',
    'share-btn':'🔥結果をシェア','tutorial-btn':'🔰入門',
    'label-I':'I : 欲しい気持ち（1〜100）','label-T':'T : いつから欲しい？（今日: 1日）',
    'tunit-day':'日','tunit-week':'週','tunit-month':'月','tunit-year':'年',
    'label-C':'C : 費用（円）','label-k':'k : あなたの金銭感覚',
    'label-calc-section':'あなたの金銭感覚を計算 ↓','label-C0':'① 予期せぬ一目惚れ即決 許容額（円）',
    'calibrate-btn':'算出','label-income':'② 月の自由に使えるお金（円）','income-btn':'算出',
    'calc-btn':'結果','save-btn':'履歴保存','export-btn':'CSV出力',
    'result-h2':'計算結果','result-W':'W（欲しいの総量）','result-E':'E （心理的コスパ）','result-judge-prefix':'判定 : ',
    'gauge-h2':'E 視覚ゲージ','zone-overpriced':'割高','zone-hold':'保留','zone-good':'良い','zone-recommend':'推奨',
    'sort-E':'E 高い順','sort-time':'時系列','clear-all':'全件削除',
    'settings-theme':'テーマ','theme-dark':'🌙 ダーク','theme-light':'☀️ ライト',
    'settings-lang':'言語 / Language','lang-ja':'🇯🇵 日本語','lang-en':'🇺🇸 English',
    'history-empty':'履歴はありません','load-btn':'読み込み','delete-btn':'削除',
    'toast-I-max':'I は 100 が上限です','toast-IT-required':'IとTは入力必須です',
    'toast-C0-invalid':'①に有効な金額を入力してください','toast-income-invalid':'②に有効な金額を入力してください',
    'toast-save-success':'履歴を保存しました','toast-save-fail':'履歴の保存に失敗しました',
    'toast-install-success':'インストール開始！','toast-ios-hint':'📲 iOS: 共有ボタン → ホーム画面に追加 でインストールできます',
    'toast-calibrate-success':(k)=>`①で、k=${k} を算出しました`,'toast-income-success':(k)=>`②で、k=${k} を算出しました`,
    'alert-calc-first':'まず計算してください','alert-history-empty':'履歴がありません',
    'alert-lib-load-fail':'画像生成ライブラリの読み込みに失敗しました。ページを再読み込みしてください。',
    'alert-card-not-found':'結果カードまたはE判断ゲージが見つかりません。',
    'alert-img-fail':'画像の生成に失敗しました。',
    'alert-share-saved':'このブラウザでは直接シェアできませんが、画像を保存しました。',
    'share-title':'Want - 結果シェア','share-text':'私の Want - 結果シェア🔥',
    'confirm-export':'履歴をCSVとして出力しますか？','confirm-clear-all':'履歴を全て削除しますか？',
    'confirm-delete-item':'削除しますか？','prompt-memo':'メモを入力（例: 欲しい物）',
    'judgment-balance':'バランス','judgment-great':'かなりおすすめ','judgment-good':'いい感じ','judgment-hold':'様子見かな','judgment-high':'高いかも',
    'update-banner-text':'新しいバージョンがあります','update-banner-btn':'今すぐ更新','toast-updated':'✓ 更新しました',
    'tut-dialog-title':'チュートリアルを始めますか？','tut-dialog-steps':'全10ステップ・約1分で完了します。','tut-dialog-note':'実際に入力可能です✅️',
    'tut-yes':'はい','tut-skip':'スキップ','tut-prev':'◀ 戻る','tut-next':'次へ ▶','tut-done':'完了',
    'tut-step-label':(cur,total)=>`ステップ ${cur} / ${total}`,
    'tut-msg-0':'① 本ツールを一言でいうと、<br>欲しい気持ちの蓄積と、費用の負担感の<br>バランスを見える化する<br><br>「人間らしい計算器」です。',
    'tut-msg-1':'② まず、あなたの「買いたい物」から<br>一緒に考えてみましょう。<br><br>何か一つ思い浮かべてみて！✨',
    'tut-msg-2':'③ 欲しい気持ちを1―100点で入力。<br>直感でOKです。',
    'tut-msg-3':'④ いつから欲しいと思ってる？<br>日、週、月、年&emsp;選択可。',
    'tut-msg-4':'⑤ 買うならいくらかかる？',
    'tut-msg-5':'⑥ 「k」はあなたの金銭感覚。<br><br>今はとばしてOKです！',
    'tut-msg-6':'⑦ k算出には、2つの方法があります。<br>1、心理的な測定<br>2、予算的な測定<br><br>どちらかでOKです！',
    'tut-msg-7':'⑧-1 心理的な測定<br><br>あなたは今、ショッピングモールで、<br>ある商品に一目惚れしました。<br>即決で「買う！」と思える許容額は？',
    'tut-msg-8':'⑧-2「k算出」を押してみよう。',
    'tut-msg-9':'⑨-1 予算的な測定<br><br>あなたの月の自由に使えるお金は？<br><br>※ いわゆる「お小遣い」のこと',
    'tut-msg-10':'⑨-2「k算出」を押してみよう。',
    'tut-msg-11':'⑩ 「結果」を押して判定を確認！<br>お疲れさまでした！',
    'welcome-tutorial-hint':'チュートリアルはこちら →&nbsp;','welcome-anytime':'いつでも体験できます！','welcome-ok':'OK',
    'ph-I':'例: 40','ph-T':'例: 1','ph-C':'例: 5000','ph-k':'例: 1（自動計算も可）','ph-C0':'例: 10000','ph-income':'例: 30000',
    'k-tooltip-html':`<div style="font-weight:700;margin-bottom:6px;">🔰 初めての方はこちら</div><div style="color:var(--muted);margin-bottom:8px;">以下の数値を入力してみよう。<br>直感で選んでみてね！</div><div class="tooltip-section" style="font-family:monospace;">お金にルーズ：<b>0.7, 0.5</b><br>普通くらい　：<b>1</b><br>お金にシビア：<b>2, 3</b></div><div style="color:var(--muted);font-size:0.78rem;margin-bottom:20px;">※ 数字が大きいほど「お金に厳しい」</div><hr class="tooltip-hr"><div style="font-weight:700;margin-bottom:4px;">🔍 正式に測定したい方</div><div style="color:var(--muted);">下の「あなたの金銭感覚を計算」<br>にて測定できます。</div>`,
    'calc-tooltip-html':`<div style="font-weight:700;margin-bottom:6px;">📏 測定方法は2つ</div><div class="tooltip-section"><div>① 心理的な測定</div><div>② 予算的な測定</div></div><div style="color:var(--muted);margin-bottom:8px;">どちらかでOKです！</div><hr class="tooltip-hr"><div style="color:var(--muted);font-size:0.8rem;">入力後に「算出」ボタンを<br>押すことも忘れずに 👍</div>`,
    'result-tooltip-html':`<div class="tooltip-section"><div style="font-weight:700;margin-bottom:5px;">W — 欲しいの総量</div><div style="color:var(--muted);">「欲しい」というエネルギーの総量。</div><div style="color:var(--accent);font-size:0.78rem;margin-top:3px;">※ 大きいほど良い</div></div><div class="tooltip-section" style="margin-bottom:0;"><div style="font-weight:700;margin-bottom:5px;">E — 心理的コスパ</div><div style="color:var(--muted);">W と費用の負担感がどれだけ釣り合っているか。</div><div style="color:var(--accent);font-size:0.78rem;margin-top:3px;">※ E = 1　: 均衡</div></div>`,
    'gauge-tooltip-html':`<div style="font-size:0.75rem;color:var(--muted);margin-bottom:6px;">色の見方</div><div class="gauge-tooltip-label"><div style="width:29%;background:rgba(239,68,68,0.28);color:#ef4444;">割高</div><div style="width:21%;background:rgba(245,158,11,0.28);color:#f59e0b;">保留</div><div style="width:21%;background:rgba(56,176,0,0.28);color:#38b000;">良い</div><div style="width:29%;background:rgba(59,130,246,0.28);color:#3b82f6;">推奨</div></div><div class="gauge-tooltip-axis"><span style="left:0%">1/7</span><span style="left:29%">1/3</span><span style="left:50%">1</span><span style="left:71%">3</span><span style="left:100%">7</span></div>`,
  },
  en: {
    'install-btn':'📲 Install','app-title':'Want - Mental ROI Calculator','app-subtitle':'Supports your shopping decisions!',
    'share-btn':'🔥 Share Result','tutorial-btn':'🔰 Tutorial',
    'label-I':'I : Desire (1–100)','label-T':'T : How long have you wanted it?<br><span style="padding-left:2.5ch">(Today: 1 day)</span>',
    'tunit-day':'Day','tunit-week':'Week','tunit-month':'Month','tunit-year':'Year',
    'label-C':'C : Cost ($)','label-k':'k : Your money sense',
    'label-calc-section':'Calculate your money sense ↓','label-C0':'① Max impulse-buy amount ($)',
    'calibrate-btn':'Calc','label-income':'② Monthly discretionary budget ($)','income-btn':'Calc',
    'calc-btn':'Result','save-btn':'Save','export-btn':'Export CSV',
    'result-h2':'Result','result-W':'W (Total desire)','result-E':'E (Psych value)','result-judge-prefix':'Verdict: ',
    'gauge-h2':'E Gauge','zone-overpriced':'Pricey','zone-hold':'Hold','zone-good':'Good','zone-recommend':'Great',
    'sort-E':'E High → Low','sort-time':'Recent','clear-all':'Delete All',
    'settings-theme':'Theme','theme-dark':'🌙 Dark','theme-light':'☀️ Light',
    'settings-lang':'言語 / Language','lang-ja':'🇯🇵 日本語','lang-en':'🇺🇸 English',
    'history-empty':'No history yet','load-btn':'Load','delete-btn':'Delete',
    'toast-I-max':'I max is 100','toast-IT-required':'I and T are required',
    'toast-C0-invalid':'① Enter a valid amount','toast-income-invalid':'② Enter a valid amount',
    'toast-save-success':'Saved to history','toast-save-fail':'Failed to save history',
    'toast-install-success':'Installing!','toast-ios-hint':'📲 iOS: Share → Add to Home Screen',
    'toast-calibrate-success':(k)=>`① k=${k} calculated`,'toast-income-success':(k)=>`② k=${k} calculated`,
    'alert-calc-first':'Calculate first','alert-history-empty':'No history',
    'alert-lib-load-fail':'Image library failed to load. Please reload the page.',
    'alert-card-not-found':'Result card or gauge not found.',
    'alert-img-fail':'Failed to generate image.',
    'alert-share-saved':'Direct sharing is unavailable, but the image has been saved.',
    'share-title':'Want - Result Share','share-text':'My Want result 🔥',
    'confirm-export':'Export history as CSV?','confirm-clear-all':'Delete all history?',
    'confirm-delete-item':'Delete this entry?','prompt-memo':'Add a note (e.g. What you want)',
    'judgment-balance':'Balanced','judgment-great':'Highly recommended','judgment-good':'Looks good','judgment-hold':'Consider waiting','judgment-high':'Seems pricey',
    'update-banner-text':'New version available','update-banner-btn':'Update now','toast-updated':'✓ Updated',
    'tut-dialog-title':'Start tutorial?','tut-dialog-steps':'10 steps · about 1 minute.','tut-dialog-note':'You can try real input ✅️',
    'tut-yes':'Yes','tut-skip':'Skip','tut-prev':'◀ Back','tut-next':'Next ▶','tut-done':'Done',
    'tut-step-label':(cur,total)=>`Step ${cur} / ${total}`,
    'tut-msg-0':'① In short, this tool visualizes<br>the balance between your desire<br>and the cost burden.<br><br>A "human calculator."',
    'tut-msg-1':'② Think of something<br>you want to buy.<br><br>Pick one thing! ✨',
    'tut-msg-2':'③ Enter your desire level (1–100).<br>Go with your gut.',
    'tut-msg-3':'④ How long have you wanted it?<br>Day, Week, Month, Year available.',
    'tut-msg-4':'⑤ How much would it cost?',
    'tut-msg-5':'⑥ "k" is your money sense.<br><br>You can skip this for now!',
    'tut-msg-6':'⑦ Two ways to find k:<br>1. Psychological<br>2. Budget-based<br><br>Either one works!',
    'tut-msg-7':'⑧-1 Psychological<br><br>You spot something at a mall<br>and fall in love instantly.<br>What\'s your impulse-buy limit?',
    'tut-msg-8':'⑧-2 Press "Calc k".',
    'tut-msg-9':'⑨-1 Budget-based<br><br>What\'s your monthly<br>discretionary budget?<br><br>※ Your "allowance"',
    'tut-msg-10':'⑨-2 Press "Calc k".',
    'tut-msg-11':'⑩ Press "Result" to see the verdict!<br>Great job!',
    'welcome-tutorial-hint':'Tutorial here →&nbsp;','welcome-anytime':'Try it anytime!','welcome-ok':'OK',
    'ph-I':'e.g. 40','ph-T':'e.g. 1','ph-C':'e.g. 100','ph-k':'(auto-calc)','ph-C0':'e.g. 200','ph-income':'e.g. 600',
    'k-tooltip-html':`<div style="font-weight:700;margin-bottom:6px;">🔰 New here?</div><div style="color:var(--muted);font-size:0.78rem;margin-bottom:20px;">Higher = more cost-conscious</div><hr class="tooltip-hr"><div style="font-weight:700;margin-bottom:4px;">🔍 About auto-calc</div><div style="color:var(--muted);">Use "Calculate your money sense"<br>below to measure it.</div>`,
    'calc-tooltip-html':`<div style="font-weight:700;margin-bottom:6px;">📏 Two ways to measure</div><div class="tooltip-section"><div>① Psychological</div><div>② Budget-based</div></div><div style="color:var(--muted);margin-bottom:8px;">Either one works!</div><hr class="tooltip-hr"><div style="color:var(--muted);font-size:0.8rem;">Don't forget to press "Calc"<br>after entering the value 👍</div>`,
    'result-tooltip-html':`<div class="tooltip-section"><div style="font-weight:700;margin-bottom:5px;">W — Total desire</div><div style="color:var(--muted);">The total energy of "wanting."</div><div style="color:var(--accent);font-size:0.78rem;margin-top:3px;">※ Higher is better</div></div><div class="tooltip-section" style="margin-bottom:0;"><div style="font-weight:700;margin-bottom:5px;">E — Psych cost-effectiveness</div><div style="color:var(--muted);">How well W balances against the cost burden.</div><div style="color:var(--accent);font-size:0.78rem;margin-top:3px;">※ E = 1 : equilibrium</div></div>`,
    'gauge-tooltip-html':`<div style="font-size:0.75rem;color:var(--muted);margin-bottom:6px;">Zone guide</div><div class="gauge-tooltip-label"><div style="width:29%;background:rgba(239,68,68,0.28);color:#ef4444;">Pricey</div><div style="width:21%;background:rgba(245,158,11,0.28);color:#f59e0b;">Hold</div><div style="width:21%;background:rgba(56,176,0,0.28);color:#38b000;">Good</div><div style="width:29%;background:rgba(59,130,246,0.28);color:#3b82f6;">Great</div></div><div class="gauge-tooltip-axis"><span style="left:0%">1/7</span><span style="left:29%">1/3</span><span style="left:50%">1</span><span style="left:71%">3</span><span style="left:100%">7</span></div>`,
  },
};

// ---- 翻訳ヘルパー ----
function tr(key, ...args) {
  const dict = TRANSLATIONS[_currentLang] || TRANSLATIONS['ja'];
  const val = dict[key] ?? TRANSLATIONS['ja'][key] ?? key;
  return typeof val === 'function' ? val(...args) : val;
}

// ---- 言語適用 ----
function applyLang(lang, skipRender = false) {
  _currentLang = lang;
  savePref(LANG_KEY, lang);
  document.documentElement.lang = lang === 'en' ? 'en' : 'ja';
  document.title = TRANSLATIONS[lang]?.['app-title'] || document.title;
  // data-i18n → textContent
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    const val = TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS['ja']?.[key];
    if (val && typeof val === 'string') el.textContent = val;
  });
  // data-i18n-html → innerHTML
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.dataset.i18nHtml;
    const val = TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS['ja']?.[key];
    if (val && typeof val === 'string') el.innerHTML = val;
  });
  // data-i18n-placeholder → placeholder
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.dataset.i18nPlaceholder;
    const val = TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS['ja']?.[key];
    if (val) el.placeholder = val;
  });
  // 言語ボタンのアクティブ状態
  const jaBtn = document.getElementById('langJaBtn');
  const enBtn = document.getElementById('langEnBtn');
  if (jaBtn) jaBtn.classList.toggle('active', lang === 'ja');
  if (enBtn) enBtn.classList.toggle('active', lang === 'en');
  // 履歴再描画（ボタンテキスト反映）—初期化時はスキップ可
  if (!skipRender) renderHistory();
}

// ---- ユーティリティ ----
const qs  = (sel) => document.querySelector(sel);
const r   = (v, dp = 6) => { const m = Math.pow(10, dp); return Math.round(v * m) / m; };
const toNum = (v) => { const n = Number(v); return Number.isFinite(n) ? n : NaN; };
function genId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'h' + Date.now().toString(36) + Math.random().toString(36).slice(2);
}
function nowIso() { return new Date().toISOString(); }

function convertTtoDays(Tval, unit) {
  if (!Number.isFinite(Tval)) return NaN;
  switch (unit) {
    case 'week':  return Tval * 7;
    case 'month': return Tval * 30;
    case 'year':  return Tval * 365;
    default:      return Tval;
  }
}

// ---- localStorage 安全ラッパー ----
function loadHistory() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(raw)) return [];
    // 必須フィールドが揃っているエントリのみ受け入れる
    return raw.filter(
      (e) => e && typeof e === 'object' && typeof e.id === 'string' && typeof e.ts === 'string'
    );
  } catch (e) {
    return [];
  }
}

function saveHistory(arr) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch (e) {
    showToast(tr('toast-save-fail'), 'error');
  }
}

function loadPref(key, fallback = null) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch (e) {
    return fallback;
  }
}

function savePref(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (e) { /* 設定保存失敗は無視 */ }
}

function removePref(key) {
  try {
    localStorage.removeItem(key);
  } catch (e) { /* 無視 */ }
}

// ---- DOM 要素 ----
const Iinput      = qs('#I');
const Tinput      = qs('#T');
const Tunit       = qs('#Tunit');
const Cinput      = qs('#C');
const kinput      = qs('#k');
const C0input     = qs('#C0');
const incomeInput = qs('#income');
const calcBtn     = qs('#calcBtn');
const calibrateBtn = qs('#calibrateBtn');
const incomeBtn   = qs('#incomeBtn');
const saveBtn     = qs('#saveBtn');
const exportBtn   = qs('#exportBtn');
const clearAllBtn = qs('#clearAllBtn');
const Wout        = qs('#Wout');
const Eout        = qs('#Eout');
const judgementEl = qs('#judgement');
const historyList = qs('#historyList');
const Ebar        = qs('#Ebar');
const EbarValue   = qs('#EbarValue');
const Eaxis       = qs('#Eaxis');
const sortEBtn    = qs('#sortEBtn');
const sortTimeBtn = qs('#sortTimeBtn');

let lastResult = null;

// ---- 計算関数 ----
function compute({ I, T, C, k }) {
  const W_raw = I * Math.sqrt(T);
  const E_raw = (C > 0 && k > 0) ? W_raw / (k * Math.sqrt(C)) : null;
  return {
    W: r(W_raw, 6),
    E: E_raw === null ? null : r(E_raw, 6),
  };
}

// ---- トースト表示 ----
function showToast(msg, type = 'error') {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  if (type === 'success') {
    toast.style.background = 'var(--good)';
  } else if (type === 'warn') {
    toast.style.background = '#f59e0b';
  } else {
    toast.style.background = 'var(--bad)';
  }
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 50);
  setTimeout(() => {
    toast.classList.remove('show');
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 600);
  }, 2800);
}

// ---- 入力エラー演出（共通化） ----
function addInputError(el) {
  el.classList.remove('input-error');
  void el.offsetWidth; // アニメーションリセット
  el.classList.add('input-error');
  setTimeout(() => el.classList.remove('input-error'), 3000);
}

// ---- 色・ラベル関数 ----
function getJudgmentLabelAndColor(E) {
  if (Math.abs(E - 1) < EPS)  return { label: tr('judgment-balance'), color: '#ffd60a' };
  if (E > 3)                   return { label: tr('judgment-great'),   color: '#3b82f6' };
  if (E > 1)                   return { label: tr('judgment-good'),    color: '#38b000' };
  if (E >= 1 / 3 - EPS)       return { label: tr('judgment-hold'),    color: '#f59e0b' };
  return                              { label: tr('judgment-high'),    color: '#ef4444' };
}

function getBarColor(v) {
  if (v < 1 / 3 - EPS)        return '#ef4444';
  if (v < 1 - EPS)             return '#f59e0b';
  if (Math.abs(v - 1) < EPS)  return '#ffd60a';
  if (v <= 3)                  return '#38b000';
  return                              '#3b82f6';
}

// ---- UI リセット共通処理 ----
function clearResultUI() {
  Wout.textContent      = '—';
  Eout.textContent      = '—';
  judgementEl.textContent = '—';
  Ebar.style.width      = '0%';
  Ebar.style.background = 'transparent';
  EbarValue.textContent = '—';
  Wout.style.color      = 'var(--text)';
  Eaxis.style.visibility = 'hidden';
}

// ---- UI 更新 ----
function updateResult(res) {
  if (res.error) {
    clearResultUI();
    judgementEl.style.color = 'var(--text)';
    return;
  }

  Wout.textContent = Number.isFinite(res.W) ? res.W.toFixed(3) : '—';
  Eout.textContent = (res.E !== null && Number.isFinite(res.E)) ? res.E.toFixed(3) : '—';

  if (res.E === null) {
    judgementEl.textContent = '—';
    judgementEl.style.color = 'var(--muted)';
    Ebar.style.width = '0%';
    Ebar.style.background = 'transparent';
    EbarValue.textContent = '—';
    Eaxis.style.visibility = 'hidden';
    Wout.style.color = Number.isFinite(res.W) ? 'var(--good)' : 'var(--text)';
    lastResult = res;
    return;
  }

  // --- E がある場合の処理 ---
  const j = getJudgmentLabelAndColor(res.E);
  judgementEl.textContent = j.label;
  judgementEl.style.color = j.color;
  Wout.style.color = '';

  // 対数スケールで 0〜100% へマッピング（軸に整合）
  const val    = Math.max(MIN_E, Math.min(res.E, MAX_E));
  const logVal = Math.log10(val);
  const logA   = Math.log10(1 / 7);
  const logB   = Math.log10(1 / 3);
  const logC   = Math.log10(1);
  const logD   = Math.log10(3);
  const logE   = Math.log10(7);
  const posA = 0, posB = 29, posC = 50, posD = 71, posE = 100;

  let percent;
  if      (logVal <= logA) percent = posA;
  else if (logVal <= logB) percent = posA + (posB - posA) * ((logVal - logA) / (logB - logA));
  else if (logVal <= logC) percent = posB + (posC - posB) * ((logVal - logB) / (logC - logB));
  else if (logVal <= logD) percent = posC + (posD - posC) * ((logVal - logC) / (logD - logC));
  else if (logVal <= logE) percent = posD + (posE - posD) * ((logVal - logD) / (logE - logD));
  else                     percent = posE;

  Ebar.style.width      = percent + '%';
  Ebar.style.background = getBarColor(res.E);
  EbarValue.textContent = res.E.toFixed(2);

  Eaxis.style.visibility = 'visible';

  lastResult = res;
}

function resetResult() {
  clearResultUI();
  judgementEl.style.color = 'var(--text)';
  lastResult = null;
}

// ---- 結果をシェア ----
const shareGaugeBtn = qs('#shareGaugeBtn');
if (shareGaugeBtn) {
  shareGaugeBtn.onclick = async () => {
    if (!window.html2canvas) {
      await new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
        // SRI: 本番環境では integrity="sha384-<hash>" を付与することを推奨
        s.crossOrigin = 'anonymous';
        s.onload = res;
        s.onerror = () => { alert(tr('alert-lib-load-fail')); rej(new Error('load failed')); };
        document.head.appendChild(s);
      }).catch(() => null);
      if (!window.html2canvas) return;
    }

    const resultCard = document.querySelector('.card:nth-of-type(2)');
    const gaugeCard  = document.querySelector('.card:nth-of-type(3)');
    if (!resultCard || !gaugeCard) {
      alert(tr('alert-card-not-found'));
      return;
    }

    const isLight = document.documentElement.classList.contains('light');
    const bgColor = isLight ? '#ffffff' : '#071226';

    const wrapper = document.createElement('div');
    Object.assign(wrapper.style, {
      display: 'flex', flexDirection: 'column', gap: '12px',
      padding: '16px', background: bgColor, borderRadius: '12px',
      width: `${Math.max(resultCard.offsetWidth, gaugeCard.offsetWidth)}px`,
    });
    wrapper.appendChild(resultCard.cloneNode(true));
    wrapper.appendChild(gaugeCard.cloneNode(true));
    document.body.appendChild(wrapper);

    let canvas;
    try {
      canvas = await html2canvas(wrapper, { backgroundColor: bgColor, scale: 2 });
    } catch (err) {
      wrapper.remove();
      alert(tr('alert-img-fail'));
      return;
    }
    wrapper.remove();

    canvas.toBlob(async (blob) => {
      if (!blob) {
        alert(tr('alert-img-fail'));
        return;
      }

      const file = new File([blob], 'Want_Result.png', { type: 'image/png' });
      let canShare = false;
      try { canShare = navigator.canShare && navigator.canShare({ files: [file] }); } catch (_) {}

      if (canShare) {
        try {
          await navigator.share({ title: tr('share-title'), text: tr('share-text'), files: [file] });
        } catch (err) {
          if (err.name !== 'AbortError') console.warn('共有失敗:', err);
        }
      } else {
        const link = document.createElement('a');
        const blobUrl = URL.createObjectURL(blob);
        link.href     = blobUrl;
        link.download = 'Want_Result.png';
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(blobUrl);
        alert(tr('alert-share-saved'));
      }
    }, 'image/png');
  };
}

// ---- 「結果」ボタン処理 ----
calcBtn.onclick = () => {
  let I      = toNum(Iinput.value);
  const T    = convertTtoDays(toNum(Tinput.value), Tunit.value);
  const C    = toNum(Cinput.value);
  const k    = toNum(kinput.value);

  if (I > 100) {
    I = 100;
    Iinput.value = 100;
    showToast(tr('toast-I-max'), 'warn');
    Iinput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    Iinput.animate([
      { boxShadow: '0 0 0px var(--accent)' },
      { boxShadow: '0 0 10px var(--accent)' },
      { boxShadow: '0 0 0px var(--accent)' },
    ], { duration: 800 });
  }

  if (!(I > 0 && T > 0)) {
    resetResult();
    showToast(tr('toast-IT-required'));
    [Iinput, Tinput].forEach(addInputError);
    const target = !I ? Iinput : Tinput;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  updateResult(compute({ I, T, C, k }));
};

// ---- k 算出（心理的測定） ----
calibrateBtn.onclick = () => {
  const C0 = toNum(C0input.value);
  if (!C0 || C0 <= 0) {
    showToast(tr('toast-C0-invalid'));
    addInputError(C0input);
    C0input.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  const kVal = 100 / Math.sqrt(C0);
  kinput.value = r(kVal, 6);
  showToast(tr('toast-calibrate-success', r(kVal, 6)), 'success');
};

// ---- k 算出（予算的測定） ----
incomeBtn.onclick = () => {
  const income = toNum(incomeInput.value);
  if (!income || income <= 0) {
    showToast(tr('toast-income-invalid'));
    addInputError(incomeInput);
    incomeInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  const C0   = income / 3;
  const kVal = 100 / Math.sqrt(C0);
  kinput.value = r(kVal, 6);
  showToast(tr('toast-income-success', r(kVal, 6)), 'success');
};

// ---- 履歴保存 ----
saveBtn.onclick = () => {
  if (!lastResult) { alert(tr('alert-calc-first')); return; }
  const memo = prompt(tr('prompt-memo'));
  if (memo === null) return;
  const entry = {
    id:    genId(),
    ts:    nowIso(),
    I:     toNum(Iinput.value),
    T:     convertTtoDays(toNum(Tinput.value), Tunit.value),
    Tunit: Tunit.value,
    C:     toNum(Cinput.value),
    k:     toNum(kinput.value),
    W:     lastResult.W,
    E:     lastResult.E,
    memo:  memo.trim(),
  };
  const arr = loadHistory();
  arr.unshift(entry);
  saveHistory(arr);
  setSortMode(_sortMode);
  showToast(tr('toast-save-success'), 'success');
};

// ---- CSV 出力 ----
exportBtn.onclick = () => {
  const arr = loadHistory();
  if (!arr.length) { alert(tr('alert-history-empty')); return; }
  if (!confirm(tr('confirm-export'))) return;

  const rows = [['ts', 'I', 'T(日換算)', 'C', 'k', 'W', 'E', 'memo']];
  arr.forEach((e) => rows.push([e.ts, e.I, e.T, e.C, e.k, e.W, e.E, e.memo]));

  const csv = new Blob(
    ['\uFEFF', rows.map((row) => row.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')],
    { type: 'text/csv' }
  );

  const url  = URL.createObjectURL(csv);
  const link = document.createElement('a');
  link.href     = url;
  link.download = 'want_history.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

// ---- 全件削除 ----
clearAllBtn.onclick = () => {
  if (confirm(tr('confirm-clear-all'))) {
    removePref(STORAGE_KEY);
    renderHistory();
  }
};

// ---- 履歴描画（イベント委譲） ----
function renderHistory() {
  const arr = loadHistory();
  // ソートはメモリ上のみ（storage への書き戻しなし）
  const sorted = arr.slice().sort(
    _sortMode === 'E'
      ? (a, b) => (b.E || 0) - (a.E || 0)
      : (a, b) => new Date(b.ts) - new Date(a.ts)
  );

  historyList.innerHTML = '';
  if (!sorted.length) {
    const empty = document.createElement('div');
    empty.style.color = 'var(--muted)';
    empty.textContent = tr('history-empty');
    historyList.appendChild(empty);
    return;
  }
  sorted.forEach((item) => {
    const el   = document.createElement('div'); el.className = 'hist-item';
    const top  = document.createElement('div'); top.className = 'hist-top';
    const meta = document.createElement('div'); meta.className = 'hist-meta';
    meta.textContent = new Date(item.ts).toLocaleString();

    const act     = document.createElement('div');
    const loadBtn = document.createElement('button');
    loadBtn.className       = 'btn-ghost btn-small';
    loadBtn.textContent     = tr('load-btn');
    loadBtn.dataset.action  = 'load';
    loadBtn.dataset.id      = item.id;
    const delBtn = document.createElement('button');
    delBtn.className       = 'btn-danger btn-small';
    delBtn.textContent     = tr('delete-btn');
    delBtn.dataset.action  = 'del';
    delBtn.dataset.id      = item.id;

    act.appendChild(loadBtn);
    act.appendChild(delBtn);
    top.appendChild(meta);
    top.appendChild(act);

    const memoEl = document.createElement('div');
    memoEl.className   = 'hist-memo';
    memoEl.textContent = item.memo || '';

    el.appendChild(top);
    el.appendChild(memoEl);
    historyList.appendChild(el);
  });
}

// イベント委譲: 履歴の読み込み・削除
historyList.addEventListener('click', (ev) => {
  const btn = ev.target.closest('button');
  if (!btn) return;
  const { action, id } = btn.dataset;

  if (action === 'load') {
    const arr  = loadHistory();
    const item = arr.find((x) => x.id === id);
    if (!item) return;

    Iinput.value = item.I;
    Cinput.value = item.C;
    kinput.value = item.k;

    const unit     = item.Tunit || 'day';
    const Tdays    = item.T;
    let   displayT = Tdays;
    if      (unit === 'week')  displayT = Tdays / 7;
    else if (unit === 'month') displayT = Tdays / 30;
    else if (unit === 'year')  displayT = Tdays / 365;
    Tinput.value = r(displayT, 2);
    Tunit.value  = unit;

    updateResult(compute({ I: item.I, T: item.T, C: item.C, k: item.k }));
    window.scrollTo({ top: 0, behavior: 'smooth' });

  } else if (action === 'del') {
    if (!confirm(tr('confirm-delete-item'))) return;
    const arr = loadHistory().filter((x) => x.id !== id);
    saveHistory(arr);
    renderHistory();
  }
});

// ---- ソート ----
function setSortMode(mode) {
  _sortMode = mode;
  savePref(SORT_MODE_KEY, mode);
  renderHistory();
  if (mode === 'E') {
    sortEBtn.classList.add('sort-active');
    sortTimeBtn.classList.remove('sort-active');
  } else {
    sortTimeBtn.classList.add('sort-active');
    sortEBtn.classList.remove('sort-active');
  }
}

sortEBtn.onclick    = () => setSortMode('E');
sortTimeBtn.onclick = () => setSortMode('time');

// 初期ソート（ボタン状態のみ同期 — renderHistory は initLang 内で 1 回呼ぶ）
(function initSortHistory() {
  if (_sortMode === 'E') {
    sortEBtn.classList.add('sort-active');
    sortTimeBtn.classList.remove('sort-active');
  } else {
    sortTimeBtn.classList.add('sort-active');
    sortEBtn.classList.remove('sort-active');
  }
})();

// ---- テーマ ----
function applyTheme(mode) {
  document.documentElement.classList.toggle('light', mode === 'light');
  savePref(THEME_KEY, mode);
  // 設定ボタンのアクティブ状態を更新
  const darkBtn  = qs('#themeDarkBtn');
  const lightBtn = qs('#themeLightBtn');
  if (darkBtn)  darkBtn.classList.toggle('active',  mode === 'dark');
  if (lightBtn) lightBtn.classList.toggle('active', mode === 'light');
}

(function initTheme() {
  const saved = loadPref(THEME_KEY);
  if (saved) {
    applyTheme(saved);
  } else {
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    applyTheme(prefersLight ? 'light' : 'dark');
  }
})();

// ---- 設定モーダル ----
(function initSettings() {
  const btn       = qs('#settingsBtn');
  const overlay   = qs('#settingsOverlay');
  const jaBtn     = qs('#langJaBtn');
  const enBtn     = qs('#langEnBtn');
  const darkBtn   = qs('#themeDarkBtn');
  const lightBtn  = qs('#themeLightBtn');
  if (!btn || !overlay) return;

  btn.addEventListener('click', () => overlay.classList.toggle('open'));
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('open');
  });

  if (darkBtn) darkBtn.addEventListener('click', () => {
    applyTheme('dark');
    if (lastResult) updateResult(lastResult);
  });
  if (lightBtn) lightBtn.addEventListener('click', () => {
    applyTheme('light');
    if (lastResult) updateResult(lastResult);
  });

  if (jaBtn) jaBtn.addEventListener('click', () => {
    applyLang('ja');
    overlay.classList.remove('open');
  });
  if (enBtn) enBtn.addEventListener('click', () => {
    applyLang('en');
    overlay.classList.remove('open');
  });
})();

// ---- 言語初期化（renderHistory はここで 1 回だけ呼ばれる） ----
(function initLang() {
  applyLang(_currentLang);
})();

// ---- PWA Service Worker 登録 ----
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => console.log('SW登録:', reg.scope))
      .catch((err) => console.warn('SW失敗:', err));
  });

  // ---- 更新通知バナー ----
  navigator.serviceWorker.addEventListener('message', (e) => {
    if (e.data?.type === 'SW_UPDATED') {
      const banner = document.getElementById('updateBanner');
      if (banner) {
        banner.style.display = 'flex';
        requestAnimationFrame(() => {
          banner.style.opacity = '1';
          banner.style.transform = 'translateX(-50%) translateY(0)';
        });
      }
    }
  });

  // 更新バナーの「今すぐ更新」ボタン
  const updateBannerBtn = document.getElementById('updateBannerBtn');
  if (updateBannerBtn) {
    updateBannerBtn.addEventListener('click', () => {
      sessionStorage.setItem('just_updated', '1');
      location.reload();
    });
  }
}

// ---- PWA インストール促進 ----
(function pwaInstall() {
  let deferredPrompt = null;
  const installBtn = qs('#installBtn');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) installBtn.style.display = 'inline-block';
  });

  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
      installBtn.style.display = 'none';
      if (outcome === 'accepted') showToast(tr('toast-install-success'), 'success');
    });
  }

  window.addEventListener('appinstalled', () => {
    if (installBtn) installBtn.style.display = 'none';
    deferredPrompt = null;
  });

  // iOS Safari 向け案内（スタンドアロンでない場合のみ）
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.navigator.standalone === true;
  if (isIos && !isStandalone && !loadPref('iosPromptShown')) {
    setTimeout(() => {
      showToast(tr('toast-ios-hint'), 'warn');
      savePref('iosPromptShown', 'true');
    }, 2000);
  }
})();

// ==== ステップ式チュートリアル ====
(function stepTutorial() {
  const tutBtn = qs('#tutorialBtn');
  if (tutBtn) {
    tutBtn.onclick = () => showTutorialDialog();
  }

  // 初回起動時のみ自動表示（ウェルカムポップアップ）
  const WELCOME_KEY = 'welcomeShown';
  if (!loadPref(WELCOME_KEY)) {
    showWelcomePopup();
  }

  function showWelcomePopup() {
    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
      position: 'fixed', inset: '0',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      background: 'rgba(0,0,0,0.55)', zIndex: '99999',
    });

    overlay.innerHTML = `
      <div style="
        background:var(--card); color:var(--text);
        padding:28px 24px; border-radius:16px;
        max-width:300px; width:88%; text-align:center;
        border:1px solid var(--accent);
        box-shadow:0 8px 32px rgba(0,0,0,0.5);
        animation:fadeInUp 0.3s ease;
      ">
        <div style="font-size:2rem;margin-bottom:10px;">🎉</div>
        <div style="font-weight:700;font-size:1.05rem;margin-bottom:10px;">Welcome to Want!</div>
        <div style="
          background:rgba(125,211,252,0.1);
          border:1px solid var(--accent);
          border-radius:10px;
          padding:12px 14px;
          margin-bottom:16px;
          font-size:0.95rem;
          line-height:1.7;
        ">
          ${tr('welcome-tutorial-hint')}<span style="
            display:inline-block;
            background:var(--accent);
            color:#042029;
            font-weight:700;
            padding:1px 8px;
            border-radius:6px;
            font-size:0.88rem;
          ">${tr('tutorial-btn')}</span>
          <br>
          <span style="font-size:0.88rem;color:var(--muted);">${tr('welcome-anytime')}</span>
        </div>
        <button id="welcomeOkBtn" style="
          width:100%; padding:10px;
          background:var(--accent); color:#042029;
          border:none; border-radius:10px;
          font-weight:700; font-size:1rem;
          cursor:pointer;
        ">${tr('welcome-ok')}</button>
      </div>
    `;

    // アニメーション
    const style = document.createElement('style');
    style.textContent = `@keyframes fadeInUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`;
    document.head.appendChild(style);

    document.body.appendChild(overlay);

    overlay.querySelector('#welcomeOkBtn').onclick = () => {
      overlay.style.transition = 'opacity 0.2s';
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 200);
      savePref(WELCOME_KEY, 'true');
    };
  }

  // ---- チュートリアル開始ダイアログ（共通化） ----
  function showTutorialDialog() {
    const dialog = document.createElement('div');
    Object.assign(dialog.style, {
      position: 'fixed', inset: '0', display: 'flex',
      flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
      background: 'rgba(0,0,0,0.6)', zIndex: '99999',
    });
    dialog.innerHTML = `
      <div style="background:var(--card);color:var(--text);padding:24px;border-radius:12px;max-width:300px;text-align:center;border:1px solid var(--accent);">
        <div style="margin-bottom:12px;font-weight:700;">${tr('tut-dialog-title')}</div>
        <div style="margin-bottom:12px;">${tr('tut-dialog-steps')}</div>
        <div style="margin-bottom:12px;">${tr('tut-dialog-note')}</div>
        <div style="height:8px;"></div>
        <div style="display:flex;gap:10px;justify-content:center;">
          <button id="tutYes" style="padding:8px 14px;background:var(--accent);color:#042029;border:none;border-radius:8px;font-weight:bold;">${tr('tut-yes')}</button>
          <button id="tutSkip" style="padding:8px 14px;background:transparent;border:1px solid var(--accent);color:var(--text);border-radius:8px;">${tr('tut-skip')}</button>
        </div>
      </div>
    `;
    document.body.appendChild(dialog);

    dialog.querySelector('#tutSkip').onclick = () => {
      savePref(TUTORIAL_KEY, 'true');
      dialog.remove();
    };
    dialog.querySelector('#tutYes').onclick = () => {
      dialog.remove();
      startTutorial();
    };
  }

  function startTutorial() {
    // ステップインデックス（i）を10段階にマッピング（12内部ステップ → 表示10）
    function getDisplayStepIndex(i) {
      if (i <= 7)  return i + 1;  // ①〜⑧-1 (0→1 … 7→8)
      if (i === 8) return 8;      // ⑧-2 → ステップ8
      if (i <= 10) return 9;      // ⑨-1, ⑨-2 → ステップ9
      return 10;                  // ⑩ (i=11)
    }
    const TOTAL_STEPS = 10;

    const steps = [
      { el: null,            msg: tr('tut-msg-0') },
      { el: null,            msg: tr('tut-msg-1') },
      { el: '#I',            msg: tr('tut-msg-2') },
      { el: '#T',            msg: tr('tut-msg-3') },
      { el: '#C',            msg: tr('tut-msg-4') },
      { el: '#k',            msg: tr('tut-msg-5') },
      { el: null,            msg: tr('tut-msg-6') },
      { el: '#C0',           msg: tr('tut-msg-7') },
      { el: '#calibrateBtn', msg: tr('tut-msg-8') },
      { el: '#income',       msg: tr('tut-msg-9') },
      { el: '#incomeBtn',    msg: tr('tut-msg-10') },
      { el: '#calcBtn',      msg: tr('tut-msg-11') },
    ];

    let index = 0;

    const mask = document.createElement('div');
    mask.className = 'tutorial-mask';
    Object.assign(mask.style, {
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      background: 'rgba(0,0,0,0.3)', zIndex: 99998, pointerEvents: 'none',
    });
    document.body.appendChild(mask);

    const bubble = document.createElement('div');
    bubble.className = 'tutorial-bubble';
    Object.assign(bubble.style, {
      position: 'fixed', width: '300px', padding: '16px',
      background: 'var(--card)', color: 'var(--text)',
      borderRadius: '12px', border: '1px solid var(--accent)',
      zIndex: 99999, textAlign: 'center',
      transition: 'top 0.2s ease,left 0.2s ease',
    });
    document.body.appendChild(bubble);

    function updateBubblePosition(el) {
      if (!el) return;
      const rect        = el.getBoundingClientRect();
      const bubbleWidth = bubble.offsetWidth || 300;
      const centerX     = rect.left + rect.width / 2;
      const top         = rect.bottom + 12;
      const left        = Math.min(Math.max(centerX, bubbleWidth / 2 + 8), window.innerWidth - bubbleWidth / 2 - 8);
      bubble.style.top       = `${Math.min(top, window.innerHeight - 120)}px`;
      bubble.style.left      = `${left}px`;
      bubble.style.transform = 'translateX(-50%)';
    }

    // スクロール・リサイズ追跡: チュートリアル中は1つのリスナーを維持
    let _currentEl = null;
    const reposition = () => { if (_currentEl) updateBubblePosition(_currentEl); };
    window.addEventListener('scroll', reposition, { passive: true });
    window.addEventListener('resize', reposition);

    function showStep(i) {
      const step = steps[i];
      if (!step) { endTutorial(); return; }

      const el = step.el ? qs(step.el) : null;
      if (step.el && !el) { nextStep(); return; }

      _currentEl = el;

      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('tutorial-highlight');
        updateBubblePosition(el);
      } else {
        bubble.style.top       = '50%';
        bubble.style.left      = '50%';
        bubble.style.transform = 'translate(-50%, -50%)';
      }

      const displayStep      = getDisplayStepIndex(i);
      const progressPercent  = (displayStep / TOTAL_STEPS) * 100;

      bubble.innerHTML = `
        <div style="margin-bottom:8px;font-weight:bold;">${tr('tut-step-label', displayStep, TOTAL_STEPS)}</div>
        <div style="height:6px;background:rgba(255,255,255,0.1);border-radius:3px;overflow:hidden;margin-bottom:8px;">
          <div style="width:${progressPercent}%;height:100%;background:var(--accent);transition:width 0.3s;"></div>
        </div>
        <div>${step.msg}</div>
        <div style="display:flex;justify-content:space-between;gap:8px;margin-top:10px;">
          <button id="prevStep" style="flex:1;${i === 0 ? 'opacity:0.4;pointer-events:none;' : ''}">${tr('tut-prev')}</button>
          <button id="nextStep" style="flex:1;">${i < steps.length - 1 ? tr('tut-next') : tr('tut-done')}</button>
        </div>
      `;

      bubble.querySelector('#nextStep').onclick = () => nextStep();
      bubble.querySelector('#prevStep').onclick = () => prevStep();
    }

    function nextStep() {
      const prev = qs(steps[index]?.el);
      if (prev) prev.classList.remove('tutorial-highlight');
      index++;
      if (index < steps.length) showStep(index);
      else endTutorial();
    }

    function prevStep() {
      if (index <= 0) return;
      const prev = qs(steps[index]?.el);
      if (prev) prev.classList.remove('tutorial-highlight');
      index--;
      showStep(index);
    }

    function endTutorial() {
      window.removeEventListener('scroll', reposition);
      window.removeEventListener('resize', reposition);
      _currentEl = null;
      bubble.remove();
      mask.remove();
      const last = qs(steps[index - 1]?.el);
      if (last) last.classList.remove('tutorial-highlight');
      savePref(TUTORIAL_KEY, 'true');
    }

    showStep(index);
  }
})();

// ---- 更新直後トースト ----
if (sessionStorage.getItem('just_updated') === '1') {
  sessionStorage.removeItem('just_updated');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  const t = document.createElement('div');
  t.textContent = tr('toast-updated');
  Object.assign(t.style, {
    position:'fixed', bottom:'24px', left:'50%', transform:'translateX(-50%) translateY(6px)',
    background:'var(--card)', border:'1.5px solid var(--accent)',
    color:'var(--text)', fontWeight:'600',
    padding:'10px 20px', borderRadius:'12px', fontSize:'0.9rem',
    boxShadow:'0 4px 16px rgba(0,0,0,0.4)', zIndex:'99999',
    opacity:'0', transition:'opacity 0.35s, transform 0.35s', pointerEvents:'none',
  });
  document.body.appendChild(t);
  requestAnimationFrame(() => {
    t.style.opacity = '1';
    t.style.transform = 'translateX(-50%) translateY(0)';
    setTimeout(() => {
      t.style.opacity = '0';
      t.style.transform = 'translateX(-50%) translateY(10px)';
      setTimeout(() => t.remove(), 400);
    }, 2200);
  });
}
