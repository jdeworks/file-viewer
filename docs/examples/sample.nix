# Sample Nix expression — a custom development shell
{ pkgs ? import <nixpkgs> {} }:

let
  pythonEnv = pkgs.python311.withPackages (ps: with ps; [
    requests
    pytest
    black
    mypy
  ]);

  nodeVersion = pkgs.nodejs_20;

  shellHook = ''
    echo "Dev shell loaded"
    export PROJECT_ROOT=$(pwd)
  '';
in

pkgs.mkShell {
  name = "sample-dev-shell";

  buildInputs = [
    pythonEnv
    nodeVersion
    pkgs.git
    pkgs.jq
    pkgs.curl
  ];

  inherit shellHook;

  env = {
    PYTHONDONTWRITEBYTECODE = "1";
    NODE_ENV = "development";
  };
}
