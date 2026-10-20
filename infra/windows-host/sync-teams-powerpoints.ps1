param(
  [Parameter(Mandatory = $true)][string]$VaultId,
  [Parameter(Mandatory = $true)][string]$AppContainer,
  [string]$RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path,
  [string]$ProfilePath = (Join-Path $env:LOCALAPPDATA 'SortaOmega\BrowserBridge\EdgeUserData'),
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
if ($VaultId -notmatch '^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$') { throw 'A vault UUID is required.' }
if ($AppContainer -notmatch '^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$') { throw 'A literal Docker app container name is required.' }
$statusDirectory = Split-Path -Parent $ProfilePath
New-Item -ItemType Directory -Path $statusDirectory -Force | Out-Null
$statusLog = Join-Path $statusDirectory 'teams-powerpoints-sync-status.jsonl'
$spool = [IO.Path]::GetFullPath((Join-Path $env:LOCALAPPDATA 'SortaOmega\BrowserBridge\spool')).TrimEnd('\')
New-Item -ItemType Directory -Path $spool -Force | Out-Null
$batchName = 'personal-' + [Guid]::NewGuid().ToString('N')
$batchRoot = [IO.Path]::GetFullPath((Join-Path $spool $batchName)).TrimEnd('\')
if ([IO.Path]::GetDirectoryName($batchRoot) -ne $spool -or $batchName -notmatch '^personal-[0-9a-f]{32}$') { throw 'Unsafe Teams PowerPoint staging path.' }

$fileCaptureMutex = $null
. (Join-Path $PSScriptRoot 'school-browser-file-lock.ps1')
try {
  $fileCaptureMutex = Enter-SchoolBrowserFileLock -ProfilePath $ProfilePath
  $bridge = Join-Path $RepositoryRoot 'apps\browser-bridge\dist\cli.js'
  $compiler = Join-Path $RepositoryRoot 'apps\browser-bridge\node_modules\.bin\tsc.cmd'
  $bridgeProject = Join-Path $RepositoryRoot 'apps\browser-bridge\tsconfig.json'
  if (-not (Test-Path -LiteralPath $compiler) -or -not (Test-Path -LiteralPath $bridgeProject)) { throw 'Install the browser bridge dependencies before syncing.' }
  & $compiler -p $bridgeProject | Out-Null
  if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $bridge)) { throw 'The Teams browser bridge could not be built.' }

  $portFile = Join-Path $ProfilePath 'DevToolsActivePort'
  function Test-SchoolEdgeReady {
    if (-not (Test-Path -LiteralPath $portFile)) { return $false }
    $portText = (Get-Content -LiteralPath $portFile -TotalCount 1).Trim()
    if ($portText -notmatch '^\d{4,5}$' -or [int]$portText -lt 1024 -or [int]$portText -gt 65535) { return $false }
    try { return (Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$portText/json/version" -TimeoutSec 2).StatusCode -eq 200 } catch { return $false }
  }
  if (-not (Test-SchoolEdgeReady)) {
    $launcher = Join-Path $RepositoryRoot 'apps\browser-bridge\launch-edge-profile.ps1'
    & $launcher | Out-Null
    for ($attempt = 0; $attempt -lt 10 -and -not (Test-SchoolEdgeReady); $attempt++) { Start-Sleep -Seconds 1 }
    if (-not (Test-SchoolEdgeReady)) { throw 'The signed-in school Edge window could not be reopened.' }
  }

  New-Item -ItemType Directory -Path $batchRoot | Out-Null
  $manifestPath = Join-Path $batchRoot 'manifest.json'
  $bridgeOutput = @(& node $bridge --provider teams-powerpoints --cdp-profile $ProfilePath --noninteractive true --output $manifestPath)
  if ($LASTEXITCODE -ne 0) {
    $errorCode = 'browser_bridge_failed'
    if ($bridgeOutput.Count) { try { $errorCode = ($bridgeOutput[-1] | ConvertFrom-Json).errorCode } catch { } }
    if ($errorCode -notmatch '^[a-z0-9_]{1,100}$') { $errorCode = 'browser_bridge_failed' }
    throw "The Teams PowerPoint capture failed: $errorCode"
  }
  $report = $bridgeOutput[-1] | ConvertFrom-Json
  $manifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($report.provider -ne 'teams-powerpoints' -or $report.format -ne 'omega_personal_files_v1' -or $report.itemCount -lt 1 -or $report.itemCount -gt 2048 -or $manifest.deviceKey -ne 'teams-sharepoint' -or @($manifest.items).Count -ne [int]$report.itemCount) { throw 'The Teams PowerPoint capture report is inconsistent.' }
  $skippedFiles = @($report.skippedFiles | Where-Object { $_ })
  if ($skippedFiles.Count -gt 5 -or @($skippedFiles | Where-Object { $_.sourcePosition -notmatch '^class_\d+_channel_\d+_file_\d+$' -or $_.reason -notin @('teams_powerpoint_download_invalid','teams_powerpoint_download_event_timeout','teams_powerpoint_download_path_timeout','teams_powerpoint_download_path_failed','teams_powerpoint_download_missing','teams_powerpoint_download_empty','teams_powerpoint_download_was_bundle','teams_powerpoint_archive_invalid','teams_school_file_signature_invalid','teams_school_file_download_was_bundle') }).Count -gt 0 -or [int]$report.itemCount + $skippedFiles.Count -gt 2048) { throw 'The Teams PowerPoint skipped-file report is invalid.' }
  if (Test-Path -LiteralPath $statusLog) {
    $previousSuccess = @(Get-Content -LiteralPath $statusLog -Encoding UTF8 | ForEach-Object {
      try { $_ | ConvertFrom-Json } catch { $null }
    } | Where-Object { $_ -and $_.status -eq 'succeeded' -and -not $_.dryRun } | Select-Object -Last 1)
    if ($previousSuccess.Count -eq 1 -and ([int]$report.classes -lt [int]$previousSuccess[0].classes -or [int]$report.channels -lt [int]$previousSuccess[0].channels -or [int]$report.itemCount + $skippedFiles.Count -lt [int]$previousSuccess[0].captured)) {
      throw 'The Teams PowerPoint capture is smaller than the last complete import; no files were imported. Inspect live source coverage before accepting removals.'
    }
  }

  $importScript = Join-Path $PSScriptRoot 'import-teams-powerpoints.ps1'
  $importOutput = @(& $importScript -StagingRoot $batchRoot -VaultId $VaultId -AppContainer $AppContainer -DryRun:$DryRun)
  $import = $importOutput[-1] | ConvertFrom-Json
  if ($import.status -ne 'succeeded' -or [int]$import.captured -ne [int]$report.itemCount -or [int]$import.counts.created + [int]$import.counts.updated + [int]$import.counts.unchanged -ne [int]$report.itemCount) { throw 'The Teams PowerPoint import was not fully accounted for.' }
  $status = [ordered]@{ at = (Get-Date).ToUniversalTime().ToString('o'); status = $(if ($skippedFiles.Count) { 'partial' } else { 'succeeded' }); dryRun = [bool]$DryRun; classes = [int]$report.classes; channels = [int]$report.channels; classSummaries = $report.classSummaries; postPresentations = [int]$report.postPresentations; postDocuments = [int]$report.postDocuments; presentations = [int]$report.presentations; documents = [int]$report.documents; captured = [int]$report.itemCount; skippedCount = $skippedFiles.Count; skippedFiles = $skippedFiles; bytes = [long]$report.bytes; created = [int]$import.counts.created; updated = [int]$import.counts.updated; unchanged = [int]$import.counts.unchanged; textExtracted = [int]$import.counts.textExtracted; textUnavailable = [int]$import.counts.textUnavailable; coverageComplete = $false; coverageLimitation = $report.coverageLimitation }
} catch {
  $message = $_.Exception.Message
  if ($message.Length -gt 240) { $message = $message.Substring(0, 240) }
  [IO.File]::AppendAllText($statusLog, (([ordered]@{ at = (Get-Date).ToUniversalTime().ToString('o'); status = 'failed'; reason = $message } | ConvertTo-Json -Compress) + "`n"))
  throw
} finally {
  try {
  if (Test-Path -LiteralPath $batchRoot) {
    try {
      Remove-Item -LiteralPath $batchRoot -Recurse -Force -ErrorAction Stop
    } catch {
      $message = $_.Exception.Message
      if ($message.Length -gt 240) { $message = $message.Substring(0, 240) }
      [IO.File]::AppendAllText($statusLog, (([ordered]@{ at = (Get-Date).ToUniversalTime().ToString('o'); status = 'failed'; reason = "staging_cleanup_failed: $message" } | ConvertTo-Json -Compress) + "`n"))
      throw
    }
  }
  } finally { Exit-SchoolBrowserFileLock -Mutex $fileCaptureMutex }
}

# A successful import is not a completed run until its temporary files are gone.
[IO.File]::AppendAllText($statusLog, (($status | ConvertTo-Json -Compress) + "`n"))
$status | ConvertTo-Json -Compress
