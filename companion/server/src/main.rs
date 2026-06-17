use axum::http::{HeaderValue, Method};
use axum::{
    middleware,
    routing::{delete, get, post},
    Router,
};
use file_viewer_companion::{auth::require_token, config::load_config, routes, AppState};
use std::sync::{Arc, Mutex};
use tower_http::cors::{AllowOrigin, CorsLayer};

#[tokio::main]
async fn main() {
    let debug = std::env::args().any(|a| a == "--debug");

    if debug {
        tracing_subscriber::fmt().with_env_filter("info").init();
    }

    let token =
        std::env::var("COMPANION_TOKEN").unwrap_or_else(|_| uuid::Uuid::new_v4().to_string());

    let pages_origin = std::env::var("COMPANION_ORIGIN")
        .unwrap_or_else(|_| "https://nicholaswilde.io".to_string());

    let watched = load_config();

    println!("═══════════════════════════════════");
    println!("  file-viewer companion v0.1.0");
    println!("  Listening on http://127.0.0.1:7700");
    println!("  Token: {token}");
    println!("  (set COMPANION_TOKEN env var to use a fixed token)");
    println!("═══════════════════════════════════");

    let state = AppState {
        token,
        watched_paths: Arc::new(Mutex::new(watched)),
        debug,
    };

    let cors = CorsLayer::new()
        .allow_origin(AllowOrigin::predicate(move |origin: &HeaderValue, _| {
            let o = origin.to_str().unwrap_or("");
            o.starts_with("http://localhost:")
                || o.starts_with("http://127.0.0.1:")
                || o == pages_origin
        }))
        .allow_methods([Method::GET, Method::POST, Method::DELETE, Method::OPTIONS])
        .allow_headers(tower_http::cors::Any);

    let protected = Router::new()
        .route("/watched-paths", post(routes::add_watched_path))
        .route("/watched-paths", delete(routes::remove_watched_path))
        .route("/file", post(routes::post_file))
        .route_layer(middleware::from_fn_with_state(state.clone(), require_token));

    let app = Router::new()
        .route("/ping", get(routes::ping))
        .route("/watched-paths", get(routes::get_watched_paths))
        .route("/find-file", get(routes::get_find_file))
        .route("/find-folder", get(routes::get_find_folder))
        .route("/file", get(routes::get_file))
        .route("/files", get(routes::get_files))
        .merge(protected)
        .layer(cors)
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("127.0.0.1:7700")
        .await
        .unwrap();
    axum::serve(listener, app).await.unwrap();
}
