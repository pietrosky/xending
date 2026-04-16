# Xending DB — Full initialization (init + migrations + seeds)
# Usage: .\platform\init-db.ps1
# Requires: xending-db container running (docker compose up -d db)

$ErrorActionPreference = "Stop"

Write-Host "=== Init (roles, schemas, extensions) ===" -ForegroundColor Cyan
Get-Content platform/supabase/docker/init.sql | docker exec -i xending-db psql -U postgres -d postgres

Write-Host "=== Migrations ===" -ForegroundColor Cyan
Get-ChildItem platform/supabase/migrations/*.sql | Sort-Object Name | ForEach-Object {
    Write-Host "  Applying: $($_.Name)"
    Get-Content $_.FullName | docker exec -i xending-db psql -U postgres -d postgres
}

Write-Host "=== Seeds ===" -ForegroundColor Cyan
Get-ChildItem platform/supabase/*seed*.sql | Sort-Object Name | ForEach-Object {
    Write-Host "  Seeding: $($_.Name)"
    Get-Content $_.FullName | docker exec -i xending-db psql -U postgres -d postgres
}

Write-Host "=== Done ===" -ForegroundColor Green
