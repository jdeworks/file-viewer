# Zsh script example

# Autoloads
autoload -Uz compinit vcs_info colors
autoload -U add-zsh-hook

# Completion init
compinit -d ~/.zcompdump

# Shell options
setopt AUTO_CD EXTENDED_GLOB
setopt HIST_IGNORE_DUPS SHARE_HISTORY
unsetopt BEEP

# Exports
export EDITOR=nvim
export LANG=en_US.UTF-8
export PATH="$HOME/bin:$PATH"

# Aliases
alias ll='ls -lah'
alias gs='git status'
alias gp="git push origin"
alias -g G='| grep'

# Zstyle completion settings
zstyle ':completion:*' menu select
zstyle ':completion:*' matcher-list 'm:{a-z}={A-Z}'
zstyle ':completion:*:descriptions' format '%B%d%b'
zstyle ':vcs_info:git:*' formats '(%b)'

# Functions
function precmd() {
    vcs_info
}

function mkcd() {
    local dir=$1
    mkdir -p "$dir" && cd "$dir"
}

function git-branch-clean() {
    local merged
    merged=$(git branch --merged | grep -v '\*' | grep -v 'main' | grep -v 'master')
    if [[ -n "$merged" ]]; then
        echo "$merged" | xargs git branch -d
    fi
}

function deploy() {
    local env=$1
    local release=${2:-false}

    if [[ -z "$env" ]]; then
        echo "Usage: deploy <env> [release]"
        return 1
    fi

    echo "Deploying to $env..."
    rsync -av ./dist/ "user@server:/var/www/$env/"
}

# POSIX-form function (no `function` keyword)
backup() {
    local src=$1
    local dest=${2:-/tmp/backup}
    typeset -i count=0
    cp -r "$src" "$dest" && (( count++ ))
    print "backed up $@"
}

reload() {
    source ~/.zshrc
}

# ZLE widget
function fzf-history-widget() {
    local cmd
    cmd=$(fc -l 1 | fzf --tac --no-sort | sed 's/^\s*[0-9]*\s*//')
    BUFFER=$cmd
    CURSOR=${#BUFFER}
    zle reset-prompt
}
zle -N fzf-history-widget
zle -N edit-command-line

# Keybindings
bindkey '^R' fzf-history-widget
bindkey '^E' edit-command-line
bindkey '^[[A' up-line-or-search
bindkey '^[[B' down-line-or-search

# Completion definitions
compdef _git git-branch-clean=git
compdef _files deploy

# Source
source ~/.zsh/plugins/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh
. ~/.zsh/aliases.zsh

# Array declarations
local plugins=(git docker kubectl helm)
typeset -a fpath_additions

# Variables
local HISTFILE=~/.zsh_history
typeset -i HISTSIZE=10000
