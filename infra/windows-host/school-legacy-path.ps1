function ConvertFrom-SchoolLegacyPath {
  param([string]$RelativePath, [string[]]$CourseNames)
  if ($RelativePath -notmatch '^Teams/[^/]+/Assignments/[a-f0-9]{24}/[^/]+\.(pptx|pdf|docx|xlsx)$') { return $null }
  try {
    $oem = [Text.Encoding]::GetEncoding(850, [Text.EncoderFallback]::ExceptionFallback, [Text.DecoderFallback]::ExceptionFallback)
    $corrected = [Text.UTF8Encoding]::new($false, $true).GetString($oem.GetBytes($RelativePath))
  } catch { return $null }
  if ($corrected -ceq $RelativePath -or $corrected -notmatch '^Teams/[^/]+/Assignments/[a-f0-9]{24}/[^/]+\.(pptx|pdf|docx|xlsx)$') { return $null }
  $knownCourses = @($CourseNames | ForEach-Object {
    $name = ($_.Normalize([Text.NormalizationForm]::FormC) -replace '[\\/:*?"<>|\x00-\x1f]', ' ' -replace '\s+', ' ').Trim().TrimEnd('.', ' ')
    if ($name.Length -gt 180) { $name = $name.Substring(0, 180) }
    $name
  })
  if ($knownCourses -cnotcontains $corrected.Split('/')[1]) { return $null }
  return $corrected
}
