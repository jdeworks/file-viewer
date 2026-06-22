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

use crate::{
    config::save_config,
    finder::{find_file, find_folder},
    paths::validate_path,
    AppState,
};

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
    if !pb.is_dir() {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": "path is not a directory" })),
        )
            .into_response();
    }
    let paths = {
        let mut locked = state.watched_paths.lock().unwrap();
        if !locked.contains(&pb) {
            locked.push(pb);
        }
        locked.clone()
    };
    if let Err(e) = save_config(&paths) {
        tracing::warn!("Failed to save config: {e}");
    }
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
    let paths = {
        let mut locked = state.watched_paths.lock().unwrap();
        locked.retain(|p| p != &pb);
        locked.clone()
    };
    if let Err(e) = save_config(&paths) {
        tracing::warn!("Failed to save config: {e}");
    }
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
}

pub async fn get_find_file(
    State(state): State<AppState>,
    Query(q): Query<FindFileQuery>,
) -> Json<FindFileResponse> {
    let watched = state.watched_paths.lock().unwrap().clone();
    let matches = find_file(&q.name, q.size, &watched)
        .into_iter()
        .map(|p| p.display().to_string())
        .collect();
    Json(FindFileResponse { matches })
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
    match validate_path(&pb, &watched) {
        Err(e) => (
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({ "error": e })),
        )
            .into_response(),
        Ok(canonical) => {
            let tmp_path = format!("{}.companion_tmp", canonical.display());
            let byte_count = body.len();
            if let Err(e) = tokio::fs::write(&tmp_path, &body).await {
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({ "error": e.to_string() })),
                )
                    .into_response();
            }
            if let Err(e) = tokio::fs::rename(&tmp_path, &canonical).await {
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({ "error": e.to_string() })),
                )
                    .into_response();
            }
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
// Deletes a single file inside a watched folder. Refuses directories. The browser
// gates this behind an explicit confirm; the Download button is unaffected.
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
            if canonical.is_dir() {
                return (
                    StatusCode::BAD_REQUEST,
                    Json(serde_json::json!({ "error": "refusing to delete a directory" })),
                )
                    .into_response();
            }
            match tokio::fs::remove_file(&canonical).await {
                Err(e) => (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({ "error": e.to_string() })),
                )
                    .into_response(),
                Ok(()) => (
                    StatusCode::OK,
                    Json(serde_json::json!({ "ok": true })),
                )
                    .into_response(),
            }
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
                let name = entry.file_name().to_string_lossy().into_owned();
                let meta = match entry.metadata().await {
                    Ok(m) => m,
                    Err(_) => continue,
                };
                let is_dir = meta.is_dir();
                let size = if is_dir { 0 } else { meta.len() };
                entries.push(DirEntry { name, size, is_dir });
            }
            (StatusCode::OK, Json(FilesResponse { entries })).into_response()
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
