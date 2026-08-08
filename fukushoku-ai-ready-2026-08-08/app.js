(() => {
  "use strict";
  const L = window.Ready20260808;
  const main = document.getElementById("mainContent");
  const toastEl = document.getElementById("toast");
  const modalLayer = document.getElementById("modalLayer");
  const modalBody = document.getElementById("modalBody");
  const voicePlayer = document.getElementById("voicePlayer");
  let state = loadState();
  let toastTimer = 0;
  let bookManifest = null;
  let activeReader = null;
  let activeGame = null;

  function loadState() {
    try { return L.mergeState(JSON.parse(localStorage.getItem(L.STORAGE_KEY))); }
    catch (_) { return L.createState(); }
  }
  function saveState(message) {
    state.updatedAt = new Date().toISOString();
    try { localStorage.setItem(L.STORAGE_KEY, JSON.stringify(state)); } catch (_) {}
    if (message) toast(message);
  }
  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
  }
  function route() { return (location.hash.replace(/^#/, "").split("?")[0] || "home").toLowerCase(); }
  function navigate(target) { location.hash = target; }
  function toast(message) { clearTimeout(toastTimer); toastEl.textContent = message; toastEl.classList.add("show"); toastTimer = setTimeout(() => toastEl.classList.remove("show"), 3200); }
  function pageHead(kicker, title, text, action = "") { return `<header class="page-head"><div><span class="eyebrow">${escapeHtml(kicker)}</span><h1>${escapeHtml(title)}</h1><p>${escapeHtml(text)}</p></div>${action}</header>`; }
  function voiceButton(file, text, label = "声を聞く") { return `<button class="voice-button" type="button" data-voice="${escapeHtml(file)}" data-caption="${escapeHtml(text)}">♪ ${escapeHtml(label)}</button>`; }
  function playVoice(file, caption) {
    if (!state.voiceEnabled) { toast("音声はOFFです。画面の字幕をご利用ください。"); return; }
    voicePlayer.pause(); voicePlayer.src = file; voicePlayer.currentTime = 0;
    voicePlayer.play().catch(() => toast("音声を再生できませんでした。字幕をご利用ください。"));
    if (caption) toast(caption);
  }
  function closeModal() { modalLayer.hidden = true; modalBody.innerHTML = ""; voicePlayer.pause(); }
  function setCurrentNav() { document.querySelectorAll(".desktop-nav a").forEach(a => a.setAttribute("aria-current", a.hash === `#${route()}` ? "page" : "false")); }
  function metrics() { return L.metrics(state); }
  function kpis(m) { return `<div class="kpi-grid"><div class="kpi"><b>${m.percent}%</b><small>全体の体験目安</small></div><div class="kpi"><b>${m.videos}/${L.VIDEOS.length}</b><small>動画</small></div><div class="kpi"><b>${m.games}/${L.GAMES.length}</b><small>作業ゲーム</small></div><div class="kpi"><b>${m.diaryDays}/10</b><small>平日の日記</small></div><div class="kpi"><b>${m.commuteOnTime}/4</b><small>約束どおり到着</small></div><div class="kpi"><b>${m.reading}</b><small>読書した作品</small></div></div>`; }

  function renderHome() {
    const m = metrics();
    main.innerHTML = `<section class="hero"><div class="hero-copy"><span class="eyebrow">RETURN-TO-WORK PRACTICE · 2026</span><h1>復職準備を、<br><span>生活の中で試す。</span></h1><p>動画で学ぶ。ゲームで作業してみる。日記で翌日の疲労まで確かめる。図書館や通勤経路へ出て、机上だけでは分からない自分のリズムを見つけます。</p><div class="hero-actions"><a class="button primary" href="#today">今日のプランを見る</a><a class="button ghost" href="#about">デモの考え方</a></div></div><div class="hero-media"><img src="assets/scene-a.webp" alt="Dr.やまねことゆきちゃんが復職準備を案内するイラスト"><span class="version-badge">2026.08.08 EDITION</span></div></section>
      <section class="section"><div class="section-title"><div><span class="eyebrow">HYBRID PROGRAM</span><h2>6つの活動を、ひとつの振り返りへ</h2><p>得点ではなく、活動量・正確さ・疲労・翌日の状態の関係を見ます。</p></div></div><div class="hybrid-grid">${L.HYBRID.map(item => `<a class="hybrid-card" href="#${item[2]}"><span class="arrow">↗</span><span class="hybrid-icon">${item[3]}</span><h3>${escapeHtml(item[0])}</h3><p>${escapeHtml(item[1])}</p></a>`).join("")}</div></section>
      <section class="section character-strip"><img src="assets/scene-c.webp" alt="教材を案内するDr.やまねことゆきちゃん"><div class="character-copy"><span class="speaker">Dr.やまねこ</span><blockquote>「今日は何点だったか」より、「何分続けると、いつ疲れが出るか」を見つけよう。</blockquote>${voiceButton("voice/welcome-dr.wav", "今日は何点だったかより、何分続けると、いつ疲れが出るかを見つけよう。", "Dr.やまねこの案内")}</div></section>
      <section class="section"><div class="section-title"><div><span class="eyebrow">DEMO PROGRESS</span><h2>いまの体験状況</h2></div><a href="#progress">詳しく見る</a></div>${kpis(m)}<div class="panel top-gap"><div class="progress-track"><span style="width:${m.percent}%"></span></div><p class="muted small">プレゼン用表示の「5日目」「修了前」「修了例」で、記録が積み上がる様子をすぐに確認できます。</p></div></section>`;
  }

  function renderToday() {
    const m = metrics();
    const tasks = [
      ["learning", "▶", "短い動画を1本", m.videos ? `${m.videos}本視聴済み` : "疾病理解から始める"],
      ["games", "◎", "作業ゲームを1回", m.games ? `${m.games}種類を体験済み` : "まず単一課題でもOK"],
      ["diary", "✎", "体調と活動を記録", `${m.diaryDays}日分を保存済み`],
      ["books", "▥", "25分の読書", m.reading ? `${m.reading}作品に栞あり` : "休憩を含めて試す"],
    ];
    main.innerHTML = `${pageHead("TODAY", "きょうのプラン", "全部をこなす必要はありません。体調に合わせて1〜3個を選び、終わった後と翌日の疲労を記録します。", voiceButton("voice/welcome-yuki.wav", "全部やらなくて大丈夫。今日の体調に合わせて、ひとつ選んでみよう。", "ゆきちゃんから一言"))}
      <div class="two-col"><section class="panel"><h2>おすすめの流れ</h2><div class="task-list">${tasks.map(t => `<a class="task-row" href="#${t[0]}"><span class="round-icon">${t[1]}</span><span><b>${t[2]}</b><small class="muted" style="display:block">${t[3]}</small></span><span class="status">開く →</span></a>`).join("")}</div></section><section class="panel"><h2>休憩を予定に入れる</h2><p>25分活動したら5分休む、動画1本の後に目を閉じるなど、始める前に休憩を決めます。</p><div class="notice info"><b>中止してよいサイン</b><br>強い不安、めまい、動悸、頭痛、急な眠気などが出たら、ゲームや練習を止めて安全を優先してください。</div><div class="top-gap">${voiceButton("voice/rest-yuki.wav", "しんどさが増えたら、途中でも休んで大丈夫だよ。", "休憩の声かけ")}</div></section></div>
      <section class="section"><div class="section-title"><div><h2>今の積み上がり</h2></div></div>${kpis(m)}</section>`;
  }

  function renderLearning() {
    main.innerHTML = `${pageHead("VIDEO LEARNING", "動画で学ぶ", "疾病理解、セルフケア、復職知識を、Dr.やまねことゆきちゃんの対話で学びます。1本ずつ、疲れを確認しながら進めます。", voiceButton("voice/learn-dr.wav", "一度に覚えなくて大丈夫です。気になる動画を一本選びましょう。", "学び方を聞く"))}<div class="notice info"><b>この版の選定方針</b><br>疾病理解・セルフケア・コミュニケーションを中心に9本を収録しています。視聴履歴はこの端末内だけに残ります。</div><div class="content-grid top-gap">${L.VIDEOS.map(video => { const done = state.videos[video.id]?.completed; return `<article class="media-card"><div class="media-thumb"><span>${escapeHtml(video.tag)}</span><b>${video.no}</b></div><div class="media-body"><span class="tag">${escapeHtml(video.duration)}</span><h2>${escapeHtml(video.title)}</h2><p>${escapeHtml(video.note)}</p><div class="card-actions"><button class="button ${done ? "soft" : "primary"}" data-open-video="${video.id}">${done ? "もう一度見る" : "動画を見る"}</button>${done ? '<span class="completed-mark">✓ 視聴済み</span>' : ""}</div></div></article>`; }).join("")}</div>`;
  }
  function openVideo(id) {
    const video = L.VIDEOS.find(v => v.id === id); if (!video) return;
    modalBody.innerHTML = `<span class="eyebrow">VIDEO ${video.no}</span><h2 id="modalTitle">${escapeHtml(video.title)}</h2><p>${escapeHtml(video.note)}</p><video id="videoPlayer" class="video-player" controls playsinline preload="metadata"><source src="${encodeURI(video.file)}" type="video/mp4">お使いのブラウザでは動画を再生できません。</video><p class="micro">最後まで再生すると視聴済みになります。デモでは手動でも記録できます。</p><div class="form-actions"><button class="button primary" data-mark-video="${video.id}">視聴済みにする</button><button class="button ghost" data-close-modal>閉じる</button></div>`;
    modalLayer.hidden = false;
    document.getElementById("videoPlayer")?.addEventListener("ended", () => markVideo(id));
  }
  function markVideo(id) { state.videos[id] = { completed: true, completedAt: new Date().toISOString() }; saveState("動画の視聴を記録しました"); closeModal(); render(); }

  function renderGames() {
    main.innerHTML = `${pageHead("WORK SIMULATION", "作業ゲーム", "単調な検査ではなく、判断・記憶・割り込みを組み合わせた短い仕事風ミッションです。正確さと一緒に、終わった後の疲労を記録します。", voiceButton("voice/game-start-dr.wav", "まず練習モードでルールを確かめてから、二重課題へ進めます。", "ゲームの案内"))}<div class="notice"><b>得点は復職可否の判定に使いません。</b><br>同じゲームを、単一課題と二重課題で比べるためのデモです。途中で休む・やめる選択も記録の一部です。</div><div class="content-grid top-gap">${L.GAMES.map((game, index) => { const result = state.games[game.id]; return `<article class="game-card"><picture><img src="assets/scene-${["b","c","a"][index]}.webp" alt="Dr.やまねことゆきちゃんが${escapeHtml(game.title)}を案内"></picture><div class="game-body"><span class="tag">${escapeHtml(game.level)} · ${escapeHtml(game.time)}</span><h2>${escapeHtml(game.title)}</h2><p>${escapeHtml(game.description)}</p>${result ? `<div class="game-result"><b>前回：</b>正答率 ${escapeHtml(result.accuracy)}% ／ 疲労 ${escapeHtml(result.fatigue)}/5 ／ ${escapeHtml(result.mode)}</div>` : ""}<div class="card-actions"><button class="button primary" data-open-game="${game.id}">${result ? "もう一度挑戦" : "ミッション開始"}</button></div></div></article>`; }).join("")}</div>`;
  }
  function openGame(id) {
    const game = L.GAMES.find(g => g.id === id); if (!game) return;
    activeGame = id;
    const shell = document.createElement("section"); shell.className = "game-frame-shell"; shell.id = "gameShell";
    shell.innerHTML = `<div class="game-frame-bar"><b>${escapeHtml(game.title)}</b><button type="button" data-close-game>中断して戻る</button></div><iframe id="activeGameFrame" src="${game.file}" title="${escapeHtml(game.title)}"></iframe>`;
    document.body.appendChild(shell);
  }
  function closeGame() { document.getElementById("gameShell")?.remove(); activeGame = null; render(); }

  function renderDiary() {
    const selected = L.DAYS.find(d => d.date === state.selectedDay) || L.DAYS[0];
    const d = state.diaries[selected.date];
    main.innerHTML = `${pageHead("DAILY CHECK-IN", "日記：体調と翌日のつながり", "睡眠・活動・集中時間・夕方の疲労・翌朝の疲労を同じ画面で振り返ります。", voiceButton("voice/diary-yuki.wav", "よかった日も、しんどかった日も、そのまま残して大丈夫だよ。", "日記の声かけ"))}<div class="day-tabs">${L.DAYS.map(day => `<button class="day-tab ${day.date === selected.date ? "active" : ""} ${state.diaries[day.date].saved ? "done" : ""}" data-day="${day.date}">${day.label}<br>${day.weekday}</button>`).join("")}</div><form id="diaryForm" class="panel"><div class="field-grid"><label class="field">起床時刻<input type="time" name="wake" value="${escapeHtml(d.wake)}"></label><label class="field">就寝時刻<input type="time" name="bed" value="${escapeHtml(d.bed)}"></label><label class="field">睡眠時間<input type="number" min="0" max="16" step="0.1" name="sleep" value="${escapeHtml(d.sleep)}"><small>時間</small></label><label class="field">睡眠の質<select name="sleepQuality">${scaleOptions(d.sleepQuality, "低い", "よい")}</select></label><label class="field">朝の体調<select name="morningCondition">${scaleOptions(d.morningCondition, "低い", "よい")}</select></label><label class="field">集中できた時間<input type="number" min="0" max="600" name="focusMinutes" value="${escapeHtml(d.focusMinutes)}"><small>合計のおよその分数</small></label><label class="field full">今日行った活動<textarea name="activity" placeholder="例：動画1本、図書館で25分読書、散歩20分">${escapeHtml(d.activity)}</textarea></label><label class="field">夕方の疲労<select name="eveningFatigue">${scaleOptions(d.eveningFatigue, "少ない", "強い")}</select></label><label class="field">翌朝の疲労<select name="nextMorningFatigue"><option value="">翌朝に入力</option>${scaleOptions(d.nextMorningFatigue, "少ない", "強い")}</select></label><label class="field full">役立ったこと・回復につながったこと<textarea name="helpful" placeholder="例：25分で区切った、昼に10分横になった">${escapeHtml(d.helpful)}</textarea></label><label class="field full">自由メモ<textarea name="note">${escapeHtml(d.note)}</textarea></label></div><div class="form-actions"><button class="button primary" type="submit">この日を保存</button><a class="button ghost" href="#report">日記をレポートにつなぐ</a></div></form>`;
  }
  function scaleOptions(current, low, high) { return [1,2,3,4,5].map(n => `<option value="${n}" ${String(n) === String(current) ? "selected" : ""}>${n} — ${n===1?low:n===5?high:""}</option>`).join(""); }

  async function ensureManifest() {
    if (bookManifest) return bookManifest;
    const response = await fetch("books/manifest.json", { cache: "no-store" });
    if (!response.ok) throw new Error("manifest");
    bookManifest = await response.json(); return bookManifest;
  }
  function renderBooks() {
    main.innerHTML = `${pageHead("AOZORA READER", "図書館で読む", "青空文庫の著作権切れ作品を、AI Ready独自の読書画面で表示します。文字・行間・配色・縦横を調整し、栞をこの端末に保存できます。", voiceButton("voice/reader-yuki.wav", "読書は速さより、疲れずに続けられる時間を確かめてみよう。", "読書の案内"))}<div class="two-col"><div class="notice info"><b>読書練習の例</b><br>図書館へ移動 → 25分読む → 5分休憩 → 集中と疲労を日記へ。資格学習や専門教材は、別の正式な教材枠で扱う想定です。</div><div class="notice"><b>青空文庫からの収録</b><br>本文の字句は変更せず、Shift_JISからUTF-8へ変換し、ルビを保持しています。作品ごとに底本・入力・校正情報を表示します。</div></div><div id="bookGrid" class="content-grid top-gap"><div class="panel empty">作品情報を読み込んでいます…</div></div>`;
    ensureManifest().then(renderBookCards).catch(() => { const grid = document.getElementById("bookGrid"); if (grid) grid.innerHTML = '<div class="notice safety">作品データを読み込めませんでした。Webサーバー上で開いてください。</div>'; });
  }
  function renderBookCards(list) {
    const grid = document.getElementById("bookGrid"); if (!grid) return;
    grid.innerHTML = list.map(book => { const r = state.reading[book.id] || {}; return `<article class="book-card"><div class="book-body"><span class="tag">出典：青空文庫</span><h2>${escapeHtml(book.title)}</h2><div class="book-meta"><span>${escapeHtml(book.author)}</span><span>・</span><span>${r.progress ? `栞 ${Math.round(r.progress)}%` : "未読"}</span>${r.minutes ? `<span>・累計 ${escapeHtml(r.minutes)}分</span>` : ""}</div><p>${escapeHtml(book.description || book.notice || "著作権の保護期間を満了した日本文学作品です。")}</p>${book.notice ? `<div class="warning-chip">内容案内：${escapeHtml(book.notice)}</div>` : ""}<div class="card-actions"><button class="button primary" data-open-book="${escapeHtml(book.id)}">${r.progress ? "栞から読む" : "作品を開く"}</button><a class="button ghost small" href="${escapeHtml(book.cardUrl)}" target="_blank" rel="noopener">図書カード</a></div></div></article>`; }).join("");
  }
  async function openBook(id) {
    try {
      const list = await ensureManifest(); const book = list.find(b => b.id === id); if (!book) throw new Error("book");
      const bookPath = String(book.file || `${book.id}.json`).replace(/^\.\//, "");
      const response = await fetch(bookPath.startsWith("books/") ? bookPath : `books/${bookPath}`, { cache: "no-store" }); if (!response.ok) throw new Error("content");
      const data = await response.json(); const saved = state.reading[id] || {};
      activeReader = { id, book, started: Date.now(), progress: saved.progress || 0 };
      const baseText = String(book.baseText || "").replace(/^底本[：:]\s*/, "");
      const shell = document.createElement("section"); shell.className = "reader-shell"; shell.id = "readerShell";
      shell.innerHTML = `<div class="reader-toolbar"><button type="button" data-reader-close>← 戻る</button><h1>${escapeHtml(book.title)} — ${escapeHtml(book.author)}</h1><button type="button" data-reader-font="-">A−</button><button type="button" data-reader-font="+">A＋</button><select data-reader-theme aria-label="配色"><option value="sepia">生成り</option><option value="light">白</option><option value="night">夜</option></select><button class="reader-secondary" type="button" data-reader-writing>縦／横</button><div class="reader-progress"><span style="width:${activeReader.progress}%"></span></div></div><article id="readerContent" class="reader-content sepia"><aside class="reader-info"><b>作品情報</b><br>${escapeHtml(book.title)}／${escapeHtml(book.author)}<br>出典：<a href="${escapeHtml(book.cardUrl)}" target="_blank" rel="noopener">青空文庫 公式図書カード</a><br>底本：${escapeHtml(baseText)}<br>入力：${escapeHtml(book.inputBy)}　校正：${escapeHtml(book.proofBy)}　ファイル最終更新：${escapeHtml(book.lastUpdated)}<br>変換：${escapeHtml(book.transformation || "Shift_JISからUTF-8へ変換、ルビをHTML ruby要素で保持、本文の字句変更なし")}<br>取得日：2026-08-08<br><small>この表示は青空文庫の関与・公認を示すものではありません。</small></aside>${data.html || data.content || ""}</article><div class="reader-caption">25分を目安に、疲れを感じたら途中でも栞を保存して休みましょう。</div>`;
      document.body.appendChild(shell);
      const content = document.getElementById("readerContent");
      requestAnimationFrame(() => { if (saved.progress && !content.classList.contains("vertical")) content.scrollTop = (content.scrollHeight - content.clientHeight) * saved.progress / 100; });
      content.addEventListener("scroll", updateReaderProgress, { passive: true });
    } catch (_) { toast("作品を読み込めませんでした"); }
  }
  function updateReaderProgress() { const content = document.getElementById("readerContent"); if (!content || !activeReader) return; const max = Math.max(1, content.scrollHeight - content.clientHeight); activeReader.progress = Math.max(activeReader.progress, Math.min(100, content.scrollTop / max * 100)); const bar = document.querySelector(".reader-progress span"); if (bar) bar.style.width = `${activeReader.progress}%`; }
  function closeReader() { if (!activeReader) return; const old = state.reading[activeReader.id] || {}; const minutes = Math.max(1, Math.round((Date.now() - activeReader.started) / 60000)); state.reading[activeReader.id] = { progress: Math.max(old.progress || 0, activeReader.progress || 0), minutes: (old.minutes || 0) + minutes, completed: activeReader.progress >= 95 }; saveState("栞と読書時間を保存しました"); document.getElementById("readerShell")?.remove(); activeReader = null; render(); }

  function renderCommute() {
    const m = metrics();
    main.innerHTML = `${pageHead("COMMUTE PRACTICE", "通勤練習：4回の約束を試す", "職場と事前に決めた4回のうち、最低2回は約束した時間に約束どおり着けるかを試します。到着だけでなく、安全性と翌日の疲労まで記録します。", voiceButton("voice/commute-dr.wav", "到着時刻だけでなく、翌日に疲れが残るかまで確認しましょう。安全が最優先です。", "通勤練習の案内"))}<div class="goal-box"><div class="goal-num">${m.commuteOnTime}<small>/4</small></div><div><b>約束どおり到着できた回数</b><p>体験目安は最低2回。達しなくても失敗ではなく、時間帯や準備を見直す材料にします。</p></div></div><form id="commuteForm" class="panel top-gap"><div class="commute-table-wrap"><table class="commute-table"><thead><tr><th>回</th><th>約束日</th><th>約束時刻</th><th>実際の到着</th><th>結果</th><th>安全性</th><th>到着後疲労</th><th>翌日疲労</th></tr></thead><tbody>${state.commute.map((a,i) => `<tr><td><b>${i+1}回目</b></td><td><input type="date" name="plannedDate_${i}" value="${a.plannedDate}"></td><td><input type="time" name="plannedTime_${i}" value="${a.plannedTime}"></td><td><input type="time" name="actualTime_${i}" value="${a.actualTime}"></td><td><select name="result_${i}">${["未実施","約束どおり到着","遅れて到着","安全のため中止","日程を再調整"].map(v=>`<option ${v===a.result?"selected":""}>${v}</option>`).join("")}</select></td><td><select name="safe_${i}"><option value="">未入力</option>${["問題なし","途中で休憩","体調変化あり"].map(v=>`<option ${v===a.safe?"selected":""}>${v}</option>`).join("")}</select></td><td><select name="arrivalFatigue_${i}"><option value="">—</option>${scaleOptions(a.arrivalFatigue,"少","強")}</select></td><td><select name="nextDayFatigue_${i}"><option value="">—</option>${scaleOptions(a.nextDayFatigue,"少","強")}</select></td></tr><tr><td colspan="8"><label class="field">振り返りメモ<input name="memo_${i}" value="${escapeHtml(a.memo)}" placeholder="準備、交通状況、休憩、読書練習など"></label></td></tr>`).join("")}</tbody></table></div><div class="form-actions"><button class="button primary" type="submit">4回の記録を保存</button><a class="button ghost" href="#report">レポートで振り返る</a></div></form><div class="notice safety top-gap"><b>安全に関する注意</b><br>体調が不安定な日や移動に危険がある日は中止・再調整してください。GPSは使わず、本人が振り返りとして入力するデモです。</div>`;
  }

  function observations() {
    const diaries = Object.values(state.diaries).filter(d => d.saved);
    if (!diaries.length) return ["日記を数日記録すると、ここに睡眠・活動・翌日疲労の傾向が表示されます。"];
    const nums = key => diaries.map(d => Number(d[key])).filter(Number.isFinite);
    const avg = arr => arr.length ? (arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(1) : "—";
    const sleep = nums("sleep"), eve = nums("eveningFatigue"), next = nums("nextMorningFatigue"), focus = nums("focusMinutes");
    const out = [`${diaries.length}日分の平均睡眠 ${avg(sleep)}時間、平均集中時間 ${avg(focus)}分。`, `夕方の疲労 平均${avg(eve)}/5、入力のある翌朝の疲労 平均${avg(next)}/5。`];
    const high = diaries.filter(d => Number(d.eveningFatigue)>=4 && Number(d.nextMorningFatigue)>=4).length;
    if (high) out.push(`夕方・翌朝とも疲労4以上の日が${high}日あります。活動内容と休憩の入れ方を見比べられます。`);
    return out;
  }
  function renderReport() {
    const r = state.report, m = metrics();
    main.innerHTML = `${pageHead("REFLECTION REPORT", "再発予防レポート", "日記・作業・読書・通勤練習を見返し、再発につながりやすい条件と、自分で試せる対処策を整理します。外部への送信機能はありません。", voiceButton("voice/report-dr.wav", "うまくいかなかった日も大切なデータです。条件と対処を具体的に整理しましょう。", "レポートの案内"))}<div class="two-col"><form id="reportForm" class="panel"><span class="private-badge">🔒 このブラウザ内だけに保存</span><h2 class="top-gap">自分の振り返り</h2><div class="field-grid"><label class="field full">早めに気づきたいサイン<textarea name="warningSigns" placeholder="睡眠、朝の準備、集中、考え方など">${escapeHtml(r.warningSigns)}</textarea></label><label class="field full">調子を崩しやすかった条件・再発要因<textarea name="triggers">${escapeHtml(r.triggers)}</textarea></label><label class="field full">サインが出たときの対処策<textarea name="responses">${escapeHtml(r.responses)}</textarea></label><label class="field full">続けたい生活・セルフケア<textarea name="habits">${escapeHtml(r.habits)}</textarea></label><label class="field full">練習から分かったこと<textarea name="learned">${escapeHtml(r.learned)}</textarea></label><label class="field full">次に試す小さな一歩<textarea name="nextSteps">${escapeHtml(r.nextSteps)}</textarea></label></div><div class="form-actions"><button class="button primary" type="submit">レポートを保存</button><button class="button ghost" type="button" data-action="print-report">印刷プレビュー</button></div></form><aside><div class="panel"><h2>記録から見えること</h2><ul>${observations().map(x=>`<li>${escapeHtml(x)}</li>`).join("")}</ul><hr class="divider"><p><b>通勤練習：</b>${m.commuteDone}/4回実施、約束どおり ${m.commuteOnTime}/4回</p><p><b>作業ゲーム：</b>${m.games}/3種類</p><p><b>読書：</b>${m.reading}作品に記録</p></div><div class="notice top-gap"><b>AIの扱い</b><br>このデモの自動要約は、入力内容の並べ替えと簡単な集計です。診断・治療・復職可否の判定は行いません。</div></aside></div>${r.saved ? reportPreview() : ""}`;
  }
  function reportPreview() { const r=state.report; return `<section class="report-preview section" id="reportPreview"><span class="eyebrow">PERSONAL REFLECTION · ${L.VERSION}</span><h2>復職準備・再発予防 振り返りレポート</h2><dl><dt>早期サイン</dt><dd>${escapeHtml(r.warningSigns)||"未記入"}</dd><dt>再発要因</dt><dd>${escapeHtml(r.triggers)||"未記入"}</dd><dt>対処策</dt><dd>${escapeHtml(r.responses)||"未記入"}</dd><dt>続けたい習慣</dt><dd>${escapeHtml(r.habits)||"未記入"}</dd><dt>練習で分かったこと</dt><dd>${escapeHtml(r.learned)||"未記入"}</dd><dt>次の一歩</dt><dd>${escapeHtml(r.nextSteps)||"未記入"}</dd></dl><p class="micro">本人の振り返りを支援するデモ資料です。医学的判断や復職可否の証明ではありません。外部への自動送信はありません。</p></section>`; }

  function renderProgress() {
    const m=metrics(); const commuteGoal=m.commuteOnTime>=2;
    const rows = [["動画視聴",m.videos,L.VIDEOS.length,"#learning"],["作業ゲーム",m.games,L.GAMES.length,"#games"],["平日の日記",m.diaryDays,10,"#diary"],["通勤練習",m.commuteDone,4,"#commute"],["読書した作品",m.reading,2,"#books"],["振り返りレポート",state.report.saved?1:0,1,"#report"]];
    main.innerHTML=`${pageHead("PROGRESS", "進み具合", "完璧さではなく、複数の活動を試し、疲労と翌日の影響まで記録できたかを一覧にします。")} ${kpis(m)}<section class="panel top-gap"><h2>活動別の記録</h2><div class="task-list">${rows.map(x=>{const pct=Math.min(100,Math.round(x[1]/x[2]*100));return `<a class="task-row" href="${x[3]}"><span class="round-icon">${pct===100?"✓":"·"}</span><span style="flex:1"><b>${x[0]}　${x[1]}/${x[2]}</b><span class="progress-track" style="display:block;margin-top:6px"><span style="width:${pct}%"></span></span></span></a>`}).join("")}</div></section><div class="two-col top-gap"><section class="panel"><h2>通勤練習の体験目安</h2><p class="${commuteGoal?"completed-mark":"muted"}">${commuteGoal?"✓ 4回中2回以上、約束どおりの到着を記録":"現在は約束どおりの到着が"+m.commuteOnTime+"回"}</p><p class="small muted">回数だけでなく、到着後と翌日の疲労、安全に移動できたかを一緒に見ます。</p></section><section class="panel"><h2>修了表示の意味</h2><p>このデモでの修了は「設定した準備活動を実施し、振り返った」という意味です。就業可能性や医学的回復を証明するものではありません。</p></section></div>`;
  }

  function renderAbout() {
    main.innerHTML = `${pageHead("ABOUT THIS DEMO", "このデモについて", "2026年8月8日時点の研究・プレゼン用プロトタイプです。実際の医療、緊急対応、雇用判断を代替しません。")}<div class="two-col"><section class="panel"><h2>安全設計</h2><ul><li>入力はブラウザのlocalStorage内だけに保存</li><li>GPS、カメラ、マイクは使用しない</li><li>ゲームの得点で復職可否を判定しない</li><li>体調不良時は途中で中止できる</li><li>青空文庫本文はサイト内に同梱し、閲覧時に外部送信しない</li></ul><div class="notice safety"><b>緊急時</b><br>生命の危険、強い自傷他害のおそれ、急激な体調悪化がある場合は、このデモへの入力を待たず、119・110、医療機関、事前に決めた緊急連絡先へ直接連絡してください。</div></section><section class="panel"><h2>キャラクターと音声</h2><div class="character-strip" style="display:block"><img src="assets/scene-a.webp" alt="Dr.やまねことゆきちゃん" style="height:190px"><div class="character-copy"><p><b>Dr.やまねこ</b>：VOICEVOX:ずんだもん<br><b>ゆきちゃん</b>：VOICEVOX:四国めたん</p><p class="micro">VOICEVOXで事前生成した音声を使用しています。実行時に外部音声サービスへ接続しません。VOICEVOXおよび音声ライブラリのキャラクターと、本デモのDr.やまねこ・ゆきちゃんは別のキャラクターです。</p><button class="button soft" data-action="toggle-voice">音声を${state.voiceEnabled?"OFF":"ON"}にする</button></div></div></section></div><section class="panel section"><h2>青空文庫の収録について</h2><p>著作権の保護期間を満了した作品を、青空文庫の取り扱い規準に沿って収録しています。作品ごとの公式カード、底本、入力者、校正者、ファイル更新日、変換履歴は読書画面に表示します。本デモは青空文庫の関与・公認を示すものではありません。</p><p><a href="https://www.aozora.gr.jp/guide/kijyunn.html" target="_blank" rel="noopener">青空文庫 収録ファイルの取り扱い規準</a></p></section><section class="panel section"><h2>疾病理解・SST・資格学習の教材枠</h2><p>青空文庫とは分けて、現行の公的資料、専門家監修教材、正式に利用許諾された教材を掲載する設計です。教材ごとに版、監修者、更新日、対象、出典、許諾範囲を管理します。</p></section>`;
  }

  function render() {
    closeModal();
    const views = { home:renderHome, today:renderToday, learning:renderLearning, games:renderGames, diary:renderDiary, books:renderBooks, commute:renderCommute, report:renderReport, progress:renderProgress, about:renderAbout };
    (views[route()] || renderHome)(); setCurrentNav();
    document.getElementById("mobileMenu").hidden = true; document.getElementById("menuButton").setAttribute("aria-expanded","false");
    document.getElementById("demoStateLabel").textContent = ({start:"最初から",mid:"5日目",near:"修了前",complete:"修了例",custom:"操作中"})[state.profile] || "操作中";
    main.focus({ preventScroll:true }); window.scrollTo({ top:0, behavior:"auto" });
  }

  document.addEventListener("click", event => {
    const profile = event.target.closest("[data-profile]"); if (profile) { state=L.sampleState(profile.dataset.profile); saveState("表示例を切り替えました"); render(); return; }
    const video = event.target.closest("[data-open-video]"); if (video) return openVideo(video.dataset.openVideo);
    const mark = event.target.closest("[data-mark-video]"); if (mark) return markVideo(mark.dataset.markVideo);
    const game = event.target.closest("[data-open-game]"); if (game) return openGame(game.dataset.openGame);
    if (event.target.closest("[data-close-game]")) return closeGame();
    const book = event.target.closest("[data-open-book]"); if (book) return openBook(book.dataset.openBook);
    if (event.target.closest("[data-reader-close]")) return closeReader();
    const font = event.target.closest("[data-reader-font]"); if (font) { const c=document.getElementById("readerContent"); const size=parseFloat(getComputedStyle(c).fontSize); c.style.fontSize=`${Math.max(14,Math.min(32,size+(font.dataset.readerFont==="+"?2:-2)))}px`; return; }
    if (event.target.closest("[data-reader-writing]")) { document.getElementById("readerContent")?.classList.toggle("vertical"); return; }
    const voice = event.target.closest("[data-voice]"); if (voice) return playVoice(voice.dataset.voice, voice.dataset.caption);
    if (event.target.closest("[data-close-modal]")) return closeModal();
    const day = event.target.closest("[data-day]"); if (day) { state.selectedDay=day.dataset.day; state.profile="custom"; saveState(); renderDiary(); return; }
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (action === "print-report") return window.print();
    if (action === "toggle-voice") { state.voiceEnabled=!state.voiceEnabled; saveState(state.voiceEnabled?"音声をONにしました":"音声をOFFにしました"); render(); }
  });
  document.addEventListener("change", event => {
    if (event.target.matches("[data-reader-theme]")) { const c=document.getElementById("readerContent"); c.classList.remove("light","night","sepia"); c.classList.add(event.target.value); }
  });
  document.addEventListener("submit", event => {
    if (event.target.id === "diaryForm") { event.preventDefault(); const data=Object.fromEntries(new FormData(event.target)); data.saved=true; state.diaries[state.selectedDay]=data; state.profile="custom"; saveState("日記を保存しました"); renderDiary(); }
    if (event.target.id === "commuteForm") { event.preventDefault(); const data=new FormData(event.target); state.commute=state.commute.map((a,i)=>Object.assign({},a,{plannedDate:data.get(`plannedDate_${i}`),plannedTime:data.get(`plannedTime_${i}`),actualTime:data.get(`actualTime_${i}`),result:data.get(`result_${i}`),safe:data.get(`safe_${i}`),arrivalFatigue:data.get(`arrivalFatigue_${i}`),nextDayFatigue:data.get(`nextDayFatigue_${i}`),memo:data.get(`memo_${i}`)})); state.profile="custom"; saveState("通勤練習を保存しました"); renderCommute(); }
    if (event.target.id === "reportForm") { event.preventDefault(); state.report=Object.assign(Object.fromEntries(new FormData(event.target)),{saved:true}); state.profile="custom"; saveState("レポートを保存しました"); renderReport(); setTimeout(()=>document.getElementById("reportPreview")?.scrollIntoView({behavior:"smooth"}),50); }
  });
  window.addEventListener("message", event => {
    const data=event.data; const frame=document.getElementById("activeGameFrame");
    if (!data || data.type!=="AI_READY_GAME_RESULT" || !frame || event.source!==frame.contentWindow || data.gameId!==activeGame) return;
    state.games[activeGame]={score:Number(data.score)||0,accuracy:Number(data.accuracy)||0,reactionMs:Number(data.reactionMs)||0,fatigue:Number(data.fatigue)||0,mode:String(data.mode||"standard"),playedAt:new Date().toISOString()}; state.profile="custom"; saveState("ゲーム結果と疲労を記録しました"); closeGame();
  });
  modalLayer.addEventListener("click", event => { if (event.target===modalLayer) closeModal(); });
  document.getElementById("modalClose").addEventListener("click",closeModal);
  document.getElementById("menuButton").addEventListener("click", event => { const menu=document.getElementById("mobileMenu"); menu.hidden=!menu.hidden; event.currentTarget.setAttribute("aria-expanded",String(!menu.hidden)); });
  window.addEventListener("hashchange",render);
  window.addEventListener("beforeunload",() => { if(activeReader) closeReader(); });
  render();
})();
