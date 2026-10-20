function Enter-SchoolBrowserFileLock {
  param([Parameter(Mandatory = $true)][string]$ProfilePath, [ValidateRange(0, 900)][int]$WaitSeconds = 900)
  if (-not [IO.Path]::IsPathRooted($ProfilePath)) { throw 'An absolute school profile path is required.' }
  $canonical = [IO.Path]::GetFullPath($ProfilePath).TrimEnd('\').ToUpperInvariant()
  $hasher = [Security.Cryptography.SHA256]::Create()
  try { $key = [BitConverter]::ToString($hasher.ComputeHash([Text.Encoding]::UTF8.GetBytes($canonical))).Replace('-', '') }
  finally { $hasher.Dispose() }
  # SSH and interactive scheduled tasks can run in different Windows sessions.
  $mutex = [Threading.Mutex]::new($false, ('Global\SortaOmegaSchoolFiles-' + $key))
  try {
    try { $held = $mutex.WaitOne([TimeSpan]::FromSeconds($WaitSeconds)) }
    catch [Threading.AbandonedMutexException] { $held = $true }
    if (-not $held) { throw 'Another school file capture still owns the browser download settings; retry after it finishes.' }
    return $mutex
  } catch { $mutex.Dispose(); throw }
}

function Exit-SchoolBrowserFileLock {
  param([Threading.Mutex]$Mutex)
  if ($null -ne $Mutex) {
    try { $Mutex.ReleaseMutex() } finally { $Mutex.Dispose() }
  }
}
