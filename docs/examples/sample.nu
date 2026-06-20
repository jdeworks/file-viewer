# Nushell script example

use std

# Private helper
def parse-version [version_str: string] {
    $version_str | split row "." | each { |v| $v | into int }
}

# Build the project
def build [
    --release (-r)   # Build in release mode
    --target (-t): string = "x86_64"  # Target architecture
] {
    let mode = if $release { "release" } else { "debug" }
    print $"Building ($target) in ($mode) mode..."
    cargo build --target $target (if $release { "--release" } else { "" })
}

# Run tests with optional filter
def run-tests [filter: string = ""] {
    let cmd = if ($filter | is-empty) {
        cargo test
    } else {
        cargo test $filter
    }
    $cmd
}

# Public API: deploy to environment
export def deploy [
    env: string  # Target environment (staging|production)
    --dry-run    # Print what would happen without executing
] {
    let allowed = ["staging" "production"]
    if not ($env in $allowed) {
        error make { msg: $"Unknown environment: ($env)" }
    }
    if $dry_run {
        print $"Would deploy to ($env)"
    } else {
        print $"Deploying to ($env)..."
        rsync -av ./dist/ $"user@server:/var/www/($env)/"
    }
}

# Public API: check service health
export def check-health [url: string] {
    let resp = http get $url | from json
    $resp | select status latency
}

use ./utils.nu [format-date, slugify]

alias ll = ls -la
alias gs = git status

let project_root = (git rev-parse --show-toplevel | str trim)
let config = open config.json
mut retry_count = 0

while $retry_count < 3 {
    let result = (try { http get https://api.example.com/health } catch { null })
    if $result != null { break }
    $retry_count = $retry_count + 1
}
