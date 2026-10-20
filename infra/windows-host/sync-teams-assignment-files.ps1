param(
  [Parameter(Mandatory = $true)][string]$VaultId,
  [Parameter(Mandatory = $true)][string]$AppContainer,
  [string]$RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path,
  [string]$ProfilePath = (Join-Path $env:LOCALAPPDATA 'SortaOmega\BrowserBridge\EdgeUserData'),
  [int]$RecordIndex = -1,
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
if ($VaultId -notmatch '^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$') { throw 'A vault UUID is required.' }
if ($AppContainer -notmatch '^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$') { throw 'A literal Docker app container name is required.' }
if ($RecordIndex -lt -1 -or $RecordIndex -gt 499) { throw 'RecordIndex must be -1 or an index from 0 to 499.' }
$statusDirectory = Split-Path -Parent $ProfilePath
New-Item -ItemType Directory -Path $statusDirectory -Force | Out-Null
$statusLog = Join-Path $statusDirectory 'teams-assignment-files-sync-status.jsonl'
$spool = [IO.Path]::GetFullPath((Join-Path $statusDirectory 'spool')).TrimEnd('\')
New-Item -ItemType Directory -Path $spool -Force | Out-Null
$snapshotName = 'teams-assignments-' + [Guid]::NewGuid().ToString('N') + '.json'
$snapshotPath = [IO.Path]::GetFullPath((Join-Path $spool $snapshotName))
$batchName = 'personal-' + [Guid]::NewGuid().ToString('N')
$batchRoot = [IO.Path]::GetFullPath((Join-Path $spool $batchName)).TrimEnd('\')
if ([IO.Path]::GetDirectoryName($snapshotPath) -ne $spool -or $snapshotName -notmatch '^teams-assignments-[0-9a-f]{32}\.json$' -or [IO.Path]::GetDirectoryName($batchRoot) -ne $spool -or $batchName -notmatch '^personal-[0-9a-f]{32}$') { throw 'Unsafe Teams assignment-file staging path.' }

$fileCaptureMutex = $null
. (Join-Path $PSScriptRoot 'school-browser-file-lock.ps1')
. (Join-Path $PSScriptRoot 'school-snapshot-encoding.ps1')
try {
  $fileCaptureMutex = Enter-SchoolBrowserFileLock -ProfilePath $ProfilePath
  $sql = @'
SELECT replace(encode(convert_to(jsonb_build_object(
  'version','omega_teams_assignments_json_v1',
  'source_timestamp',max(source_timestamp),
  'source_origin','https://assignments.edu.cloud.microsoft',
  'coverage',jsonb_build_object('listRoute','/classes/all/list','visibleCardCount',count(*),'capturedDetailCount',count(*),'complete',false,'limitation','Reused latest imported source records for file acquisition.'),
  'records',jsonb_agg(source_record ORDER BY external_id)
)::text,'UTF8'),'base64'),chr(10),'')
FROM school_snapshot_links
WHERE vault_id='00000000-0000-4000-8000-000000000001' AND source_origin='https://assignments.edu.cloud.microsoft' AND record_kind='assignment';
'@
  if ($VaultId -ne '00000000-0000-4000-8000-000000000001') { throw 'This export query is scoped to the configured personal vault.' }
  $sourceLines = @(& docker exec sorta-omega-git-postgres-1 psql -X -v ON_ERROR_STOP=1 -U sorta -d sorta_omega -q -t -A -c $sql)
  if ($LASTEXITCODE -ne 0 -or $sourceLines.Count -ne 1) { throw 'Could not export the latest Teams assignment source records.' }
  $snapshotText = ConvertFrom-SchoolSnapshotBase64 -Encoded $sourceLines[0]
  $snapshot = $snapshotText | ConvertFrom-Json
  if ($snapshot.version -ne 'omega_teams_assignments_json_v1' -or @($snapshot.records).Count -lt 1 -or @($snapshot.records).Count -gt 500 -or ([datetime]::UtcNow - [datetime]$snapshot.source_timestamp).TotalHours -gt 24) { throw 'The latest Teams assignment source records are empty, stale, or invalid.' }
  [IO.File]::WriteAllText($snapshotPath, $snapshotText, [Text.UTF8Encoding]::new($false))

  $bridge = Join-Path $RepositoryRoot 'apps\browser-bridge\dist\cli.js'
  $compiler = Join-Path $RepositoryRoot 'apps\browser-bridge\node_modules\.bin\tsc.cmd'
  if (-not (Test-Path -LiteralPath $compiler)) { throw 'Install the browser bridge dependencies before syncing.' }
  & $compiler -p (Join-Path $RepositoryRoot 'apps\browser-bridge\tsconfig.json') | Out-Null
  if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $bridge)) { throw 'The Teams browser bridge could not be built.' }
  $portFile = Join-Path $ProfilePath 'DevToolsActivePort'
  if (-not (Test-Path -LiteralPath $portFile)) { throw 'The signed-in school Edge profile is not running.' }
  $portText = (Get-Content -LiteralPath $portFile -TotalCount 1).Trim()
  if ($portText -notmatch '^\d{4,5}$' -or [int]$portText -lt 1024 -or [int]$portText -gt 65535) { throw 'The signed-in school Edge port is invalid.' }
  try { $ready = (Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$portText/json/version" -TimeoutSec 2).StatusCode -eq 200 } catch { $ready = $false }
  if (-not $ready) { throw 'The signed-in school Edge profile is not reachable.' }

  New-Item -ItemType Directory -Path $batchRoot | Out-Null
  $manifestPath = Join-Path $batchRoot 'manifest.json'
  $bridgeArgs = @('--provider','teams-assignment-files','--cdp-profile',$ProfilePath,'--noninteractive','true','--base-snapshot',$snapshotPath,'--output',$manifestPath)
  if ($RecordIndex -ge 0) { $bridgeArgs += @('--assignment-record-index',[string]$RecordIndex) }
  $bridgeOutput = @(& node $bridge @bridgeArgs)
  if ($LASTEXITCODE -ne 0) {
    $errorCode = 'browser_bridge_failed'
    if ($bridgeOutput.Count) { try { $errorCode = ($bridgeOutput[-1] | ConvertFrom-Json).errorCode } catch { } }
    if ($errorCode -notmatch '^[a-z0-9_]{1,100}$') { $errorCode = 'browser_bridge_failed' }
    throw "The Teams assignment-file capture failed: $errorCode"
  }
  $report = $bridgeOutput[-1] | ConvertFrom-Json
  $manifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($report.provider -ne 'teams-assignment-files' -or $report.format -ne 'omega_personal_files_v1' -or [int]$report.assignments -ne @($snapshot.records).Count -or [int]$report.itemCount -ne @($manifest.items).Count -or [int]$report.downloaded -ne [int]$report.itemCount -or $manifest.deviceKey -ne 'teams-sharepoint') { throw 'The Teams assignment-file capture report is inconsistent.' }
  $import = $null
  if ([int]$report.itemCount -gt 0) {
    $importOutput = @(& (Join-Path $PSScriptRoot 'import-teams-powerpoints.ps1') -StagingRoot $batchRoot -VaultId $VaultId -AppContainer $AppContainer -DryRun:$DryRun)
    $import = $importOutput[-1] | ConvertFrom-Json
    if ($import.status -ne 'succeeded' -or [int]$import.captured -ne [int]$report.itemCount) { throw 'The Teams assignment-file import was not fully accounted for.' }
  }
  $status = [ordered]@{ at=(Get-Date).ToUniversalTime().ToString('o'); status='succeeded'; dryRun=[bool]$DryRun; recordIndex=$RecordIndex; assignments=[int]$report.assignments; resources=[int]$report.resources; eligible=[int]$report.eligible; downloaded=[int]$report.downloaded; unsupported=[int]$report.unsupported; bytes=[long]$report.bytes; created=$(if($import){[int]$import.counts.created}else{0}); updated=$(if($import){[int]$import.counts.updated}else{0}); unchanged=$(if($import){[int]$import.counts.unchanged}else{0}); textExtracted=$(if($import){[int]$import.counts.textExtracted}else{0}); textUnavailable=$(if($import){[int]$import.counts.textUnavailable}else{0}); coverageComplete=$false; coverageLimitation=$report.coverageLimitation }
  [IO.File]::AppendAllText($statusLog, (($status | ConvertTo-Json -Compress) + "`n"))
  $status | ConvertTo-Json -Compress
} catch {
  $message = $_.Exception.Message
  if ($message.Length -gt 240) { $message = $message.Substring(0,240) }
  [IO.File]::AppendAllText($statusLog, (([ordered]@{at=(Get-Date).ToUniversalTime().ToString('o');status='failed';reason=$message} | ConvertTo-Json -Compress) + "`n"))
  throw
} finally {
  try {
  if (Test-Path -LiteralPath $snapshotPath) { Remove-Item -LiteralPath $snapshotPath -Force }
  if (Test-Path -LiteralPath $batchRoot) { Remove-Item -LiteralPath $batchRoot -Recurse -Force }
  } finally { Exit-SchoolBrowserFileLock -Mutex $fileCaptureMutex }
}
