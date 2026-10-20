function ConvertFrom-SchoolSnapshotBase64 {
  param([Parameter(Mandatory = $true)][string]$Encoded)
  if ($Encoded.Length -gt 36MB -or $Encoded -notmatch '^[A-Za-z0-9+/]+={0,2}$') { throw 'School snapshot transport is invalid.' }
  try {
    $bytes = [Convert]::FromBase64String($Encoded)
    if ($bytes.Length -gt 25MB) { throw 'Snapshot too large' }
    return [Text.UTF8Encoding]::new($false, $true).GetString($bytes)
  } catch { throw 'School snapshot transport is not bounded UTF-8.' }
}
