Write-Host "Stopping server on port 3001..." -ForegroundColor Yellow

$process = Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess

if ($process) {
    Write-Host "Found process ID: $process" -ForegroundColor Cyan
    Stop-Process -Id $process -Force
    Write-Host "Server stopped successfully!" -ForegroundColor Green
} else {
    Write-Host "No process found on port 3001" -ForegroundColor Red
}

Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")