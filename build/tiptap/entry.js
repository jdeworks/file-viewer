// Build input for the vendored TipTap bundle. NOT shipped to docs/.
// esbuild concatenates this (and its dependency tree) into a single same-origin
// ESM file: docs/vendor/tiptap/tiptap.esm.js — see build.mjs in this folder.
//
// Everything re-exported here becomes importable by docs/types/markdown/*.js.
// Keep the surface minimal: the markdown WYSIWYG editor only needs the Editor
// class, StarterKit (paragraph/heading/bold/italic/strike/code/codeBlock/
// blockquote/lists/link/horizontalRule/hardBreak), the table kit, and the
// markdown parse/serialize extension.
export { Editor } from '@tiptap/core';
export { default as StarterKit } from '@tiptap/starter-kit';
export { TableKit } from '@tiptap/extension-table';
export { Markdown } from '@tiptap/markdown';
