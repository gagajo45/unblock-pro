# Запуск portable exe с флагом теста замены (без скачивания с GitHub).
# Сначала собери: npm run build:win
$exe = Get-ChildItem -Path "dist" -Filter "*-win-portable.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $exe) {
    Write-Host "Сначала собери: npm run build:win" -ForegroundColor Red
    exit 1
}
$env:UNBLOCKPRO_SIMULATE_UPDATE_APPLY = "1"
& $exe.FullName
