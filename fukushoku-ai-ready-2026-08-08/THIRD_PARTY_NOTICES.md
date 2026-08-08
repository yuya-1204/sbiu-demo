# Third-party notices

## VOICEVOX

本デモの案内音声は、VOICEVOXで事前生成した静的音声ファイルです。デモの閲覧中にVOICEVOXや外部の音声サービスへ接続しません。

- Dr.やまねこ：VOICEVOX:ずんだもん
- ゆきちゃん：VOICEVOX:四国めたん

VOICEVOXおよび音声ライブラリのキャラクターと、本デモのDr.やまねこ・ゆきちゃんは別のキャラクターです。

利用・公開時は、VOICEVOXおよび各音声ライブラリの最新の利用規約も確認してください。

- VOICEVOX 利用規約：https://voicevox.hiroshiba.jp/term/
- ずんだもん・東北ずん子プロジェクト ガイドライン：https://zunko.jp/guideline.html
- 四国めたん・東北ずん子プロジェクト ガイドライン：https://zunko.jp/guideline.html

## 再生成方法

VOICEVOX Engineを起動した状態で、プロジェクト直下から次を実行します。

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\generate_voicevox.ps1
```

台本と話者設定は `voice-lines.json`、生成結果とハッシュ値は `voice/voice_manifest.json` に記録されます。
