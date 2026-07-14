{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  name = "file-viewer-demo";

  packages = with pkgs; [
    nodejs_22
    playwright-test
    python3
  ];

  shellHook = ''
    export PLAYWRIGHT_BROWSERS_PATH="$PWD/.cache/playwright"
    echo "Development shell ready"
  '';
}
