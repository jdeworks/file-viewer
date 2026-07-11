#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: companion/scripts/build-release.sh vMAJOR.MINOR.PATCH

Build and validate the File Viewer Companion release assets locally. The tag
must already exist locally at HEAD. This script does not create or publish a
release, push commits or tags, or upload assets.
EOF
}

die() {
  printf 'error: %s\n' "$*" >&2
  exit 1
}

if [[ ${1:-} == "--help" || ${1:-} == "-h" ]]; then
  [[ $# -eq 1 ]] || die "--help takes no other arguments"
  usage
  exit 0
fi

[[ $# -eq 1 ]] || { usage >&2; exit 2; }
tag=$1
if [[ ! $tag =~ ^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?(\+[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?$ ]]; then
  die "tag must be v-prefixed SemVer (for example, v0.1.0)"
fi
version=${tag#v}
prerelease=${version%%+*}
if [[ $prerelease == *-* ]]; then
  prerelease=${prerelease#*-}
  IFS='.' read -r -a prerelease_ids <<< "$prerelease"
  for identifier in "${prerelease_ids[@]}"; do
    if [[ $identifier =~ ^[0-9]+$ && ${#identifier} -gt 1 && $identifier == 0* ]]; then
      die "numeric SemVer prerelease identifiers must not contain leading zeroes"
    fi
  done
fi

script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
repo_root=$(cd "$script_dir/../.." && pwd)
companion_dir="$repo_root/companion"
tauri_dir="$companion_dir/src-tauri"
dist_root="$companion_dir/dist"
dist_dir="$dist_root/$tag"

[[ $(uname -s) == "Linux" ]] || die "release builds require x86_64 Linux or WSL"
[[ $(uname -m) == "x86_64" ]] || die "release builds require x86_64, found $(uname -m)"

for cmd in git cargo docker sha256sum file dpkg-deb node; do
  command -v "$cmd" >/dev/null 2>&1 || die "required command not found: $cmd"
done

if ! command -v cargo-tauri >/dev/null 2>&1; then
  cargo tauri --version >/dev/null 2>&1 || die "cargo-tauri is required (the 'cargo tauri' subcommand)"
fi

if ! command -v cargo-about >/dev/null 2>&1; then
  die "cargo-about 0.8.2 is required; install it with: cargo install --locked cargo-about --version 0.8.2"
fi
about_version=$(cargo-about --version | awk '{print $2}')
if [[ $about_version != "0.8.2" ]]; then
  die "cargo-about 0.8.2 is required, found $about_version; install it with: cargo install --locked --force cargo-about --version 0.8.2"
fi

cd "$repo_root"
worktree_status=$(git status --porcelain --untracked-files=all)
[[ -z $worktree_status ]] || die "worktree must be clean, including untracked files"

tag_commit=$(git rev-parse --verify "refs/tags/$tag^{commit}" 2>/dev/null) \
  || die "local tag $tag does not exist"
head_commit=$(git rev-parse HEAD)
[[ $tag_commit == "$head_commit" ]] || die "local tag $tag does not point at HEAD"
tag_type=$(git cat-file -t "refs/tags/$tag")
[[ $tag_type == "tag" ]] || die "local tag $tag must be annotated"

git remote get-url origin >/dev/null 2>&1 || die "git remote 'origin' is required to verify the tag is unpushed"
set +e
remote_tag_output=$(git ls-remote --exit-code --tags origin "refs/tags/$tag" 2>&1)
remote_tag_status=$?
set -e
case $remote_tag_status in
  0) die "tag $tag already exists on origin; release assets must be verified before the tag is pushed" ;;
  2) ;;
  *) die "could not verify whether $tag exists on origin: $remote_tag_output" ;;
esac

package_version() {
  local manifest=$1 package_id
  package_id=$(cargo pkgid --manifest-path "$manifest")
  printf '%s\n' "${package_id##*@}"
}

server_version=$(package_version "$companion_dir/server/Cargo.toml")
desktop_version=$(package_version "$tauri_dir/Cargo.toml")
tauri_version=$(node -e 'process.stdout.write(require(process.argv[1]).version)' "$tauri_dir/tauri.conf.json")
[[ $server_version == "$version" ]] || die "server package version $server_version does not match $version"
[[ $desktop_version == "$version" ]] || die "desktop package version $desktop_version does not match $version"
[[ $tauri_version == "$version" ]] || die "Tauri config version $tauri_version does not match $version"

printf '%s\n' '>> Running full repository release gate'
"$repo_root/scripts/check.sh"

if [[ -L $dist_root ]]; then
  die "$dist_root must not be a symlink"
fi
mkdir -p "$dist_root"
case "$dist_dir" in
  "$dist_root"/v*) ;;
  *) die "refusing to recreate unexpected dist path: $dist_dir" ;;
esac
rm -rf -- "$dist_dir"
mkdir -p "$dist_dir"

printf '%s\n' '>> Testing server with locked offline dependencies'
cargo test --offline --locked --manifest-path "$companion_dir/Cargo.toml"

printf '%s\n' '>> Building current debug server explicitly'
cargo build --offline --locked --manifest-path "$companion_dir/Cargo.toml"

printf '%s\n' '>> Running browser-to-companion E2E'
node "$repo_root/tests/companion-e2e.mjs"

printf '%s\n' '>> Building Linux deb and AppImage bundles'
rm -rf -- "$tauri_dir/target/release/bundle/deb" "$tauri_dir/target/release/bundle/appimage"
(
  cd "$tauri_dir"
  cargo tauri build --ci --bundles deb,appimage -- --locked
)

printf '%s\n' '>> Building Windows server and desktop executables'
"$companion_dir/scripts/build-windows.sh" all

mapfile -d '' -t debs < <(find "$tauri_dir/target/release/bundle/deb" -maxdepth 1 -type f -name '*.deb' -print0)
mapfile -d '' -t appimages < <(find "$tauri_dir/target/release/bundle/appimage" -maxdepth 1 -type f -name '*.AppImage' -print0)
[[ ${#debs[@]} -eq 1 ]] || die "expected exactly one deb bundle, found ${#debs[@]}"
[[ ${#appimages[@]} -eq 1 ]] || die "expected exactly one AppImage bundle, found ${#appimages[@]}"

linux_appimage="file-viewer-companion-$version-linux-x86_64.AppImage"
linux_deb="file-viewer-companion-$version-linux-amd64.deb"
windows_desktop="file-viewer-companion-desktop-$version-windows-x86_64.exe"
windows_server="file-viewer-companion-server-$version-windows-x86_64.exe"

install -m 0755 "${appimages[0]}" "$dist_dir/$linux_appimage"
install -m 0644 "${debs[0]}" "$dist_dir/$linux_deb"
install -m 0644 "$companion_dir/.win-target-tauri/x86_64-pc-windows-msvc/release/file-viewer-companion-desktop.exe" "$dist_dir/$windows_desktop"
install -m 0644 "$companion_dir/.win-target/x86_64-pc-windows-msvc/release/companion.exe" "$dist_dir/$windows_server"
install -m 0644 "$repo_root/LICENSE" "$dist_dir/LICENSE"

printf '%s\n' '>> Generating third-party license notice'
cargo-about generate \
  --fail \
  --frozen \
  --manifest-path "$tauri_dir/Cargo.toml" \
  --config "$companion_dir/about.toml" \
  --output-file "$dist_dir/THIRD-PARTY-LICENSES.html" \
  "$companion_dir/about.hbs"

payloads=(
  "$linux_appimage"
  "$linux_deb"
  "$windows_desktop"
  "$windows_server"
  "LICENSE"
  "THIRD-PARTY-LICENSES.html"
)
for asset in "${payloads[@]}"; do
  [[ -s "$dist_dir/$asset" ]] || die "release asset is missing or empty: $asset"
done

deb_package=$(dpkg-deb --field "$dist_dir/$linux_deb" Package)
deb_version=$(dpkg-deb --field "$dist_dir/$linux_deb" Version)
deb_arch=$(dpkg-deb --field "$dist_dir/$linux_deb" Architecture)
[[ $deb_package == "file-viewer-companion" ]] || die "unexpected deb Package: $deb_package"
[[ $deb_version == "$version" ]] || die "unexpected deb Version: $deb_version"
[[ $deb_arch == "amd64" ]] || die "unexpected deb Architecture: $deb_arch"

appimage_type=$(file -b "$dist_dir/$linux_appimage")
[[ $appimage_type =~ ELF\ 64-bit.*x86-64 ]] || die "AppImage is not an x86-64 ELF: $appimage_type"

extract_tmp=''
cleanup_extract() {
  if [[ -n $extract_tmp && -d $extract_tmp ]]; then
    rm -rf -- "$extract_tmp"
  fi
}
trap cleanup_extract EXIT
extract_tmp=$(mktemp -d)
(
  cd "$extract_tmp"
  "$dist_dir/$linux_appimage" --appimage-extract >/dev/null
)
[[ -d "$extract_tmp/squashfs-root" ]] || die "AppImage extraction did not create squashfs-root"
cleanup_extract
extract_tmp=''

for windows_asset in "$windows_desktop" "$windows_server"; do
  windows_type=$(file -b "$dist_dir/$windows_asset")
  [[ $windows_type =~ PE32\+.*x86-64 ]] || die "$windows_asset is not PE32+ x86-64: $windows_type"
done

mapfile -t sorted_payloads < <(printf '%s\n' "${payloads[@]}" | LC_ALL=C sort)
[[ ${#sorted_payloads[@]} -eq 6 ]] || die "expected six checksum payloads"
(
  cd "$dist_dir"
  : > SHA256SUMS
  for asset in "${sorted_payloads[@]}"; do
    sha256sum -- "$asset" >> SHA256SUMS
  done
  awk '{ sub(/^[^ ]+  /, ""); print }' SHA256SUMS | LC_ALL=C sort -c
  sha256sum -c SHA256SUMS
)

worktree_status=$(git status --porcelain --untracked-files=all)
[[ -z $worktree_status ]] || die "build changed the worktree; inspect it before release"

cat <<EOF

Release assets are ready in:
  $dist_dir

Manual next steps:
  1. Smoke-test the Linux bundles and both raw Windows executables on their target platforms.
  2. Verify platform cleanup and re-run the checksum check after transferring files.
  3. Follow companion/README.md's manual release sequence.

No remote, tag, or release state was changed by this script.
EOF
