" Vim configuration (.vimrc)

" ── Plugin Manager (vim-plug) ──
call plug#begin('~/.vim/plugged')

Plug 'tpope/vim-fugitive'
Plug 'tpope/vim-surround'
Plug 'tpope/vim-commentary'
Plug 'airblade/vim-gitgutter'
Plug 'preservim/nerdtree'
Plug 'ctrlpvim/ctrlp.vim'
Plug 'dense-analysis/ale'
Plug 'itchyny/lightline.vim'
Plug 'morhetz/gruvbox'
Plug 'jiangmiao/auto-pairs'
Plug 'junegunn/fzf', { 'do': { -> fzf#install() } }
Plug 'junegunn/fzf.vim'

call plug#end()

" ── General Settings ──
set nocompatible
set encoding=utf-8
set number
set relativenumber
set cursorline
set tabstop=4
set shiftwidth=4
set expandtab
set autoindent
set smartindent
set hlsearch
set incsearch
set ignorecase
set smartcase
set wrap
set linebreak
set scrolloff=8
set sidescrolloff=8
set signcolumn=yes
set updatetime=300
set hidden
set nobackup
set nowritebackup
set cmdheight=2
set laststatus=2
set wildmenu

" ── Colorscheme ──
set background=dark
colorscheme gruvbox

" ── Key Mappings ──
let mapleader = " "

nnoremap <leader>n :NERDTreeToggle<CR>
nnoremap <leader>ff :Files<CR>
nnoremap <leader>fg :Rg<CR>
nnoremap <leader>w :w<CR>
nnoremap <leader>q :q<CR>
nnoremap <C-h> <C-w>h
nnoremap <C-l> <C-w>l
nnoremap <C-j> <C-w>j
nnoremap <C-k> <C-w>k
nnoremap <leader>gb :Git blame<CR>
nnoremap <leader>gs :Git<CR>
vnoremap < <gv
vnoremap > >gv

" ── Plugin Settings ──
let g:NERDTreeShowHidden=1
let g:NERDTreeMinimalUI=1
let g:ctrlp_use_caching=1
let g:ale_linters_explicit=1
let g:lightline = { 'colorscheme': 'gruvbox' }
