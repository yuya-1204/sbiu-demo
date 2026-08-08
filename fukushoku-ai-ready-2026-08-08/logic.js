(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.Ready20260808 = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const VERSION = "2026-08-08";
  const STORAGE_KEY = "fukushokuAiReady20260808V1";
  const DAYS = [
    ["2026-08-10", "8/10", "月", false], ["2026-08-11", "8/11", "火", false],
    ["2026-08-12", "8/12", "水", false], ["2026-08-13", "8/13", "木", false],
    ["2026-08-14", "8/14", "金", false], ["2026-08-15", "8/15", "土", true],
    ["2026-08-16", "8/16", "日", true], ["2026-08-17", "8/17", "月", false],
    ["2026-08-18", "8/18", "火", false], ["2026-08-19", "8/19", "水", false],
    ["2026-08-20", "8/20", "木", false], ["2026-08-21", "8/21", "金", false],
    ["2026-08-22", "8/22", "土", true], ["2026-08-23", "8/23", "日", true],
  ].map((item, index) => ({ id: index + 1, date: item[0], label: item[1], weekday: item[2], weekend: item[3] }));

  const VIDEOS = [
    { id: "v00", no: "00", title: "利用開始・安全説明", tag: "はじめに", duration: "約6分", file: "../videos/V00_利用開始・安全説明_Drやまねことゆきちゃん.mp4", note: "AI Readyの目的、記録の扱い、無理をしない進め方を確認します。" },
    { id: "v01", no: "01", title: "職場復帰までの流れ", tag: "復職知識", duration: "約8分", file: "../videos/V01_職場復帰までの流れ_Drやまねことゆきちゃん.mp4", note: "治療・生活の安定から復職後まで、一般的な流れを俯瞰します。" },
    { id: "v02", no: "02", title: "うつ病を正しく知る", tag: "疾病理解", duration: "約9分", file: "../videos/V02_うつ病を正しく知る_Drやまねことゆきちゃん.mp4", note: "症状の出方には個人差があることを前提に、基本を学びます。" },
    { id: "v03", no: "03", title: "適応反応と不安を理解する", tag: "疾病理解", duration: "約9分", file: "../videos/V03_適応反応と不安を理解する_Drやまねことゆきちゃん.mp4", note: "ストレス反応と不安の仕組みを整理します。" },
    { id: "v04", no: "04", title: "睡眠・活動・疲労の記録方法", tag: "セルフモニタリング", duration: "約8分", file: "../videos/V04_睡眠・活動・疲労の記録方法_Drやまねことゆきちゃん.mp4", note: "その日の状態だけでなく、翌日の疲労まで振り返ります。" },
    { id: "v05", no: "05", title: "不調の早期サインと相談行動", tag: "再発予防", duration: "約9分", file: "../videos/V05_不調の早期サインと相談行動_Drやまねことゆきちゃん.mp4", note: "早めに気づくためのサインと、安全な行動を考えます。" },
    { id: "v08", no: "08", title: "アサーションスキル", tag: "コミュニケーション", duration: "約10分", file: "../videos/V08_アサーションスキル_Drやまねことゆきちゃん.mp4", note: "自分と相手の双方を尊重する伝え方を練習します。" },
    { id: "v09", no: "09", title: "認知行動療法：思考の柔軟性", tag: "セルフケア", duration: "約10分", file: "../videos/V09_認知行動療法_思考の柔軟性_Drやまねことゆきちゃん.mp4", note: "考えを事実と分け、別の見方を増やす練習です。" },
    { id: "v11", no: "11", title: "セルフケア：健康的なストレス解消", tag: "セルフケア", duration: "約9分", file: "../videos/V11_セルフケア_健康的なストレス解消_Drやまねことゆきちゃん.mp4", note: "自分に合う回復行動を、小さく試して記録します。" },
  ];

  const GAMES = [
    { id: "double-mission", title: "ねこメール便：ダブルミッション", file: "games/double-mission.html", level: "主力・二重課題", time: "5〜8分", description: "依頼メールの優先順位を判断しながら、ゆきちゃんの割り込み合図と記憶コードにも対応します。" },
    { id: "invoice-rescue", title: "請求書レスキュー", file: "games/invoice-rescue.html", level: "照合＋ルール切替", time: "4〜6分", description: "注文内容と請求書を照合。途中で変わる確認ルールにも落ち着いて対応します。" },
    { id: "library-mission", title: "やまねこ図書館ミッション", file: "games/library-mission.html", level: "分類＋反応課題", time: "4〜6分", description: "本を正しい棚へ分類しつつ、館内アナウンスの合図にも反応します。" },
  ];

  const HYBRID = [
    ["動画視聴", "疾病理解、セルフケア、復職知識のインプット", "learning", "▶"],
    ["ゲーム・作業", "注意力、判断、PC作業、疲労の確認", "games", "◎"],
    ["日記", "体調・睡眠・活動と翌日への影響の把握", "diary", "✎"],
    ["レポート", "再発要因、対処策、自分で続けたい行動の整理", "report", "▤"],
    ["図書館での読書", "模擬出勤、集中の持続、外出先での作業練習", "books", "▥"],
    ["通勤練習", "朝の準備、移動、安全性、到着後・翌日の疲労確認", "commute", "↗"],
  ];

  function emptyDiary() {
    return { wake: "07:00", bed: "23:00", sleep: "7", sleepQuality: "3", morningCondition: "3", activity: "", focusMinutes: "", eveningFatigue: "3", nextMorningFatigue: "", helpful: "", note: "", saved: false };
  }

  function emptyCommute(index) {
    return { id: index + 1, plannedDate: ["2026-08-12", "2026-08-14", "2026-08-18", "2026-08-20"][index], plannedTime: "08:45", actualTime: "", result: "未実施", safe: "", arrivalFatigue: "", nextDayFatigue: "", memo: "" };
  }

  function createState() {
    return {
      version: VERSION,
      profile: "start",
      videos: {},
      games: {},
      diaries: Object.fromEntries(DAYS.map(day => [day.date, emptyDiary()])),
      selectedDay: DAYS[0].date,
      commute: [0, 1, 2, 3].map(emptyCommute),
      reading: {},
      report: { warningSigns: "", triggers: "", responses: "", habits: "", learned: "", nextSteps: "", saved: false },
      voiceEnabled: true,
      consent: false,
      updatedAt: null,
    };
  }

  function mergeState(raw) {
    const base = createState();
    if (!raw || raw.version !== VERSION) return base;
    const merged = Object.assign(base, raw);
    merged.videos = Object.assign({}, base.videos, raw.videos || {});
    merged.games = Object.assign({}, base.games, raw.games || {});
    merged.diaries = Object.assign({}, base.diaries, raw.diaries || {});
    merged.commute = base.commute.map((item, i) => Object.assign(item, (raw.commute || [])[i] || {}));
    merged.reading = Object.assign({}, raw.reading || {});
    merged.report = Object.assign(base.report, raw.report || {});
    return merged;
  }

  function sampleState(profile) {
    const state = createState();
    state.profile = profile;
    state.consent = true;
    const count = profile === "mid" ? 5 : profile === "near" ? 8 : profile === "complete" ? VIDEOS.length : 0;
    VIDEOS.slice(0, count).forEach(v => { state.videos[v.id] = { completed: true, completedAt: "2026-08-18 10:00" }; });
    const diaryCount = profile === "mid" ? 5 : profile === "near" ? 9 : profile === "complete" ? 10 : 0;
    DAYS.filter(d => !d.weekend).slice(0, diaryCount).forEach((day, index) => {
      state.diaries[day.date] = { wake: index % 3 === 0 ? "07:10" : "06:55", bed: "23:00", sleep: index % 4 === 0 ? "6.5" : "7.2", sleepQuality: index % 4 === 0 ? "2" : "3", morningCondition: index % 5 === 0 ? "2" : "3", activity: index % 2 ? "動画視聴と20分の散歩" : "図書館で45分読書", focusMinutes: index % 2 ? "35" : "45", eveningFatigue: index % 3 === 0 ? "4" : "3", nextMorningFatigue: index % 3 === 0 ? "3" : "2", helpful: "25分ごとに短い休憩を入れると続けやすかった", note: "架空のサンプル記録です。", saved: true };
    });
    if (profile !== "start") {
      state.games["double-mission"] = { score: 820, accuracy: 88, reactionMs: 1240, fatigue: 3, mode: "dual", playedAt: "2026-08-17" };
      state.reading.mikan = { progress: 72, minutes: 34, completed: false };
    }
    if (profile === "near" || profile === "complete") {
      state.games["invoice-rescue"] = { score: 760, accuracy: 83, reactionMs: 1560, fatigue: 3, mode: "standard", playedAt: "2026-08-19" };
      Object.assign(state.commute[0], { actualTime: "08:42", result: "約束どおり到着", safe: "問題なし", arrivalFatigue: "3", nextDayFatigue: "2", memo: "到着後に10分休憩してから読書を開始" });
      Object.assign(state.commute[1], { actualTime: "09:08", result: "遅れて到着", safe: "問題なし", arrivalFatigue: "4", nextDayFatigue: "4", memo: "電車遅延。翌日は予定を軽くした" });
      Object.assign(state.commute[2], { actualTime: "08:44", result: "約束どおり到着", safe: "問題なし", arrivalFatigue: "3", nextDayFatigue: "3", memo: "前夜の準備が役立った" });
      state.report = { warningSigns: "就寝が遅くなり、朝の準備に時間がかかる。小さな確認が増える。", triggers: "予定を詰めすぎた日と、休憩を後回しにした日。", responses: "予定を一段階減らし、25分作業＋5分休憩に戻す。睡眠と翌朝の疲労を記録する。", habits: "起床時刻を大きくずらさない。週に数回、外出先で短時間の読書を続ける。", learned: "同じ活動量でも、休憩の入れ方で翌日の疲労が変わることが分かった。", nextSteps: "4回目の通勤練習と、二重課題ゲームの疲労比較を行う。", saved: true };
    }
    if (profile === "complete") {
      state.games["library-mission"] = { score: 910, accuracy: 92, reactionMs: 1100, fatigue: 2, mode: "dual", playedAt: "2026-08-21" };
      Object.assign(state.commute[3], { actualTime: "08:41", result: "約束どおり到着", safe: "問題なし", arrivalFatigue: "2", nextDayFatigue: "2", memo: "落ち着いて移動できた" });
      state.reading.kagakusha = { progress: 100, minutes: 42, completed: true };
    }
    return state;
  }

  function metrics(state) {
    const weekdayDays = DAYS.filter(d => !d.weekend);
    const diaryDays = weekdayDays.filter(d => state.diaries[d.date] && state.diaries[d.date].saved).length;
    const videos = VIDEOS.filter(v => state.videos[v.id] && state.videos[v.id].completed).length;
    const games = GAMES.filter(g => state.games[g.id]).length;
    const commuteDone = state.commute.filter(a => a.result !== "未実施").length;
    const commuteOnTime = state.commute.filter(a => a.result === "約束どおり到着").length;
    const reading = Object.keys(state.reading).filter(k => (state.reading[k].minutes || 0) > 0).length;
    const totalParts = videos / VIDEOS.length + games / GAMES.length + diaryDays / 10 + Math.min(commuteDone / 4, 1) + Math.min(reading / 2, 1) + (state.report.saved ? 1 : 0);
    return { diaryDays, videos, games, commuteDone, commuteOnTime, reading, percent: Math.round(totalParts / 6 * 100) };
  }

  return { VERSION, STORAGE_KEY, DAYS, VIDEOS, GAMES, HYBRID, createState, mergeState, sampleState, metrics };
});
