# ~/.bashrc — Bash interactive shell configuration

# Source global definitions
if [ -f /etc/bashrc ]; then
    . /etc/bashrc
fi

# Source local aliases
source ~/.bash_aliases

# --------------------
# PATH
# --------------------
export PATH="$HOME/.local/bin:$HOME/bin:$PATH"
export PATH="$HOME/.cargo/bin:$PATH"

# --------------------
# Environment
# --------------------
export EDITOR=vim
export VISUAL=vim
export PAGER=less
export HISTSIZE=10000
export HISTFILESIZE=20000
export HISTCONTROL=ignoredups:erasedups

# --------------------
# Aliases
# --------------------
alias ll='ls -alF'
alias la='ls -A'
alias l='ls -CF'
alias ..='cd ..'
alias ...='cd ../..'
alias gs='git status'
alias ga='git add'
alias gc='git commit'
alias gp='git push'
alias gl='git log --oneline --graph --decorate'
alias grep='grep --color=auto'
alias df='df -h'
alias du='du -h'
alias cls='clear'
alias vi='vim'
alias py='python3'
alias pip='pip3'
alias dps='docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"'
alias k='kubectl'

# --------------------
# Functions
# --------------------

# mkdir + cd in one step
mkcd() {
    mkdir -p "$1" && cd "$1"
}

# Fuzzy-find and open file in editor
fopen() {
    local file
    file=$(find . -type f | fzf)
    [ -n "$file" ] && $EDITOR "$file"
}

# Extract various archive types
extract() {
    if [ -f "$1" ]; then
        case "$1" in
            *.tar.bz2) tar xjf "$1" ;;
            *.tar.gz)  tar xzf "$1" ;;
            *.zip)     unzip "$1" ;;
            *.gz)      gunzip "$1" ;;
            *) echo "Unknown archive: $1" ;;
        esac
    else
        echo "'$1' is not a file"
    fi
}
