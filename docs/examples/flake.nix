{
  description = "A simple development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    home-manager = {
      url = "github:nix-community/home-manager";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { self, nixpkgs, flake-utils, home-manager }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs
            yarn
            git
            curl
            jq
          ];
          shellHook = ''
            echo "Welcome to the dev shell!"
          '';
        };
        packages.default = pkgs.hello;
        apps.default = {
          type = "app";
          program = "${pkgs.hello}/bin/hello";
        };
        overlays.default = final: prev: { myPkg = pkgs.hello; };
      }) // {
        nixosModules.default = { config, pkgs, ... }: { };
      };
}
