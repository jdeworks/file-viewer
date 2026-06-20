;;; sample.el --- My Emacs configuration  -*- lexical-binding: t; -*-

;;; Commentary:
;; A minimal Emacs Lisp configuration demonstrating common patterns.

;;; Code:

(require 'cl-lib)
(require 'subr-x)
(require 'package)

(use-package magit
  :ensure t
  :bind ("C-x g" . magit-status))

(use-package company
  :ensure t
  :hook (prog-mode . company-mode)
  :config
  (setq company-idle-delay 0.3))

(use-package flycheck
  :ensure t
  :init (global-flycheck-mode))

(defcustom my-theme 'dark
  "The preferred color theme. Can be `dark' or `light'."
  :type '(choice (const dark) (const light))
  :group 'my-config)

(defcustom my-font-size 14
  "Default font size in points."
  :type 'integer
  :group 'my-config)

(defvar my-init-time nil
  "Time at which the init file was loaded.")

(defun my/reload-config ()
  "Reload the Emacs init file."
  (interactive)
  (load-file user-init-file)
  (message "Config reloaded!"))

(defun my/open-init-file ()
  "Open the Emacs init file for editing."
  (interactive)
  (find-file user-init-file))

(defun my/toggle-theme ()
  "Toggle between dark and light themes."
  (interactive)
  (if (eq my-theme 'dark)
      (setq my-theme 'light)
    (setq my-theme 'dark)))

(provide 'my-config)

;;; sample.el ends here
