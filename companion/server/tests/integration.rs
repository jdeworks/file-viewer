use axum::{
    body::Body,
    http::{header, Method, Request, StatusCode},
    Extension, Router,
};
use file_viewer_companion::{router, AppState};
use std::fs;
use std::sync::{Arc, Mutex};
use tempfile::TempDir;
use tower::ServiceExt;

// Build the real router via the shared lib fn, so the tests exercise the exact route surface +
// token middleware the binary and Tauri wrapper use (no drift).
fn build_app(token: &str, watched: Vec<std::path::PathBuf>) -> Router {
    build_app_with_config(token, watched).0
}

fn build_app_with_config(
    token: &str,
    watched: Vec<std::path::PathBuf>,
) -> (Router, std::path::PathBuf) {
    // Retain the temporary config directory as a Router extension for exactly the router's
    // lifetime. Route tests must never fall through to the real per-user config path.
    let config_dir = Arc::new(TempDir::new().expect("isolated route config"));
    let (watcher_tx, _) = tokio::sync::broadcast::channel(1);
    let config_path = config_dir.path().join("config.json");
    let state = AppState {
        token: token.to_string(),
        watched_paths: Arc::new(Mutex::new(watched)),
        config_path: config_path.clone(),
        debug: false,
        watcher_tx,
    };
    (
        router(state, "https://test.invalid".to_string()).layer(Extension(config_dir)),
        config_path,
    )
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
    assert_eq!(
        json["token"], "secret",
        "ping returns the session token for auto-pickup"
    );
    assert!(json["capabilities"]
        .as_array()
        .unwrap()
        .iter()
        .any(|c| c == "file-delete"));
}

#[tokio::test]
async fn test_cors_allows_exact_deployed_and_loopback_origins() {
    for origin in [
        "https://test.invalid",
        "http://localhost:8123",
        "http://127.0.0.1:8123",
    ] {
        let response = build_app("secret", vec![])
            .oneshot(
                Request::builder()
                    .uri("/ping")
                    .header(header::ORIGIN, origin)
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK, "{origin}");
        assert_eq!(
            response
                .headers()
                .get(header::ACCESS_CONTROL_ALLOW_ORIGIN)
                .and_then(|v| v.to_str().ok()),
            Some(origin),
            "{origin}"
        );
    }
}

#[tokio::test]
async fn test_cors_rejects_hostile_lookalike_and_null_origins() {
    for origin in [
        "https://evil.example",
        "http://localhost.evil.example:8123",
        "http://127.0.0.1.evil.example:8123",
        "null",
    ] {
        let response = build_app("secret", vec![])
            .oneshot(
                Request::builder()
                    .uri("/ping")
                    .header(header::ORIGIN, origin)
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::FORBIDDEN, "{origin}");
        assert!(response
            .headers()
            .get(header::ACCESS_CONTROL_ALLOW_ORIGIN)
            .is_none());
    }
}

#[tokio::test]
async fn test_blind_cross_site_subresource_request_without_origin_is_rejected() {
    let response = build_app("secret", vec![])
        .oneshot(
            Request::builder()
                .uri("/find-file?name=anything&size=0")
                .header("Sec-Fetch-Site", "cross-site")
                .header("Sec-Fetch-Mode", "no-cors")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::FORBIDDEN);
}

#[tokio::test]
async fn test_cors_preflight_allows_exact_origin_and_rejects_hostile_origin() {
    let allowed = build_app("secret", vec![])
        .oneshot(
            Request::builder()
                .method(Method::OPTIONS)
                .uri("/watched-paths")
                .header(header::ORIGIN, "http://localhost:8123")
                .header(header::ACCESS_CONTROL_REQUEST_METHOD, "POST")
                .header(
                    header::ACCESS_CONTROL_REQUEST_HEADERS,
                    "content-type,x-companion-token",
                )
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(allowed.status(), StatusCode::OK);
    assert_eq!(
        allowed
            .headers()
            .get(header::ACCESS_CONTROL_ALLOW_ORIGIN)
            .and_then(|v| v.to_str().ok()),
        Some("http://localhost:8123")
    );

    let hostile = build_app("secret", vec![])
        .oneshot(
            Request::builder()
                .method(Method::OPTIONS)
                .uri("/watched-paths")
                .header(header::ORIGIN, "https://evil.example")
                .header(header::ACCESS_CONTROL_REQUEST_METHOD, "POST")
                .header(header::ACCESS_CONTROL_REQUEST_HEADERS, "x-companion-token")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(hostile.status(), StatusCode::FORBIDDEN);
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
async fn test_add_watched_path_rejects_relative_path() {
    let app = build_app("secret", vec![]);
    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/watched-paths")
                .header(header::CONTENT_TYPE, "application/json")
                .header("X-Companion-Token", "secret")
                .body(Body::from(r#"{"path":"relative"}"#))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
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

#[tokio::test]
async fn test_route_persistence_uses_injected_disposable_config() {
    let root = TempDir::new().unwrap();
    let (app, config_path) = build_app_with_config("secret", vec![]);
    assert!(!config_path.exists());
    let body = serde_json::json!({ "path": root.path() }).to_string();

    let response = app
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

    assert_eq!(response.status(), StatusCode::OK);
    assert!(
        config_path.exists(),
        "the injected disposable config was not written"
    );
    let persisted: serde_json::Value =
        serde_json::from_slice(&fs::read(config_path).unwrap()).unwrap();
    assert_eq!(
        persisted["watched_paths"][0],
        root.path().display().to_string()
    );
}

#[tokio::test]
async fn test_config_persistence_failure_returns_500_without_changing_state() {
    let root = TempDir::new().unwrap();
    let (app, config_path) = build_app_with_config("secret", vec![]);
    fs::create_dir(&config_path).unwrap(); // an atomic file rename cannot replace a directory
    let body = serde_json::json!({ "path": root.path() }).to_string();

    let response = app
        .clone()
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
    assert_eq!(response.status(), StatusCode::INTERNAL_SERVER_ERROR);

    let get = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/watched-paths")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let bytes = axum::body::to_bytes(get.into_body(), usize::MAX)
        .await
        .unwrap();
    let json: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(json["paths"], serde_json::json!([]));
    assert!(config_path.is_dir());
}

#[tokio::test]
async fn test_remove_persistence_failure_returns_500_without_changing_state() {
    let root = TempDir::new().unwrap();
    let root_path = root.path().to_path_buf();
    let (app, config_path) = build_app_with_config("secret", vec![root_path.clone()]);
    fs::create_dir(&config_path).unwrap();
    let body = serde_json::json!({ "path": root_path }).to_string();

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::DELETE)
                .uri("/watched-paths")
                .header(header::CONTENT_TYPE, "application/json")
                .header("X-Companion-Token", "secret")
                .body(Body::from(body))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::INTERNAL_SERVER_ERROR);

    let get = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/watched-paths")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let bytes = axum::body::to_bytes(get.into_body(), usize::MAX)
        .await
        .unwrap();
    let json: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(
        json["paths"],
        serde_json::json!([root.path().display().to_string()])
    );
}

#[tokio::test]
async fn test_hostile_origin_cannot_mutate_watched_paths_even_with_valid_token() {
    let root = TempDir::new().unwrap();
    let (app, config_path) = build_app_with_config("secret", vec![]);
    let body = serde_json::json!({ "path": root.path() }).to_string();

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/watched-paths")
                .header(header::ORIGIN, "https://evil.example")
                .header(header::CONTENT_TYPE, "application/json")
                .header("X-Companion-Token", "secret")
                .body(Body::from(body))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::FORBIDDEN);
    assert!(
        !config_path.exists(),
        "hostile-origin request persisted a config mutation"
    );

    let get = app
        .oneshot(
            Request::builder()
                .uri("/watched-paths")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let bytes = axum::body::to_bytes(get.into_body(), usize::MAX)
        .await
        .unwrap();
    let json: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(json["paths"], serde_json::json!([]));
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

#[tokio::test]
async fn test_post_file_accepts_payload_above_axum_default_limit() {
    let tmp = TempDir::new().unwrap();
    let file_path = tmp.path().join("large.bin");
    let payload = vec![0x5a; 2 * 1024 * 1024 + 1];
    let app = build_app("secret", vec![tmp.path().to_path_buf()]);
    let path = file_path.display().to_string();

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri(format!("/file?path={}", urlencoding::encode(&path)))
                .header("X-Companion-Token", "secret")
                .body(Body::from(payload.clone()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(fs::read(file_path).unwrap(), payload);
}

// --- create a NOT-yet-existing file in a watched dir (the "create unknown file" flow) ---

#[tokio::test]
async fn test_create_new_file_in_watched_dir() {
    let tmp = TempDir::new().unwrap();
    let app = build_app("secret", vec![tmp.path().to_path_buf()]);
    let new_path = tmp.path().join("brand-new.txt");
    assert!(!new_path.exists(), "precondition: file must not exist yet");

    let path_str = new_path.to_str().unwrap().to_string();
    let resp = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri(format!("/file?path={}", urlencoding::encode(&path_str)))
                .header("X-Companion-Token", "secret")
                .body(Body::from("created!"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    assert!(new_path.exists(), "the new file should have been created");
    assert_eq!(fs::read_to_string(&new_path).unwrap(), "created!");
}

#[tokio::test]
async fn test_create_file_in_new_subfolder() {
    // Reproduces the reported case: saving welcome.md into a subfolder that doesn't exist yet, but
    // lives under a watched folder, must succeed (the subfolder is created).
    let tmp = TempDir::new().unwrap();
    let app = build_app("secret", vec![tmp.path().to_path_buf()]);
    let nested = tmp.path().join("folder").join("welcome.md");
    assert!(
        !nested.parent().unwrap().exists(),
        "precondition: subfolder absent"
    );

    let path_str = nested.to_str().unwrap().to_string();
    let resp = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri(format!("/file?path={}", urlencoding::encode(&path_str)))
                .header("X-Companion-Token", "secret")
                .body(Body::from("# hi"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    assert!(
        nested.exists(),
        "file should be created in the new subfolder"
    );
    assert_eq!(fs::read_to_string(&nested).unwrap(), "# hi");
}

#[tokio::test]
async fn test_create_new_file_outside_watched_returns_403() {
    let tmp = TempDir::new().unwrap();
    let other = TempDir::new().unwrap();
    let app = build_app("secret", vec![tmp.path().to_path_buf()]);
    let new_path = other.path().join("nope.txt"); // parent dir is not watched
    let path_str = new_path.to_str().unwrap().to_string();
    let resp = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri(format!("/file?path={}", urlencoding::encode(&path_str)))
                .header("X-Companion-Token", "secret")
                .body(Body::from("x"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::FORBIDDEN);
    assert!(
        !new_path.exists(),
        "must not create a file outside watched dirs"
    );
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

#[tokio::test]
async fn test_post_file_rejects_wrong_token_without_changing_disk() {
    let tmp = TempDir::new().unwrap();
    let file_path = tmp.path().join("data.txt");
    fs::write(&file_path, b"original").unwrap();
    let app = build_app("secret", vec![tmp.path().to_path_buf()]);
    let path = file_path.display().to_string();

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri(format!("/file?path={}", urlencoding::encode(&path)))
                .header("X-Companion-Token", "wrong")
                .body(Body::from("changed"))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(fs::read(&file_path).unwrap(), b"original");
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

// --- /reveal ---

#[tokio::test]
async fn test_reveal_requires_token_and_watched_path() {
    let tmp = TempDir::new().unwrap();
    let file_path = tmp.path().join("r.txt");
    fs::write(&file_path, b"x").unwrap();
    let other = TempDir::new().unwrap();
    let outside = other.path().join("o.txt");
    fs::write(&outside, b"x").unwrap();
    let app = build_app("secret", vec![tmp.path().to_path_buf()]);
    let p = file_path.to_str().unwrap().to_string();

    // No token → 401.
    let r1 = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri(format!("/reveal?path={}", urlencoding::encode(&p)))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(r1.status(), StatusCode::UNAUTHORIZED);

    // Token + watched file → 200 (the OS reveal command is best-effort/ignored in tests).
    let r2 = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri(format!("/reveal?path={}", urlencoding::encode(&p)))
                .header("X-Companion-Token", "secret")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(r2.status(), StatusCode::OK);

    // Token + outside watched → 403.
    let po = outside.to_str().unwrap().to_string();
    let r3 = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri(format!("/reveal?path={}", urlencoding::encode(&po)))
                .header("X-Companion-Token", "secret")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(r3.status(), StatusCode::FORBIDDEN);
}

// --- /tree recursive listing ---

#[tokio::test]
async fn test_tree_lists_files_recursively() {
    let tmp = TempDir::new().unwrap();
    fs::write(tmp.path().join("a.txt"), b"aaa").unwrap();
    fs::create_dir(tmp.path().join("sub")).unwrap();
    fs::write(tmp.path().join("sub").join("b.txt"), b"bb").unwrap();

    let app = build_app("secret", vec![tmp.path().to_path_buf()]);
    let path_str = tmp.path().to_str().unwrap().to_string();
    let resp = app
        .oneshot(
            Request::builder()
                .uri(format!("/tree?path={}", urlencoding::encode(&path_str)))
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
    let files = json["files"].as_array().unwrap();
    let paths: Vec<&str> = files.iter().map(|f| f["path"].as_str().unwrap()).collect();
    assert!(paths.contains(&"a.txt"));
    assert!(
        paths.contains(&"sub/b.txt"),
        "nested file should use a '/'-separated relative path; got {paths:?}"
    );
    assert_eq!(json["truncated"], false);
}

#[cfg(unix)]
#[tokio::test]
async fn test_tree_does_not_follow_symlink_outside_watched_root() {
    use std::os::unix::fs::symlink;
    let watched = TempDir::new().unwrap();
    let outside = TempDir::new().unwrap();
    fs::write(outside.path().join("secret.txt"), b"secret").unwrap();
    symlink(outside.path(), watched.path().join("escape")).unwrap();
    let app = build_app("secret", vec![watched.path().to_path_buf()]);
    let path = watched.path().display().to_string();

    let response = app
        .oneshot(
            Request::builder()
                .uri(format!("/tree?path={}", urlencoding::encode(&path)))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert!(json["files"].as_array().unwrap().is_empty());
}

#[tokio::test]
async fn test_tree_reports_truncation_at_depth_bound() {
    let root = TempDir::new().unwrap();
    let mut deepest = root.path().to_path_buf();
    for _ in 0..66 {
        deepest.push("d");
    }
    fs::create_dir_all(&deepest).unwrap();
    fs::write(deepest.join("too-deep.txt"), b"x").unwrap();
    let app = build_app("secret", vec![root.path().to_path_buf()]);
    let path = root.path().display().to_string();

    let response = app
        .oneshot(
            Request::builder()
                .uri(format!("/tree?path={}", urlencoding::encode(&path)))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(json["truncated"], true);
    assert!(json["files"].as_array().unwrap().is_empty());
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
    assert!(
        file_path.exists(),
        "file must survive an unauthorized delete"
    );
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
    assert!(
        file_path.exists(),
        "out-of-watched file must not be deleted"
    );
}

#[tokio::test]
async fn test_delete_subfolder_recursively() {
    let tmp = TempDir::new().unwrap();
    let dir_path = tmp.path().join("subdir");
    fs::create_dir(&dir_path).unwrap();
    fs::write(dir_path.join("inner.txt"), b"x").unwrap();

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
    assert_eq!(resp.status(), StatusCode::OK);
    assert!(
        !dir_path.exists(),
        "subfolder should be deleted recursively"
    );
}

#[tokio::test]
async fn test_delete_refuses_watched_root() {
    let tmp = TempDir::new().unwrap();
    let app = build_app("secret", vec![tmp.path().to_path_buf()]);
    let path_str = tmp.path().to_str().unwrap().to_string();
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
    assert!(
        tmp.path().exists(),
        "the watched root must never be deleted"
    );
}

#[tokio::test]
async fn test_delete_refuses_ancestor_of_nested_watched_root() {
    let root = TempDir::new().unwrap();
    let parent = root.path().join("parent");
    let nested = parent.join("nested-root");
    fs::create_dir_all(&nested).unwrap();
    fs::write(nested.join("keep.txt"), b"keep").unwrap();
    let app = build_app("secret", vec![root.path().to_path_buf(), nested.clone()]);
    let path = parent.display().to_string();

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::DELETE)
                .uri(format!("/file?path={}", urlencoding::encode(&path)))
                .header("X-Companion-Token", "secret")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    assert!(nested.join("keep.txt").exists());
}

#[cfg(unix)]
#[tokio::test]
async fn test_delete_refuses_symbolic_link() {
    use std::os::unix::fs::symlink;
    let root = TempDir::new().unwrap();
    let target = root.path().join("target.txt");
    let link = root.path().join("link.txt");
    fs::write(&target, b"keep").unwrap();
    symlink(&target, &link).unwrap();
    let app = build_app("secret", vec![root.path().to_path_buf()]);
    let path = link.display().to_string();

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::DELETE)
                .uri(format!("/file?path={}", urlencoding::encode(&path)))
                .header("X-Companion-Token", "secret")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    assert!(link.symlink_metadata().unwrap().file_type().is_symlink());
    assert_eq!(fs::read(target).unwrap(), b"keep");
}

// --- /logs ---

#[tokio::test]
async fn test_logs_records_actions_and_filters() {
    use file_viewer_companion::logging;
    // Enable the ring buffer (idempotent; dir=None means no file writes in tests).
    logging::init(None);

    let tmp = TempDir::new().unwrap();
    // Unique marker so we find our own entry amid other tests sharing the global ring.
    let fname = "logtest_marker_zzz.txt";
    let file_path = tmp.path().join(fname);
    fs::write(&file_path, b"x").unwrap();
    let path_str = file_path.to_str().unwrap().to_string();
    let app = build_app("secret", vec![tmp.path().to_path_buf()]);

    // A save should produce a "saved …" info log mentioning the file.
    let resp = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri(format!("/file?path={}", urlencoding::encode(&path_str)))
                .header("X-Companion-Token", "secret")
                .body(Body::from("hello"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::OK);

    // GET /logs filtered to our marker + info level.
    let resp = app
        .oneshot(
            Request::builder()
                .uri("/logs?level=info&q=logtest_marker_zzz")
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
    assert!(
        entries.iter().any(|e| {
            let m = e["msg"].as_str().unwrap_or("");
            e["level"] == "info" && m.contains("saved") && m.contains(fname)
        }),
        "expected a 'saved' info log for our file; got {:?}",
        entries
    );
    // Every returned entry must carry a timestamp + level (shape for the viewers).
    assert!(entries
        .iter()
        .all(|e| e["ts"].as_str().is_some() && e["level"].as_str().is_some()));
}
