param(
  [Parameter(Mandatory = $true)][string]$VaultId,
  [string]$ProfilePath = (Join-Path $env:LOCALAPPDATA 'SortaOmega\BrowserBridge\EdgeUserData'),
  [switch]$Apply
)
$ErrorActionPreference = 'Stop'
if ($VaultId -notmatch '^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$') { throw 'A vault UUID is required.' }
. (Join-Path $PSScriptRoot 'school-browser-file-lock.ps1')
. (Join-Path $PSScriptRoot 'school-snapshot-encoding.ps1')
. (Join-Path $PSScriptRoot 'school-legacy-path.ps1')
$lock = Enter-SchoolBrowserFileLock -ProfilePath $ProfilePath
try {
  if ($Apply -and (Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -match '--provider\s+teams-(powerpoints|assignment-files)(?:\s|$)' })) {
    throw 'Finish active school file captures before repairing their import paths.'
  }
  $query = @'
SELECT replace(encode(convert_to(jsonb_build_object(
 'courses',(SELECT jsonb_agg(DISTINCT source_record->>'courseTitle') FROM school_snapshot_links WHERE vault_id='VAULT' AND source_origin='https://assignments.edu.cloud.microsoft' AND record_kind='assignment'),
 'imports',(SELECT jsonb_agg(jsonb_build_object('note_id',i.note_id,'blob_id',i.blob_id,'old_hash',i.path_hash,'old_path',i.relative_path,'revision',n.revision)) FROM personal_file_imports i JOIN notes n ON n.id=i.note_id WHERE i.vault_id='VAULT' AND i.device_key='teams-sharepoint' AND i.relative_path LIKE 'Teams/%/Assignments/%' AND n.trashed_at IS NULL)
)::text,'UTF8'),'base64'),chr(10),'');
'@
  $lines = @(& docker exec sorta-omega-git-postgres-1 psql -X -v ON_ERROR_STOP=1 -U sorta -d sorta_omega -q -t -A -c $query.Replace('VAULT', $VaultId))
  if ($LASTEXITCODE -ne 0 -or $lines.Count -ne 1) { throw 'Could not inspect scoped school import paths.' }
  $snapshot = (ConvertFrom-SchoolSnapshotBase64 -Encoded $lines[0]) | ConvertFrom-Json
  if (@($snapshot.imports).Count -gt 512) { throw 'School path repair exceeds its row bound.' }
  $fixes = @($snapshot.imports | Where-Object { $_ } | ForEach-Object {
    $corrected = ConvertFrom-SchoolLegacyPath -RelativePath $_.old_path -CourseNames $snapshot.courses
    if ($corrected) {
      $hasher = [Security.Cryptography.SHA256]::Create()
      try { $newHash = [BitConverter]::ToString($hasher.ComputeHash([Text.Encoding]::UTF8.GetBytes('teams-sharepoint' + [char]0 + $corrected))).Replace('-', '').ToLowerInvariant() }
      finally { $hasher.Dispose() }
      [ordered]@{ note_id=$_.note_id; blob_id=$_.blob_id; old_hash=$_.old_hash; old_path=$_.old_path; new_hash=$newHash; new_path=$corrected; revision=$_.revision }
    }
  })
  if (-not $Apply -or -not $fixes.Count) {
    [pscustomobject]@{ dryRun=(-not [bool]$Apply); candidates=$fixes.Count; repaired=0; originalsChanged=$false } | ConvertTo-Json -Compress
    return
  }
  $payload = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes((ConvertTo-Json -InputObject $fixes -Depth 5 -Compress)))
  $sql = @'
BEGIN;
CREATE TEMP TABLE school_path_fixes ON COMMIT DROP AS SELECT * FROM jsonb_to_recordset(convert_from(decode('PAYLOAD','base64'),'UTF8')::jsonb) AS f(note_id uuid,blob_id uuid,old_hash text,old_path text,new_hash text,new_path text,revision integer);
ALTER TABLE school_path_fixes ADD PRIMARY KEY(note_id), ADD UNIQUE(new_hash);
DO $$ BEGIN
 IF (SELECT count(*) FROM school_path_fixes) <> (SELECT count(*) FROM school_path_fixes f JOIN personal_file_imports i ON i.vault_id='VAULT' AND i.device_key='teams-sharepoint' AND i.path_hash=f.old_hash AND i.relative_path=f.old_path AND i.note_id=f.note_id AND i.blob_id=f.blob_id JOIN notes n ON n.id=f.note_id AND n.vault_id=i.vault_id AND n.revision=f.revision AND n.trashed_at IS NULL AND left(n.body,length('Imported from teams-sharepoint: '||f.old_path||E'\n\n'))='Imported from teams-sharepoint: '||f.old_path||E'\n\n') THEN RAISE EXCEPTION 'School path repair snapshot changed'; END IF;
 IF EXISTS(SELECT 1 FROM school_path_fixes f JOIN personal_file_imports i ON i.vault_id='VAULT' AND i.device_key='teams-sharepoint' AND i.path_hash=f.new_hash) THEN RAISE EXCEPTION 'School path repair conflicts with an existing corrected path'; END IF;
END $$;
UPDATE personal_file_imports i SET relative_path=f.new_path,path_hash=f.new_hash FROM school_path_fixes f WHERE i.vault_id='VAULT' AND i.device_key='teams-sharepoint' AND i.path_hash=f.old_hash AND i.note_id=f.note_id;
WITH changed AS (UPDATE notes n SET title=CASE WHEN n.title=split_part(f.old_path,'/',5) THEN split_part(f.new_path,'/',5) ELSE n.title END,body='Imported from teams-sharepoint: '||f.new_path||substring(n.body FROM length('Imported from teams-sharepoint: '||f.old_path)+1),revision=n.revision+1,updated_at=now() FROM school_path_fixes f WHERE n.id=f.note_id AND n.vault_id='VAULT' RETURNING n.id,n.revision,n.title,n.body) INSERT INTO note_revisions(note_id,revision,title,body) SELECT id,revision,title,body FROM changed;
UPDATE blobs b SET filename=split_part(f.new_path,'/',5) FROM school_path_fixes f WHERE b.id=f.blob_id AND b.vault_id='VAULT' AND b.filename=split_part(f.old_path,'/',5);
SELECT json_build_object('dryRun',false,'repaired',count(*),'originalsChanged',false) FROM school_path_fixes;
COMMIT;
'@
  $result = @($sql.Replace('PAYLOAD', $payload).Replace('VAULT', $VaultId) | & docker exec -i sorta-omega-git-postgres-1 psql -X -v ON_ERROR_STOP=1 -U sorta -d sorta_omega -q -t -A)
  if ($LASTEXITCODE -ne 0) { throw 'School path repair was rolled back.' }
  $result
} finally { Exit-SchoolBrowserFileLock -Mutex $lock }
