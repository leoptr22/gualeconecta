$ErrorActionPreference = 'Stop'
$pushEntries = Get-Content -LiteralPath 'data/vercel-review-push-env.json' -Raw | ConvertFrom-Json
foreach ($entry in $pushEntries) {
    if ($entry.key -notin @('VAPID_PUBLIC_KEY','VAPID_PRIVATE_KEY')) { throw 'Variable push inválida' }
    $variableType = if ($entry.secret) { '--sensitive' } else { '--no-sensitive' }
    $vercelCommand = "vercel env add $($entry.key) --environment production $variableType --force --yes --scope leoptr22s-projects"
    $entry.value | & npm exec --yes --package=vercel -c $vercelCommand
    if ($LASTEXITCODE -ne 0) { throw "No se pudo configurar $($entry.key)" }
}
