[CmdletBinding()]
param(
    [string]$ApiBase = 'http://127.0.0.1:50021'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$specPath = Join-Path $projectRoot 'voice-lines.json'
$voiceDir = Join-Path $projectRoot 'voice'
$manifestPath = Join-Path $voiceDir 'voice_manifest.json'
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

if (-not (Test-Path -LiteralPath $specPath -PathType Leaf)) {
    throw "Voice script not found: $specPath"
}

[void](New-Item -ItemType Directory -Path $voiceDir -Force)
$spec = Get-Content -LiteralPath $specPath -Raw -Encoding UTF8 | ConvertFrom-Json
$lines = @($spec.lines)
$drVoice = $spec.voices.'dr-yamaneko'
$yukiVoice = $spec.voices.yuki
$requiredIds = @(
    'welcome-dr', 'welcome-yuki', 'learn-dr', 'reader-yuki',
    'commute-dr', 'diary-yuki', 'report-dr', 'rest-yuki',
    'game-start-dr', 'game-interrupt-yuki', 'game-correct-dr',
    'game-finish-yuki', 'invoice-dr', 'invoice-yuki',
    'library-dr', 'library-yuki'
)

if ($lines.Count -ne $requiredIds.Count) {
    throw "Expected $($requiredIds.Count) lines, found $($lines.Count)."
}

$ids = @($lines | ForEach-Object { [string]$_.id })
$files = @($lines | ForEach-Object { [string]$_.file })
if (($ids | Sort-Object -Unique).Count -ne $ids.Count) {
    throw 'Voice line IDs must be unique.'
}
if (($files | Sort-Object -Unique).Count -ne $files.Count) {
    throw 'Voice file names must be unique.'
}
foreach ($requiredId in $requiredIds) {
    if ($ids -notcontains $requiredId) {
        throw "Required voice line is missing: $requiredId"
    }
}

$versionResponse = Invoke-RestMethod -Uri "$ApiBase/version" -Method Get
$engineVersion = [string]$versionResponse
$speakers = Invoke-RestMethod -Uri "$ApiBase/speakers" -Method Get
$availableStyleIds = @(
    $speakers |
        ForEach-Object { $_.styles } |
        ForEach-Object { [int]$_.id }
)
foreach ($speakerId in @(2, 3)) {
    if ($availableStyleIds -notcontains $speakerId) {
        throw "VOICEVOX speaker style ID $speakerId is not available."
    }
}

$manifestEntries = New-Object System.Collections.Generic.List[object]
foreach ($line in $lines) {
    $speaker = [int]$line.speaker
    $character = [string]$line.character
    $credit = [string]$line.credit
    $fileName = [string]$line.file

    if ($fileName -notmatch '^[a-z0-9-]+\.wav$') {
        throw "Invalid voice file name: $fileName"
    }
    $expectedVoice = if ($speaker -eq 3) { $drVoice } elseif ($speaker -eq 2) { $yukiVoice } else { $null }
    if ($null -eq $expectedVoice) {
        throw "Unexpected speaker ID: $speaker"
    }
    if (($character -ne [string]$expectedVoice.character) -or ($credit -ne [string]$expectedVoice.credit)) {
        throw "Character or credit does not match speaker $speaker for line: $($line.id)"
    }

    $speedScale = if ($speaker -eq 3) { 1.02 } else { 1.00 }
    $intonationScale = 1.05
    $encodedText = [Uri]::EscapeDataString([string]$line.text)
    $queryUri = "$ApiBase/audio_query?text=$encodedText&speaker=$speaker"
    $query = Invoke-RestMethod -Uri $queryUri -Method Post
    $query.speedScale = $speedScale
    $query.pitchScale = 0.0
    $query.intonationScale = $intonationScale
    $query.volumeScale = 1.0
    $query.prePhonemeLength = 0.12
    $query.postPhonemeLength = 0.20
    $query.outputSamplingRate = 48000
    $query.outputStereo = $false
    $queryJson = $query | ConvertTo-Json -Depth 30 -Compress

    $outputPath = Join-Path $voiceDir $fileName
    Invoke-WebRequest `
        -Uri "$ApiBase/synthesis?speaker=$speaker&enable_interrogative_upspeak=true" `
        -Method Post `
        -ContentType 'application/json' `
        -Body ([Text.Encoding]::UTF8.GetBytes($queryJson)) `
        -OutFile $outputPath `
        -UseBasicParsing

    $bytes = [IO.File]::ReadAllBytes($outputPath)
    if (($bytes.Length -lt 44) -or
        ([Text.Encoding]::ASCII.GetString($bytes, 0, 4) -ne 'RIFF') -or
        ([Text.Encoding]::ASCII.GetString($bytes, 8, 4) -ne 'WAVE')) {
        throw "VOICEVOX did not produce a valid WAV file: $outputPath"
    }

    $hash = (Get-FileHash -LiteralPath $outputPath -Algorithm SHA256).Hash.ToLowerInvariant()
    $manifestEntries.Add([ordered]@{
        id = [string]$line.id
        file = "voice/$fileName"
        speaker = $speaker
        character = $character
        credit = $credit
        purpose = [string]$line.purpose
        text = [string]$line.text
        speedScale = $speedScale
        intonationScale = $intonationScale
        bytes = $bytes.Length
        sha256 = $hash
    })
    Write-Host ("Generated {0} ({1} bytes)" -f $fileName, $bytes.Length)
}

$manifest = [ordered]@{
    schemaVersion = 1
    generatedAt = (Get-Date).ToUniversalTime().ToString('o')
    generator = [ordered]@{
        name = 'VOICEVOX'
        engineVersion = $engineVersion
        apiBase = $ApiBase
    }
    delivery = [ordered]@{
        staticAssets = $true
        externalVoiceServiceRequiredAtRuntime = $false
    }
    audioFormat = [ordered]@{
        container = 'WAV'
        encoding = 'PCM 16-bit'
        sampleRate = 48000
        channels = 1
    }
    characterNotice = [string]$spec.characterNotice
    entries = $manifestEntries
}
$manifestJson = $manifest | ConvertTo-Json -Depth 20
[IO.File]::WriteAllText($manifestPath, $manifestJson + [Environment]::NewLine, $utf8NoBom)
Write-Host "Wrote manifest: $manifestPath"
