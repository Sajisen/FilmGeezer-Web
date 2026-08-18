[CmdletBinding()]
param(
    [string]$BackupDirectory = (Join-Path $env:USERPROFILE "FilmGeezer Backups\MongoDB"),
    [string]$EnvironmentFile
)

$ErrorActionPreference = "Stop"

function Get-MongoUriFromEnvFile {
    param([Parameter(Mandatory = $true)][string]$Path)

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "FilmGeezer environment file was not found at '$Path'."
    }

    $line = Get-Content -LiteralPath $Path |
        Where-Object { $_ -match '^\s*MONGODB_URI\s*=' } |
        Select-Object -First 1

    if (-not $line) {
        throw "MONGODB_URI was not found in '$Path'."
    }

    $value = ($line -split '=', 2)[1].Trim()

    if (
        ($value.StartsWith('"') -and $value.EndsWith('"')) -or
        ($value.StartsWith("'") -and $value.EndsWith("'"))
    ) {
        $value = $value.Substring(1, $value.Length - 2)
    }

    if (-not ($value.StartsWith('mongodb://') -or $value.StartsWith('mongodb+srv://'))) {
        throw "MONGODB_URI in '$Path' is not a valid MongoDB connection string."
    }

    return $value
}

$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverDirectory = Split-Path -Parent $scriptDirectory

if (-not $EnvironmentFile) {
    $EnvironmentFile = Join-Path $serverDirectory '.env'
}

$mongodumpCommand = Get-Command mongodump -ErrorAction SilentlyContinue
if (-not $mongodumpCommand) {
    throw "mongodump was not found. Install MongoDB Database Tools and make sure mongodump is available in PATH."
}

$mongorestoreCommand = Get-Command mongorestore -ErrorAction SilentlyContinue
if (-not $mongorestoreCommand) {
    throw "mongorestore was not found. Install MongoDB Database Tools and make sure mongorestore is available in PATH."
}

$mongoUri = Get-MongoUriFromEnvFile -Path $EnvironmentFile

New-Item -ItemType Directory -Path $BackupDirectory -Force | Out-Null

$timestamp = Get-Date -Format 'yyyy-MM-dd_HHmmss'
$backupPath = Join-Path $BackupDirectory "filmgeezer-full-$timestamp.archive.gz"
$tempConfigPath = Join-Path ([System.IO.Path]::GetTempPath()) "filmgeezer-mongodump-$([Guid]::NewGuid().ToString('N')).yml"

# MongoDB recommends --config for sensitive URI/password values so they do not
# have to be supplied directly on the command line. YAML single quotes are
# escaped by doubling them.
$yamlUri = $mongoUri.Replace("'", "''")
$configContents = "uri: '$yamlUri'`r`n"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($tempConfigPath, $configContents, $utf8NoBom)

try {
    Write-Host "Creating full FilmGeezer MongoDB backup..."
    Write-Host "Destination: $backupPath"
    Write-Warning "This archive contains FilmGeezer user/application data. Gzip compresses it; it does not encrypt it."

    & $mongodumpCommand.Source "--config=$tempConfigPath" "--archive=$backupPath" --gzip

    if ($LASTEXITCODE -ne 0) {
        throw "mongodump failed with exit code $LASTEXITCODE."
    }

    if (-not (Test-Path -LiteralPath $backupPath -PathType Leaf)) {
        throw "mongodump completed without creating the expected backup file."
    }

    $backupFile = Get-Item -LiteralPath $backupPath
    $sizeMb = [Math]::Round($backupFile.Length / 1MB, 2)

    Write-Host ""
    Write-Host "Verifying backup archive with mongorestore --dryRun..."

    & $mongorestoreCommand.Source `
        "--config=$tempConfigPath" `
        "--archive=$backupPath" `
        --gzip `
        --dryRun

    if ($LASTEXITCODE -ne 0) {
        throw "Backup file was created, but mongorestore dry-run verification failed with exit code $LASTEXITCODE. Keep the archive for investigation and do not treat it as a verified backup yet."
    }

    Write-Host ""
    Write-Host "Backup completed and verified successfully."
    Write-Host "File: $($backupFile.FullName)"
    Write-Host "Size: $sizeMb MB"
    Write-Host "Verification: mongorestore dry-run passed; no data was imported."
    Write-Host ""
    Write-Host "Each run creates a new timestamped full backup. Existing backups are not deleted or overwritten."
}
finally {
    if (Test-Path -LiteralPath $tempConfigPath) {
        Remove-Item -LiteralPath $tempConfigPath -Force -ErrorAction SilentlyContinue
    }

    $mongoUri = $null
    $configContents = $null
    $yamlUri = $null
}
