param(
  [string]$InSchoolOrigin = 'https://mailand.inschool.visma.no'
)

$ErrorActionPreference = 'Stop'
$origin = [Uri]$InSchoolOrigin
if ($origin.Scheme -ne 'https' -or -not $origin.Host.EndsWith('.inschool.visma.no')) {
  throw 'A registered HTTPS InSchool origin is required.'
}

$edgeCandidates = @(
  [IO.Path]::Combine(${env:ProgramFiles(x86)}, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
  [IO.Path]::Combine($env:ProgramFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe')
)
$edge = $edgeCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $edge) { throw 'Microsoft Edge is not installed.' }
if (-not $env:LOCALAPPDATA) { throw 'LOCALAPPDATA is unavailable.' }

$profile = Join-Path $env:LOCALAPPDATA 'SortaOmega\BrowserBridge\EdgeUserData'
New-Item -ItemType Directory -Force -Path $profile | Out-Null
$portFile = Join-Path $profile 'DevToolsActivePort'
function Get-ProfilePort {
  if (-not (Test-Path -LiteralPath $portFile)) { return $null }
  $portText = (Get-Content -LiteralPath $portFile -TotalCount 1).Trim()
  if ($portText -notmatch '^\d{4,5}$' -or [int]$portText -lt 1024 -or [int]$portText -gt 65535) { return $null }
  return $portText
}

function Test-ProfileReady {
  $portText = Get-ProfilePort
  if (-not $portText) { return $false }
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$portText/json/version" -TimeoutSec 2
    return [int]$response.StatusCode -eq 200
  } catch {
    return $false
  }
}

function Ensure-SchoolTabs {
  $portText = Get-ProfilePort
  $tabs = Invoke-RestMethod -Uri "http://127.0.0.1:$portText/json/list" -TimeoutSec 3
  $pages = @($tabs | Where-Object { $_.type -eq 'page' })
  $signInInProgress = $pages | Where-Object {
    try { ([Uri]$_.url).Scheme -eq 'https' -and ([Uri]$_.url).Host -in @('idp.feide.no', 'login.microsoftonline.com') } catch { $false }
  }
  if ($signInInProgress) {
    Write-Output 'School sign-in is in progress; existing authentication tabs retained.'
    return
  }
  $schoolOrigins = @(
    @{ Url = 'https://teams.microsoft.com/'; HostPattern = '^(teams\.microsoft\.com|teams\.cloud\.microsoft)$' },
    @{ Url = $origin.GetLeftPart([UriPartial]::Authority); HostPattern = '^' + [regex]::Escape($origin.Host) + '$' }
  )
  foreach ($school in $schoolOrigins) {
    $existing = $pages | Where-Object {
      try { ([Uri]$_.url).Host -match $school.HostPattern } catch { $false }
    } | Select-Object -First 1
    if (-not $existing) {
      $encodedUrl = [Uri]::EscapeDataString($school.Url)
      $null = Invoke-RestMethod -Method Put -Uri "http://127.0.0.1:$portText/json/new?$encodedUrl" -TimeoutSec 3
    }
  }
}

function Test-ProfileProcess {
  $escapedProfile = [regex]::Escape($profile)
  $process = Get-CimInstance Win32_Process -Filter "Name = 'msedge.exe'" |
    Where-Object { $_.CommandLine -match $escapedProfile } |
    Select-Object -First 1
  return $null -ne $process
}

# Scheduled school imports may all start at once. Keep the readiness check and
# launch inside one cross-process lock so only one of them opens the tabs.
$launchMutex = [System.Threading.Mutex]::new($false, 'Local\SortaOmegaSchoolEdgeLaunch')
$ownsMutex = $false
try {
  try {
    $ownsMutex = $launchMutex.WaitOne([TimeSpan]::FromSeconds(30))
  } catch [System.Threading.AbandonedMutexException] {
    $ownsMutex = $true
  }
  if (-not $ownsMutex) { throw 'Timed out waiting for the school Edge launcher.' }

  if (Test-ProfileReady) {
    Ensure-SchoolTabs
    Write-Output 'Omega Edge automation profile is already running; existing school tabs reused.'
    return
  }

  # Edge may still be starting, or its debugging endpoint may be temporarily
  # unavailable. Never send URLs to that existing profile: Edge would turn
  # every attempted "relaunch" into another pair of tabs.
  if (Test-ProfileProcess) {
    for ($attempt = 0; $attempt -lt 10; $attempt++) {
      Start-Sleep -Seconds 1
      if (Test-ProfileReady) {
        Ensure-SchoolTabs
        Write-Output 'Omega Edge automation profile is already running; existing school tabs reused.'
        return
      }
    }
    throw 'Omega Edge is running, but its automation endpoint is unavailable. No tabs were opened.'
  }

  $arguments = @(
    "--user-data-dir=`"$profile`"",
    '--remote-debugging-port=0',
    '--remote-debugging-address=127.0.0.1',
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank#sorta-omega-start'
  )
  Start-Process -FilePath $edge -ArgumentList $arguments -WindowStyle Normal
  for ($attempt = 0; $attempt -lt 15; $attempt++) {
    Start-Sleep -Seconds 1
    if (Test-ProfileReady) {
      Ensure-SchoolTabs
      $portText = Get-ProfilePort
      $tabs = Invoke-RestMethod -Uri "http://127.0.0.1:$portText/json/list" -TimeoutSec 3
      $startingTab = $tabs | Where-Object { $_.type -eq 'page' -and $_.url -eq 'about:blank#sorta-omega-start' } | Select-Object -First 1
      if ($startingTab) { $null = Invoke-RestMethod -Uri "http://127.0.0.1:$portText/json/close/$($startingTab.id)" -TimeoutSec 3 }
      Write-Output 'Omega Edge profile opened. Existing Teams and InSchool tabs were reused, or missing tabs opened; Brave remains untouched.'
      return
    }
  }
  throw 'Omega Edge was started, but its automation endpoint did not become ready. No additional tabs were opened.'
} finally {
  if ($ownsMutex) { $launchMutex.ReleaseMutex() }
  $launchMutex.Dispose()
}
