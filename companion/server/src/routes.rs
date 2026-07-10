use axum::{
    body::Bytes,
    extract::{Query, State},
    http::{header, StatusCode},
    response::{
        sse::{Event as SseEvent, KeepAlive, Sse},
        IntoResponse, Response,
    },
    Json,
};
use futures_util::stream::Stream;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tokio_stream::{wrappers::BroadcastStream, StreamExt};

use std::sync::atomic::{AtomicBool, AtomicI64, Ordering};

use crate::{
    config::save_config_to,
    finder::{find_file, find_folder},
    logging,
    paths::{contains_watched_root, validate_path, validate_path_for_write},
    storage::atomic_write,
    AppState,
};

const MAX_WATCHED_PATHS: usize = 128;
/// Browser intake reads at most 64 MiB for editable non-media files. Keep bounded headroom for
/// edits/encodings while making the accepted limit explicit instead of Axum's 2 MiB default.
pub const MAX_WRITE_BYTES: usize = 128 * 1024 * 1024;

// Log "viewer connected" only once per process (ping is polled periodically by the browser, so we
// don't want a line every 30s). Reset implicitly by a server restart.
static CONNECTED_LOGGED: AtomicBool = AtomicBool::new(false);

// Epoch-seconds of the most recent /ping. The viewer polls /ping every ~30s while open, so the tray
// can show a green/red connection dot: "connected" = a ping within the last ~45s.
static LAST_PING_EPOCH: AtomicI64 = AtomicI64::new(0);

fn now_epoch_secs() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

/// Seconds since the last viewer /ping (i64::MAX if none yet). The tray polls this for the status dot.
pub fn seconds_since_last_ping() -> i64 {
    let last = LAST_PING_EPOCH.load(Ordering::Relaxed);
    if last == 0 {
        return i64::MAX;
    }
    now_epoch_secs() - last
}

// ---------------------------------------------------------------------------
// GET /ping
// ---------------------------------------------------------------------------

#[derive(Serialize)]
pub struct PingResponse {
    pub ok: bool,
    pub version: &'static str,
    /// The session token. Returned here so the viewer can pick it up automatically — only CORS-
    /// allowed origins (localhost + the configured Pages origin) can read this response, so a
    /// disallowed page still can't obtain the token (and thus can't make mutating calls).
    pub token: String,
    pub capabilities: Vec<&'static str>,
}

pub async fn ping(State(state): State<AppState>) -> Json<PingResponse> {
    LAST_PING_EPOCH.store(now_epoch_secs(), Ordering::Relaxed);
    if !CONNECTED_LOGGED.swap(true, Ordering::Relaxed) {
        logging::info("viewer connected");
    }
    Json(PingResponse {
        ok: true,
        version: env!("CARGO_PKG_VERSION"),
        token: state.token.clone(),
        capabilities: vec![
            "file-read",
            "file-write",
            "file-delete",
            "file-watch",
            "find-file",
            "find-folder",
        ],
    })
}

// ---------------------------------------------------------------------------
// GET /watched-paths
// ---------------------------------------------------------------------------

#[derive(Serialize)]
pub struct WatchedPathsResponse {
    pub paths: Vec<String>,
}

pub async fn get_watched_paths(State(state): State<AppState>) -> Json<WatchedPathsResponse> {
    let paths = state
        .watched_paths
        .lock()
        .unwrap()
        .iter()
        .map(|p| p.display().to_string())
        .collect();
    Json(WatchedPathsResponse { paths })
}

// ---------------------------------------------------------------------------
// POST /watched-paths  (token required — enforced by middleware layer)
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
pub struct WatchedPathBody {
    pub path: String,
}

pub async fn add_watched_path(
    State(state): State<AppState>,
    Json(body): Json<WatchedPathBody>,
) -> Response {
    let pb = PathBuf::from(&body.path);
    if !pb.is_absolute() {
        logging::warn(format!(
            "rejected watched folder (path is not absolute): {}",
            body.path
        ));
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": "path must be absolute" })),
        )
            .into_response();
    }
    if !pb.is_dir() {
        logging::warn(format!(
            "rejected watched folder (not a directory): {}",
            body.path
        ));
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": "path is not a directory" })),
        )
            .into_response();
    }
    let paths = {
        let mut locked = state.watched_paths.lock().unwrap();
        if locked.contains(&pb) {
            locked.clone()
        } else {
            if locked.len() >= MAX_WATCHED_PATHS {
                logging::warn(format!(
                    "rejected watched folder (limit reached): {}",
                    body.path
                ));
                return (
                    StatusCode::BAD_REQUEST,
                    Json(serde_json::json!({ "error": "watched folder limit reached" })),
                )
                    .into_response();
            }
            let mut updated = locked.clone();
            updated.push(pb);
            if let Err(e) = save_config_to(&state.config_path, &updated) {
                logging::error(format!("failed to save config: {e}"));
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({ "error": "could not persist watched folders" })),
                )
                    .into_response();
            }
            *locked = updated.clone();
            updated
        }
    };
    logging::info(format!("watched folder added: {}", body.path));
    let path_strs: Vec<String> = paths.iter().map(|p| p.display().to_string()).collect();
    (
        StatusCode::OK,
        Json(serde_json::json!({ "ok": true, "paths": path_strs })),
    )
        .into_response()
}

// ---------------------------------------------------------------------------
// DELETE /watched-paths  (token required)
// ---------------------------------------------------------------------------

pub async fn remove_watched_path(
    State(state): State<AppState>,
    Json(body): Json<WatchedPathBody>,
) -> Response {
    let pb = PathBuf::from(&body.path);
    if !pb.is_absolute() {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": "path must be absolute" })),
        )
            .into_response();
    }
    let paths = {
        let mut locked = state.watched_paths.lock().unwrap();
        if !locked.contains(&pb) {
            locked.clone()
        } else {
            let mut updated = locked.clone();
            updated.retain(|p| p != &pb);
            if let Err(e) = save_config_to(&state.config_path, &updated) {
                logging::error(format!("failed to save config: {e}"));
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({ "error": "could not persist watched folders" })),
                )
                    .into_response();
            }
            *locked = updated.clone();
            updated
        }
    };
    logging::info(format!("watched folder removed: {}", body.path));
    let path_strs: Vec<String> = paths.iter().map(|p| p.display().to_string()).collect();
    (
        StatusCode::OK,
        Json(serde_json::json!({ "ok": true, "paths": path_strs })),
    )
        .into_response()
}

// ---------------------------------------------------------------------------
// GET /find-file?name=&size=
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
pub struct FindFileQuery {
    pub name: String,
    pub size: u64,
}

#[derive(Serialize)]
pub struct FindFileResponse {
    pub matches: Vec<String>,
    pub truncated: bool,
}

pub async fn get_find_file(
    State(state): State<AppState>,
    Query(q): Query<FindFileQuery>,
) -> Json<FindFileResponse> {
    let watched = state.watched_paths.lock().unwrap().clone();
    let result = find_file(&q.name, q.size, &watched);
    let matches: Vec<String> = result
        .matches
        .into_iter()
        .map(|p| p.display().to_string())
        .collect();
    logging::info(format!(
        "find-file '{}' ({} bytes) → {} match(es)",
        q.name,
        q.size,
        matches.len()
    ));
    Json(FindFileResponse {
        matches,
        truncated: result.truncated,
    })
}

// ---------------------------------------------------------------------------
// GET /find-folder?relPath=
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
pub struct FindFolderQuery {
    #[serde(rename = "relPath")]
    pub rel_path: String,
}

#[derive(Serialize)]
pub struct FindFolderResponse {
    pub matches: Vec<String>,
}

pub async fn get_find_folder(
    State(state): State<AppState>,
    Query(q): Query<FindFolderQuery>,
) -> Json<FindFolderResponse> {
    let watched = state.watched_paths.lock().unwrap().clone();
    let matches = find_folder(&q.rel_path, &watched)
        .into_iter()
        .map(|p| p.display().to_string())
        .collect();
    Json(FindFolderResponse { matches })
}

// ---------------------------------------------------------------------------
// GET /file?path=
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
pub struct FileQuery {
    pub path: String,
}

pub async fn get_file(State(state): State<AppState>, Query(q): Query<FileQuery>) -> Response {
    let watched = state.watched_paths.lock().unwrap().clone();
    let pb = PathBuf::from(&q.path);
    match validate_path(&pb, &watched) {
        Err(e) => (
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({ "error": e })),
        )
            .into_response(),
        Ok(canonical) if !canonical.is_file() => (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": "path is not a regular file" })),
        )
            .into_response(),
        Ok(canonical) => match tokio::fs::read(&canonical).await {
            Err(e) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": e.to_string() })),
            )
                .into_response(),
            Ok(bytes) => {
                let mime = mime_guess::from_path(&canonical)
                    .first_or_octet_stream()
                    .to_string();
                ([(header::CONTENT_TYPE, mime)], bytes).into_response()
            }
        },
    }
}

// ---------------------------------------------------------------------------
// POST /file?path=   (token required — enforced by middleware layer)
// ---------------------------------------------------------------------------

pub async fn post_file(
    State(state): State<AppState>,
    Query(q): Query<FileQuery>,
    body: Bytes,
) -> Response {
    let watched = state.watched_paths.lock().unwrap().clone();
    let pb = PathBuf::from(&q.path);
    // validate_path_for_write also permits a not-yet-existing file (the "create" flow), as long as
    // its parent dir resolves inside a watched folder. An existing file goes through the stricter
    // canonicalize path.
    match validate_path_for_write(&pb, &watched) {
        Err(e) => {
            logging::warn(format!("save refused: {e} (path: {})", q.path));
            (
                StatusCode::FORBIDDEN,
                Json(serde_json::json!({ "error": e })),
            )
                .into_response()
        }
        Ok(canonical) => {
            if canonical.is_dir() {
                return (
                    StatusCode::BAD_REQUEST,
                    Json(serde_json::json!({ "error": "target path is a directory" })),
                )
                    .into_response();
            }
            let is_create = !canonical.exists();
            // Create any missing intermediate subfolders (validate_path_for_write already proved the
            // target stays within a watched dir), so saving into a not-yet-existing subfolder works.
            if let Some(parent) = canonical.parent() {
                if let Err(e) = tokio::fs::create_dir_all(parent).await {
                    logging::error(format!("save failed (mkdir {}): {e}", parent.display()));
                    return (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        Json(serde_json::json!({ "error": e.to_string() })),
                    )
                        .into_response();
                }
            }
            let byte_count = body.len();
            if let Err(e) = atomic_write(&canonical, &body).await {
                logging::error(format!("save failed ({}): {e}", canonical.display()));
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({ "error": e.to_string() })),
                )
                    .into_response();
            }
            logging::info(format!(
                "{} {} ({} bytes)",
                if is_create { "created" } else { "saved" },
                canonical.display(),
                byte_count
            ));
            (
                StatusCode::OK,
                Json(serde_json::json!({ "ok": true, "bytes": byte_count })),
            )
                .into_response()
        }
    }
}

// ---------------------------------------------------------------------------
// DELETE /file?path=   (token required — enforced by middleware layer)
// Deletes a file or recursively deletes a subfolder inside a watched root. A watched root itself
// is never deleted. The browser gates this behind an explicit confirm; Download is unaffected.
// ---------------------------------------------------------------------------

pub async fn delete_file(State(state): State<AppState>, Query(q): Query<FileQuery>) -> Response {
    let watched = state.watched_paths.lock().unwrap().clone();
    let pb = PathBuf::from(&q.path);
    match validate_path(&pb, &watched) {
        Err(e) => (
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({ "error": e })),
        )
            .into_response(),
        Ok(canonical) => {
            if std::fs::symlink_metadata(&pb)
                .map(|metadata| metadata.file_type().is_symlink())
                .unwrap_or(false)
            {
                logging::warn(format!("delete refused (symbolic link): {}", pb.display()));
                return (
                    StatusCode::BAD_REQUEST,
                    Json(serde_json::json!({ "error": "refusing to delete a symbolic link" })),
                )
                    .into_response();
            }
            if canonical.is_dir() {
                // A subfolder can be deleted recursively only when it is neither a watched root nor
                // an ancestor of another watched root.
                if contains_watched_root(&canonical, &watched) {
                    logging::warn(format!(
                        "delete refused (contains watched root): {}",
                        canonical.display()
                    ));
                    return (
                        StatusCode::BAD_REQUEST,
                        Json(serde_json::json!({ "error": "refusing to delete a watched folder root or its ancestor" })),
                    )
                        .into_response();
                }
                return match tokio::fs::remove_dir_all(&canonical).await {
                    Err(e) => {
                        logging::error(format!("delete failed ({}): {e}", canonical.display()));
                        (
                            StatusCode::INTERNAL_SERVER_ERROR,
                            Json(serde_json::json!({ "error": e.to_string() })),
                        )
                            .into_response()
                    }
                    Ok(()) => {
                        logging::info(format!("deleted folder {}", canonical.display()));
                        (
                            StatusCode::OK,
                            Json(serde_json::json!({ "ok": true, "folder": true })),
                        )
                            .into_response()
                    }
                };
            }
            match tokio::fs::remove_file(&canonical).await {
                Err(e) => {
                    logging::error(format!("delete failed ({}): {e}", canonical.display()));
                    (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        Json(serde_json::json!({ "error": e.to_string() })),
                    )
                        .into_response()
                }
                Ok(()) => {
                    logging::info(format!("deleted {}", canonical.display()));
                    (StatusCode::OK, Json(serde_json::json!({ "ok": true }))).into_response()
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------
// POST /reveal?path=   (token required) — show a file/folder in the OS file manager.
// Path-restricted to watched folders. Opens the native browser (Explorer/Finder), it does NOT run
// the file or any associated app.
// ---------------------------------------------------------------------------

pub async fn reveal(State(state): State<AppState>, Query(q): Query<FileQuery>) -> Response {
    let watched = state.watched_paths.lock().unwrap().clone();
    let pb = PathBuf::from(&q.path);
    match validate_path(&pb, &watched) {
        Err(e) => (
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({ "error": e })),
        )
            .into_response(),
        Ok(canonical) => {
            #[cfg(target_os = "windows")]
            {
                let _ = std::process::Command::new("explorer")
                    .arg(format!("/select,{}", canonical.display()))
                    .spawn();
            }
            #[cfg(target_os = "macos")]
            {
                let _ = std::process::Command::new("open")
                    .args(["-R", &canonical.display().to_string()])
                    .spawn();
            }
            #[cfg(target_os = "linux")]
            {
                // No portable "select the file", so open its containing directory.
                let dir = if canonical.is_dir() {
                    canonical.as_path()
                } else {
                    canonical.parent().unwrap_or(&canonical)
                };
                let _ = std::process::Command::new("xdg-open").arg(dir).spawn();
            }
            logging::info(format!("revealed {}", canonical.display()));
            (StatusCode::OK, Json(serde_json::json!({ "ok": true }))).into_response()
        }
    }
}

// ---------------------------------------------------------------------------
// GET /files?path=
// ---------------------------------------------------------------------------

#[derive(Serialize)]
pub struct DirEntry {
    pub name: String,
    pub size: u64,
    #[serde(rename = "isDir")]
    pub is_dir: bool,
}

#[derive(Serialize)]
pub struct FilesResponse {
    pub entries: Vec<DirEntry>,
}

pub async fn get_files(State(state): State<AppState>, Query(q): Query<FileQuery>) -> Response {
    let watched = state.watched_paths.lock().unwrap().clone();
    let pb = PathBuf::from(&q.path);
    match validate_path(&pb, &watched) {
        Err(e) => (
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({ "error": e })),
        )
            .into_response(),
        Ok(canonical) => {
            if !canonical.is_dir() {
                return (
                    StatusCode::BAD_REQUEST,
                    Json(serde_json::json!({ "error": "path is not a directory" })),
                )
                    .into_response();
            }
            let mut entries = Vec::new();
            let mut read_dir = match tokio::fs::read_dir(&canonical).await {
                Ok(rd) => rd,
                Err(e) => {
                    return (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        Json(serde_json::json!({ "error": e.to_string() })),
                    )
                        .into_response();
                }
            };
            while let Ok(Some(entry)) = read_dir.next_entry().await {
                let file_type = match entry.file_type().await {
                    Ok(file_type) if !file_type.is_symlink() => file_type,
                    _ => continue,
                };
                let name = entry.file_name().to_string_lossy().into_owned();
                let meta = match entry.metadata().await {
                    Ok(m) => m,
                    Err(_) => continue,
                };
                let is_dir = file_type.is_dir();
                let size = if is_dir { 0 } else { meta.len() };
                entries.push(DirEntry { name, size, is_dir });
            }
            (StatusCode::OK, Json(FilesResponse { entries })).into_response()
        }
    }
}

// ---------------------------------------------------------------------------
// GET /tree?path=  — recursive file listing under a folder (for the sidebar refresh).
// Returns every file's path RELATIVE to the requested dir ('/'-separated) plus its size.
// Path-restricted to watched folders; capped so a huge tree can't hang the request.
// ---------------------------------------------------------------------------

const TREE_MAX_FILES: usize = 5000;
const TREE_MAX_ENTRIES: usize = 20_000;
const TREE_MAX_DEPTH: usize = 64;

#[derive(Serialize)]
pub struct TreeFile {
    pub path: String,
    pub size: u64,
    pub mtime: u64, // epoch ms of last modification — lets the viewer detect changes cheaply
}

#[derive(Serialize)]
pub struct TreeResponse {
    pub files: Vec<TreeFile>,
    pub truncated: bool,
}

fn walk_tree(
    root: &std::path::Path,
    dir: &std::path::Path,
    depth: usize,
    visited: &mut usize,
    out: &mut Vec<TreeFile>,
    truncated: &mut bool,
) {
    if *truncated {
        return;
    }
    if depth > TREE_MAX_DEPTH {
        *truncated = true;
        return;
    }
    let rd = match std::fs::read_dir(dir) {
        Ok(r) => r,
        Err(_) => return,
    };
    for entry in rd.flatten() {
        if out.len() >= TREE_MAX_FILES || *visited >= TREE_MAX_ENTRIES {
            *truncated = true;
            return;
        }
        *visited += 1;
        let path = entry.path();
        let file_type = match entry.file_type() {
            Ok(file_type) if !file_type.is_symlink() => file_type,
            _ => continue,
        };
        let meta = match entry.metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };
        if file_type.is_dir() {
            walk_tree(root, &path, depth + 1, visited, out, truncated);
            if *truncated {
                return;
            }
        } else if file_type.is_file() {
            if let Ok(rel) = path.strip_prefix(root) {
                let mtime = meta
                    .modified()
                    .ok()
                    .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                    .map(|d| d.as_millis() as u64)
                    .unwrap_or(0);
                out.push(TreeFile {
                    path: rel.to_string_lossy().replace('\\', "/"),
                    size: meta.len(),
                    mtime,
                });
            }
        }
    }
}

pub async fn get_tree(State(state): State<AppState>, Query(q): Query<FileQuery>) -> Response {
    let watched = state.watched_paths.lock().unwrap().clone();
    let pb = PathBuf::from(&q.path);
    match validate_path(&pb, &watched) {
        Err(e) => (
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({ "error": e })),
        )
            .into_response(),
        Ok(canonical) => {
            if !canonical.is_dir() {
                return (
                    StatusCode::BAD_REQUEST,
                    Json(serde_json::json!({ "error": "path is not a directory" })),
                )
                    .into_response();
            }
            let mut files = Vec::new();
            let mut truncated = false;
            let mut visited = 0;
            walk_tree(
                &canonical,
                &canonical,
                0,
                &mut visited,
                &mut files,
                &mut truncated,
            );
            logging::info(format!(
                "tree {} → {} file(s){}",
                canonical.display(),
                files.len(),
                if truncated { " (truncated)" } else { "" }
            ));
            (StatusCode::OK, Json(TreeResponse { files, truncated })).into_response()
        }
    }
}

// ---------------------------------------------------------------------------
// GET /watch  — Server-Sent Events stream for file change notifications.
// No auth required: it only emits paths of files already inside watched dirs.
// ---------------------------------------------------------------------------

pub async fn watch_sse(
    State(state): State<AppState>,
) -> Sse<impl Stream<Item = Result<SseEvent, std::convert::Infallible>>> {
    let rx = state.watcher_tx.subscribe();
    let stream = BroadcastStream::new(rx)
        .filter_map(|r| r.ok())
        .map(|event| {
            let data = serde_json::to_string(&event).unwrap_or_default();
            Ok(SseEvent::default().data(data))
        });

    Sse::new(stream).keep_alive(
        KeepAlive::new()
            .interval(std::time::Duration::from_secs(15))
            .text("ping"),
    )
}

// ---------------------------------------------------------------------------
// GET /logs?level=&q=&since=&limit=  — recent log entries for the viewers.
// No auth: it only exposes the companion's own activity log (paths the viewer
// already knows). CORS-gated like the other read endpoints.
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
pub struct LogsQuery {
    /// Minimum level: "info" (all), "warn", or "error".
    pub level: Option<String>,
    /// Case-insensitive substring filter on the message.
    pub q: Option<String>,
    /// RFC3339 cutoff — only entries at or after this timestamp.
    pub since: Option<String>,
    pub limit: Option<usize>,
}

#[derive(Serialize)]
pub struct LogsResponse {
    pub entries: Vec<logging::LogEntry>,
}

pub async fn get_logs(Query(q): Query<LogsQuery>) -> Json<LogsResponse> {
    let min_level = q.level.as_deref().and_then(logging::Level::from_filter);
    let limit = q.limit.unwrap_or(500).min(2000);
    let entries = logging::recent(min_level, q.q.as_deref(), q.since.as_deref(), limit);
    Json(LogsResponse { entries })
}
