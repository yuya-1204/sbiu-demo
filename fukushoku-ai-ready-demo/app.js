(function () {
  "use strict";

  const Logic = window.DemoLogic;
  const main = document.getElementById("mainContent");
  const lessonDialog = document.getElementById("lessonDialog");
  const lessonContent = document.getElementById("lessonContent");
  const completeLessonButton = document.getElementById("completeLessonButton");
  const gameDialog = document.getElementById("gameDialog");
  const toastElement = document.getElementById("toast");
  const routeAnnouncement = document.getElementById("routeAnnouncement");
  const mobileMenu = document.getElementById("mobileMenu");
  const menuButton = document.getElementById("menuButton");

  const PROFILE_LABELS = {
    start: "初期状態",
    mid: "実施中（疑似データ）",
    near: "修了直前（疑似データ）",
    complete: "修了後（疑似データ）",
  };

  const ROUTE_TITLES = {
    home: "トップ",
    consent: "利用開始前の説明・同意",
    "participant-dashboard": "本人用ダッシュボード",
    daily: "毎日の記録",
    learning: "自己学習動画",
    games: "必須ゲーム",
    reflection: "最終振り返り・面談準備",
    decision: "産業医面談の最終意思確認",
    result: "修了結果",
    company: "企業担当者用ダッシュボード",
    "company-detail": "利用者の共有要約",
    verify: "修了証明書の確認",
    certificate: "修了証明書",
    "open-learning": "全従業員向け情報提供",
  };

  const LESSONS = {
    1: {
      title: "復職 AI Ready（アイレディ）の目的と注意点",
      duration: "約5分",
      pages: [
        ["このプログラムの役割", "産業医面談の前に、生活リズム、通勤訓練、職場へ相談したいことを14日間で整理します。通勤訓練は1回以上の実施が修了条件です。復職できるかどうかを判定するものではありません。"],
        ["記録の扱い", "本人はすべての記録を確認できます。会社には、実施日数などの必須要約と、本人が個別に共有を選んだ内容だけを表示します。"],
        ["安全に関する注意", "入力内容はリアルタイムで確認されません。体調の急変や危険を感じるときは、主治医、登録した連絡先、119・110などへ直接連絡してください。"],
      ],
    },
    7: {
      title: "産業医面談の準備と最終意思確認",
      duration: "約7分",
      pages: [
        ["面談前にそろえること", "記録、1回以上の通勤訓練、配慮してほしい事項、確認したい質問を短い言葉でまとめます。病名のアプリ入力は必須ではありません。"],
        ["最終意思を選ぶ", "産業医面談予定日の5～3日前を目安に、正式申込み、延期、中止のいずれかを本人が選びます。日数は当面、カレンダー上の日数で扱います。"],
        ["正式申込みの流れ", "アプリで会社へ申込みを登録し、会社から産業医へ最終依頼する想定です。申込み後に実際の面談や復職ができたかどうかは、プログラム修了の条件に含みません。"],
      ],
    },
  };

  let memoryState = null;
  let state = loadState();
  let activeLesson = null;
  let activeGame = null;
  let pendingDecision = null;
  let lastVerification = null;
  let lastRoute = null;
  let toastTimer = null;

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#039;",
    })[character]);
  }

  function loadState() {
    try {
      const saved = window.localStorage.getItem(Logic.STORAGE_KEY);
      return Logic.normalizeState(saved ? JSON.parse(saved) : null);
    } catch (error) {
      return memoryState ? Logic.normalizeState(memoryState) : Logic.createInitialState();
    }
  }

  function saveState() {
    memoryState = Logic.clone(state);
    try {
      window.localStorage.setItem(Logic.STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      // file:// restrictions or private browsing can block storage. The in-memory demo still works.
    }
    updateDemoStateLabel();
  }

  function markCustom() {
    state.profile = "custom";
  }

  function updateDemoStateLabel() {
    const label = document.getElementById("demoStateLabel");
    if (label) label.textContent = PROFILE_LABELS[state.profile] || "操作中";
  }

  function routeName() {
    const hash = window.location.hash.replace(/^#/, "");
    return (hash.split("?")[0] || "home").toLowerCase();
  }

  function navigate(route) {
    const target = `#${route}`;
    if (window.location.hash === target) render();
    else window.location.hash = target;
  }

  function toast(message) {
    window.clearTimeout(toastTimer);
    toastElement.textContent = message;
    toastElement.classList.add("show");
    toastTimer = window.setTimeout(() => toastElement.classList.remove("show"), 3200);
  }

  function option(value, current, label) {
    return `<option value="${escapeHtml(value)}"${String(value) === String(current) ? " selected" : ""}>${escapeHtml(label == null ? value : label)}</option>`;
  }

  function radio(name, value, current, label) {
    return `<label class="choice"><input type="radio" name="${escapeHtml(name)}" value="${escapeHtml(value)}"${String(value) === String(current) ? " checked" : ""} required><span>${escapeHtml(label || value)}</span></label>`;
  }

  function statusClass(status) {
    if (/修了/.test(status) && !/未修了/.test(status)) return "complete";
    if (/実施中|開始前/.test(status)) return "active";
    if (/延期|未修了/.test(status)) return "warning";
    return "stopped";
  }

  function completionList(progress) {
    return `<ul class="check-list">${progress.items.map((item) => `
      <li class="check-item${item.done ? " done" : ""}">
        <span class="check-symbol" aria-hidden="true">✓</span>
        <span>${escapeHtml(item.label)}</span>
        <span class="check-value">${escapeHtml(item.value)}</span>
      </li>`).join("")}</ul>`;
  }

  function participantSideNav(current) {
    const progress = Logic.completion(state);
    let links = [
      ["participant-dashboard", "ホーム", state.consented],
      ["daily", "毎日の記録", progress.completedDays >= 8],
      ["learning", "自己学習動画", progress.videosDone === 7],
      ["games", "必須ゲーム", progress.gamesDone === 3],
      ["reflection", "振り返り・面談準備", state.finalReflectionSaved && state.interviewPrepSaved],
      ["decision", "最終意思確認", Boolean(state.decision)],
      ["result", "修了結果", progress.complete],
    ];
    if (state.decision === "cancel") {
      links = [
        ["participant-dashboard", "ホーム", true],
        ["result", "利用結果", false],
        ["open-learning", "任意の情報提供動画", false],
      ];
    }
    return `<nav class="side-nav" aria-label="本人用メニュー"><strong>佐藤みらい さん</strong>${links.map(([route, label, done]) => `
      <a href="#${route}"${current === route ? ' aria-current="page"' : ""}>
        <span>${escapeHtml(label)}</span>${done ? '<span class="nav-status" aria-label="完了">✓</span>' : ""}
      </a>`).join("")}</nav>`;
  }

  function participantPage(current, content, className) {
    return `<section class="page soft ${className || ""}"><div class="participant-shell">${participantSideNav(current)}<div>${content}</div></div></section>`;
  }

  function renderHome() {
    return `
      <section class="hero">
        <div class="hero-grid">
          <div>
            <span class="eyebrow">企業向け操作デモ</span>
            <h1>復職 AI Ready（アイレディ）<span>産業医面談前の14日間を、本人と会社の共通準備に。</span></h1>
            <p class="hero-copy">生活リズムの記録、1回以上の通勤訓練、自己学習、面談準備を一つの流れにまとめたデモです。復職可否の判定ではなく、本人の準備と最終意思確認を支えます。</p>
            <div class="hero-actions">
              <a class="button primary" href="#consent">本人用デモを始める</a>
              <a class="button secondary" href="#company">企業担当者用デモを見る</a>
            </div>
          </div>
          <aside class="hero-note" aria-label="プログラム概要">
            <strong><span class="visually-hidden">14</span>日間の準備期間</strong>
            <p>平日10日のうち8日以上、朝と夕方を記録。土日は任意です。</p>
          </aside>
        </div>
      </section>

      <section class="section" aria-labelledby="entryTitle">
        <span class="eyebrow">DEMO ENTRANCE</span>
        <h2 id="entryTitle">見たい立場から入れます</h2>
        <p class="section-lead">ログインは省略しています。上部の「デモ状態」を切り替えると、説明の場で14日間を待たずに各段階を確認できます。</p>
        <div class="entry-grid">
          <a class="entry-card" href="#consent"><span class="entry-icon" aria-hidden="true">本人</span><h3>本人用デモ</h3><p>同意、毎日の記録、動画、ゲーム、面談申込みまで操作します。</p><span>体験を始める →</span></a>
          <a class="entry-card" href="#company"><span class="entry-icon" aria-hidden="true">企業</span><h3>企業担当者用</h3><p>5人の架空利用者と、本人が共有した要約だけを確認します。</p><span>管理画面を見る →</span></a>
          <a class="entry-card" href="#verify"><span class="entry-icon" aria-hidden="true">証明</span><h3>修了証明書確認</h3><p>有効期間内と期限経過後、両方の確認結果を試せます。</p><span>番号を確認する →</span></a>
          <a class="entry-card" href="#open-learning"><span class="entry-icon" aria-hidden="true">学習</span><h3>全従業員向け動画</h3><p>休職中・休職していない人にも開放する任意教材の入口です。</p><span>教材を見る →</span></a>
        </div>
      </section>

      <section class="section tint" aria-labelledby="flowTitle">
        <span class="eyebrow">14-DAY FLOW</span>
        <h2 id="flowTitle">会社の案内から、面談の正式申込みまで</h2>
        <div class="flow" aria-label="利用の流れ">
          <div class="flow-step"><span class="flow-dot"></span><strong>会社から案内</strong><small>診断書提出済みを確認</small></div>
          <div class="flow-step"><span class="flow-dot"></span><strong>本人が開始</strong><small>説明・同意後に記録</small></div>
          <div class="flow-step highlight"><span class="flow-dot"></span><strong>14日間の準備</strong><small>記録・通勤訓練・動画・ゲーム</small></div>
          <div class="flow-step"><span class="flow-dot"></span><strong>最終意思確認</strong><small>予定日の5～3日前</small></div>
          <div class="flow-step"><span class="flow-dot"></span><strong>会社へ申込み</strong><small>会社から産業医へ依頼</small></div>
        </div>
        <div class="important-note top-gap">
          <strong>解決したいこと</strong>
          <p>産業医面談予定日の5～3日前に本人の意思を最終確認し、不要な産業医の追加訪問や直前キャンセルの減少を目指します。さらに、万が一、短期間で再休職となった際には、通所リワークを勧める流れを事前に類似の仕組みで経験してもらい、分かりやすく伝えることで、次の支援へスムーズにつなげます。</p>
        </div>
      </section>

      <section class="section" aria-labelledby="scopeTitle">
        <div class="two-column">
          <div class="panel">
            <span class="eyebrow">このデモで扱うこと</span>
            <h2 id="scopeTitle">準備の見える化</h2>
            <ul class="summary-list">
              <li>朝・夕の記録と生活リズムの要約</li>
              <li>修了条件となる通勤訓練を1回以上</li>
              <li>日中の任意のおすすめ事項</li>
              <li>必須動画7本、必須ゲーム3種</li>
              <li>面談準備、共有範囲、最終意思確認</li>
              <li>修了証明書と企業向け確認ページ</li>
            </ul>
          </div>
          <div class="panel">
            <span class="eyebrow">対応しないこと</span>
            <h2>医療判断・緊急対応</h2>
            <ul class="summary-list">
              <li>復職可否や症状の医学的判定</li>
              <li>記録のリアルタイム監視</li>
              <li>緊急時の自動連絡や常時相談対応</li>
              <li>ゲームの点数・成績による修了判定</li>
            </ul>
            <div class="warning-note top-gap"><strong>研修修了後の想定</strong><p>有効期間は暫定1年6か月です。その期間内の再履修・修了証明書の再発行は原則行わず、短期間で再休職となった場合は通所リワークを推奨します。</p></div>
          </div>
        </div>
      </section>`;
  }

  function renderConsent() {
    const agreed = state.consented;
    return `<section class="page narrow soft">
      <div class="page-head"><div><span class="eyebrow">本人用デモ｜利用開始</span><h1 class="page-title">説明を確認してから始めます</h1><p class="lead">架空の利用者「佐藤みらい」として操作します。病名は画面に表示しません。</p></div></div>
      ${agreed ? '<div class="success-note bottom-gap"><strong>説明・同意は登録済みです。</strong><p>このデモ端末の中だけに保存されています。</p></div>' : ""}
      <form id="consentForm" class="panel">
        <h2>確認する4つのこと</h2>
        <div class="stack consent-list">
          <label class="check-card"><input type="checkbox" name="consent_medical"${agreed ? " checked" : ""}><span><strong>医療的な判断を行わない</strong><small>復職可否、回復の程度、治療方針をこのサービスが判定することはありません。</small></span></label>
          <label class="check-card"><input type="checkbox" name="consent_monitoring"${agreed ? " checked" : ""}><span><strong>リアルタイムで確認されない</strong><small>入力は緊急連絡ではありません。危険を感じるときは主治医、連絡先、119・110へ直接連絡します。</small></span></label>
          <label class="check-card"><input type="checkbox" name="consent_sharing"${agreed ? " checked" : ""}><span><strong>会社へ必須要約を共有する</strong><small>実施日数、生活リズム要約、通勤訓練、修了・面談申込状況は会社へ共有されます。</small></span></label>
          <label class="check-card"><input type="checkbox" name="consent_stop"${agreed ? " checked" : ""}><span><strong>いつでも中断・中止できる</strong><small>開始後も本人の意思で止められます。中断・中止だけを理由に復職可否を決めるものではありません。</small></span></label>
        </div>
        <div class="warning-note top-gap"><strong>体調の急変・生命の危険があるとき</strong><p>この画面への入力を待たず、主治医や医療機関、事前に決めた連絡先へ連絡してください。緊急時は119・110を利用してください。</p></div>
        <div class="form-actions"><a class="button secondary" href="#home">戻る</a><button class="button primary" id="consentStartButton" type="submit"${agreed ? "" : " disabled"}>同意して14日間を始める</button></div>
      </form>
    </section>`;
  }

  function renderParticipantDashboard() {
    const progress = Logic.completion(state);
    const status = Logic.participantStatus(state);
    const doneCount = progress.items.filter((item) => item.done).length;
    const nextRoute = !state.consented ? "consent" : state.decision === "cancel" ? "open-learning" : progress.complete ? "result" : progress.completedDays < 8 || progress.commuteDays < 1 ? "daily" : progress.videosDone < 7 ? "learning" : progress.gamesDone < 3 ? "games" : (!state.finalReflectionSaved || !state.interviewPrepSaved) ? "reflection" : "decision";
    const nextLabel = !state.consented ? "説明・同意を確認する" : state.decision === "cancel" ? "任意動画を見る" : progress.complete ? "修了結果を見る" : progress.readyBeforeDecision ? "最終意思を登録する" : "次の準備へ進む";
    return participantPage("participant-dashboard", `
      <div class="page-head"><div><span class="eyebrow">本人用デモ</span><h1 class="page-title">おはようございます、佐藤みらいさん</h1><p class="lead">30代・事務職｜復職可能の診断書を会社へ提出済み（架空データ）</p></div><div class="page-head-actions"><span class="status-chip ${statusClass(status)}">${escapeHtml(status)}</span></div></div>
      ${!state.consented ? '<div class="important-note bottom-gap"><strong>まず、利用開始前の説明・同意が必要です。</strong><p>デモ用プロフィールの切替では、途中や修了時点へ直接移動することもできます。</p></div>' : ""}
      <div class="metric-grid">
        <div class="metric"><span class="metric-label">朝・夕を記録した平日</span><span class="metric-value">${progress.completedDays}<small>/10日</small></span><span class="metric-help">修了条件は8日以上</span></div>
        <div class="metric"><span class="metric-label">通勤訓練</span><span class="metric-value">${progress.commuteDays}<small>/1回以上</small></span><span class="metric-help">修了条件</span></div>
        <div class="metric"><span class="metric-label">自己学習動画</span><span class="metric-value">${progress.videosDone}<small>/7本</small></span><span class="metric-help">7種類を1回ずつ</span></div>
        <div class="metric"><span class="metric-label">必須ゲーム</span><span class="metric-value">${progress.gamesDone}<small>/3種</small></span><span class="metric-help">点数・成績は不問</span></div>
        <div class="metric"><span class="metric-label">修了条件</span><span class="metric-value">${doneCount}<small>/${progress.items.length}項目</small></span><span class="metric-help">正式申込みまで</span></div>
      </div>
      <div class="panel top-gap">
        <div class="two-column">
          <div><span class="eyebrow">現在の進捗</span><h2>修了までの確認</h2><div class="progress-track" aria-label="修了条件の進捗"><div class="progress-bar green" style="width:${Math.round(doneCount / progress.items.length * 100)}%"></div></div>${completionList(progress)}</div>
          <div><span class="eyebrow">面談予定</span><h2>産業医面談予定日</h2><p class="schedule-date">デモ開始時点で あと14日</p><p>予定日の5～3日前を目安に、正式申込み・延期・中止を選びます。日付切替は操作説明用の疑似日付です。</p><a class="button primary" href="#${nextRoute}">${nextLabel}</a></div>
        </div>
      </div>
      ${state.decision === "cancel" ? '<div class="panel top-gap"><span class="eyebrow">利用中止後</span><h2>任意の情報提供動画を利用できます</h2><p>復職準備コースの記録・必須課題は閉じています。再開する場合は、会社から改めて案内を受ける想定です。</p><div class="form-actions"><a class="button primary" href="#open-learning">任意動画を見る</a><a class="button secondary" href="#result">利用結果を確認</a></div></div>' : `<div class="card-grid">
        <div class="card action-card"><span class="card-kicker">毎日 約20分×2回</span><h3>朝と夕方の記録</h3><p>好きな日へ切り替えて、14日間の操作を短時間で確認できます。</p><a class="button friendly" href="#daily">記録する</a></div>
        <div class="card action-card"><span class="card-kicker">必須7本</span><h3>自己学習動画</h3><p>デモでは1・7を視聴可能にし、ほかは準備中または疑似履歴で表示します。</p><a class="button friendly" href="#learning">動画を見る</a></div>
        <div class="card action-card"><span class="card-kicker">最終ステップ</span><h3>面談準備と意思確認</h3><p>共有する内容を確認し、会社への正式申込みを登録します。</p><a class="button friendly" href="#reflection">準備を確認する</a></div>
      </div>`}`, "participant-dashboard");
  }

  function dayTabs() {
    return `<div class="day-tabs" role="group" aria-label="デモ用日付切替">${Logic.DAYS.map((day) => {
      const record = state.days[day.id];
      const complete = record.morningDone && record.eveningDone;
      const partial = record.morningDone || record.eveningDone;
      const classes = ["day-tab", day.weekend ? "weekend" : "", complete ? "complete" : "", state.currentDay === day.id ? "current" : ""].filter(Boolean).join(" ");
      const status = complete ? "朝夕完了" : partial ? "一部入力" : day.weekend ? "任意" : "未入力";
      return `<button class="${classes}" type="button" data-action="select-day" data-day="${day.id}" aria-pressed="${state.currentDay === day.id}"><strong>${escapeHtml(day.label)}（${escapeHtml(day.weekday)}）</strong><span>${status}</span></button>`;
    }).join("")}</div>`;
  }

  function renderDaily() {
    const dayInfo = Logic.DAYS.find((day) => day.id === Number(state.currentDay)) || Logic.DAYS[0];
    const record = state.days[dayInfo.id];
    const progress = Logic.completion(state);
    const checkedRecommendations = new Set(record.recommendations || []);
    return participantPage("daily", `
      <div class="page-head"><div><span class="eyebrow">本人用デモ｜毎日の記録</span><h1 class="page-title">${escapeHtml(dayInfo.label)}（${escapeHtml(dayInfo.weekday)}）のチェックイン・アウト</h1><p class="lead">上の日付を自由に切り替えられます。朝と夕方の両方を保存すると、平日1日分として数えます。</p></div><div class="page-head-actions"><a class="button secondary" href="#participant-dashboard">進捗へ戻る</a></div></div>
      <div class="panel bottom-gap"><span class="field-label">デモ用日付切替</span>${dayTabs()}<p class="muted small">この疑似日付では月～金を「平日」とし、祝日設定は省略しています。</p>${dayInfo.weekend ? '<div class="info-note"><strong>土日の記録は任意です。</strong><p>保存しても修了条件の「平日8日以上」には加算されません。</p></div>' : ""}</div>
      <section class="panel form-section">
        <div class="section-heading"><div><span class="eyebrow">REQUIRED COMMUTE TRAINING</span><h2>修了条件：通勤訓練を1回以上</h2></div><span class="status-chip ${progress.commuteDays >= 1 ? "complete" : "active"}">${progress.commuteDays >= 1 ? `${progress.commuteDays}回 実施済み` : "未実施"}</span></div>
        <div class="important-note"><strong>企業の総務と上司に事前に連絡してから行います。</strong><p>約束した日時に職場で待ち合わせて、15分程度お話をします。帰りに図書館やカフェなどで、読書や自主学習をしてから帰宅します。</p></div>
        <div class="info-note top-gap"><strong>まずは午前中くらいを目標に、やってみてね。</strong><p>本来は出社に間に合う時間を目指すとよいですが、総務・上司との都合もあります。体調が不安なときは無理をせず、会社へ連絡して日程を調整してください。</p></div>
      </section>
      <form id="morningForm" data-day="${dayInfo.id}" class="panel form-section">
        <div class="section-heading"><div><span class="eyebrow">CHECK IN</span><h2>朝のチェックイン</h2></div><span class="status-chip ${record.morningDone ? "complete" : "active"}">${record.morningDone ? "保存済み" : "未入力"}</span></div>
        <div class="form-grid">
          <div class="form-field"><label for="wakeTime">起床時刻</label><input id="wakeTime" name="wakeTime" type="time" value="${escapeHtml(record.morning.wakeTime)}" required></div>
          <div class="form-field"><label for="sleepHours">睡眠時間</label><select id="sleepHours" name="sleepHours">${["4未満", "4", "5", "6", "6.5", "7", "7.5", "8", "9以上"].map((value) => option(value, record.morning.sleepHours, `${value}時間${/未満|以上/.test(value) ? "" : "前後"}`)).join("")}</select></div>
          <div class="form-field"><label for="sleepQuality">睡眠の状態</label><select id="sleepQuality" name="sleepQuality">${["よく眠れた", "ふつう", "やや浅い", "ほとんど眠れない"].map((value) => option(value, record.morning.sleepQuality)).join("")}</select></div>
          <div class="form-field"><span class="field-label">朝食</span><div class="choice-group">${radio("breakfast", "食べた", record.morning.breakfast, "食べた")}${radio("breakfast", "少し", record.morning.breakfast, "少し")}${radio("breakfast", "食べていない", record.morning.breakfast, "食べていない")}</div></div>
          <div class="form-field"><label for="medication">服薬 <span class="muted small">（任意）</span></label><input id="medication" name="medication" value="${escapeHtml(record.morning.medication)}" placeholder="例：朝食後に服用"></div>
          <div class="form-field"><label for="condition">体調</label><select id="condition" name="condition">${[1,2,3,4,5].map((value) => option(value, record.morning.condition, `${value}｜${value === 1 ? "つらい" : value === 3 ? "ふつう" : value === 5 ? "良い" : ""}`)).join("")}</select></div>
          <div class="form-field"><label for="mood">気分</label><select id="mood" name="mood">${[1,2,3,4,5].map((value) => option(value, record.morning.mood, `${value}｜${value === 1 ? "落ち込んでいる" : value === 3 ? "ふつう" : value === 5 ? "安定している" : ""}`)).join("")}</select></div>
          <div class="form-field full"><label for="plan">今日の予定</label><textarea id="plan" name="plan" required placeholder="無理のない範囲で予定を書きます">${escapeHtml(record.morning.plan)}</textarea></div>
          <div class="form-field"><span class="field-label">通勤訓練の予定</span><div class="choice-group">${radio("commutePlan", "あり", record.morning.commutePlan, "あり")}${radio("commutePlan", "なし", record.morning.commutePlan, "なし")}</div></div>
          <div class="form-field"><label for="concern">困っていること <span class="muted small">（任意）</span></label><textarea id="concern" name="concern" placeholder="緊急連絡には使用できません">${escapeHtml(record.morning.concern)}</textarea></div>
        </div>
        <div class="form-actions"><button class="button primary" type="submit">朝の記録を保存</button></div>
      </form>

      <form id="recommendationForm" data-day="${dayInfo.id}" class="panel form-section">
        <span class="eyebrow">DAYTIME IDEAS</span><h2>通勤訓練以外に、日中にできそうなこと</h2><p>ここに表示する項目はすべて任意です。実施しなくても修了判定には影響しません。</p>
        <div class="recommendation-list">${Logic.RECOMMENDATIONS.map((item) => `<label class="check-card"><input type="checkbox" name="recommendation" value="${escapeHtml(item)}"${checkedRecommendations.has(item) ? " checked" : ""}><span><strong>${escapeHtml(item)}</strong><small>できたときだけチェック</small></span></label>`).join("")}</div>
        <div class="form-field top-gap"><label for="customRecommendation">自分で追加した予定 <span class="muted small">（任意）</span></label><input id="customRecommendation" name="customRecommendation" value="${escapeHtml(record.customRecommendation)}" placeholder="例：復職初日の持ち物を確認"></div>
        <div class="form-actions"><button class="button secondary" type="submit">おすすめ事項を保存</button></div>
      </form>

      <form id="eveningForm" data-day="${dayInfo.id}" class="panel form-section">
        <div class="section-heading"><div><span class="eyebrow">CHECK OUT</span><h2>夕方のチェックアウト</h2></div><span class="status-chip ${record.eveningDone ? "complete" : "active"}">${record.eveningDone ? "保存済み" : "未入力"}</span></div>
        <div class="form-grid">
          <div class="form-field full"><label for="accomplished">今日できたこと</label><textarea id="accomplished" name="accomplished" required>${escapeHtml(record.evening.accomplished)}</textarea></div>
          <div class="form-field"><label for="fatigue">疲労の程度</label><select id="fatigue" name="fatigue">${[1,2,3,4,5].map((value) => option(value, record.evening.fatigue, `${value}｜${value === 1 ? "ほぼない" : value === 3 ? "ほどほど" : value === 5 ? "とても強い" : ""}`)).join("")}</select></div>
          <div class="form-field"><label for="moodChange">気分の変化</label><select id="moodChange" name="moodChange">${["良くなった", "少し落ち着いた", "変わらない", "少しつらくなった", "つらくなった"].map((value) => option(value, record.evening.moodChange)).join("")}</select></div>
          <div class="form-field"><label for="commuteResult">通勤訓練（修了条件）の実施</label><select id="commuteResult" name="commuteResult">${["実施した", "予定したが実施しなかった", "実施していない"].map((value) => option(value, record.evening.commuteResult)).join("")}</select></div>
          <div class="form-field"><label for="outing">外出・通勤訓練の内容</label><input id="outing" name="outing" value="${escapeHtml(record.evening.outing)}" placeholder="例：総務・上司と15分話し、帰りに図書館で30分読書"></div>
          <div class="form-field"><label for="learningDone">ゲーム・動画の実施</label><select id="learningDone" name="learning">${["なし", "動画", "ゲーム", "動画とゲーム"].map((value) => option(value, record.evening.learning)).join("")}</select></div>
          <div class="form-field"><label for="challenge">生活上の課題</label><textarea id="challenge" name="challenge">${escapeHtml(record.evening.challenge)}</textarea></div>
          <div class="form-field"><label for="tomorrow">明日の予定</label><textarea id="tomorrow" name="tomorrow" required>${escapeHtml(record.evening.tomorrow)}</textarea></div>
          <div class="form-field full"><label for="consult">相談したいこと <span class="muted small">（任意）</span></label><textarea id="consult" name="consult" placeholder="入力しても、すぐに誰かが確認するものではありません">${escapeHtml(record.evening.consult)}</textarea></div>
        </div>
        <div class="warning-note top-gap"><strong>この入力はリアルタイムで確認されません。</strong><p>強い体調不良や危険を感じるときは、画面への入力ではなく、医療機関や事前に決めた連絡先へ直接連絡してください。</p></div>
        <div class="form-actions"><button class="button primary" type="submit">夕方の記録を保存</button></div>
      </form>`, "daily");
  }

  function renderLearning() {
    const progress = Logic.completion(state);
    return participantPage("learning", `
      <div class="page-head"><div><span class="eyebrow">本人用デモ｜自己学習</span><h1 class="page-title">必須動画 7本</h1><p class="lead">7種類を1回ずつ視聴します。デモでは第1回・第7回を開けます。</p></div><div class="page-head-actions"><span class="status-chip ${progress.videosDone === 7 ? "complete" : "active"}">${progress.videosDone}/7本 視聴済み</span></div></div>
      <div class="info-note bottom-gap"><strong>デモ用プロフィールについて</strong><p>第2～6回は制作準備中です。「修了直前」「修了後」では、デモ説明用の視聴履歴として完了表示になります。</p></div>
      <div class="video-list">${Logic.VIDEOS.map((video) => {
        const done = Boolean(state.videos[video.id]);
        const available = video.available;
        const status = done ? "視聴済み" : available ? "視聴可能" : "準備中";
        return `<article class="video-card${available ? " available" : ""}"><span class="video-number">${String(video.id).padStart(2, "0")}</span><span class="status-chip card-status ${done ? "complete" : available ? "active" : ""}">${status}${done && !available ? "（デモ履歴）" : ""}</span><h3>${escapeHtml(video.title)}</h3><p>${available ? "デモ用の要点画面を確認し、最後に視聴完了を登録します。" : "本公開までに動画コンテンツを用意する想定です。"}</p>${available ? `<button class="button ${done ? "secondary" : "primary"} small" type="button" data-action="open-lesson" data-lesson="${video.id}" data-track="true">${done ? "もう一度見る" : "デモ動画を見る"}</button>` : '<button class="button secondary small" type="button" disabled>準備中</button>'}</article>`;
      }).join("")}</div>`, "learning");
  }

  function renderGames() {
    const progress = Logic.completion(state);
    return participantPage("games", `
      <div class="page-head"><div><span class="eyebrow">本人用デモ｜体験学習</span><h1 class="page-title">必須ゲーム 3種</h1><p class="lead">取り組んだかどうかだけを修了条件にします。ゲームの点数・回答内容は会社へ共有しません。</p></div><div class="page-head-actions"><span class="status-chip ${progress.gamesDone === 3 ? "complete" : "active"}">${progress.gamesDone}/3種 体験済み</span></div></div>
      <div class="game-list">${Logic.GAMES.map((game, index) => {
        const done = Boolean(state.games[game.id]);
        return `<article class="game-card"><span class="game-paw" aria-hidden="true">${["余", "整", "相"][index]}</span><span class="status-chip card-status ${done ? "complete" : "active"}">${done ? "体験済み" : "未体験"}</span><h3>${escapeHtml(game.title)}</h3><p>${escapeHtml(game.description)}</p><button class="button ${done ? "secondary" : "primary"} small" type="button" data-action="open-game" data-game="${escapeHtml(game.id)}">${done ? "もう一度体験" : "ゲームを開く"}</button></article>`;
      }).join("")}</div>
      <div class="important-note top-gap"><strong>ローカルで動作します</strong><p>3つのゲームはこのフォルダ内に含まれ、外部サイトへ接続しません。音が出る場面があるため、説明会では端末の音量を確認してください。</p></div>`, "games");
  }

  function sharedValue(enabled, value, emptyText) {
    if (!enabled) return '<span class="not-shared">本人は共有していません</span>';
    return escapeHtml(value || emptyText || "記載なし");
  }

  function renderSharePreview() {
    const summary = Logic.summaryForCompany(state);
    const prep = state.interviewPrep;
    return `<div class="share-preview">
      <section class="share-group"><span class="status-chip active">必ず共有</span><h3>会社へ表示する要約</h3><dl><dt>実施日数</dt><dd>${summary.recordDays}日／平日10日</dd><dt>生活リズム</dt><dd>${escapeHtml(summary.routine)}</dd><dt>通勤訓練</dt><dd>${escapeHtml(summary.commute)}</dd><dt>修了・申込状況</dt><dd>${escapeHtml(summary.status)}</dd><dt>配慮事項の記載</dt><dd>${prep.accommodations ? "記載あり" : "記載なし"}</dd></dl></section>
      <section class="share-group"><span class="status-chip">本人が個別に選択</span><h3>選択した場合だけ表示</h3><dl><dt>配慮事項の具体的内容</dt><dd>${sharedValue(state.sharing.accommodations, prep.accommodations)}</dd><dt>面談準備の詳細</dt><dd>${sharedValue(state.sharing.interviewDetails, [prep.conditionSummary, prep.commuteSummary, prep.questions].filter(Boolean).join("／"))}</dd><dt>自由記述</dt><dd>${sharedValue(state.sharing.freeText, prep.freeText)}</dd><dt>服薬情報</dt><dd>${sharedValue(state.sharing.medication, prep.medication)}</dd></dl></section>
    </div>`;
  }

  function renderReflection() {
    const reflection = state.finalReflection;
    const prep = state.interviewPrep;
    return participantPage("reflection", `
      <div class="page-head"><div><span class="eyebrow">本人用デモ｜仕上げ</span><h1 class="page-title">最終振り返りと面談準備</h1><p class="lead">短時間で整理できる内容に絞り、会社へ見せる範囲は本人が確認します。</p></div></div>
      <form id="reflectionForm" class="panel form-section">
        <div class="section-heading"><div><span class="eyebrow">約10分</span><h2>最終振り返り</h2></div><span class="status-chip ${state.finalReflectionSaved ? "complete" : "active"}">${state.finalReflectionSaved ? "保存済み" : "未完了"}</span></div>
        <div class="form-grid">
          <div class="form-field full"><label for="learned">この14日間で分かったこと</label><textarea id="learned" name="learned" required>${escapeHtml(reflection.learned)}</textarea></div>
          <div class="form-field"><label for="stableRoutine">整ってきた生活リズム</label><textarea id="stableRoutine" name="stableRoutine" required>${escapeHtml(reflection.stableRoutine)}</textarea></div>
          <div class="form-field"><label for="remainingConcern">残っている心配</label><textarea id="remainingConcern" name="remainingConcern" required>${escapeHtml(reflection.remainingConcern)}</textarea></div>
          <div class="form-field full"><label for="nextAction">復職初日までに確認すること</label><textarea id="nextAction" name="nextAction" required>${escapeHtml(reflection.nextAction)}</textarea></div>
        </div><div class="form-actions"><button class="button primary" type="submit">最終振り返りを保存</button></div>
      </form>

      <form id="prepForm" class="panel form-section">
        <div class="section-heading"><div><span class="eyebrow">約5分</span><h2>面談準備シート</h2></div><span class="status-chip ${state.interviewPrepSaved ? "complete" : "active"}">${state.interviewPrepSaved ? "保存済み" : "未完了"}</span></div>
        <p>病名はアプリへ必須入力しません。会社が保有する復職可能の診断書で確認する想定です。</p>
        <div class="form-grid">
          <div class="form-field"><label for="conditionSummary">現在の生活・体調の要約</label><textarea id="conditionSummary" name="conditionSummary" required>${escapeHtml(prep.conditionSummary)}</textarea></div>
          <div class="form-field"><label for="commuteSummary">通勤訓練の要約</label><textarea id="commuteSummary" name="commuteSummary" required>${escapeHtml(prep.commuteSummary)}</textarea></div>
          <div class="form-field"><label for="accommodations">配慮してほしい事項 <span class="muted small">（記載は任意）</span></label><textarea id="accommodations" name="accommodations">${escapeHtml(prep.accommodations)}</textarea><small>具体的内容を共有しない場合も、記載の有無は会社へ表示します。</small></div>
          <div class="form-field"><label for="questions">会社・産業医へ確認したいこと</label><textarea id="questions" name="questions" required>${escapeHtml(prep.questions)}</textarea></div>
          <div class="form-field"><label for="prepMedication">服薬情報 <span class="muted small">（任意）</span></label><textarea id="prepMedication" name="medication">${escapeHtml(prep.medication)}</textarea><small>面談で産業医から確認されることが多いため、事前記載をおすすめします。</small></div>
          <div class="form-field"><label for="freeText">自由記述 <span class="muted small">（任意）</span></label><textarea id="freeText" name="freeText">${escapeHtml(prep.freeText)}</textarea></div>
        </div><div class="form-actions"><button class="button primary" type="submit">面談準備シートを保存</button></div>
      </form>

      <section class="panel">
        <span class="eyebrow">SHARING CONTROL</span><h2>会社へ共有する範囲</h2><p>下の4項目は初期状態では共有しません。本人が一つずつ選べます。</p>
        <div class="recommendation-list">
          <label class="check-card"><input type="checkbox" data-share="accommodations"${state.sharing.accommodations ? " checked" : ""}><span><strong>配慮事項の具体的内容</strong><small>記載の有無そのものは必ず共有</small></span></label>
          <label class="check-card"><input type="checkbox" data-share="interviewDetails"${state.sharing.interviewDetails ? " checked" : ""}><span><strong>面談準備の詳細</strong><small>体調・通勤・質問の記述</small></span></label>
          <label class="check-card"><input type="checkbox" data-share="freeText"${state.sharing.freeText ? " checked" : ""}><span><strong>自由記述</strong><small>任意で会社へ共有</small></span></label>
          <label class="check-card"><input type="checkbox" data-share="medication"${state.sharing.medication ? " checked" : ""}><span><strong>服薬情報</strong><small>任意で会社へ共有</small></span></label>
        </div>
        <div class="divider"></div><h2>共有前のプレビュー</h2>${renderSharePreview()}
        <div class="form-actions"><a class="button primary" href="#decision">最終意思確認へ進む</a></div>
      </section>`, "reflection");
  }

  function decisionDefinition(type) {
    return {
      formal: { title: "産業医面談を正式に申し込む", description: "面談準備完了として会社へ登録し、会社から産業医へ最終依頼する想定です。", button: "正式申込みを確認" },
      postpone: { title: "面談を延期する", description: "今回は申込みを行わず、必要に応じて準備を続けます。延期中は未修了です。", button: "延期を確認" },
      cancel: { title: "利用を中止する", description: "復職準備コースを中止し、任意の情報提供動画だけを見られる状態へ戻す想定です。", button: "中止を確認" },
    }[type];
  }

  function renderDecision() {
    const progress = Logic.completion(state);
    const current = state.decision ? decisionDefinition(state.decision) : null;
    const pending = pendingDecision ? decisionDefinition(pendingDecision) : null;
    return participantPage("decision", `
      <div class="page-head"><div><span class="eyebrow">本人用デモ｜最終ステップ</span><h1 class="page-title">産業医面談の最終意思確認</h1><p class="lead">産業医面談予定日の5～3日前（当面はカレンダー日）に本人が選び、会社へ連絡が付くよう登録します。</p></div></div>
      ${state.decision ? `<div class="success-note bottom-gap"><strong>登録済み：${escapeHtml(current.title)}</strong><p>${escapeHtml(state.decisionAt || "デモ日時")}に、デモ上で会社へ送信した想定です。選び直すこともできます。</p></div>` : ""}
      <div class="panel bottom-gap"><div class="two-column"><div><h2>申込み前の修了条件</h2>${completionList(progress)}</div><div><h2>現在の状態</h2>${progress.readyBeforeDecision ? '<div class="success-note"><strong>面談準備まで完了しています。</strong><p>正式申込みを登録すると、全条件を満たします。</p></div>' : `<div class="warning-note"><strong>まだ${progress.unmet.filter((item) => item.id !== "decision").length}項目が未完了です。</strong><p>未修了でも本人が希望する場合は、産業医面談の申込み自体はできます。ただし修了証明書は発行されません。</p></div>`}</div></div></div>
      <div class="decision-grid">
        <article class="decision-card formal"><span class="eyebrow">FORMAL</span><h3>正式に申し込む</h3><p>会社へ申込みを登録し、会社から産業医へ面談を最終依頼します。</p><button class="button primary" type="button" data-action="choose-decision" data-decision="formal">この内容を選ぶ</button></article>
        <article class="decision-card postpone"><span class="eyebrow">POSTPONE</span><h3>面談を延期する</h3><p>体調や準備を考え、現時点では面談申込みを延期します。修了にはなりません。</p><button class="button secondary" type="button" data-action="choose-decision" data-decision="postpone">延期を選ぶ</button></article>
        <article class="decision-card cancel"><span class="eyebrow">CANCEL</span><h3>利用を中止する</h3><p>本人の意思で準備コースを終了します。任意の学習動画は引き続き見られる想定です。</p><button class="button danger" type="button" data-action="choose-decision" data-decision="cancel">中止を選ぶ</button></article>
      </div>
      ${pending ? `<form id="decisionForm" class="confirmation-panel" data-decision="${pendingDecision}"><h2>${escapeHtml(pending.title)}</h2><p>${escapeHtml(pending.description)}</p>${pendingDecision === "formal" && !progress.readyBeforeDecision ? '<div class="warning-note"><strong>未修了での産業医面談の申し込みです。</strong><p>事前準備が足りない、または体調回復が不十分と判断される可能性が、修了時より高くなる見込みです。それでも申込みますか。</p></div>' : ""}<div class="form-field top-gap"><label for="decisionReason">会社へ共有する連絡メモ <span class="muted small">（任意）</span></label><textarea id="decisionReason" name="decisionReason">${escapeHtml(state.decisionReason)}</textarea><small>正式申込み・延期・中止の選択と一緒に、会社の通知画面へ表示します。</small></div><div class="form-actions"><button class="button secondary" type="button" data-action="cancel-decision-confirm">戻る</button><button class="button ${pendingDecision === "cancel" ? "danger" : "primary"}" type="submit">${escapeHtml(pending.button)}</button></div></form>` : ""}
      <div class="info-note top-gap"><strong>このデモの通知表現</strong><p>実際のメールや外部システムへは送信しません。登録後は「デモ上で会社へ送信した想定」と表示します。</p></div>`, "decision");
  }

  function renderResult() {
    const progress = Logic.completion(state);
    const status = Logic.participantStatus(state);
    const summary = Logic.summaryForCompany(state);
    let resultNote = '<div class="info-note"><strong>修了結果はまだ確定していません。</strong><p>修了条件を確認し、最後に産業医面談の正式申込みを登録します。</p></div>';
    if (progress.complete) resultNote = '<div class="success-note"><strong>復職 AI Ready（アイレディ） 復職準備コースを修了しました。</strong><p>プログラムへの取組みと正式申込みを確認しました。これは復職可能性や医学的回復を証明するものではありません。</p></div>';
    else if (state.decision === "formal") resultNote = '<div class="warning-note"><strong>未修了での産業医面談の申し込みを登録しました。</strong><p>会社への申込みは登録されていますが、修了条件を満たしていないため修了証明書は発行しません。</p></div>';
    else if (state.decision === "postpone") resultNote = '<div class="warning-note"><strong>産業医面談を延期しました。</strong><p>延期を選んだため、現時点では未修了です。</p></div>';
    else if (state.decision === "cancel") resultNote = '<div class="warning-note"><strong>利用を中止しました。</strong><p>準備コースは未修了です。全従業員向けの任意動画へ戻る想定です。</p><p><a class="button secondary small" href="#open-learning">任意の情報提供動画を見る</a></p></div>';
    return participantPage("result", `
      <div class="page-head"><div><span class="eyebrow">本人用デモ｜結果</span><h1 class="page-title">修了結果・最終レポート</h1><p class="lead">佐藤みらいさんの架空データをもとに表示しています。</p></div><div class="page-head-actions"><span class="status-chip ${statusClass(status)}">${escapeHtml(status)}</span></div></div>
      ${resultNote}
      <div class="two-column top-gap">
        <section class="panel"><h2>修了条件</h2>${completionList(progress)}</section>
        <section class="panel"><h2>本人への最終フィードバック</h2><dl class="result-list"><dt>記録日数</dt><dd>${summary.recordDays}日／平日10日</dd><dt>生活リズム</dt><dd>${escapeHtml(summary.routine)}</dd><dt>通勤訓練</dt><dd>${escapeHtml(summary.commute)}</dd><dt>面談申込み</dt><dd>${state.decision === "formal" ? "デモ上で会社へ送信した想定" : "正式申込みなし"}</dd></dl></section>
      </div>
      <div class="panel top-gap"><h2>修了証明書</h2>${progress.complete ? '<p>研修有効期限は修了日から暫定1年6か月です。期限経過後も、過去に修了した事実は確認できます。</p><div class="form-actions"><a class="button primary" href="#certificate">修了証明書を表示</a><a class="button secondary" href="#verify">確認ページを見る</a></div>' : '<p class="muted">すべての修了条件を満たした場合だけ発行します。面談を実施できたか、実際に復職したかは発行条件に含みません。</p>'}</div>`, "result");
  }

  function peopleForCompany() {
    const satoStatus = Logic.participantStatus(state);
    return [
      { name: "佐藤みらい", department: "管理部", days: Logic.completion(state).completedDays, status: satoStatus, interview: state.decision === "formal" ? "申込み通知あり" : state.decision === "postpone" ? "延期" : state.decision === "cancel" ? "中止" : "未通知", link: true },
      { name: "鈴木あおい", department: "営業企画部", days: 6, status: "実施中", interview: "未通知" },
      { name: "高橋健太", department: "開発部", days: 8, status: "面談延期", interview: "延期" },
      { name: "田中さくら", department: "総務部", days: 3, status: "本人が中断", interview: "未通知" },
      { name: "伊藤大輔", department: "営業部", days: 5, status: "未修了での産業医面談の申し込み", interview: "申込み通知あり" },
    ];
  }

  function satoNotificationMarkup() {
    const memo = state.decisionReason ? `<br><span class="muted small">連絡メモ：${escapeHtml(state.decisionReason)}</span>` : "";
    if (state.decision === "formal") return `<li><time>2026/7/22 10:30</time><strong>佐藤みらいさん</strong><br>${Logic.completion(state).complete ? "修了・産業医面談申込み" : "未修了での産業医面談の申し込み"}${memo}</li>`;
    if (state.decision === "postpone") return `<li><time>2026/7/22 10:30</time><strong>佐藤みらいさん</strong><br>産業医面談を延期${memo}</li>`;
    if (state.decision === "cancel") return `<li><time>2026/7/22 10:30</time><strong>佐藤みらいさん</strong><br>復職準備コースの利用を中止${memo}</li>`;
    return '<li><time>デモ状態に連動</time><strong>佐藤みらいさん</strong><br>面談申込み通知はまだありません</li>';
  }

  function renderCompany() {
    const people = peopleForCompany();
    const completed = people.filter((person) => /修了/.test(person.status) && !/未修了/.test(person.status)).length;
    const active = people.filter((person) => /実施中|開始前/.test(person.status)).length;
    const applications = people.filter((person) => person.interview === "申込み通知あり").length;
    return `<section class="page enterprise">
      <div class="page-head"><div><span class="eyebrow">企業担当者用デモ</span><h1 class="page-title">復職準備の進捗を、必要な範囲だけ確認</h1><p class="lead">すべて架空の人物・架空データです。病名、ゲームの点数、本人が共有していない自由記述は一覧に表示しません。</p></div><div class="page-head-actions"><a class="button secondary" href="#participant-dashboard">本人画面へ切替</a></div></div>
      <div class="metric-grid">
        <div class="metric"><span class="metric-label">対象者</span><span class="metric-value">5<small>人</small></span><span class="metric-help">デモ用架空データ</span></div>
        <div class="metric"><span class="metric-label">実施中・開始前</span><span class="metric-value">${active}<small>人</small></span><span class="metric-help">14日間の進捗</span></div>
        <div class="metric"><span class="metric-label">修了</span><span class="metric-value">${completed}<small>人</small></span><span class="metric-help">正式申込みまで完了</span></div>
        <div class="metric"><span class="metric-label">面談申込み通知</span><span class="metric-value">${applications}<small>件</small></span><span class="metric-help">会社から産業医へ依頼</span></div>
      </div>
      <div class="company-summary top-gap">
        <section class="panel"><div class="section-heading"><div><span class="eyebrow">PARTICIPANTS</span><h2>利用者一覧</h2></div><button class="button secondary small" type="button" data-action="copy-invite">開始案内を表示</button></div>
          <div class="table-wrap"><table><thead><tr><th scope="col">利用者</th><th scope="col">状況</th><th scope="col">朝夕記録</th><th scope="col">面談通知</th><th scope="col">確認</th></tr></thead><tbody>${people.map((person) => `<tr><td><strong>${escapeHtml(person.name)}</strong><br><span class="muted small">${escapeHtml(person.department)}</span></td><td><span class="status-chip ${statusClass(person.status)}">${escapeHtml(person.status)}</span></td><td>${person.days}日／10日</td><td>${escapeHtml(person.interview)}</td><td>${person.link ? '<a class="person-link" href="#company-detail">共有要約を見る</a>' : '<span class="muted">デモ固定値</span>'}</td></tr>`).join("")}</tbody></table></div>
        </section>
        <aside class="panel"><span class="eyebrow">NOTIFICATIONS</span><h2>通知</h2><ul class="notification-list">${satoNotificationMarkup()}<li><time>2026/7/21 16:20</time><strong>伊藤大輔さん</strong><br>未修了での産業医面談の申し込み</li><li><time>2026/7/20 09:15</time><strong>高橋健太さん</strong><br>産業医面談を延期</li></ul><p class="muted small">外部へ実際の通知は送信していません。</p></aside>
      </div>
      <section class="panel top-gap"><span class="eyebrow">PILOT SUMMARY</span><h2>実証全体の簡易集計</h2><div class="three-column compact-stats"><div><strong>${people.reduce((sum, person) => sum + person.days, 0)}</strong><span>朝夕記録・延べ日数</span></div><div><strong>${people.filter((person) => /延期|中断|中止/.test(person.status)).length}</strong><span>延期・中断</span></div><div><strong>${applications}</strong><span>面談申込み</span></div></div><p class="muted small">個人の医学的評価ではなく、実証の利用状況を確認するための集計です。</p></section>
    </section>`;
  }

  function renderCompanyDetail() {
    const summary = Logic.summaryForCompany(state);
    const progress = Logic.completion(state);
    return `<section class="page enterprise">
      <div class="page-head"><div><span class="eyebrow">企業担当者用デモ｜共有要約</span><h1 class="page-title">佐藤みらいさん</h1><p class="lead">本人が同意した範囲だけを表示します。病名は会社が保有する診断書で確認する想定のため、この画面には表示しません。</p></div><div class="page-head-actions"><a class="button secondary" href="#company">一覧へ戻る</a></div></div>
      <div class="two-column">
        <section class="panel"><span class="status-chip active">必ず共有</span><h2 class="top-gap">実施状況の要約</h2><dl class="result-list"><dt>実施日数</dt><dd>${summary.recordDays}日／平日10日</dd><dt>生活リズム</dt><dd>${escapeHtml(summary.routine)}</dd><dt>通勤訓練</dt><dd>${escapeHtml(summary.commute)}</dd><dt>状況</dt><dd>${escapeHtml(summary.status)}</dd><dt>配慮事項</dt><dd>${state.interviewPrep.accommodations ? "記載あり" : "記載なし"}</dd></dl></section>
        <section class="panel"><span class="status-chip">本人が個別に選択</span><h2 class="top-gap">共有された詳細</h2><dl class="result-list"><dt>配慮事項</dt><dd>${sharedValue(state.sharing.accommodations, state.interviewPrep.accommodations)}</dd><dt>面談準備</dt><dd>${sharedValue(state.sharing.interviewDetails, [state.interviewPrep.conditionSummary, state.interviewPrep.commuteSummary, state.interviewPrep.questions].filter(Boolean).join("／"))}</dd><dt>自由記述</dt><dd>${sharedValue(state.sharing.freeText, state.interviewPrep.freeText)}</dd><dt>服薬情報</dt><dd>${sharedValue(state.sharing.medication, state.interviewPrep.medication)}</dd></dl></section>
      </div>
      <section class="panel top-gap"><div class="two-column"><div><h2>産業医面談の申込み</h2><p>${state.decision === "formal" ? `<span class="status-chip ${progress.complete ? "complete" : "warning"}">${progress.complete ? "修了・正式申込み済み" : "未修了での産業医面談の申し込み"}</span></p><p>デモ上で会社へ送信した想定です。会社から産業医へ最終依頼します。</p>` : `<span class="status-chip ${statusClass(summary.status)}">${escapeHtml(summary.status)}</span></p><p>${state.decision === "postpone" ? "延期の連絡をデモ上で受け付けました。" : state.decision === "cancel" ? "利用中止の連絡をデモ上で受け付けました。" : "正式申込みの通知はまだありません。"}</p>`}${state.decisionReason ? `<p class="muted small">連絡メモ：${escapeHtml(state.decisionReason)}</p>` : ""}</div><div><h2>修了証明書</h2>${progress.complete ? '<p>証明書番号 RA-20260722-0001</p><div class="form-actions"><a class="button primary" href="#verify">証明書を確認</a></div>' : '<p class="muted">未発行です。面談申込みだけでは発行されません。</p>'}</div></div></section>
      <div class="important-note top-gap"><strong>判断に関する注意</strong><p>この要約は面談準備の補助情報です。復職可否や医学的回復を判定する情報として単独で使用しない想定です。</p></div>
    </section>`;
  }

  function certificateMarkup() {
    return `<article class="certificate" aria-label="復職 AI Ready（アイレディ） 復職準備コース修了証明書">
      <p class="certificate-kicker">CERTIFICATE OF COMPLETION</p><h2>復職 AI Ready（アイレディ）<br>復職準備コース修了証明書</h2><p class="certificate-name">佐藤みらい 様</p><p class="certificate-body">上記の者が、復職 AI Ready（アイレディ） 復職準備コースの所定の取組みを完了し、産業医面談の正式申込みを登録したことを証明します。</p>
      <dl class="certificate-meta"><dt>修了日</dt><dd>2026年7月22日</dd><dt>研修有効期限</dt><dd>2028年1月21日</dd><dt>証明書番号</dt><dd>RA-20260722-0001</dd><dt>発行者</dt><dd>復職 AI Ready（アイレディ）運営事務局</dd></dl>
      <p class="certificate-issuer">復職 AI Ready（アイレディ）運営事務局</p><a class="qr-demo" href="#verify" data-action="verify-certificate-link" data-number="RA-20260722-0001" aria-label="この証明書を確認ページで開く（確認用コードのデモ）"><span>DEMO</span></a><p class="certificate-disclaimer">本証明書はプログラム修了の事実を示すものであり、復職可能性、医学的回復、就業上の安全性を証明するものではありません。TuringCerts連携予定。</p>
    </article>`;
  }

  function renderCertificate() {
    const progress = Logic.completion(state);
    if (!progress.complete) return `<section class="page narrow soft"><div class="page-head"><div><span class="eyebrow">本人用デモ｜証明書</span><h1 class="page-title">修了証明書はまだ発行されていません</h1><p class="lead">すべての修了条件を満たすと表示できます。</p></div></div><div class="warning-note"><strong>現在は未修了です。</strong><p>上部の「修了後を表示」を使うと、完成状態をすぐに確認できます。</p></div><div class="form-actions"><a class="button primary" href="#result">修了結果へ戻る</a><a class="button secondary" href="#verify">確認ページを試す</a></div></section>`;
    return `<section class="page soft"><div class="page-head certificate-actions"><div><span class="eyebrow">本人用デモ｜修了証明書</span><h1 class="page-title">修了証明書</h1><p class="lead">PDF風のデモ画面です。印刷機能からPDFとして保存できます。</p></div><div class="page-head-actions"><button class="button secondary" type="button" data-action="print-certificate">印刷・PDF保存</button><a class="button primary" href="#verify" data-action="verify-certificate-link" data-number="RA-20260722-0001">企業向け確認ページ</a></div></div><div class="certificate-wrap">${certificateMarkup()}</div><div class="important-note certificate-wrap"><strong>期限経過後も残す情報</strong><p>有効期限が過ぎた後も、「過去にこのプログラムを修了した事実」と元の修了日を確認できる想定です。証明書の失効や更新は行わず、有効期限は研修内容の有効期間として表示します。</p></div></section>`;
  }

  function verificationResultMarkup(result) {
    if (!result) return "";
    if (result.status === "format-error") return '<div class="warning-note"><strong>番号の形式を確認してください。</strong><p>例：RA-20260722-0001</p></div>';
    if (result.status === "not-found") return `<div class="warning-note"><strong>該当する証明書が見つかりません。</strong><p>${escapeHtml(result.number)} はデモ用確認データに登録されていません。</p></div>`;
    const valid = result.status === "valid";
    return `<article class="verification-card"><div><span class="status-chip ${valid ? "valid" : "expired"}">${valid ? "有効期間内" : "研修有効期限 経過"}</span><h2>${valid ? "修了証明書を確認しました" : "過去の修了事実を確認しました"}</h2>${valid ? '<p>現在、研修の有効期間内です。</p>' : '<div class="warning-note"><strong>有効期限は過ぎています。</strong><p>ただし、この方が過去にプログラムを修了した事実は引き続き確認できます。</p></div>'}<dl><dt>証明書番号</dt><dd>${escapeHtml(result.number)}</dd><dt>氏名</dt><dd>${escapeHtml(result.holder)}</dd><dt>証明書名</dt><dd>${escapeHtml(result.title)}</dd><dt>修了日</dt><dd>${escapeHtml(result.completedAt)}</dd><dt>研修有効期限</dt><dd>${escapeHtml(result.validUntil)}</dd><dt>発行者</dt><dd>復職 AI Ready（アイレディ）運営事務局</dd></dl><p class="muted small">この確認はプログラム修了の事実を示し、復職可否や医学的回復を示すものではありません。</p></div><div class="qr-demo" aria-label="確認済みコードのデモ"><span>${valid ? "VALID" : "PAST"}</span></div></article>`;
  }

  function renderVerify() {
    return `<section class="page enterprise narrow"><div class="page-head"><div><span class="eyebrow">企業向け確認ページ</span><h1 class="page-title">修了証明書を確認する</h1><p class="lead">証明書番号を入力すると、現在の有効期間と過去の修了事実を確認できます。</p></div></div>
      <div class="panel"><h2>証明書番号</h2><form id="verifyForm" class="verify-form"><label class="visually-hidden" for="certificateNumber">証明書番号</label><input id="certificateNumber" name="certificateNumber" autocomplete="off" placeholder="RA-20260722-0001" value="${lastVerification ? escapeHtml(lastVerification.number) : ""}" required><button class="button primary" type="submit">確認する</button></form><div class="form-actions"><button class="button secondary small" type="button" data-action="verify-sample" data-number="RA-20260722-0001">有効期間内の例</button><button class="button secondary small" type="button" data-action="verify-sample" data-number="RA-20240115-0007">期限経過後の例</button></div><p class="muted small">デモ用番号以外は「見つかりません」と表示します。外部照会は行いません。</p></div>
      <div class="verify-result" aria-live="polite">${verificationResultMarkup(lastVerification)}</div>
      <div class="important-note top-gap"><strong>TuringCerts連携予定</strong><p>このデモではPDF風証明書と確認ページをローカル表示しています。TuringCerts導入後に元の修了日で後日発行できるかは、提供会社へ確認する前提です。</p></div>
    </section>`;
  }

  function renderOpenLearning() {
    const publicLessons = [
      { id: 1, title: "復職 AI Ready（アイレディ）の目的と安全な使い方", available: true },
      { id: 2, title: "生活リズムと睡眠の基本", available: false },
      { id: 5, title: "困ったときの相談とコミュニケーション", available: false },
      { id: 7, title: "面談前に整理しておくこと", available: true },
    ];
    return `<section class="page soft"><div class="page-head"><div><span class="eyebrow">全従業員向け｜任意の情報提供</span><h1 class="page-title">休職前後を問わず見られる学習スペース</h1><p class="lead">休職中の人、現在休職していない人にも開放する想定です。視聴済みだけを確認し、修了証明書は発行しません。</p></div><div class="page-head-actions"><a class="button secondary" href="#home">トップへ戻る</a></div></div>
      <div class="video-list">${publicLessons.map((lesson) => { const done = Boolean(state.publicVideos && state.publicVideos[lesson.id]); return `<article class="video-card${lesson.available ? " available" : ""}"><span class="video-number">${String(lesson.id).padStart(2, "0")}</span><span class="status-chip card-status ${done ? "complete" : lesson.available ? "active" : ""}">${done ? "視聴済み" : lesson.available ? "一部公開" : "準備中"}</span><h3>${escapeHtml(lesson.title)}</h3><p>${lesson.available ? "復職準備コースと共通するデモ教材です。" : "今後公開する任意の情報提供動画です。"}</p>${lesson.available ? `<button class="button ${done ? "secondary" : "primary"} small" type="button" data-action="open-lesson" data-lesson="${lesson.id}" data-track="false">${done ? "もう一度見る" : "教材を見る"}</button>` : '<button class="button secondary small" type="button" disabled>準備中</button>'}</article>`; }).join("")}</div>
      <div class="info-note top-gap"><strong>このスペースの位置づけ</strong><p>視聴は任意で、復職可否の判定や修了条件には使用しません。準備コースの中断・中止後も、この部分だけは見られる運用を想定しています。</p></div></section>`;
  }

  function renderRoute(route) {
    switch (route) {
      case "home": return renderHome();
      case "consent": return renderConsent();
      case "participant-dashboard": return renderParticipantDashboard();
      case "daily": return renderDaily();
      case "learning": return renderLearning();
      case "games": return renderGames();
      case "reflection": return renderReflection();
      case "decision": return renderDecision();
      case "result": return renderResult();
      case "company": return renderCompany();
      case "company-detail": return renderCompanyDetail();
      case "verify": return renderVerify();
      case "certificate": return renderCertificate();
      case "open-learning": return renderOpenLearning();
      default: return renderHome();
    }
  }

  function render() {
    const requested = routeName();
    const protectedRoutes = new Set(["daily", "learning", "games", "reflection", "decision", "result", "certificate"]);
    const closedCourseRoutes = new Set(["daily", "learning", "games", "reflection", "decision", "certificate"]);
    let route = ROUTE_TITLES[requested] ? requested : "home";
    if (!state.consented && protectedRoutes.has(route)) route = "consent";
    if (state.decision === "cancel" && closedCourseRoutes.has(route)) route = "result";
    main.innerHTML = renderRoute(route);
    document.title = `${ROUTE_TITLES[route]}｜復職 AI Ready（アイレディ） 操作デモ`;
    routeAnnouncement.textContent = `${ROUTE_TITLES[route]}を表示しました`;
    updateDemoStateLabel();
    mobileMenu.hidden = true;
    menuButton.setAttribute("aria-expanded", "false");
    if (lastRoute !== route) {
      window.scrollTo(0, 0);
      main.focus({ preventScroll: true });
    }
    lastRoute = route;
  }

  function formValue(form, name) {
    const value = new FormData(form).get(name);
    return value == null ? "" : String(value);
  }

  function saveMorning(form) {
    const id = Number(form.dataset.day);
    const day = state.days[id];
    ["wakeTime", "sleepHours", "sleepQuality", "breakfast", "medication", "condition", "mood", "plan", "commutePlan", "concern"].forEach((field) => {
      day.morning[field] = formValue(form, field);
    });
    day.morningDone = true;
    markCustom();
    saveState();
    render();
    toast(Logic.DAYS.find((item) => item.id === id).weekend ? "朝の任意記録を保存しました" : "朝のチェックインを保存しました");
  }

  function saveEvening(form) {
    const id = Number(form.dataset.day);
    const day = state.days[id];
    ["accomplished", "fatigue", "moodChange", "commuteResult", "outing", "learning", "challenge", "tomorrow", "consult"].forEach((field) => {
      day.evening[field] = formValue(form, field);
    });
    day.eveningDone = true;
    markCustom();
    saveState();
    render();
    toast(Logic.DAYS.find((item) => item.id === id).weekend ? "夕方の任意記録を保存しました" : "夕方のチェックアウトを保存しました");
  }

  function saveRecommendations(form) {
    const id = Number(form.dataset.day);
    state.days[id].recommendations = Array.from(form.querySelectorAll('input[name="recommendation"]:checked')).map((input) => input.value);
    state.days[id].customRecommendation = formValue(form, "customRecommendation");
    markCustom();
    saveState();
    toast("任意のおすすめ事項を保存しました。修了判定には影響しません");
  }

  function showLesson(id, track) {
    const lesson = LESSONS[id];
    if (!lesson) return;
    activeLesson = { kind: "lesson", id, track };
    lessonContent.innerHTML = `<span class="eyebrow">デモ版ミニ教材｜${escapeHtml(lesson.duration)}</span><h2 id="lessonTitle">${escapeHtml(lesson.title)}</h2><div class="video-placeholder" aria-label="動画内容のデモ"><span aria-hidden="true">▶</span><strong>動画内容を要点表示しています</strong><small>本公開時は動画プレーヤーを配置する想定です</small></div><div class="lesson-pages">${lesson.pages.map(([title, body], index) => `<section class="lesson-page"><strong>${index + 1}. ${escapeHtml(title)}</strong><span>${escapeHtml(body)}</span></section>`).join("")}</div>`;
    completeLessonButton.textContent = track ? "最後まで確認し、視聴完了にする" : "内容を確認して閉じる";
    lessonDialog.showModal();
  }

  function showInvite() {
    activeLesson = { kind: "invite" };
    lessonContent.innerHTML = `<span class="eyebrow">企業から本人への案内例</span><h2 id="lessonTitle">復職 AI Ready（アイレディ） 開始のご案内</h2><div class="important-note"><strong>佐藤みらいさんへ（架空データ）</strong><p>復職可能の診断書の提出後、産業医面談に向けた準備として、14日間の「復職 AI Ready（アイレディ）」をご案内します。</p></div><div class="lesson-pages top-gap"><section class="lesson-page"><strong>取り組む内容</strong><span>平日の朝・夕の記録、通勤訓練1回以上、自己学習動画7本、必須ゲーム3種、最終振り返り、面談準備を行います。通勤訓練では、総務・上司と約束した日時に職場で15分程度話し、帰りに図書館やカフェなどで読書・自主学習をします。</span></section><section class="lesson-page"><strong>本人の意思を尊重します</strong><span>利用はいつでも中断・中止できます。復職可否をアプリが判定するものではありません。</span></section><section class="lesson-page"><strong>会社への共有</strong><span>実施日数、生活リズム要約、通勤訓練、修了・面談申込状況を共有します。詳しい記述は本人が個別に選びます。</span></section><section class="lesson-page"><strong>緊急対応ではありません</strong><span>入力はリアルタイムで確認されません。体調急変時は主治医、医療機関、事前の連絡先へ直接連絡してください。</span></section></div><p class="muted small">実際の送信先・URLはデモ版では表示しません。外部送信も行いません。</p>`;
    completeLessonButton.textContent = "案内内容を確認して閉じる";
    lessonDialog.showModal();
  }

  function completeLesson() {
    if (!activeLesson) return;
    if (activeLesson.kind === "invite") {
      lessonDialog.close();
      activeLesson = null;
      toast("開始案内の内容を確認しました（外部送信なし）");
      return;
    }
    if (activeLesson.track) {
      state.videos[activeLesson.id] = true;
      markCustom();
      saveState();
      toast(`動画${activeLesson.id}を視聴済みにしました`);
    } else {
      state.publicVideos[activeLesson.id] = true;
      markCustom();
      saveState();
      toast("任意教材を視聴済みにしました（修了条件には影響しません）");
    }
    lessonDialog.close();
    activeLesson = null;
    render();
  }

  function showGame(id) {
    const game = Logic.GAMES.find((item) => item.id === id);
    if (!game) return;
    activeGame = id;
    document.getElementById("gameDialogTitle").textContent = game.title;
    document.querySelectorAll("[data-game-frame]").forEach((frame) => {
      frame.hidden = frame.dataset.gameFrame !== id;
    });
    gameDialog.showModal();
  }

  function completeGame(id) {
    if (!Logic.GAMES.some((game) => game.id === id)) return;
    state.games[id] = true;
    markCustom();
    saveState();
    toast(`${Logic.GAMES.find((game) => game.id === id).title}を体験済みにしました`);
    if (gameDialog.open) gameDialog.close();
    activeGame = null;
    render();
  }

  function resetGameStorage() {
    document.querySelectorAll("[data-game-frame]").forEach((frame) => {
      try {
        frame.contentWindow.postMessage({ source: "ready-demo-parent", type: "GAME_RESET" }, "*");
      } catch (error) {
        // A not-yet-loaded frame can be ignored.
      }
    });
  }

  document.addEventListener("click", (event) => {
    const profileButton = event.target.closest("[data-profile]");
    if (profileButton) {
      const profile = profileButton.dataset.profile;
      state = Logic.createProfile(profile);
      pendingDecision = null;
      lastVerification = null;
      saveState();
      if (profile === "start") resetGameStorage();
      render();
      toast(`${PROFILE_LABELS[profile]}へ切り替えました`);
      return;
    }

    const actionButton = event.target.closest("[data-action]");
    if (!actionButton) return;
    const action = actionButton.dataset.action;

    if (action === "reset") {
      if (!window.confirm("デモの入力・進捗を初期状態へ戻しますか？")) return;
      try { window.localStorage.removeItem(Logic.STORAGE_KEY); } catch (error) { /* no-op */ }
      state = Logic.createInitialState();
      memoryState = Logic.clone(state);
      pendingDecision = null;
      lastVerification = null;
      resetGameStorage();
      navigate("home");
      render();
      toast("デモを初期状態へ戻しました");
      return;
    }

    if (action === "select-day") {
      state.currentDay = Number(actionButton.dataset.day);
      saveState();
      render();
      return;
    }

    if (action === "open-lesson") {
      showLesson(Number(actionButton.dataset.lesson), actionButton.dataset.track === "true");
      return;
    }
    if (action === "close-lesson") {
      lessonDialog.close();
      activeLesson = null;
      return;
    }
    if (action === "complete-lesson") {
      completeLesson();
      return;
    }
    if (action === "open-game") {
      showGame(actionButton.dataset.game);
      return;
    }
    if (action === "close-game") {
      gameDialog.close();
      activeGame = null;
      return;
    }
    if (action === "complete-game") {
      if (activeGame) completeGame(activeGame);
      return;
    }
    if (action === "choose-decision") {
      pendingDecision = actionButton.dataset.decision;
      render();
      window.setTimeout(() => document.getElementById("decisionForm")?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
      return;
    }
    if (action === "cancel-decision-confirm") {
      pendingDecision = null;
      render();
      return;
    }
    if (action === "verify-sample") {
      lastVerification = Logic.verifyCertificate(actionButton.dataset.number);
      render();
      return;
    }
    if (action === "verify-certificate-link") {
      event.preventDefault();
      lastVerification = Logic.verifyCertificate(actionButton.dataset.number);
      navigate("verify");
      return;
    }
    if (action === "print-certificate") {
      window.print();
      return;
    }
    if (action === "copy-invite") {
      showInvite();
    }
  });

  document.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.target;
    if (form.id === "consentForm") {
      const checks = Array.from(form.querySelectorAll('input[type="checkbox"]'));
      if (!checks.every((input) => input.checked)) {
        toast("4項目すべてを確認してください");
        return;
      }
      state.consented = true;
      markCustom();
      saveState();
      navigate("participant-dashboard");
      toast("説明・同意をデモ端末へ保存しました");
      return;
    }
    if (form.id === "morningForm") { saveMorning(form); return; }
    if (form.id === "eveningForm") { saveEvening(form); return; }
    if (form.id === "recommendationForm") { saveRecommendations(form); return; }
    if (form.id === "reflectionForm") {
      ["learned", "stableRoutine", "remainingConcern", "nextAction"].forEach((field) => { state.finalReflection[field] = formValue(form, field); });
      state.finalReflectionSaved = true;
      markCustom();
      saveState();
      render();
      toast("最終振り返りを保存しました");
      return;
    }
    if (form.id === "prepForm") {
      ["conditionSummary", "commuteSummary", "accommodations", "questions", "medication", "freeText"].forEach((field) => { state.interviewPrep[field] = formValue(form, field); });
      state.interviewPrepSaved = true;
      markCustom();
      saveState();
      render();
      toast("面談準備シートを保存しました");
      return;
    }
    if (form.id === "decisionForm") {
      const decision = form.dataset.decision;
      state.decision = decision;
      state.decisionReason = formValue(form, "decisionReason");
      state.decisionAt = "2026年7月22日 10:30";
      if (decision === "formal" && Logic.completion(state).readyBeforeDecision) state.profile = "complete";
      else markCustom();
      pendingDecision = null;
      saveState();
      navigate("result");
      toast("デモ上で会社へ送信した想定です（外部送信なし）");
      return;
    }
    if (form.id === "verifyForm") {
      lastVerification = Logic.verifyCertificate(formValue(form, "certificateNumber"));
      render();
    }
  });

  document.addEventListener("change", (event) => {
    if (event.target.matches('#consentForm input[type="checkbox"]')) {
      const form = event.target.form;
      const allChecked = Array.from(form.querySelectorAll('input[type="checkbox"]')).every((input) => input.checked);
      document.getElementById("consentStartButton").disabled = !allChecked;
      return;
    }
    if (event.target.matches("[data-share]")) {
      state.sharing[event.target.dataset.share] = event.target.checked;
      markCustom();
      saveState();
      render();
      toast(event.target.checked ? "この項目を会社へ共有する設定にしました" : "この項目を共有しない設定にしました");
    }
  });

  menuButton.addEventListener("click", () => {
    mobileMenu.hidden = !mobileMenu.hidden;
    menuButton.setAttribute("aria-expanded", String(!mobileMenu.hidden));
  });

  mobileMenu.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      mobileMenu.hidden = true;
      menuButton.setAttribute("aria-expanded", "false");
    }
  });

  window.addEventListener("message", (event) => {
    const data = event.data;
    if (!data || data.source !== "ready-demo-game" || data.type !== "GAME_COMPLETED" || data.version !== 1) return;
    const game = Logic.GAMES.find((item) => item.id === data.gameId);
    if (!game) return;
    const expectedFrame = document.querySelector(`[data-game-frame="${data.gameId}"]`);
    if (!expectedFrame || event.source !== expectedFrame.contentWindow) return;
    state.games[data.gameId] = true;
    markCustom();
    saveState();
    toast(`${game.title}の完了を記録しました`);
    render();
  });

  window.addEventListener("hashchange", render);
  render();
})();
