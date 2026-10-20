$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'school-snapshot-encoding.ps1')
$expected = 'Teams/' + [char]0xD8 + 'konomistyring/oppgave med ' + [char]0xE6 + [char]0xF8 + [char]0xE5 + '.xlsx'
$encoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($expected))
if ((ConvertFrom-SchoolSnapshotBase64 -Encoded $encoded) -cne $expected) { throw 'Norwegian characters changed in transport.' }
foreach ($invalid in @('not base64!', '/w==')) {
  $rejected = $false
  try { $null = ConvertFrom-SchoolSnapshotBase64 -Encoded $invalid } catch { $rejected = $true }
  if (-not $rejected) { throw 'Invalid snapshot transport was accepted.' }
}
[pscustomobject]@{ norwegianRoundTrip = $true; invalidBase64Rejected = $true; invalidUtf8Rejected = $true } | ConvertTo-Json -Compress
