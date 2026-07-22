(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.DemoLogic = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const STORAGE_KEY = "returnToWorkAiReadyDemoV1";

  const DAYS = [
    { id: 1, date: "2026-07-09", label: "7/9", weekday: "木", weekend: false },
    { id: 2, date: "2026-07-10", label: "7/10", weekday: "金", weekend: false },
    { id: 3, date: "2026-07-11", label: "7/11", weekday: "土", weekend: true },
    { id: 4, date: "2026-07-12", label: "7/12", weekday: "日", weekend: true },
    { id: 5, date: "2026-07-13", label: "7/13", weekday: "月", weekend: false },
    { id: 6, date: "2026-07-14", label: "7/14", weekday: "火", weekend: false },
    { id: 7, date: "2026-07-15", label: "7/15", weekday: "水", weekend: false },
    { id: 8, date: "2026-07-16", label: "7/16", weekday: "木", weekend: false },
    { id: 9, date: "2026-07-17", label: "7/17", weekday: "金", weekend: false },
    { id: 10, date: "2026-07-18", label: "7/18", weekday: "土", weekend: true },
    { id: 11, date: "2026-07-19", label: "7/19", weekday: "日", weekend: true },
    { id: 12, date: "2026-07-20", label: "7/20", weekday: "月", weekend: false },
    { id: 13, date: "2026-07-21", label: "7/21", weekday: "火", weekend: false },
    { id: 14, date: "2026-07-22", label: "7/22", weekday: "水", weekend: false },
  ];

  const VIDEOS = [
    { id: 1, title: "復職 AI Ready（アイレディ）の目的と注意点", available: true },
    { id: 2, title: "生活リズムと睡眠", available: false },
    { id: 3, title: "通勤練習と疲労の確認", available: false },
    { id: 4, title: "仕事量・休憩・余力の考え方", available: false },
    { id: 5, title: "相談と職場でのコミュニケーション", available: false },
    { id: 6, title: "配慮事項・家庭・ほかの通院の整理", available: false },
    { id: 7, title: "産業医面談の準備と最終意思確認", available: true },
  ];

  const GAMES = [
    {
      id: "margin",
      title: "きょうの余白をつくろう",
      description: "仕事量だけでなく、休憩と予備時間も一日の予定へ置いてみます。",
      file: "games/neko-office-margin.html",
    },
    {
      id: "adjustment",
      title: "ねこオフィス調整室",
      description: "仕事場で使えそうな環境の工夫や配慮事項を整理します。",
      file: "games/neko-office-adjustment.html",
    },
    {
      id: "consult",
      title: "相談メモをつくろう",
      description: "事実・影響・お願いを整理し、相談したいことを言葉にします。",
      file: "games/neko-office-consult.html",
    },
  ];

  const RECOMMENDATIONS = [
    "通勤練習",
    "身の回りの整理・整頓・掃除",
    "適度な運動",
    "図書館やカフェでの読書・自習",
    "高血圧・糖尿病・歯科など、ほかの病気の通院",
    "育児・介護について親族やケアマネジャーへ相談",
  ];

  const CERTIFICATES = {
    "RA-20260722-0001": {
      status: "valid",
      holder: "佐藤みらい",
      completedAt: "2026年7月22日",
      validUntil: "2028年1月21日",
      title: "復職 AI Ready（アイレディ） 復職準備コース修了証明書",
    },
    "RA-20240115-0007": {
      status: "expired",
      holder: "架空 太郎",
      completedAt: "2024年1月15日",
      validUntil: "2025年7月14日",
      title: "復職 AI Ready（アイレディ） 復職準備コース修了証明書",
    },
  };

  function emptyDay() {
    return {
      morningDone: false,
      eveningDone: false,
      morning: {
        wakeTime: "07:00",
        sleepHours: "7",
        sleepQuality: "ふつう",
        breakfast: "食べた",
        medication: "",
        condition: "3",
        mood: "3",
        plan: "",
        commutePlan: "なし",
        concern: "",
      },
      evening: {
        accomplished: "",
        fatigue: "3",
        moodChange: "変わらない",
        commuteResult: "実施していない",
        outing: "なし",
        learning: "なし",
        challenge: "",
        tomorrow: "",
        consult: "",
      },
      recommendations: [],
      customRecommendation: "",
    };
  }

  function createInitialState() {
    const days = {};
    DAYS.forEach((day) => {
      days[day.id] = emptyDay();
    });
    const videos = {};
    VIDEOS.forEach((video) => {
      videos[video.id] = false;
    });
    const games = {};
    GAMES.forEach((game) => {
      games[game.id] = false;
    });
    return {
      version: 1,
      profile: "start",
      consented: false,
      currentDay: 1,
      days,
      videos,
      publicVideos: { 1: false, 7: false },
      games,
      finalReflection: {
        learned: "",
        stableRoutine: "",
        remainingConcern: "",
        nextAction: "",
      },
      finalReflectionSaved: false,
      interviewPrep: {
        conditionSummary: "",
        commuteSummary: "",
        accommodations: "",
        questions: "",
        medication: "",
        freeText: "",
      },
      interviewPrepSaved: false,
      sharing: {
        accommodations: false,
        interviewDetails: false,
        freeText: false,
        medication: false,
      },
      decision: null,
      decisionReason: "",
      decisionAt: null,
    };
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function fillDay(day, index) {
    day.morningDone = true;
    day.eveningDone = true;
    day.morning = {
      wakeTime: index % 3 === 0 ? "07:10" : "06:55",
      sleepHours: index % 4 === 0 ? "6.5" : "7",
      sleepQuality: index % 4 === 0 ? "やや浅い" : "ふつう",
      breakfast: "食べた",
      medication: "朝食後に服用（架空データ）",
      condition: index < 3 ? "3" : "4",
      mood: "3",
      plan: index % 2 === 0 ? "図書館で1時間読書" : "生活リズムの確認",
      commutePlan: index > 3 ? "あり" : "なし",
      concern: "",
    };
    day.evening = {
      accomplished: index > 3 ? "午前中に外出し、予定どおり帰宅できた" : "起床時間をそろえられた",
      fatigue: index > 5 ? "3" : "4",
      moodChange: "少し落ち着いた",
      commuteResult: index > 3 ? "実施した" : "実施していない",
      outing: index > 3 ? "通勤経路の一部を練習" : "近所を散歩",
      learning: index % 2 === 0 ? "動画" : "ゲーム",
      challenge: index === 2 ? "午後に少し疲れた" : "",
      tomorrow: "無理をせず同じ時間に起きる",
      consult: "",
    };
    day.recommendations = index > 3 ? ["通勤練習", "適度な運動"] : ["身の回りの整理・整頓・掃除"];
  }

  function createProfile(profile) {
    const state = createInitialState();
    state.profile = profile;
    if (profile === "start") return state;
    state.consented = true;

    const weekdayIds = DAYS.filter((day) => !day.weekend).map((day) => day.id);
    const fillCount = profile === "mid" ? 4 : 8;
    weekdayIds.slice(0, fillCount).forEach((id, index) => fillDay(state.days[id], index));
    state.currentDay = profile === "mid" ? 7 : 14;

    if (profile === "mid") {
      state.videos[1] = true;
      state.games.margin = true;
      return state;
    }

    VIDEOS.forEach((video) => {
      state.videos[video.id] = true;
    });
    GAMES.forEach((game) => {
      state.games[game.id] = true;
    });
    state.finalReflection = {
      learned: "朝の時間をそろえると、その日の予定を立てやすいと分かりました。",
      stableRoutine: "平日は7時前後に起床し、午前中に外出するリズムが整ってきました。",
      remainingConcern: "午後に疲れが出やすいため、最初は残業を避けたいです。",
      nextAction: "復職初日の持ち物と通勤経路を前日に確認します。",
    };
    state.finalReflectionSaved = true;
    state.interviewPrep = {
      conditionSummary: "午前中の活動は安定しています。午後は休憩を入れると予定を続けられます。",
      commuteSummary: "通勤経路を3回練習し、混雑する時間帯も確認しました。",
      accommodations: "復職後2週間は残業を避け、昼休みに静かな場所で休憩したいです。",
      questions: "復職初週の業務量と、困ったときの相談先を確認したいです。",
      medication: "朝食後に服用（架空データ）",
      freeText: "面談当日は、段階的な業務再開について相談したいです。",
    };
    state.interviewPrepSaved = true;
    state.sharing.accommodations = true;
    state.sharing.interviewDetails = true;

    if (profile === "complete") {
      state.decision = "formal";
      state.decisionReason = "準備内容を確認し、面談を希望します。";
      state.decisionAt = "2026年7月22日 10:30";
    }
    return state;
  }

  function normalizeState(raw) {
    const base = createInitialState();
    if (!raw || typeof raw !== "object") return base;
    const merged = Object.assign(base, raw);
    merged.days = Object.assign(base.days, raw.days || {});
    DAYS.forEach((day) => {
      merged.days[day.id] = Object.assign(emptyDay(), merged.days[day.id] || {});
      merged.days[day.id].morning = Object.assign(emptyDay().morning, merged.days[day.id].morning || {});
      merged.days[day.id].evening = Object.assign(emptyDay().evening, merged.days[day.id].evening || {});
      if (!Array.isArray(merged.days[day.id].recommendations)) merged.days[day.id].recommendations = [];
    });
    merged.videos = Object.assign(base.videos, raw.videos || {});
    merged.publicVideos = Object.assign(base.publicVideos, raw.publicVideos || {});
    merged.games = Object.assign(base.games, raw.games || {});
    merged.finalReflection = Object.assign(base.finalReflection, raw.finalReflection || {});
    merged.interviewPrep = Object.assign(base.interviewPrep, raw.interviewPrep || {});
    merged.sharing = Object.assign(base.sharing, raw.sharing || {});
    return merged;
  }

  function completion(state) {
    const completedDays = DAYS.filter((day) => !day.weekend && state.days[day.id].morningDone && state.days[day.id].eveningDone).length;
    const videosDone = VIDEOS.filter((video) => state.videos[video.id]).length;
    const gamesDone = GAMES.filter((game) => state.games[game.id]).length;
    const items = [
      { id: "records", label: "平日8日以上の朝・夕記録", done: completedDays >= 8, value: `${completedDays}/8日` },
      { id: "videos", label: "自己学習動画7本", done: videosDone === VIDEOS.length, value: `${videosDone}/7本` },
      { id: "games", label: "必須ゲーム3種", done: gamesDone === GAMES.length, value: `${gamesDone}/3種` },
      { id: "reflection", label: "最終振り返り", done: Boolean(state.finalReflectionSaved), value: state.finalReflectionSaved ? "保存済み" : "未完了" },
      { id: "interview", label: "面談準備シート", done: Boolean(state.interviewPrepSaved), value: state.interviewPrepSaved ? "保存済み" : "未完了" },
      { id: "decision", label: "産業医面談の正式申込み", done: state.decision === "formal", value: state.decision === "formal" ? "登録済み" : "未登録" },
    ];
    return {
      completedDays,
      videosDone,
      gamesDone,
      items,
      readyBeforeDecision: items.slice(0, 5).every((item) => item.done),
      complete: items.every((item) => item.done),
      unmet: items.filter((item) => !item.done),
    };
  }

  function participantStatus(state) {
    const progress = completion(state);
    if (state.decision === "formal" && progress.complete) return "修了・正式申込み済み";
    if (state.decision === "formal") return "未修了での産業医面談の申し込み";
    if (state.decision === "postpone") return "面談延期";
    if (state.decision === "cancel") return "利用中止";
    if (state.consented) return "実施中";
    return "開始前";
  }

  function average(values) {
    if (!values.length) return null;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  function summaryForCompany(state) {
    const recorded = DAYS.filter((day) => !day.weekend && state.days[day.id].morningDone && state.days[day.id].eveningDone);
    const wakeMinutes = recorded
      .map((day) => state.days[day.id].morning.wakeTime)
      .filter(Boolean)
      .map((time) => {
        const [hours, minutes] = time.split(":").map(Number);
        return hours * 60 + minutes;
      });
    const avgWake = average(wakeMinutes);
    const roundedWake = avgWake === null ? null : Math.round(avgWake);
    const wakeText = roundedWake === null
      ? "記録なし"
      : `${String(Math.floor(roundedWake / 60) % 24).padStart(2, "0")}:${String(roundedWake % 60).padStart(2, "0")}前後`;
    const commuteCount = recorded.filter((day) => state.days[day.id].evening.commuteResult === "実施した" || state.days[day.id].recommendations.includes("通勤練習")).length;
    return {
      recordDays: completion(state).completedDays,
      routine: avgWake === null ? "記録がまだありません" : `起床は${wakeText}。平日の朝・夕記録から自動作成した要約です。`,
      commute: commuteCount ? `通勤練習または通勤経路確認の記録：${commuteCount}日` : "通勤練習の記録はまだありません",
      status: participantStatus(state),
    };
  }

  function verifyCertificate(number) {
    const normalized = String(number || "").trim().toUpperCase();
    if (!/^RA-\d{8}-\d{4}$/.test(normalized)) {
      return { status: "format-error", number: normalized };
    }
    const certificate = CERTIFICATES[normalized];
    if (!certificate) return { status: "not-found", number: normalized };
    return Object.assign({ number: normalized }, certificate);
  }

  return {
    STORAGE_KEY,
    DAYS,
    VIDEOS,
    GAMES,
    RECOMMENDATIONS,
    createInitialState,
    createProfile,
    normalizeState,
    completion,
    participantStatus,
    summaryForCompany,
    verifyCertificate,
    clone,
  };
});
