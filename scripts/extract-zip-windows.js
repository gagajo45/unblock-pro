'use strict';
/**
 * Распаковка ZIP на Windows без Expand-Archive (он есть только с PowerShell 5).
 * На Windows 7 часто PS 2.0 — используем .NET ZipFile (нужен .NET 4.5+), затем COM Shell.Application.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const PS_EXTRACT = `param([string]$ZipPath, [string]$DestPath)
$ErrorActionPreference = 'Stop'
$ZipPath = [System.IO.Path]::GetFullPath($ZipPath)
$DestPath = [System.IO.Path]::GetFullPath($DestPath)
if (-not (Test-Path -LiteralPath $ZipPath)) { throw "Zip not found: $ZipPath" }

function Try-DotNet {
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  if (-not (Test-Path -LiteralPath $DestPath)) { New-Item -ItemType Directory -Path $DestPath -Force | Out-Null }
  [System.IO.Compression.ZipFile]::ExtractToDirectory($ZipPath, $DestPath)
}

function Try-ExpandArchive {
  Expand-Archive -LiteralPath $ZipPath -DestinationPath $DestPath -Force
}

function Try-ComShell {
  if (-not (Test-Path -LiteralPath $DestPath)) { New-Item -ItemType Directory -Path $DestPath -Force | Out-Null }
  $shell = New-Object -ComObject Shell.Application
  $z = $shell.Namespace($ZipPath)
  if (-not $z) { throw "Shell.Namespace failed for zip" }
  $d = $shell.Namespace($DestPath)
  if (-not $d) { throw "Shell.Namespace failed for dest" }
  $d.CopyHere($z.Items(), 20)
  $deadline = (Get-Date).AddSeconds(120)
  while ((Get-Date) -lt $deadline) {
    $hit = Get-ChildItem -LiteralPath $DestPath -Recurse -Filter 'winws.exe' -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($hit) { return }
    Start-Sleep -Milliseconds 400
  }
}

try { Try-DotNet; exit 0 } catch { }
try { Try-ExpandArchive; exit 0 } catch { }
try { Try-ComShell; exit 0 } catch { }
throw "ZIP extract failed (DotNet/Expand-Archive/COM)"
`;

function extractZipWindows(zipPath, destDir) {
  const tmp = path.join(os.tmpdir(), `unblock-extract-${Date.now()}-${Math.random().toString(36).slice(2)}.ps1`);
  fs.writeFileSync(tmp, PS_EXTRACT, 'utf8');
  try {
    const r = spawnSync(
      'powershell',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', tmp, zipPath, destDir],
      { encoding: 'utf8', windowsHide: true, maxBuffer: 10 * 1024 * 1024 }
    );
    if (r.status !== 0) {
      const msg = (r.stderr || r.stdout || '').trim() || `exit ${r.status}`;
      throw new Error(msg);
    }
  } finally {
    try {
      fs.unlinkSync(tmp);
    } catch (e) {}
  }
}

module.exports = { extractZipWindows };
