param(
  [string]$VaultId,
  [string]$AppContainer,
  [switch]$FromInSchoolTask,
  [switch]$RunOnce,
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$taskName = 'Sorta Omega - Teams PowerPoints'
if (-not $RunOnce -and (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue)) { throw 'The Teams PowerPoint sync task already exists; inspect it before changing it.' }
if ($DryRun -and -not $RunOnce) { throw 'DryRun requires RunOnce.' }
if ($FromInSchoolTask) {
  if ($VaultId -or $AppContainer) { throw 'Specify either the existing InSchool task or explicit values, not both.' }
  $schoolTask = Get-ScheduledTask -TaskName 'Sorta Omega - InSchool timetable' -ErrorAction Stop
  if (@($schoolTask.Actions).Count -ne 1) { throw 'The InSchool task action is ambiguous.' }
  $arguments = $schoolTask.Actions[0].Arguments
  $vaultMatch = [regex]::Match($arguments, '(?i)(?:^|\s)-VaultId\s+([0-9a-f-]{36})(?=\s|$)')
  $containerMatch = [regex]::Match($arguments, '(?i)(?:^|\s)-AppContainer\s+([a-zA-Z0-9_.-]{1,128})(?=\s|$)')
  if (-not $vaultMatch.Success -or -not $containerMatch.Success) { throw 'The existing InSchool task does not contain the expected scoped parameters.' }
  $VaultId = $vaultMatch.Groups[1].Value
  $AppContainer = $containerMatch.Groups[1].Value
}
if ($VaultId -notmatch '^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$') { throw 'A vault UUID is required.' }
if ($AppContainer -notmatch '^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$') { throw 'A literal Docker app container name is required.' }
$script = Join-Path $PSScriptRoot 'sync-teams-powerpoints.ps1'
if (-not (Test-Path -LiteralPath $script)) { throw 'The Teams PowerPoint sync script is missing.' }
$repository = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$profile = Join-Path $env:LOCALAPPDATA 'SortaOmega\BrowserBridge\EdgeUserData'
if ($RunOnce) { & $script -VaultId $VaultId -AppContainer $AppContainer -RepositoryRoot $repository -ProfilePath $profile -DryRun:$DryRun; return }
$arguments = '-NoProfile -ExecutionPolicy Bypass -File "{0}" -VaultId {1} -AppContainer {2} -RepositoryRoot "{3}" -ProfilePath "{4}"' -f $script,$VaultId,$AppContainer,$repository,$profile
$action = New-ScheduledTaskAction -Execute (Join-Path $PSHOME 'powershell.exe') -Argument $arguments
$next = (Get-Date).Date.AddHours((Get-Date).Hour).AddMinutes(50)
if ($next -le (Get-Date)) { $next = $next.AddHours(1) }
$trigger = New-ScheduledTaskTrigger -Once -At $next -RepetitionInterval (New-TimeSpan -Hours 6) -RepetitionDuration (New-TimeSpan -Days 3650)
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -WakeToRun -ExecutionTimeLimit (New-TimeSpan -Minutes 45) -MultipleInstances IgnoreNew
$principal = New-ScheduledTaskPrincipal -UserId "$env:COMPUTERNAME\$env:USERNAME" -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description 'Capture PowerPoint originals from Teams class-channel Shared folders and rendered post attachments every six hours. Older posts and Classwork remain uncovered.' | Out-Null
Get-ScheduledTask -TaskName $taskName | Select-Object TaskName,State
