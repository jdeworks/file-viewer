use axum::{
    body::Body,
    http::{header, Method, Request, StatusCode},
    Router,
};
use file_viewer_companion::{router, AppState};
use std::fs;
use std::sync::{Arc, Mutex};
use tempfile::TempDir;
use tower::ServiceExt;

// Build the real router via the shared lib fn, so the tests exercise the exact route surface +
// token middleware the binary and Tauri wrapper use (no drift).
fn build_app(token: &str, watched: Vec<std::path::PathBuf>) -> Router {
    let (watcher_tx, _) = tokio::sync::broadcast::channel(1);
    let state = AppState {
        token: token.to_string(),
        watched_paths: Arc::new(Mutex::new(watched)),
        debug: false,
        watcher_tx,
    };
    router(state, "https://test.invalid".to_string())
}

// --- /ping ---

#[tokio::test]
async fn test_ping() {
    let app = build_app("secret", vec![]);
    let resp = app
        .oneshot(Request::builder().uri("/ping").body(Body::empty()).unwrap())
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    let body = axum::body::to_bytes(resp.into_body(), usize::MAX)
        .await
        .unwrap();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(json["ok"], true);
    assert_eq!(json["version"], "0.1.0");
}

// --- /watched-paths mutation ---

#[tokio::test]
async fn test_add_watched_path_requires_token() {
    let tmp = TempDir::new().unwrap();
    let app = build_app("secret", vec![]);
    let body = serde_json::json!({ "path": tmp.path().to_str().unwrap() }).to_string();
    let resp = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/watched-paths")
                .header(header::CONTENT_TYPE, "application/json")
                .body(Body::from(body))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn test_add_and_get_watched_path() {
    let tmp = TempDir::new().unwrap();
    let app = build_app("secret", vec![]);
    let path_str = tmp.path().to_str().unwrap().to_string();
    let body = serde_json::json!({ "path": &path_str }).to_string();
    let resp = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/watched-paths")
                .header(header::CONTENT_TYPE, "application/json")
                .header("X-Companion-Token", "secret")
                .body(Body::from(body))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    let body_bytes = axum::body::to_bytes(resp.into_body(), usize::MAX)
        .await
        .unwrap();
    let json: serde_json::Value = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(json["ok"], true);
    let paths = json["paths"].as_array().unwrap();
    assert!(paths.iter().any(|p| p.as_str().unwrap() == path_str));
}

// --- /find-file ---

#[tokio::test]
async fn test_find_file() {
    let tmp = TempDir::new().unwrap();
    let file_path = tmp.path().join("test.bin");
    let content = b"hello world";
    fs::write(&file_path, content).unwrap();

    let app = build_app("secret", vec![tmp.path().to_path_buf()]);
    let resp = app
        .oneshot(
            Request::builder()
                .uri("/find-file?name=test.bin&size=11")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    let body = axum::body::to_bytes(resp.into_body(), usize::MAX)
        .await
        .unwrap();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    let matches = json["matches"].as_array().unwrap();
    assert!(!matches.is_empty());
    assert!(matches[0].as_str().unwrap().ends_with("test.bin"));
}

// --- /file read/write ---

#[tokio::test]
async fn test_post_and_get_file() {
    let tmp = TempDir::new().unwrap();
    let file_path = tmp.path().join("data.txt");
    // Write an initial file so validate_path (canonicalize) can find it
    fs::write(&file_path, b"initial").unwrap();

    let app = build_app("secret", vec![tmp.path().to_path_buf()]);

    // POST to write new content
    let path_str = file_path.to_str().unwrap().to_string();
    let resp = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri(format!("/file?path={}", urlencoding::encode(&path_str)))
                .header("X-Companion-Token", "secret")
                .body(Body::from("new content"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    let body = axum::body::to_bytes(resp.into_body(), usize::MAX)
        .await
        .unwrap();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(json["ok"], true);
    assert_eq!(json["bytes"], 11);

    // GET to read back
    let resp2 = app
        .oneshot(
            Request::builder()
                .uri(format!("/file?path={}", urlencoding::encode(&path_str)))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(resp2.status(), StatusCode::OK);
    let bytes = axum::body::to_bytes(resp2.into_body(), usize::MAX)
        .await
        .unwrap();
    assert_eq!(&bytes[..], b"new content");
}

// --- 403 on out-of-watched-path access ---

#[tokio::test]
async fn test_file_outside_watched_returns_403() {
    let tmp = TempDir::new().unwrap();
    let other = TempDir::new().unwrap();
    // The file exists but its dir is not watched
    let file_path = other.path().join("secret.txt");
    fs::write(&file_path, b"secret").unwrap();

    let app = build_app("secret", vec![tmp.path().to_path_buf()]);
    let path_str = file_path.to_str().unwrap().to_string();
    let resp = app
        .oneshot(
            Request::builder()
                .uri(format!("/file?path={}", urlencoding::encode(&path_str)))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::FORBIDDEN);
}

// --- 401 on POST /file without token ---

#[tokio::test]
async fn test_post_file_requires_token() {
    let tmp = TempDir::new().unwrap();
    let file_path = tmp.path().join("data.txt");
    fs::write(&file_path, b"x").unwrap();

    let app = build_app("secret", vec![tmp.path().to_path_buf()]);
    let path_str = file_path.to_str().unwrap().to_string();
    let resp = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri(format!("/file?path={}", urlencoding::encode(&path_str)))
                .body(Body::from("new content"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::UNAUTHORIZED);
}

// --- /files directory listing ---

#[tokio::test]
async fn test_list_files() {
    let tmp = TempDir::new().unwrap();
    fs::write(tmp.path().join("a.txt"), b"aaa").unwrap();
    fs::create_dir(tmp.path().join("subdir")).unwrap();

    let app = build_app("secret", vec![tmp.path().to_path_buf()]);
    let path_str = tmp.path().to_str().unwrap().to_string();
    let resp = app
        .oneshot(
            Request::builder()
                .uri(format!("/files?path={}", urlencoding::encode(&path_str)))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    let body = axum::body::to_bytes(resp.into_body(), usize::MAX)
        .await
        .unwrap();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    let entries = json["entries"].as_array().unwrap();
    let names: Vec<&str> = entries
        .iter()
        .map(|e| e["name"].as_str().unwrap())
        .collect();
    assert!(names.contains(&"a.txt"));
    assert!(names.contains(&"subdir"));
}

// --- GET /watch (SSE) ---

#[tokio::test]
async fn test_watch_endpoint_exists() {
    // GET /watch must respond 200 with Content-Type: text/event-stream.
    // We don't try to consume the stream (it would block); we only inspect the
    // response headers, which are sent immediately before the body is streamed.
    let app = build_app("secret", vec![]);
    let resp = app
        .oneshot(
            Request::builder()
                .uri("/watch")
                .header(header::ACCEPT, "text/event-stream")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(resp.status(), StatusCode::OK);
    let ct = resp
        .headers()
        .get(header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    assert!(
        ct.starts_with("text/event-stream"),
        "expected text/event-stream, got: {ct}"
    );
}

// --- DELETE /file ---

#[tokio::test]
async fn test_delete_file() {
    let tmp = TempDir::new().unwrap();
    let file_path = tmp.path().join("doomed.txt");
    fs::write(&file_path, b"bye").unwrap();

    let app = build_app("secret", vec![tmp.path().to_path_buf()]);
    let path_str = file_path.to_str().unwrap().to_string();
    let resp = app
        .oneshot(
            Request::builder()
                .method(Method::DELETE)
                .uri(format!("/file?path={}", urlencoding::encode(&path_str)))
                .header("X-Companion-Token", "secret")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    assert!(!file_path.exists(), "file should be gone after delete");
}

#[tokio::test]
async fn test_delete_file_requires_token() {
    let tmp = TempDir::new().unwrap();
    let file_path = tmp.path().join("keep.txt");
    fs::write(&file_path, b"x").unwrap();

    let app = build_app("secret", vec![tmp.path().to_path_buf()]);
    let path_str = file_path.to_str().unwrap().to_string();
    let resp = app
        .oneshot(
            Request::builder()
                .method(Method::DELETE)
                .uri(format!("/file?path={}", urlencoding::encode(&path_str)))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::UNAUTHORIZED);
    assert!(file_path.exists(), "file must survive an unauthorized delete");
}

#[tokio::test]
async fn test_delete_file_outside_watched_returns_403() {
    let tmp = TempDir::new().unwrap();
    let other = TempDir::new().unwrap();
    let file_path = other.path().join("secret.txt");
    fs::write(&file_path, b"secret").unwrap();

    let app = build_app("secret", vec![tmp.path().to_path_buf()]);
    let path_str = file_path.to_str().unwrap().to_string();
    let resp = app
        .oneshot(
            Request::builder()
                .method(Method::DELETE)
                .uri(format!("/file?path={}", urlencoding::encode(&path_str)))
                .header("X-Companion-Token", "secret")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::FORBIDDEN);
    assert!(file_path.exists(), "out-of-watched file must not be deleted");
}

#[tokio::test]
async fn test_delete_refuses_directory() {
    let tmp = TempDir::new().unwrap();
    let dir_path = tmp.path().join("subdir");
    fs::create_dir(&dir_path).unwrap();

    let app = build_app("secret", vec![tmp.path().to_path_buf()]);
    let path_str = dir_path.to_str().unwrap().to_string();
    let resp = app
        .oneshot(
            Request::builder()
                .method(Method::DELETE)
                .uri(format!("/file?path={}", urlencoding::encode(&path_str)))
                .header("X-Companion-Token", "secret")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
    assert!(dir_path.exists(), "directory must not be deleted");
}
