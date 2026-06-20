# Fish shell script example

# Variables
set -g EDITOR nvim
set -gx PATH $HOME/.cargo/bin $PATH
set -l project_root (git rev-parse --show-toplevel 2>/dev/null)

# Functions
function greet
    echo "Hello, $argv[1]!"
end

function fish_prompt
    set -l last_status $status
    set -l branch (git rev-parse --abbrev-ref HEAD 2>/dev/null)
    if test -n "$branch"
        printf '[%s] $ ' $branch
    else
        printf '$ '
    end
end

function mkcd
    mkdir -p $argv[1] && cd $argv[1]
end

function deploy --description "Deploy to a target environment"
    argparse 'e/env=' 'r/release' -- $argv
    or return

    set -l env $_flag_env
    if test -z "$env"
        echo "Usage: deploy -e <staging|production>"
        return 1
    end

    if set -q _flag_release
        echo "Deploying release build to $env..."
    else
        echo "Deploying to $env..."
    end
end

# Aliases
alias ll "ls -la"
alias gs "git status"
alias gp "git push"

# Abbreviations
abbr -a gco git checkout
abbr -a gcm git commit -m

# Event handler
function on_exit --on-event fish_exit
    echo "Bye!"
end

# Source
source ~/.config/fish/local.fish
