;; Emacs configuration (init.el)

;; ── Package Management ──
(require 'package)
(add-to-list 'package-archives '("melpa" . "https://melpa.org/packages/") t)
(add-to-list 'package-archives '("gnu" . "https://elpa.gnu.org/packages/") t)
(package-initialize)

;; Bootstrap use-package
(unless (package-installed-p 'use-package)
  (package-refresh-contents)
  (package-install 'use-package))
(require 'use-package)
(setq use-package-always-ensure t)

;; ── Core UI ──
(use-package emacs
  :config
  (setq inhibit-startup-screen t)
  (setq visible-bell t)
  (tool-bar-mode -1)
  (menu-bar-mode -1)
  (scroll-bar-mode -1)
  (global-display-line-numbers-mode 1)
  (column-number-mode 1)
  (global-hl-line-mode 1)
  (set-frame-font "Fira Code 13" nil t))

;; ── Theme ──
(use-package doom-themes
  :config
  (load-theme 'doom-one t)
  (doom-themes-visual-bell-config)
  (doom-themes-treemacs-config))

(use-package doom-modeline
  :hook (after-init . doom-modeline-mode))

;; ── Editor Packages ──
(use-package evil
  :init
  (setq evil-want-integration t)
  (setq evil-want-keybinding nil)
  :config
  (evil-mode 1))

(use-package evil-collection
  :after evil
  :config
  (evil-collection-init))

(use-package company
  :hook (after-init . global-company-mode)
  :config
  (setq company-idle-delay 0.2)
  (setq company-minimum-prefix-length 1))

(use-package ivy
  :diminish
  :config
  (ivy-mode 1)
  (setq ivy-use-virtual-buffers t))

(use-package counsel
  :after ivy
  :config (counsel-mode 1))

(use-package swiper
  :after ivy)

(use-package projectile
  :config
  (projectile-mode 1))

(use-package magit)

(use-package flycheck
  :hook (after-init . global-flycheck-mode))

(use-package lsp-mode
  :commands lsp
  :hook ((python-mode . lsp)
         (rust-mode . lsp)
         (js-mode . lsp)))

(use-package treemacs)

(use-package which-key
  :config (which-key-mode))

;; ── Keybindings ──
(global-set-key (kbd "C-x C-b") 'ibuffer)
(global-set-key (kbd "C-s") 'swiper)
(global-set-key (kbd "M-x") 'counsel-M-x)
(global-set-key (kbd "C-x C-f") 'counsel-find-file)
(global-set-key (kbd "C-c p f") 'projectile-find-file)
(global-set-key (kbd "C-c p s") 'projectile-switch-project)
(global-set-key (kbd "C-c g s") 'magit-status)
(global-set-key (kbd "C-c t") 'treemacs)
(global-set-key (kbd "<f5>") 'revert-buffer)

;; ── Custom Variables ──
(custom-set-variables
 '(custom-safe-themes t)
 '(tab-width 2)
 '(indent-tabs-mode nil)
 '(show-paren-mode t)
 '(electric-pair-mode t)
 '(delete-selection-mode t))

(custom-set-faces
 '(default ((t (:family "Fira Code" :height 130)))))
