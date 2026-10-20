$ErrorActionPreference = 'Stop'
$helper = Join-Path $PSScriptRoot 'school-browser-file-lock.ps1'
. $helper
$profile = Join-Path ([IO.Path]::GetTempPath()) ('sorta-lock-test-' + [Guid]::NewGuid().ToString('N'))
$childScript = @'
$ErrorActionPreference = 'Stop'
. 'HELPER'
$lock = Enter-SchoolBrowserFileLock -ProfilePath 'PROFILE' -WaitSeconds 0
try { [Console]::WriteLine('LOCK_READY'); $null = [Console]::ReadLine() }
finally { Exit-SchoolBrowserFileLock -Mutex $lock }
'@
$childScript = $childScript.Replace('HELPER', $helper.Replace("'", "''")).Replace('PROFILE', $profile.Replace("'", "''"))
$start = [Diagnostics.ProcessStartInfo]::new()
$start.FileName = (Get-Process -Id $PID).Path
$start.Arguments = '-NoProfile -EncodedCommand ' + [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($childScript))
$start.UseShellExecute = $false
$start.CreateNoWindow = $true
$start.RedirectStandardOutput = $true
$start.RedirectStandardInput = $true
$child = [Diagnostics.Process]::new()
$child.StartInfo = $start
try {
  $null = $child.Start()
  $ready = $child.StandardOutput.ReadLineAsync()
  if (-not $ready.Wait(10000) -or $ready.Result -ne 'LOCK_READY') { throw 'Child did not acquire the test lock.' }
  $blocked = $false
  try { $unexpected = Enter-SchoolBrowserFileLock -ProfilePath $profile -WaitSeconds 0; Exit-SchoolBrowserFileLock -Mutex $unexpected }
  catch { $blocked = $_.Exception.Message -like 'Another school file capture*' }
  if (-not $blocked) { throw 'A competing process acquired an already-held profile lock.' }
  $other = Enter-SchoolBrowserFileLock -ProfilePath ($profile + '-other') -WaitSeconds 0
  Exit-SchoolBrowserFileLock -Mutex $other
  $child.StandardInput.WriteLine('release')
  if (-not $child.WaitForExit(10000) -or $child.ExitCode -ne 0) { throw 'Child did not release the test lock.' }
  $after = Enter-SchoolBrowserFileLock -ProfilePath $profile -WaitSeconds 0
  Exit-SchoolBrowserFileLock -Mutex $after
  [pscustomobject]@{ competingProcessBlocked = $true; separateProfileIndependent = $true; releasedLockReusable = $true } | ConvertTo-Json -Compress
} finally {
  if (-not $child.HasExited) { $child.StandardInput.WriteLine('release'); if (-not $child.WaitForExit(5000)) { $child.Kill() } }
  $child.Dispose()
}
