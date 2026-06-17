use axum::{
    middleware,
    routing::{delete, get, post},
    Router,
};
use axum_test::TestServer;
use file_viewer_companion::{auth::require_token, routes, AppState};
use std::sync::{Arc, Mutex};

fn build_app(token: &str) -> Router {
    let state = AppState {
        token: token.to_string(),
        watched_paths: Arc::new(Mutex::new(vec![])),
    };

    let protected = Router::new()
        .route("/watched-paths", post(routes::add_watched_path))
        .route("/watched-paths", delete(routes::remove_watched_path))
        .route("/file", post(routes::post_file))
        .route_layer(middleware::from_fn_with_state(
            state.clone(),
            require_token,
        ));

    Router::new()
        .route("/ping", get(routes::ping))
        .route("/watched-paths", get(routes::get_watched_paths))
        .route("/find-file", get(routes::get_find_file))
        .route("/find-folder", get(routes::get_find_folder))
        .route("/file", get(routes::get_file))
        .merge(protected)
        .with_state(state)
}

// ---------------------------------------------------------------------------
// /ping
// ---------------------------------------------------------------------------

#[tokio::test]
async fn test_ping_returns_ok() {
    let server = TestServer::new(build_app("secret")).unwrap();
    let resp = server.get("/ping").await;
    resp.assert_status_ok();
    let body: serde_json::Value = resp.json();
    assert_eq!(body["ok"], true);
    assert!(body["version"].is_string());
}

// ---------------------------------------------------------------------------
// /watched-paths GET — empty on startup
// ---------------------------------------------------------------------------

#[tokio::test]
async fn test_watched_paths_initially_empty() {
    let server = TestServer::new(build_app("secret")).unwrap();
    let resp = server.get("/watched-paths").await;
    resp.assert_status_ok();
    let body: serde_json::Value = resp.json();
    assert_eq!(body["paths"], serde_json::json!([]));
}

// ---------------------------------------------------------------------------
// POST /file — auth enforcement
// ---------------------------------------------------------------------------

#[tokio::test]
async fn test_post_file_without_token_returns_401() {
    let server = TestServer::new(build_app("secret")).unwrap();
    let resp = server.post("/file?path=/tmp/test.txt").bytes(b"data".as_ref().into()).await;
    resp.assert_status(axum::http::StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn test_post_file_wrong_token_returns_401() {
    let server = TestServer::new(build_app("secret")).unwrap();
    let resp = server
        .post("/file?path=/tmp/test.txt")
        .add_header(
            axum::http::HeaderName::from_static("x-companion-token"),
            axum::http::HeaderValue::from_static("wrong"),
        )
        .bytes(b"data".as_ref().into())
        .await;
    resp.assert_status(axum::http::StatusCode::UNAUTHORIZED);
}

// ---------------------------------------------------------------------------
// POST /file — path outside watched dirs returns 403 (token correct)
// ---------------------------------------------------------------------------

#[tokio::test]
async fn test_post_file_outside_watched_returns_403() {
    let server = TestServer::new(build_app("secret")).unwrap();
    // No watched paths configured, so any real path is outside them.
    let resp = server
        .post("/file?path=/tmp/companion_test_not_watched.txt")
        .add_header(
            axum::http::HeaderName::from_static("x-companion-token"),
            axum::http::HeaderValue::from_static("secret"),
        )
        .bytes(b"data".as_ref().into())
        .await;
    resp.assert_status(axum::http::StatusCode::FORBIDDEN);
}

// ---------------------------------------------------------------------------
// DELETE /watched-paths — requires token
// ---------------------------------------------------------------------------

#[tokio::test]
async fn test_delete_watched_path_without_token_returns_401() {
    let server = TestServer::new(build_app("secret")).unwrap();
    let resp = server
        .delete("/watched-paths")
        .json(&serde_json::json!({ "path": "/tmp" }))
        .await;
    resp.assert_status(axum::http::StatusCode::UNAUTHORIZED);
}
