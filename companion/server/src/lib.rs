pub mod auth;
pub mod config;
pub mod finder;
pub mod logging;
pub mod paths;
pub mod routes;
pub mod watcher;

use axum::{
    http::{HeaderValue, Method},
    middleware,
    routing::{delete, get, post},
    Router,
};
use std::io;
use std::net::{Ipv4Addr, TcpListener};
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

/// Claim the Companion server port on IPv4 loopback before starting any long-lived UI.
///
/// Keeping the returned listener alive reserves the port. A second standalone or tray process gets
/// `AddrInUse` and can exit without creating a nonfunctional tray. The socket is nonblocking so it
/// can be passed to `tokio::net::TcpListener::from_std`.
pub fn bind_server_listener(port: u16) -> io::Result<TcpListener> {
    let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, port))?;
    listener.set_nonblocking(true)?;
    Ok(listener)
}

/// Build the full companion HTTP router (public + token-protected routes + CORS). Shared by the
/// standalone server binary, the Tauri desktop wrapper, and the integration tests, so the route
/// surface and security middleware can never drift between them. The browser CORS barrier allows
/// `pages_origin` (the deployed viewer) plus HTTP localhost/127.0.0.1 on any port. CORS does not
/// constrain non-browser local processes.
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
        .route("/reveal", post(routes::reveal))
        .route_layer(middleware::from_fn_with_state(state.clone(), auth::require_token));

    Router::new()
        .route("/ping", get(routes::ping))
        .route("/watched-paths", get(routes::get_watched_paths))
        .route("/find-file", get(routes::get_find_file))
        .route("/find-folder", get(routes::get_find_folder))
        .route("/file", get(routes::get_file))
        .route("/files", get(routes::get_files))
        .route("/tree", get(routes::get_tree))
        .route("/watch", get(routes::watch_sse))
        .route("/logs", get(routes::get_logs))
        .merge(protected)
        .merge(extra)
        .layer(cors)
        .with_state(state)
}

#[cfg(test)]
mod tests {
    use super::bind_server_listener;
    use std::io::ErrorKind;

    #[test]
    fn server_listener_claim_is_exclusive_and_released_on_drop() {
        let first = bind_server_listener(0).expect("claim an available loopback port");
        let port = first.local_addr().unwrap().port();

        let error = bind_server_listener(port).expect_err("a second claim must fail");
        assert_eq!(error.kind(), ErrorKind::AddrInUse);

        drop(first);
        bind_server_listener(port).expect("dropping the owner must release the port");
    }

    #[test]
    fn server_listener_is_loopback_and_nonblocking() {
        let listener = bind_server_listener(0).expect("claim an available loopback port");
        assert!(listener.local_addr().unwrap().ip().is_loopback());

        let error = listener
            .accept()
            .expect_err("accept must not block without a client");
        assert_eq!(error.kind(), ErrorKind::WouldBlock);
    }
}
