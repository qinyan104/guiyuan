Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$envFile = Join-Path $repoRoot 'release/.env'
$composeFile = Join-Path $repoRoot 'release/docker-compose.yml'

if (-not (Test-Path -LiteralPath $envFile)) {
    throw "Missing $envFile. Copy release/.env.example to release/.env first."
}

if (-not (Test-Path -LiteralPath $composeFile)) {
    throw "Missing $composeFile."
}

Push-Location $repoRoot
try {
    $remotesOutput = (& git remote)
    if ($LASTEXITCODE -ne 0) {
        throw "git remote failed with exit code $LASTEXITCODE."
    }

    $remotes = @($remotesOutput | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    if ($remotes.Count -eq 0) {
        Write-Warning "No git remotes configured. Skipping git pull and deploying current local source."
    }
    else {
        $upstreamRef = & git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>$null
        if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace(($upstreamRef | Select-Object -First 1))) {
            & git pull
            if ($LASTEXITCODE -ne 0) {
                throw "git pull failed with exit code $LASTEXITCODE."
            }
        }
        else {
            $currentBranch = (& git branch --show-current | Select-Object -First 1).Trim()
            if ([string]::IsNullOrWhiteSpace($currentBranch)) {
                throw "Unable to determine current git branch."
            }

            if ($remotes.Count -eq 1) {
                $remote = $remotes[0].Trim()
                Write-Warning "Branch '$currentBranch' has no upstream. Using 'git pull $remote $currentBranch'."
                & git pull $remote $currentBranch
                if ($LASTEXITCODE -ne 0) {
                    throw "git pull $remote $currentBranch failed with exit code $LASTEXITCODE."
                }
            }
            else {
                $remoteList = $remotes -join ', '
                throw "Branch '$currentBranch' has no upstream and multiple remotes are configured ($remoteList). Set an upstream first."
            }
        }
    }

    # 宿主机本地快速编译 jar 包（复用本地缓存，极速装箱）
    Write-Host "Compiling backend jar locally..." -ForegroundColor Cyan
    Push-Location (Join-Path $repoRoot "backend")
    try {
        & .\mvnw.cmd package -DskipTests -DskipITs -B
        if ($LASTEXITCODE -ne 0) {
            throw "Local maven package failed with exit code $LASTEXITCODE."
        }
    }
    finally {
        Pop-Location
    }

    & docker compose --env-file $envFile -f $composeFile up --build -d
    if ($LASTEXITCODE -ne 0) {
        throw "docker compose up failed with exit code $LASTEXITCODE."
    }

    & docker compose --env-file $envFile -f $composeFile ps
    if ($LASTEXITCODE -ne 0) {
        throw "docker compose ps failed with exit code $LASTEXITCODE."
    }
}
finally {
    Pop-Location
}
