$ErrorActionPreference = 'Stop'
$backendEntries = Get-Content -LiteralPath 'data/vercel-backend-env.json' -Raw | ConvertFrom-Json
foreach ($entry in $backendEntries) {
    if ($entry.key -notmatch '^[A-Z_]+$') { throw 'Variable de entorno inválida' }
    $variableType = if ($entry.secret) { '--sensitive' } else { '--no-sensitive' }
    $vercelCommand = "vercel env add $($entry.key) --environment production $variableType --force --yes --scope leoptr22s-projects"
    $entry.value | & npm exec --yes --package=vercel -c $vercelCommand
    if ($LASTEXITCODE -ne 0) { throw "No se pudo configurar $($entry.key)" }
}
