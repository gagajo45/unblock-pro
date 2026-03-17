# Test portable update: build v-1, put current in temp, run old. Click Update to replace.
# Usage: npm run portable:test-update

$ErrorActionPreference = 'Stop'
$root = (Get-Item $PSScriptRoot).Parent.FullName
Set-Location $root

$pkgPath = Join-Path $root "package.json"
$pkgRaw = Get-Content $pkgPath -Raw -Encoding UTF8
$pkg = $pkgRaw | ConvertFrom-Json
$current = $pkg.version
$parts = $current -split '\.'
$parts[-1] = [int]$parts[-1] - 1
$oldVer = $parts -join '.'

$testDir = Join-Path $root "test-portable-update-$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())"
$distDir = Join-Path $root "dist"

Write-Host "Current version: $current" -ForegroundColor Cyan
Write-Host "Old version (for test): $oldVer" -ForegroundColor Cyan

function Set-PackageVersion { param($ver)
  node -e "const fs=require('fs');const p=process.argv[1];const v=process.argv[2];const j=JSON.parse(fs.readFileSync(p,'utf8'));j.version=v;fs.writeFileSync(p,JSON.stringify(j,null,2),'utf8');" $pkgPath $ver
}

Write-Host "`n[1/5] Building $oldVer..." -ForegroundColor Yellow
Set-PackageVersion $oldVer
$null = npm run build:win
if ($LASTEXITCODE -ne 0) { throw "Build $oldVer failed" }

$oldExe = Get-ChildItem -Path $distDir -Filter "*-v$oldVer-*-portable.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $oldExe) { $oldExe = Get-ChildItem -Path $distDir -Filter "*-win-portable.exe" -ErrorAction SilentlyContinue | Where-Object { $_.Name -match "v$oldVer" } | Select-Object -First 1 }
if (-not $oldExe) { throw "Portable exe $oldVer not found" }

Write-Host "[2/5] Building $current..." -ForegroundColor Yellow
Set-PackageVersion $current
$null = npm run build:win
if ($LASTEXITCODE -ne 0) { throw "Build $current failed" }

$newExe = Get-ChildItem -Path $distDir -Filter "*-v$current-*-portable.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $newExe) { $newExe = Get-ChildItem -Path $distDir -Filter "*-win-portable.exe" -ErrorAction SilentlyContinue | Where-Object { $_.Name -match "v$current" } | Select-Object -First 1 }
if (-not $newExe) { throw "Portable exe $current not found" }

Write-Host "[3/5] Preparing test folder..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path $testDir -Force | Out-Null
$oldExeInTest = Join-Path $testDir $oldExe.Name
Copy-Item $oldExe.FullName -Destination $oldExeInTest -Force

$updateExePath = Join-Path $env:TEMP "UnblockPro-portable-update-$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()).exe"
Copy-Item $newExe.FullName -Destination $updateExePath -Force
Write-Host "  Old exe: $($oldExe.Name) -> test folder" -ForegroundColor Gray
Write-Host "  New exe: $($newExe.Name) -> temp" -ForegroundColor Gray
Write-Host "  Temp path: $updateExePath" -ForegroundColor Gray

Write-Host "[4/5] Starting old version ($oldVer) from $testDir" -ForegroundColor Green
Write-Host "  (Close any running UnblockPro before next test)" -ForegroundColor Gray
Write-Host "  Click Update - new exe will replace old one in place." -ForegroundColor Gray
Write-Host ""

$env:UNBLOCKPRO_UPDATE_FROM_PATH = $updateExePath
$env:UNBLOCKPRO_UPDATE_TARGET_PATH = $oldExeInTest
$env:UNBLOCKPRO_UPDATE_NEW_NAME = $newExe.Name
& $oldExeInTest
