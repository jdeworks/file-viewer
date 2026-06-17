use axum::{
    body::Bytes,
    extract::{Query, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

use crate::{
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
}

pub async fn ping() -> Json<PingResponse> {
    Json(PingResponse {
        ok: true,
        version: env!("CARGO_PKG_VERSION"),
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
    state.watched_paths.lock().unwrap().push(pb);
    (StatusCode::OK, Json(serde_json::json!({ "ok": true }))).into_response()
}

// ---------------------------------------------------------------------------
// DELETE /watched-paths  (token required)
// ---------------------------------------------------------------------------

pub async fn remove_watched_path(
    State(state): State<AppState>,
    Json(body): Json<WatchedPathBody>,
) -> Response {
    let pb = PathBuf::from(&body.path);
    let mut paths = state.watched_paths.lock().unwrap();
    let before = paths.len();
    paths.retain(|p| p != &pb);
    let removed = paths.len() < before;
    (
        StatusCode::OK,
        Json(serde_json::json!({ "ok": true, "removed": removed })),
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
        Ok(canonical) => match std::fs::read(&canonical) {
            Err(e) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": e.to_string() })),
            )
                .into_response(),
            Ok(bytes) => bytes.into_response(),
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
        Ok(canonical) => match std::fs::write(&canonical, &body) {
            Err(e) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": e.to_string() })),
            )
                .into_response(),
            Ok(_) => (StatusCode::OK, Json(serde_json::json!({ "ok": true }))).into_response(),
        },
    }
}
