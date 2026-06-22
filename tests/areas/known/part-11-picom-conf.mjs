// Auto-split slice 11/18 of the known-files smoke area (see ./../known-files.mjs).
// Covers: picom.conf … .nanorc.
// Called in order on the shared ctx — keep openExample order intact; no cross-file state.
export async function run(ctx) {
  const { page, origin, frameOf, pass, fail, openExample } = ctx;

  // ── picom.conf (picom X11 compositor) viewer ──
  await openExample('picom.conf');
  await page.waitForSelector('#previewHost .picomcfg-doc', { timeout: 12000 });
  const picomText = await page.$eval('#previewHost .picomcfg-doc', (e) => e.textContent);
  if (/picom/i.test(picomText)) pass('picom.conf: picom badge shown'); else fail('picom-conf badge: ' + picomText.slice(0, 200));
  if (/glx|backend|shadow/i.test(picomText)) pass('picom.conf: backend or shadow information shown'); else fail('picom-conf content: ' + picomText.slice(0, 300));

  // ── mpd.conf (Music Player Daemon) viewer ──
  await openExample('mpd.conf');
  await page.waitForSelector('#previewHost .mpdcfg-doc', { timeout: 12000 });
  const mpdText = await page.$eval('#previewHost .mpdcfg-doc', (e) => e.textContent);
  if (/MPD/i.test(mpdText)) pass('mpd.conf: MPD badge shown'); else fail('mpd-conf badge: ' + mpdText.slice(0, 200));
  if (/Music|audio|pipewire/i.test(mpdText)) pass('mpd.conf: music directory or audio outputs shown'); else fail('mpd-conf content: ' + mpdText.slice(0, 300));

  // ── shard.yml (Crystal Shard) viewer ──
  await openExample('shard.yml');
  await page.waitForSelector('#previewHost .shard-doc', { timeout: 12000 });
  const shardText = await page.$eval('#previewHost .shard-doc', (e) => e.textContent);
  if (/Crystal/i.test(shardText)) pass('shard.yml: Crystal badge shown'); else fail('crystal-shard badge: ' + shardText.slice(0, 200));
  if (/my_crystal_app|0\.3\.1/i.test(shardText)) pass('shard.yml: package name or version shown'); else fail('crystal-shard name/version: ' + shardText.slice(0, 300));
  if (/kemal|jennifer|pg/i.test(shardText)) pass('shard.yml: dependencies shown'); else fail('crystal-shard deps: ' + shardText.slice(0, 300));

  // ── build.zig.zon (Zig Package Manifest) viewer ──
  await openExample('build.zig.zon');
  await page.waitForSelector('#previewHost .zon-doc', { timeout: 12000 });
  const zigzonText = await page.$eval('#previewHost .zon-doc', (e) => e.textContent);
  if (/Zig/i.test(zigzonText)) pass('build.zig.zon: Zig badge shown'); else fail('zig-zon badge: ' + zigzonText.slice(0, 200));
  if (/my_zig_project|0\.2\.0/i.test(zigzonText)) pass('build.zig.zon: package name or version shown'); else fail('zig-zon name/version: ' + zigzonText.slice(0, 300));

  // ── dune-project (Dune build system) viewer ──
  await openExample('dune-project');
  await page.waitForSelector('#previewHost .dunebuild-doc', { timeout: 12000 });
  const duneText = await page.$eval('#previewHost .dunebuild-doc', (e) => e.textContent);
  if (/Dune/i.test(duneText)) pass('dune-project: Dune badge shown'); else fail('dune-build badge: ' + duneText.slice(0, 200));
  if (/my-ocaml-project|3\.14|library|executable/i.test(duneText)) pass('dune-project: project name or stanza info shown'); else fail('dune-build content: ' + duneText.slice(0, 300));
  if (/package/i.test(duneText)) pass('dune-project: package count shown'); else fail('dune-build packages: ' + duneText.slice(0, 300));

  // ── .scalafmt.conf (scalafmt Scala formatter) viewer ──
  await openExample('.scalafmt.conf');
  await page.waitForSelector('#previewHost .scalafmt-doc', { timeout: 12000 });
  const scalafmtText = await page.$eval('#previewHost .scalafmt-doc', (e) => e.textContent);
  if (/scalafmt/i.test(scalafmtText)) pass('.scalafmt.conf: scalafmt badge shown'); else fail('scalafmt-conf badge: ' + scalafmtText.slice(0, 200));
  if (/maxColumn|version|3\.7/i.test(scalafmtText)) pass('.scalafmt.conf: version or maxColumn shown'); else fail('scalafmt-conf content: ' + scalafmtText.slice(0, 300));
  if (/rewrite|SortImports|scala/i.test(scalafmtText)) pass('.scalafmt.conf: rewrite rules or dialect shown'); else fail('scalafmt-conf rewrite: ' + scalafmtText.slice(0, 300));

  // ── .scalafix.conf (scalafix Scala linter/rewriter) viewer ──
  await openExample('.scalafix.conf');
  await page.waitForSelector('.scalafix-doc', { timeout: 12000 });
  pass('.scalafix.conf: renders');
  const scalafixText = await page.$eval('.scalafix-doc', el => el.textContent);
  if (/scalafix/i.test(scalafixText)) pass('.scalafix.conf: badge shown'); else fail('.scalafix.conf: missing badge: ' + scalafixText.slice(0, 200));
  if (/rule|RemoveUnused|OrganizeImports/i.test(scalafixText)) pass('.scalafix.conf: rules shown'); else fail('.scalafix.conf: no rules shown: ' + scalafixText.slice(0, 300));

  // ── bspwmrc (bspwm tiling window manager config) viewer ──
  await openExample('bspwmrc');
  await page.waitForSelector('#previewHost .bspwmrc-doc', { timeout: 12000 });
  const bspwmText = await page.$eval('#previewHost .bspwmrc-doc', (e) => e.textContent);
  if (/bspwm/i.test(bspwmText)) pass('bspwmrc: bspwm badge shown'); else fail('bspwmrc badge: ' + bspwmText.slice(0, 200));
  if (/HDMI-1|eDP-1/i.test(bspwmText)) pass('bspwmrc: monitor names shown'); else fail('bspwmrc monitors: ' + bspwmText.slice(0, 300));
  if (/border_width|window_gap|split_ratio/i.test(bspwmText)) pass('bspwmrc: layout settings shown'); else fail('bspwmrc layout: ' + bspwmText.slice(0, 300));
  if (/#45475a|#89b4fa|#cba6f7/i.test(bspwmText)) pass('bspwmrc: border colors shown'); else fail('bspwmrc colors: ' + bspwmText.slice(0, 300));

  // ── sxhkdrc (sxhkd hotkey daemon config) viewer ──
  await openExample('sxhkdrc');
  await page.waitForSelector('#previewHost .sxhkdrc-doc', { timeout: 12000 });
  const sxhkdText = await page.$eval('#previewHost .sxhkdrc-doc', (e) => e.textContent);
  if (/sxhkd/i.test(sxhkdText)) pass('sxhkdrc: sxhkd badge shown'); else fail('sxhkdrc badge: ' + sxhkdText.slice(0, 200));
  if (/binding|shortcut/i.test(sxhkdText)) pass('sxhkdrc: binding count shown'); else fail('sxhkdrc binding count: ' + sxhkdText.slice(0, 300));
  if (/super\s*\+/i.test(sxhkdText)) pass('sxhkdrc: Super key bindings shown'); else fail('sxhkdrc key combos: ' + sxhkdText.slice(0, 300));
  if (/alacritty|rofi|bspc/i.test(sxhkdText)) pass('sxhkdrc: commands listed'); else fail('sxhkdrc commands: ' + sxhkdText.slice(0, 300));

  // ── mpv.conf (mpv media player config) viewer ──
  await openExample('mpv.conf');
  await page.waitForSelector('#previewHost .mpvcfg-doc', { timeout: 12000 });
  const mpvText = await page.$eval('#previewHost .mpvcfg-doc', (e) => e.textContent);
  if (/mpv/i.test(mpvText)) pass('mpv.conf: mpv badge shown'); else fail('mpv-conf badge: ' + mpvText.slice(0, 200));
  if (/gpu-next|vo/i.test(mpvText)) pass('mpv.conf: video output shown'); else fail('mpv-conf vo: ' + mpvText.slice(0, 300));
  if (/auto-safe|hwdec/i.test(mpvText)) pass('mpv.conf: hwdec shown'); else fail('mpv-conf hwdec: ' + mpvText.slice(0, 300));

  // ── yt-dlp.conf (yt-dlp downloader config) viewer ──
  await openExample('yt-dlp.conf');
  await page.waitForSelector('#previewHost .ytdlpcfg-doc', { timeout: 12000 });
  const ytdlpText = await page.$eval('#previewHost .ytdlpcfg-doc', (e) => e.textContent);
  if (/yt-dlp/i.test(ytdlpText)) pass('yt-dlp.conf: yt-dlp badge shown'); else fail('ytdlp-conf badge: ' + ytdlpText.slice(0, 200));
  if (/format|bestvideo/i.test(ytdlpText)) pass('yt-dlp.conf: format spec shown'); else fail('ytdlp-conf format: ' + ytdlpText.slice(0, 300));
  if (/output|Downloads/i.test(ytdlpText)) pass('yt-dlp.conf: output path shown'); else fail('ytdlp-conf output: ' + ytdlpText.slice(0, 300));

  // ── ncmpcpp.conf (ncmpcpp MPD music player client config) viewer ──
  await openExample('ncmpcpp.conf');
  await page.waitForSelector('#previewHost .ncmpcpp-doc', { timeout: 12000 });
  const ncmpcppText = await page.$eval('#previewHost .ncmpcpp-doc', (e) => e.textContent);
  if (/ncmpcpp/i.test(ncmpcppText)) pass('ncmpcpp.conf: ncmpcpp badge shown'); else fail('ncmpcpp-conf badge: ' + ncmpcppText.slice(0, 200));
  if (/localhost|mpd_host/i.test(ncmpcppText)) pass('ncmpcpp.conf: MPD host shown'); else fail('ncmpcpp-conf mpd host: ' + ncmpcppText.slice(0, 300));
  if (/spectrum|visualizer/i.test(ncmpcppText)) pass('ncmpcpp.conf: visualizer type shown'); else fail('ncmpcpp-conf visualizer: ' + ncmpcppText.slice(0, 300));

  // ── newsboat.conf (newsboat RSS/Atom feed reader config) viewer ──
  await openExample('newsboat.conf');
  await page.waitForSelector('#previewHost .newsboat-doc', { timeout: 12000 });
  const newsboatText = await page.$eval('#previewHost .newsboat-doc', (e) => e.textContent);
  if (/newsboat/i.test(newsboatText)) pass('newsboat.conf: newsboat badge shown'); else fail('newsboat-conf badge: ' + newsboatText.slice(0, 200));
  if (/30 min|reload-time/i.test(newsboatText)) pass('newsboat.conf: reload time shown'); else fail('newsboat-conf reload-time: ' + newsboatText.slice(0, 300));
  if (/xdg-open|browser/i.test(newsboatText)) pass('newsboat.conf: browser command shown'); else fail('newsboat-conf browser: ' + newsboatText.slice(0, 300));

  // ── .Xresources (X11 resource database) viewer ──
  await openExample('.Xresources');
  await page.waitForSelector('#previewHost .xrdb-doc', { timeout: 12000 });
  const xresText = await page.$eval('#previewHost .xrdb-doc', (e) => e.textContent);
  if (/Xresources/i.test(xresText)) pass('.Xresources: Xresources badge shown'); else fail('xresources badge: ' + xresText.slice(0, 200));
  if (/96\s*dpi|Xft/i.test(xresText)) pass('.Xresources: DPI or Xft settings shown'); else fail('xresources dpi: ' + xresText.slice(0, 300));
  if (/#1e1e2e|#cdd6f4|color0|color/i.test(xresText)) pass('.Xresources: color palette shown'); else fail('xresources colors: ' + xresText.slice(0, 300));

  // ── xorg.conf (Xorg X server config) viewer ──
  await openExample('xorg.conf');
  await page.waitForSelector('#previewHost .xorgcfg-doc', { timeout: 12000 });
  const xorgText = await page.$eval('#previewHost .xorgcfg-doc', (e) => e.textContent);
  if (/Xorg/i.test(xorgText)) pass('xorg.conf: Xorg badge shown'); else fail('xorg-conf badge: ' + xorgText.slice(0, 200));
  if (/amdgpu|nvidia|intel|modesetting/i.test(xorgText)) pass('xorg.conf: GPU driver shown'); else fail('xorg-conf driver: ' + xorgText.slice(0, 300));
  if (/Screen|Device|Monitor|ServerLayout/i.test(xorgText)) pass('xorg.conf: section names shown'); else fail('xorg-conf sections: ' + xorgText.slice(0, 300));

  // ── rclone.conf (rclone cloud storage config) viewer ──
  await openExample('rclone.conf');
  await page.waitForSelector('#previewHost .rclonecfg-doc', { timeout: 12000 });
  const rcloneText = await page.$eval('#previewHost .rclonecfg-doc', (e) => e.textContent);
  if (/rclone/i.test(rcloneText)) pass('rclone.conf: rclone badge shown'); else fail('rclone-conf badge: ' + rcloneText.slice(0, 200));
  if (/s3-backup|gdrive|dropbox|sftp/i.test(rcloneText)) pass('rclone.conf: remote names shown'); else fail('rclone-conf remotes: ' + rcloneText.slice(0, 300));
  if (/s3|drive|dropbox|sftp|crypt/i.test(rcloneText)) pass('rclone.conf: remote type chips shown'); else fail('rclone-conf types: ' + rcloneText.slice(0, 300));
  if (!/AKIAIOSFODNN7EXAMPLE|wJalrXUtnFEMI|GOCSPX|example_token/.test(rcloneText)) pass('rclone.conf: credentials are redacted'); else fail('rclone-conf credentials not redacted: ' + rcloneText.slice(0, 400));
  if (/configured/i.test(rcloneText)) pass('rclone.conf: [configured] placeholder shown for secrets'); else fail('rclone-conf redact placeholder: ' + rcloneText.slice(0, 300));

  // ── resticprofile.toml (resticprofile backup config) viewer ──
  await openExample('resticprofile.toml');
  await page.waitForSelector('#previewHost .resticcfg-doc', { timeout: 12000 });
  const resticText = await page.$eval('#previewHost .resticcfg-doc', (e) => e.textContent);
  if (/restic/i.test(resticText)) pass('resticprofile.toml: restic badge shown'); else fail('restic-config badge: ' + resticText.slice(0, 200));
  if (/default|offsite/i.test(resticText)) pass('resticprofile.toml: profile names shown'); else fail('restic-config profiles: ' + resticText.slice(0, 300));
  if (/repository|password-file/i.test(resticText)) pass('resticprofile.toml: repository or password-file shown'); else fail('restic-config repo: ' + resticText.slice(0, 300));
  if (!/AKIAIOSFODNN7EXAMPLE|wJalrXUtnFEMI/.test(resticText)) pass('resticprofile.toml: AWS credentials are redacted'); else fail('restic-config credentials not redacted: ' + resticText.slice(0, 400));

  // ── .taskrc (Taskwarrior config) viewer ──
  await openExample('.taskrc');
  await page.waitForSelector('#previewHost .taskrccfg-doc', { timeout: 12000 });
  const taskrcText = await page.$eval('#previewHost .taskrccfg-doc', (e) => e.textContent);
  if (/taskwarrior/i.test(taskrcText)) pass('.taskrc: Taskwarrior badge shown'); else fail('taskrc badge: ' + taskrcText.slice(0, 200));
  if (/data\.location|~\/.local\/share\/task/i.test(taskrcText)) pass('.taskrc: data location shown'); else fail('taskrc data location: ' + taskrcText.slice(0, 300));
  if (/urgency|coefficient/i.test(taskrcText)) pass('.taskrc: urgency coefficients shown'); else fail('taskrc urgency: ' + taskrcText.slice(0, 300));
  if (!/\[configured\].*(?:org|user|uuid|password)/i.test(taskrcText) && /configured/i.test(taskrcText)) pass('.taskrc: taskd.credentials shown as [configured]'); else if (/configured/i.test(taskrcText)) pass('.taskrc: taskd.credentials masked'); else fail('taskrc credentials not masked: ' + taskrcText.slice(0, 400));

  // ── .curlrc (curl defaults config) viewer ──
  await openExample('.curlrc');
  await page.waitForSelector('#previewHost .curlrc-doc', { timeout: 12000 });
  pass('.curlrc: renders');
  const curlrcText = await page.$eval('#previewHost .curlrc-doc', (e) => e.textContent);
  if (/curl/i.test(curlrcText)) pass('.curlrc: badge shown'); else fail('.curlrc: missing badge');
  if (/redirect|location|max-redirs/i.test(curlrcText)) pass('.curlrc: redirect setting shown'); else fail('curlrc redirect: ' + curlrcText.slice(0, 300));
  if (/max-time|connect-timeout|timeout/i.test(curlrcText)) pass('.curlrc: timeout shown'); else fail('curlrc timeout: ' + curlrcText.slice(0, 300));
  if (!curlrcText.includes('secretpass')) pass('.curlrc: credentials masked'); else fail('.curlrc: credential leaked!');

  // ── .inputrc (GNU readline config) viewer ──
  await openExample('.inputrc');
  await page.waitForSelector('#previewHost .inputrc-doc', { timeout: 12000 });
  const inputrcText = await page.$eval('#previewHost .inputrc-doc', (e) => e.textContent);
  if (/readline/i.test(inputrcText)) pass('.inputrc: readline badge shown'); else fail('inputrc badge: ' + inputrcText.slice(0, 200));
  if (/editing.mode|vi mode|emacs mode/i.test(inputrcText)) pass('.inputrc: editing mode shown'); else fail('inputrc editing mode: ' + inputrcText.slice(0, 300));
  if (/completion.ignore.case|completion/i.test(inputrcText)) pass('.inputrc: completion settings shown'); else fail('inputrc completion: ' + inputrcText.slice(0, 300));

  // ── .wgetrc (wget config) viewer ──
  await openExample('.wgetrc');
  await page.waitForSelector('#previewHost .wgetrc-doc', { timeout: 12000 });
  pass('.wgetrc: renders');
  const wgetrcText = await page.$eval('#previewHost .wgetrc-doc', (e) => e.textContent);
  if (/wget/i.test(wgetrcText)) pass('.wgetrc: badge shown'); else fail('.wgetrc: missing badge');
  if (/timeout|connect.timeout/i.test(wgetrcText)) pass('.wgetrc: timeout shown'); else fail('wgetrc timeout: ' + wgetrcText.slice(0, 300));
  if (/tries|retry/i.test(wgetrcText)) pass('.wgetrc: retry count shown'); else fail('wgetrc tries: ' + wgetrcText.slice(0, 300));
  if (!wgetrcText.includes('secretpass')) pass('.wgetrc: credentials masked'); else fail('.wgetrc: credential leaked!');

  // ── helix.toml (Helix editor config) viewer ──
  await openExample('helix.toml');
  await page.waitForSelector('#previewHost .helixcfg-doc', { timeout: 12000 });
  const helixText = await page.$eval('#previewHost .helixcfg-doc', (e) => e.textContent);
  if (/helix/i.test(helixText)) pass('helix.toml: Helix badge shown'); else fail('helix-config badge: ' + helixText.slice(0, 200));
  if (/catppuccin_mocha|theme/i.test(helixText)) pass('helix.toml: theme shown'); else fail('helix-config theme: ' + helixText.slice(0, 300));
  if (/relative|line.number/i.test(helixText)) pass('helix.toml: line-number setting shown'); else fail('helix-config line-number: ' + helixText.slice(0, 300));

  // ── lfrc (lf file manager config) viewer ──
  await openExample('lfrc');
  await page.waitForSelector('#previewHost .lfrc-doc', { timeout: 12000 });
  const lfrcText = await page.$eval('#previewHost .lfrc-doc', (e) => e.textContent);
  if (/\blf\b/i.test(lfrcText)) pass('lfrc: lf badge shown'); else fail('lfrc badge: ' + lfrcText.slice(0, 200));
  if (/icons|setting/i.test(lfrcText)) pass('lfrc: icons setting shown'); else fail('lfrc icons: ' + lfrcText.slice(0, 300));
  if (/binding|map|key/i.test(lfrcText)) pass('lfrc: key mappings section shown'); else fail('lfrc mappings: ' + lfrcText.slice(0, 300));

  // ── ranger.conf (Ranger terminal file manager config) viewer ──
  await openExample('ranger.conf');
  await page.waitForSelector('#previewHost .rangercfg-doc', { timeout: 12000 });
  const rangerText = await page.$eval('#previewHost .rangercfg-doc', (e) => e.textContent);
  if (/ranger/i.test(rangerText)) pass('ranger.conf: Ranger badge shown'); else fail('ranger-conf badge: ' + rangerText.slice(0, 200));
  if (/1,3,4|column.ratios/i.test(rangerText)) pass('ranger.conf: column ratios shown'); else fail('ranger-conf column_ratios: ' + rangerText.slice(0, 300));
  if (/preview.images|preview_images/i.test(rangerText)) pass('ranger.conf: preview_images chip shown'); else fail('ranger-conf preview_images: ' + rangerText.slice(0, 300));

  // ── zathurarc (Zathura PDF viewer config) viewer ──
  await openExample('zathurarc');
  await page.waitForSelector('#previewHost .zathura-doc', { timeout: 12000 });
  const zathuraText = await page.$eval('#previewHost .zathura-doc', (e) => e.textContent);
  if (/zathura/i.test(zathuraText)) pass('zathurarc: Zathura badge shown'); else fail('zathurarc badge: ' + zathuraText.slice(0, 200));
  if (/#1e1e2e|default.bg|default-bg/i.test(zathuraText)) pass('zathurarc: default-bg color shown'); else fail('zathurarc default-bg: ' + zathuraText.slice(0, 300));
  if (/recolor/i.test(zathuraText)) pass('zathurarc: recolor mode shown'); else fail('zathurarc recolor: ' + zathuraText.slice(0, 300));

  // ── wsl.conf (WSL2 per-distribution config) viewer ──
  await openExample('wsl.conf');
  await page.waitForSelector('#previewHost .wslcfg-doc', { timeout: 12000 });
  const wslText = await page.$eval('#previewHost .wslcfg-doc', (e) => e.textContent);
  if (/WSL2/i.test(wslText)) pass('wsl.conf: WSL2 badge shown'); else fail('wsl-conf badge: ' + wslText.slice(0, 200));
  if (/automount|enabled/i.test(wslText)) pass('wsl.conf: automount section shown'); else fail('wsl-conf automount: ' + wslText.slice(0, 300));
  if (/systemd/i.test(wslText)) pass('wsl.conf: systemd chip shown'); else fail('wsl-conf systemd: ' + wslText.slice(0, 300));

  // ── loader.conf (systemd-boot config) viewer ──
  await openExample('loader.conf');
  await page.waitForSelector('#previewHost .sdbcfg-doc', { timeout: 12000 });
  const loaderText = await page.$eval('#previewHost .sdbcfg-doc', (e) => e.textContent);
  if (/systemd-boot/i.test(loaderText)) pass('loader.conf: systemd-boot badge shown'); else fail('loader-conf badge: ' + loaderText.slice(0, 200));
  if (/arch-linux\.conf|default/i.test(loaderText)) pass('loader.conf: default entry shown'); else fail('loader-conf default: ' + loaderText.slice(0, 300));
  if (/timeout|3/i.test(loaderText)) pass('loader.conf: timeout shown'); else fail('loader-conf timeout: ' + loaderText.slice(0, 300));

  // ── cmus.rc (cmus terminal music player config) viewer ──
  await openExample('cmus.rc');
  await page.waitForSelector('#previewHost .cmuscfg-doc', { timeout: 12000 });
  const cmusText = await page.$eval('#previewHost .cmuscfg-doc', (e) => e.textContent);
  if (/cmus/i.test(cmusText)) pass('cmus.rc: cmus badge shown'); else fail('cmus badge: ' + cmusText.slice(0, 200));
  if (/pipewire|output.plugin/i.test(cmusText)) pass('cmus.rc: output plugin shown'); else fail('cmus output plugin: ' + cmusText.slice(0, 300));
  if (/zenburn|colorscheme/i.test(cmusText)) pass('cmus.rc: colorscheme shown'); else fail('cmus colorscheme: ' + cmusText.slice(0, 300));

  // ── pacman.conf (Arch Linux pacman config) viewer ──
  await openExample('pacman.conf');
  await page.waitForSelector('#previewHost .pacmancfg-doc', { timeout: 12000 });
  const pacmanText = await page.$eval('#previewHost .pacmancfg-doc', (e) => e.textContent);
  if (/pacman/i.test(pacmanText)) pass('pacman.conf: pacman badge shown'); else fail('pacman badge: ' + pacmanText.slice(0, 200));
  if (/repositor/i.test(pacmanText)) pass('pacman.conf: repositories count shown'); else fail('pacman repos: ' + pacmanText.slice(0, 300));
  if (/ParallelDownloads|5/i.test(pacmanText)) pass('pacman.conf: ParallelDownloads shown'); else fail('pacman parallel: ' + pacmanText.slice(0, 300));
  if (/chaotic-aur|multilib|extra|core/i.test(pacmanText)) pass('pacman.conf: repository names shown'); else fail('pacman repo names: ' + pacmanText.slice(0, 300));

  // ── Brewfile (Homebrew bundle manifest) viewer ──
  await openExample('Brewfile');
  await page.waitForSelector('.brewfile-doc', { timeout: 12000 });
  pass('Brewfile: renders');
  const brewText = await page.$eval('.brewfile-doc', (e) => e.textContent);
  if (!brewText.includes('Homebrew') && !brewText.includes('brew')) fail('Brewfile: missing badge'); else pass('Brewfile: badge shown');
  if (!brewText.includes('formulae') && !brewText.includes('cask') && !brewText.includes('git')) fail('Brewfile: no packages shown'); else pass('Brewfile: packages shown');
  if (/tap/i.test(brewText)) pass('Brewfile: taps section shown'); else fail('Brewfile taps: ' + brewText.slice(0, 300));
  if (/formulae|formula/i.test(brewText)) pass('Brewfile: formulae section shown'); else fail('Brewfile formulae: ' + brewText.slice(0, 300));
  if (/cask/i.test(brewText)) pass('Brewfile: casks section shown'); else fail('Brewfile casks: ' + brewText.slice(0, 300));

  // ── dnf.conf (DNF package manager config) viewer ──
  await openExample('dnf.conf');
  await page.waitForSelector('#previewHost .dnfcfg-doc', { timeout: 12000 });
  const dnfText = await page.$eval('#previewHost .dnfcfg-doc', (e) => e.textContent);
  if (/DNF/i.test(dnfText)) pass('dnf.conf: DNF badge shown'); else fail('dnf-conf badge: ' + dnfText.slice(0, 200));
  if (/GPG enabled|gpgcheck/i.test(dnfText)) pass('dnf.conf: GPG check chip shown'); else fail('dnf-conf gpgcheck: ' + dnfText.slice(0, 300));
  if (/parallel|max_parallel_downloads/i.test(dnfText)) pass('dnf.conf: parallel downloads shown'); else fail('dnf-conf parallel: ' + dnfText.slice(0, 300));

  // ── .gdbinit (GDB debugger init) viewer ──
  await openExample('.gdbinit');
  await page.waitForSelector('#previewHost .gdbinit-doc', { timeout: 12000 });
  const gdbText = await page.$eval('#previewHost .gdbinit-doc', (e) => e.textContent);
  if (/GDB/i.test(gdbText)) pass('.gdbinit: GDB badge shown'); else fail('gdbinit badge: ' + gdbText.slice(0, 200));
  if (/print pretty|history|pagination/i.test(gdbText)) pass('.gdbinit: display settings or history shown'); else fail('gdbinit settings: ' + gdbText.slice(0, 300));
  if (/GEF|hook-stop|plist/i.test(gdbText)) pass('.gdbinit: extensions or custom commands shown'); else fail('gdbinit extensions: ' + gdbText.slice(0, 300));

  // ── gradle.properties enhanced viewer (JVM heap + Android + performance) ──
  await openExample('gradle.properties');
  await page.waitForSelector('#previewHost .gp-doc', { timeout: 12000 });
  const gpEnhText = await page.$eval('#previewHost .gp-doc', (e) => e.textContent);
  if (/Xmx|Xms|Heap/i.test(gpEnhText)) pass('gradle.properties: JVM heap shown'); else fail('gradle-props jvm-heap: ' + gpEnhText.slice(0, 300));
  if (/useAndroidX|Android/i.test(gpEnhText)) pass('gradle.properties: Android section shown'); else fail('gradle-props android: ' + gpEnhText.slice(0, 300));
  if (/configuration.cache|parallel|caching/i.test(gpEnhText)) pass('gradle.properties: performance settings shown'); else fail('gradle-props perf: ' + gpEnhText.slice(0, 300));

  // ── haproxy.cfg (HAProxy config) viewer ──
  await openExample('haproxy.cfg');
  await page.waitForSelector('#previewHost .haproxy-doc', { timeout: 12000 });
  pass('haproxy.cfg: badge shown');
  const haSections = await page.$eval('#previewHost .haproxy-doc', el => el.textContent);
  if (!haSections.includes('frontend')) fail('haproxy.cfg: frontend not shown');
  else pass('haproxy.cfg: frontend shown');
  if (!haSections.includes('backend')) fail('haproxy.cfg: backend not shown');
  else pass('haproxy.cfg: backend shown');
  if (haSections.includes('password')) fail('haproxy.cfg: stats password leaked');
  else pass('haproxy.cfg: stats password masked');

  // ── 50-usb.rules (udev rules) viewer ──
  await openExample('50-usb.rules');
  await page.waitForSelector('#previewHost .udev-doc', { timeout: 12000 });
  pass('50-usb.rules: badge shown');
  const udevText = await page.$eval('#previewHost .udev-doc', el => el.textContent);
  if (!udevText.includes('usb')) fail('50-usb.rules: USB subsystem not shown');
  else pass('50-usb.rules: USB subsystem shown');
  if (!udevText.includes('plugdev')) fail('50-usb.rules: group not shown');
  else pass('50-usb.rules: plugdev group shown');

  // ── .pre-commit-config.yaml enhanced viewer ──
  await openExample('.pre-commit-config.yaml');
  await page.waitForSelector('#previewHost .prc-doc', { timeout: 12000 });
  pass('.pre-commit-config.yaml: badge shown');
  const precommitText = await page.$eval('#previewHost .prc-doc', el => el.textContent);
  if (!precommitText.includes('pre-commit-hooks')) fail('.pre-commit-config.yaml: repos not shown');
  else pass('.pre-commit-config.yaml: repo shown');
  if (!precommitText.includes('black')) fail('.pre-commit-config.yaml: hook not shown');
  else pass('.pre-commit-config.yaml: hook shown');

  // ── conky.conf enhanced viewer ──
  await openExample('conky.conf');
  await page.waitForSelector('#previewHost .conky-doc', { timeout: 12000 });
  pass('conky.conf: badge shown');
  const conkyText = await page.$eval('#previewHost .conky-doc', el => el.textContent);
  if (!conkyText.includes('top_right')) fail('conky.conf: alignment not shown');
  else pass('conky.conf: alignment shown');
  if (!conkyText.includes('1.0')) fail('conky.conf: update interval not shown');
  else pass('conky.conf: update interval shown');

  // ── mypackage.opam (OCaml opam package descriptor) viewer ──
  await openExample('mypackage.opam');
  await page.waitForSelector('#previewHost .opam-doc', { timeout: 12000 });
  pass('mypackage.opam: badge shown');
  const opamText = await page.$eval('#previewHost .opam-doc', (e) => e.textContent);
  if (!opamText.includes('mypackage')) fail('mypackage.opam: package name not shown');
  else pass('mypackage.opam: package name shown');
  if (!opamText.includes('yojson')) fail('mypackage.opam: dependencies not shown');
  else pass('mypackage.opam: dependencies shown');
  if (/MIT/i.test(opamText)) pass('mypackage.opam: license shown'); else fail('opam license: ' + opamText.slice(0, 300));
  if (/Jane Smith|maintainer/i.test(opamText)) pass('mypackage.opam: maintainer shown'); else fail('opam maintainer: ' + opamText.slice(0, 300));

  // ── deny.toml (cargo-deny) viewer ──
  await openExample('deny.toml');
  await page.waitForSelector('#previewHost .cargodeny-doc', { timeout: 12000 });
  pass('deny.toml: badge shown');
  const denyText = await page.$eval('#previewHost .cargodeny-doc', el => el.textContent);
  if (!denyText.includes('MIT')) fail('deny.toml: allowed licenses not shown');
  else pass('deny.toml: licenses shown');
  if (!denyText.includes('vulnerability')) fail('deny.toml: advisories not shown');
  else pass('deny.toml: advisories shown');

  // ── release-please-config.json viewer ──
  await openExample('release-please-config.json');
  await page.waitForSelector('#previewHost .relpls-doc', { timeout: 12000 });
  pass('release-please-config.json: badge shown');
  const rplText = await page.$eval('#previewHost .relpls-doc', el => el.textContent);
  if (!rplText.includes('node')) fail('release-please-config.json: release type not shown');
  else pass('release-please-config.json: release type shown');
  if (!rplText.includes('packages/api')) fail('release-please-config.json: packages not shown');
  else pass('release-please-config.json: packages shown');

  // ── .nanorc (GNU nano editor config) viewer ──
  await openExample('.nanorc');
  await page.waitForSelector('#previewHost .nanorc-doc', { timeout: 12000 });
  pass('.nanorc: badge shown');
  const nanoText = await page.$eval('#previewHost .nanorc-doc', el => el.textContent);
  if (!nanoText.includes('tabsize') && !nanoText.includes('4')) fail('.nanorc: settings not shown');
  else pass('.nanorc: settings shown');
  if (!nanoText.includes('include') && !nanoText.includes('nanorc')) fail('.nanorc: syntax includes not shown');
  else pass('.nanorc: syntax includes shown');
}
