param(
  [Parameter(Mandatory = $true)][string]$VaultId,
  [Parameter(Mandatory = $true)][string]$AppContainer,
  [string]$RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path,
  [string]$ProfilePath = (Join-Path $env:LOCALAPPDATA 'SortaOmega\BrowserBridge\EdgeUserData'),
  [string]$InSchoolOrigin = 'https://mailand.inschool.visma.no',
  [switch]$CaptureFiles,
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
if ($VaultId -notmatch '^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$') { throw 'A vault UUID is required.' }
if ($AppContainer -notmatch '^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$') { throw 'A literal Docker app container name is required.' }
$origin = [Uri]$InSchoolOrigin
if ($origin.Scheme -ne 'https' -or -not $origin.Host.EndsWith('.inschool.visma.no') -or $origin.AbsolutePath -ne '/' -or $origin.Query -or $origin.Fragment) { throw 'A registered InSchool HTTPS origin is required.' }
$statusDirectory = Split-Path -Parent $ProfilePath
New-Item -ItemType Directory -Path $statusDirectory -Force | Out-Null
$statusLog = Join-Path $statusDirectory 'teams-assignments-sync-status.jsonl'

$fileCaptureMutex = $null
. (Join-Path $PSScriptRoot 'school-browser-file-lock.ps1')
try {
  if ($CaptureFiles) { $fileCaptureMutex = Enter-SchoolBrowserFileLock -ProfilePath $ProfilePath }
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
    try {
      $response = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$portText/json/version" -TimeoutSec 2
      return [int]$response.StatusCode -eq 200
    } catch { return $false }
  }
  if (-not (Test-SchoolEdgeReady)) {
    $launcher = Join-Path $RepositoryRoot 'apps\browser-bridge\launch-edge-profile.ps1'
    if (-not (Test-Path -LiteralPath $launcher)) { throw 'The school Edge launcher is missing.' }
    & $launcher -InSchoolOrigin $origin.GetLeftPart([UriPartial]::Authority) | Out-Null
    for ($attempt = 0; $attempt -lt 10 -and -not (Test-SchoolEdgeReady); $attempt++) { Start-Sleep -Seconds 1 }
    if (-not (Test-SchoolEdgeReady)) { throw 'The signed-in school Edge window could not be reopened.' }
  }

  $spool = Join-Path $env:LOCALAPPDATA 'SortaOmega\BrowserBridge\spool'
  New-Item -ItemType Directory -Path $spool -Force | Out-Null
  $name = 'teams-assignments-' + [Guid]::NewGuid().ToString('N') + '.json'
  $artifact = Join-Path $spool $name
  $containerArtifact = '/tmp/' + $name
  $copied = $false
  $fileReport = $null
  try {
    $bridgeOutput = @(& node $bridge --provider teams-assignments --cdp-profile $ProfilePath --noninteractive true --output $artifact)
    if ($LASTEXITCODE -ne 0) {
      $errorCode = 'browser_bridge_failed'
      if ($bridgeOutput.Count -gt 0) { try { $errorCode = ($bridgeOutput[-1] | ConvertFrom-Json).errorCode } catch { } }
      if ($errorCode -notmatch '^[a-z0-9_]{1,100}$') { $errorCode = 'browser_bridge_failed' }
      throw "The Teams assignment capture failed: $errorCode"
    }
    $bridgeReport = $bridgeOutput[-1] | ConvertFrom-Json
    if ($bridgeReport.provider -ne 'teams-assignments' -or $bridgeReport.format -ne 'omega_teams_assignments_json_v1' -or $bridgeReport.itemCount -lt 1 -or $bridgeReport.itemCount -gt 500) { throw 'The Teams bridge returned an invalid capture report.' }
    if (Test-Path -LiteralPath $statusLog) {
      $previousSuccess = @(Get-Content -LiteralPath $statusLog -Encoding UTF8 | ForEach-Object {
        try { $_ | ConvertFrom-Json } catch { $null }
      } | Where-Object { $_ -and $_.status -eq 'succeeded' -and -not $_.dryRun -and $null -ne $_.captured } | Select-Object -Last 1)
      if ($previousSuccess.Count -eq 1 -and [int]$bridgeReport.itemCount -lt [int]$previousSuccess[0].captured) {
        throw 'The Teams assignment capture is smaller than the last live import; no missing assignments were reconciled. Inspect Teams source coverage before accepting a lower count.'
      }
    }
    $snapshot = Get-Content -LiteralPath $artifact -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($snapshot.version -ne $bridgeReport.format -or @($snapshot.records).Count -ne [int]$bridgeReport.itemCount -or [int]$snapshot.coverage.visibleCardCount -ne [int]$bridgeReport.itemCount -or [int]$snapshot.coverage.capturedDetailCount -ne [int]$bridgeReport.itemCount) { throw 'The Teams snapshot did not account for every visible assignment card.' }
    & docker cp $artifact "${AppContainer}:$containerArtifact"
    if ($LASTEXITCODE -ne 0) { throw 'The Teams snapshot could not be transferred to the app container.' }
    $copied = $true
    $importArgs = @('exec', $AppContainer, 'node', '/app/apps/api/dist/import-teams-assignments.js', '--vault-id', $VaultId, '--file', $containerArtifact)
    if ($DryRun) { $importArgs += @('--dry-run', 'true') }
    $importOutput = @(& docker @importArgs)
    if ($LASTEXITCODE -ne 0) { throw 'The Teams assignment snapshot was not applied.' }
    $importReport = $importOutput[-1] | ConvertFrom-Json
    $actions = $importReport.counts.assignments
    if ($null -eq $actions -or [bool]$importReport.dryRun -ne [bool]$DryRun) { throw 'The Teams import returned an invalid report.' }
    $accounted = [int]$actions.created + [int]$actions.updated + [int]$actions.unchanged + [int]$actions.stale + [int]$actions.skipped
    if ($accounted -ne [int]$bridgeReport.itemCount) { throw 'The Teams import did not account for every captured assignment.' }
    if ($CaptureFiles) {
      $spoolFull = [IO.Path]::GetFullPath($spool).TrimEnd('\')
      $batchName = 'personal-' + [Guid]::NewGuid().ToString('N')
      $batchRoot = [IO.Path]::GetFullPath((Join-Path $spoolFull $batchName)).TrimEnd('\')
      if ([IO.Path]::GetDirectoryName($batchRoot) -ne $spoolFull -or $batchName -notmatch '^personal-[0-9a-f]{32}$') { throw 'Unsafe Teams assignment-file staging path.' }
      try {
        New-Item -ItemType Directory -Path $batchRoot | Out-Null
        $manifestPath = Join-Path $batchRoot 'manifest.json'
        $fileOutput = @(& node $bridge --provider teams-assignment-files --cdp-profile $ProfilePath --noninteractive true --base-snapshot $artifact --output $manifestPath)
        if ($LASTEXITCODE -ne 0) {
          $errorCode = 'browser_bridge_failed'
          if ($fileOutput.Count) { try { $errorCode = ($fileOutput[-1] | ConvertFrom-Json).errorCode } catch { } }
          if ($errorCode -notmatch '^[a-z0-9_]{1,100}$') { $errorCode = 'browser_bridge_failed' }
          throw "The Teams assignment-file capture failed: $errorCode"
        }
        $fileReport = $fileOutput[-1] | ConvertFrom-Json
        $manifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
        if ($fileReport.provider -ne 'teams-assignment-files' -or $fileReport.format -ne 'omega_personal_files_v1' -or $manifest.deviceKey -ne 'teams-sharepoint' -or [int]$fileReport.assignments -ne [int]$bridgeReport.itemCount -or [int]$fileReport.downloaded -ne [int]$fileReport.itemCount -or @($manifest.items).Count -ne [int]$fileReport.itemCount) { throw 'The Teams assignment-file capture report is inconsistent.' }
        if ([int]$fileReport.itemCount -gt 0) {
          $fileImportOutput = @(& (Join-Path $PSScriptRoot 'import-teams-powerpoints.ps1') -StagingRoot $batchRoot -VaultId $VaultId -AppContainer $AppContainer -DryRun:$DryRun)
          $fileImport = $fileImportOutput[-1] | ConvertFrom-Json
          if ($fileImport.status -ne 'succeeded' -or [int]$fileImport.captured -ne [int]$fileReport.itemCount) { throw 'The Teams assignment-file import was not fully accounted for.' }
        }
      } finally {
        if (Test-Path -LiteralPath $batchRoot) { Remove-Item -LiteralPath $batchRoot -Recurse -Force }
      }
    }
  } finally {
    if ($copied) { & docker exec -u 0 $AppContainer rm $containerArtifact | Out-Null }
    if (Test-Path -LiteralPath $artifact) { Remove-Item -LiteralPath $artifact -Force }
  }
  $status = [ordered]@{at=(Get-Date).ToUniversalTime().ToString('o');status='succeeded';dryRun=[bool]$DryRun;captured=[int]$bridgeReport.itemCount;created=[int]$actions.created;updated=[int]$actions.updated;unchanged=[int]$actions.unchanged;stale=[int]$actions.stale;skipped=[int]$actions.skipped;attachmentCapture=[bool]$CaptureFiles;attachmentsDownloaded=$(if ($fileReport) { [int]$fileReport.downloaded } else { $null });attachmentsUnsupported=$(if ($fileReport) { [int]$fileReport.unsupported } else { $null });coverageComplete=[bool]$bridgeReport.coverageComplete;coverageLimitation=$bridgeReport.coverageLimitation}
  [IO.File]::AppendAllText($statusLog, (($status | ConvertTo-Json -Compress) + "`n"))
  Write-Output ($status | ConvertTo-Json -Compress)
} catch {
  $message = $_.Exception.Message
  if ($message.Length -gt 240) { $message = $message.Substring(0,240) }
  [IO.File]::AppendAllText($statusLog, (([ordered]@{at=(Get-Date).ToUniversalTime().ToString('o');status='failed';reason=$message} | ConvertTo-Json -Compress) + "`n"))
  throw
} finally {
  Exit-SchoolBrowserFileLock -Mutex $fileCaptureMutex
}
