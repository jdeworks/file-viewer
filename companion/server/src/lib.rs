pub mod auth;
pub mod config;
pub mod finder;
pub mod paths;
pub mod routes;
pub mod watcher;

use axum::{
    http::{HeaderValue, Method},
    middleware,
    routing::{delete, get, post},
    Router,
};
use std::sync::{Arc, Mutex};
use tokio::sync::broadcast;
use tower_http::cors::{AllowOrigin, CorsLayer};
use watcher::WatchEvent;

#[derive(Clone)]
pub struct AppState {
    pub token: String,
    pub watched_paths: Arc<Mutex<Vec<std::path::PathBuf>>>,
    pub debug: bool,
    pub watcher_tx: broadcast::Sender<WatchEvent>,
}

/// Build the full companion HTTP router (public + token-protected routes + CORS). Shared by the
/// standalone server binary, the Tauri desktop wrapper, and the integration tests, so the route
/// surface and security middleware can never drift between them. CORS is locked to localhost,
/// 127.0.0.1, and `pages_origin` (the deployed viewer origin).
pub fn router(state: AppState, pages_origin: String) -> Router {
    router_with(state, pages_origin, Router::new())
}

/// Like `router`, plus `extra` routes merged in before CORS + state are applied — used by the Tauri
/// wrapper to add `/path-picker` (which needs the native dialog and so can't live in this crate).
/// The caller applies its own auth `route_layer` to `extra` when those routes mutate; the final
/// `.with_state` here supplies the state both that middleware and the handlers need.
pub fn router_with(state: AppState, pages_origin: String, extra: Router<AppState>) -> Router {
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
        .route("/file", post(routes::post_file).delete(routes::delete_file))
        .route_layer(middleware::from_fn_with_state(state.clone(), auth::require_token));

    Router::new()
        .route("/ping", get(routes::ping))
        .route("/watched-paths", get(routes::get_watched_paths))
        .route("/find-file", get(routes::get_find_file))
        .route("/find-folder", get(routes::get_find_folder))
        .route("/file", get(routes::get_file))
        .route("/files", get(routes::get_files))
        .route("/watch", get(routes::watch_sse))
        .merge(protected)
        .merge(extra)
        .layer(cors)
        .with_state(state)
}
