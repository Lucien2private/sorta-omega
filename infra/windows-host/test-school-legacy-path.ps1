$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'school-legacy-path.ps1')
$course = [char]0xD8 + 'konomistyring 2026 27 - VGMAI'
$correct = 'Teams/' + $course + '/Assignments/0123456789abcdef01234567/oppgave med ' + [char]0xF8 + '.xlsx'
$broken = [Text.Encoding]::GetEncoding(850).GetString([Text.Encoding]::UTF8.GetBytes($correct))
if ((ConvertFrom-SchoolLegacyPath -RelativePath $broken -CourseNames @($course)) -cne $correct) { throw 'Legacy path was not corrected exactly.' }
if ($null -ne (ConvertFrom-SchoolLegacyPath -RelativePath $correct -CourseNames @($course))) { throw 'A correct Unicode path was changed.' }
if ($null -ne (ConvertFrom-SchoolLegacyPath -RelativePath $broken -CourseNames @('Other course'))) { throw 'An unrecognized course was changed.' }
if ($null -ne (ConvertFrom-SchoolLegacyPath -RelativePath ($broken.Replace('/Assignments/', '/General/')) -CourseNames @($course))) { throw 'A non-assignment path was changed.' }
$decomposed = $correct.Replace('oppgave med ' + [char]0xF8, 'oppgave a' + [char]0x30A)
$legacyDecomposed = [Text.Encoding]::GetEncoding(850).GetString([Text.Encoding]::UTF8.GetBytes($decomposed))
if ((ConvertFrom-SchoolLegacyPath -RelativePath $legacyDecomposed -CourseNames @($course)) -cne $decomposed.Normalize([Text.NormalizationForm]::FormC)) { throw 'Corrected paths must match the collector NFC normalization.' }
[pscustomobject]@{ exactLegacyRepair = $true; validUnicodePreserved = $true; knownCourseRequired = $true; assignmentScopeRequired = $true } | ConvertTo-Json -Compress
