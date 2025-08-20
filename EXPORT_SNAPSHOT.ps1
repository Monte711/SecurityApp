# Project Snapshot Export Script (PowerShell)
# Creates a complete project snapshot with git status and logs

param(
    [string]$OutputPath = ".\ARTIFACTS"
)

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$SnapshotName = "project_snapshot_$Timestamp"

Write-Host "Creating project snapshot: $SnapshotName"

# Create artifacts directory if it doesn't exist
if (!(Test-Path $OutputPath)) {
    New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null
}

# Capture git status
Write-Host "Capturing git status..."
try {
    if (Get-Command git -ErrorAction SilentlyContinue) {
        if (git rev-parse --git-dir 2>$null) {
            git status --porcelain | Out-File -FilePath "$OutputPath\git_status.txt" -Encoding UTF8
            git log -n 10 --pretty=format:"%h %an %ad %s" | Out-File -FilePath "$OutputPath\git_log.txt" -Encoding UTF8
            Write-Host "Git repository detected - status and log captured"
        } else {
            "No git repository found in current directory" | Out-File -FilePath "$OutputPath\git_status.txt"
            "No git repository found in current directory" | Out-File -FilePath "$OutputPath\git_log.txt"
        }
    } else {
        "Git not available on this system" | Out-File -FilePath "$OutputPath\git_status.txt"
        "Git not available on this system" | Out-File -FilePath "$OutputPath\git_log.txt"
    }
} catch {
    "Error accessing git: $($_.Exception.Message)" | Out-File -FilePath "$OutputPath\git_status.txt"
    "Error accessing git: $($_.Exception.Message)" | Out-File -FilePath "$OutputPath\git_log.txt"
}

# Copy key artifacts to ARTIFACTS directory
Write-Host "Copying key artifacts..."

$FilesToCopy = @(
    "docker\infrastructure.yml",
    "shared\schemas.py", 
    "shared\utils.py",
    "README.md",
    "PROJECT_OVERVIEW.md",
    "MODULE_STATUS.md",
    "module_status.json",
    ".env.example"
)

foreach ($File in $FilesToCopy) {
    if (Test-Path $File) {
        Copy-Item $File $OutputPath -ErrorAction SilentlyContinue
    }
}

# Create manifest of included files
Write-Host "Creating manifest..."
Get-ChildItem $OutputPath -File | ForEach-Object { $_.Name } | Sort-Object | Out-File -FilePath "$OutputPath\manifest.txt"

# Create the snapshot archive
Write-Host "Creating snapshot archive..."
$ArchivePath = "$OutputPath\$SnapshotName.zip"

try {
    # Exclude common development artifacts
    $ExcludePatterns = @(
        "*.git*",
        "*node_modules*", 
        "*__pycache__*",
        "*.pyc",
        "*venv*",
        "*.log"
    )
    
    # Use PowerShell's Compress-Archive
    $AllFiles = Get-ChildItem -Recurse -File | Where-Object {
        $File = $_
        $ShouldExclude = $false
        foreach ($Pattern in $ExcludePatterns) {
            if ($File.FullName -like $Pattern) {
                $ShouldExclude = $true
                break
            }
        }
        -not $ShouldExclude
    }
    
    $AllFiles | Compress-Archive -DestinationPath $ArchivePath -Force
    Write-Host "Snapshot created: $ArchivePath"
} catch {
    Write-Host "Warning: Could not create zip archive: $($_.Exception.Message)"
}

# Create snapshot summary
Write-Host "Creating snapshot summary..."
$SummaryContent = @"
Project Snapshot Summary
========================
Created: $(Get-Date)
Snapshot: $SnapshotName
Project: Unified Enterprise Cybersecurity Platform

Contents:
- Complete project source code
- Documentation and specifications  
- Infrastructure configurations
- Git history and status
- Module development status

To restore:
1. Extract archive to desired location
2. Review RECOVERY_GUIDE.md for next steps
3. Follow HOW_TO_CONTINUE.md for development setup

Manifest of key artifacts:
$(Get-Content "$OutputPath\manifest.txt" -Raw)
"@

$SummaryContent | Out-File -FilePath "$OutputPath\snapshot_summary.txt" -Encoding UTF8

Write-Host ""
Write-Host "✅ Snapshot export completed successfully!" -ForegroundColor Green
Write-Host "📁 Location: $OutputPath"
Write-Host "📦 Archive: $SnapshotName.zip"
Write-Host "📋 Summary: snapshot_summary.txt"
Write-Host ""
Write-Host "To use this snapshot:"
Write-Host "1. Extract the archive in a new location"
Write-Host "2. Read RECOVERY_GUIDE.md for overview"
Write-Host "3. Follow HOW_TO_CONTINUE.md for development setup"
