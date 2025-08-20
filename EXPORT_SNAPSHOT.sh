#!/bin/bash

# Project Snapshot Export Script
# Creates a complete project snapshot with git status and logs

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${SCRIPT_DIR}"
ARTIFACTS_DIR="${PROJECT_ROOT}/ARTIFACTS"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
SNAPSHOT_NAME="project_snapshot_${TIMESTAMP}"

echo "Creating project snapshot: ${SNAPSHOT_NAME}"

# Create artifacts directory if it doesn't exist
mkdir -p "${ARTIFACTS_DIR}"

# Capture git status
echo "Capturing git status..."
if command -v git >/dev/null 2>&1; then
    if git rev-parse --git-dir >/dev/null 2>&1; then
        git status --porcelain > "${ARTIFACTS_DIR}/git_status.txt"
        git log -n 10 --pretty=format:"%h %an %ad %s" > "${ARTIFACTS_DIR}/git_log.txt"
        echo "Git repository detected - status and log captured"
    else
        echo "No git repository found in current directory" > "${ARTIFACTS_DIR}/git_status.txt"
        echo "No git repository found in current directory" > "${ARTIFACTS_DIR}/git_log.txt"
    fi
else
    echo "Git not available on this system" > "${ARTIFACTS_DIR}/git_status.txt"
    echo "Git not available on this system" > "${ARTIFACTS_DIR}/git_log.txt"
fi

# Copy key artifacts to ARTIFACTS directory
echo "Copying key artifacts..."

# Infrastructure files
if [ -f "${PROJECT_ROOT}/docker/infrastructure.yml" ]; then
    cp "${PROJECT_ROOT}/docker/infrastructure.yml" "${ARTIFACTS_DIR}/"
fi

# Shared schemas and utilities
if [ -f "${PROJECT_ROOT}/shared/schemas.py" ]; then
    cp "${PROJECT_ROOT}/shared/schemas.py" "${ARTIFACTS_DIR}/"
fi

if [ -f "${PROJECT_ROOT}/shared/utils.py" ]; then
    cp "${PROJECT_ROOT}/shared/utils.py" "${ARTIFACTS_DIR}/"
fi

# Core documentation
cp "${PROJECT_ROOT}/README.md" "${ARTIFACTS_DIR}/" 2>/dev/null || echo "README.md not found"
cp "${PROJECT_ROOT}/PROJECT_OVERVIEW.md" "${ARTIFACTS_DIR}/" 2>/dev/null || echo "PROJECT_OVERVIEW.md not found"
cp "${PROJECT_ROOT}/MODULE_STATUS.md" "${ARTIFACTS_DIR}/" 2>/dev/null || echo "MODULE_STATUS.md not found"
cp "${PROJECT_ROOT}/module_status.json" "${ARTIFACTS_DIR}/" 2>/dev/null || echo "module_status.json not found"

# Environment template
cp "${PROJECT_ROOT}/.env.example" "${ARTIFACTS_DIR}/" 2>/dev/null || echo ".env.example not found"

# Create manifest of included files
echo "Creating manifest..."
find "${ARTIFACTS_DIR}" -type f -exec basename {} \; | sort > "${ARTIFACTS_DIR}/manifest.txt"

# Create the snapshot archive
echo "Creating snapshot archive..."
if command -v zip >/dev/null 2>&1; then
    cd "${PROJECT_ROOT}"
    zip -r "${ARTIFACTS_DIR}/${SNAPSHOT_NAME}.zip" \
        . \
        -x "*.git/*" \
        -x "*node_modules/*" \
        -x "*__pycache__/*" \
        -x "*.pyc" \
        -x "*venv/*" \
        -x "*.log"
    echo "Snapshot created: ${ARTIFACTS_DIR}/${SNAPSHOT_NAME}.zip"
else
    echo "Warning: zip command not available. Creating tar.gz instead..."
    cd "${PROJECT_ROOT}"
    tar --exclude='.git' \
        --exclude='node_modules' \
        --exclude='__pycache__' \
        --exclude='*.pyc' \
        --exclude='venv' \
        --exclude='*.log' \
        -czf "${ARTIFACTS_DIR}/${SNAPSHOT_NAME}.tar.gz" .
    echo "Snapshot created: ${ARTIFACTS_DIR}/${SNAPSHOT_NAME}.tar.gz"
fi

# Create snapshot summary
echo "Creating snapshot summary..."
cat > "${ARTIFACTS_DIR}/snapshot_summary.txt" << EOF
Project Snapshot Summary
========================
Created: $(date)
Snapshot: ${SNAPSHOT_NAME}
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
$(cat "${ARTIFACTS_DIR}/manifest.txt")
EOF

echo ""
echo "✅ Snapshot export completed successfully!"
echo "📁 Location: ${ARTIFACTS_DIR}/"
echo "📦 Archive: ${SNAPSHOT_NAME}.zip (or .tar.gz)"
echo "📋 Summary: snapshot_summary.txt"
echo ""
echo "To use this snapshot:"
echo "1. Extract the archive in a new location"
echo "2. Read RECOVERY_GUIDE.md for overview"
echo "3. Follow HOW_TO_CONTINUE.md for development setup"
