# Nushell config.nu — user configuration file
# Place at: $nu.config-path

use std

$env.config = {
    show_banner: false
    edit_mode: vi
    render_right_prompt_on_last_line: false

    history: {
        max_size: 10000
        sync_on_enter: true
        file_format: "sqlite"
        isolation: true
    }

    completions: {
        case_sensitive: false
        quick: true
        partial: true
        algorithm: "fuzzy"
        external: {
            enable: true
            max_results: 100
        }
    }

    table: {
        mode: "rounded"
        index_mode: "always"
        show_empty: true
        padding: { left: 1, right: 1 }
        trim: {
            methodology: "wrapping"
            wrapping_try_keep_words: true
            truncating_suffix: "..."
        }
    }

    cursor_shape: {
        emacs: block
        vi_insert: block
        vi_normal: underscore
    }

    color_config: (nu-highlight)

    use_kitty_protocol: false
    highlight_resolved_externals: false

    hooks: {
        pre_prompt: []
        pre_execution: []
        env_change: {}
        display_output: "if (term size).columns >= 100 { table -e } else { table }"
        command_not_found: {}
    }

    keybindings: [
        {
            name: fuzzy_history
            modifier: control
            keycode: char_r
            mode: [emacs, vi_insert, vi_normal]
            event: { send: executehostcommand cmd: "commandline edit --replace (history | each { |it| $it.command } | uniq | reverse | str join (char -i 0) | fzf --read0 --tiebreak=chunk --layout=reverse --multi --preview='echo {..}' --preview-window='bottom:3:wrap' --bind='ctrl-d:reload(history | each { |it| $it.command } | uniq | reverse | str join (char -i 0))' | decode utf-8 | str trim)" }
        }
        {
            name: clear_screen
            modifier: control
            keycode: char_l
            mode: [emacs, vi_insert, vi_normal]
            event: { send: clearscreen }
        }
        {
            name: accept_autosuggestion
            modifier: none
            keycode: right
            mode: vi_insert
            event: { send: historyhintcomplete }
        }
    ]

    menus: [
        {
            name: completion_menu
            only_buffer_difference: false
            marker: "| "
            type: {
                layout: columnar
                columns: 4
                col_width: 20
                col_padding: 2
            }
            style: {
                text: green
                selected_text: green_reverse
                description_text: yellow
            }
        }
        {
            name: history_menu
            only_buffer_difference: true
            marker: "? "
            type: {
                layout: list
                page_size: 10
            }
            style: {
                text: green
                selected_text: green_reverse
                description_text: yellow
            }
        }
    ]
}

# ─── Custom Commands ─────────────────────────────────────────────────────────

def "path exists" [p: string] {
    ($p | path exists)
}

def "git status clean" [] {
    (git status --short | str length) == 0
}

def "sys mem" [] {
    sys mem | select total free used
}

def "docker ps clean" [] {
    docker ps --format "{{.Names}}\t{{.Image}}\t{{.Status}}" | from tsv --noheaders | rename name image status
}

def "log tail" [file: string, lines: int = 50] {
    open $file | lines | last $lines
}

# ─── Aliases ──────────────────────────────────────────────────────────────────

alias ll = ls -la
alias la = ls -a
alias gs = git status
alias gd = git diff
alias gl = git log --oneline --graph --all
alias ga = git add
alias gc = git commit
alias gp = git push
alias gco = git checkout
alias gcb = git checkout -b
alias k = kubectl
alias kns = kubectl config set-context --current --namespace
alias tf = terraform
alias v = nvim
alias cat = bat
alias grep = rg
alias find = fd

# ─── Environment ─────────────────────────────────────────────────────────────

$env.EDITOR = "nvim"
$env.VISUAL = "nvim"
$env.PAGER = "less"
$env.MANPAGER = "nvim +Man!"
