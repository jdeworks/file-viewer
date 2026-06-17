use axum::{
    middleware,
    routing::{delete, get, post},
    Router,
};
use file_viewer_companion::{auth::require_token, routes, AppState};
use std::sync::{Arc, Mutex};
use tower_http::cors::{Any, CorsLayer};

#[tokio::main]
async fn main() {
    let token =
        std::env::var("COMPANION_TOKEN").unwrap_or_else(|_| uuid::Uuid::new_v4().to_string());

    println!("Companion server starting on :7700");
    println!("Token: {token}");

    let state = AppState {
        token,
        watched_paths: Arc::new(Mutex::new(vec![])),
    };

    // CORS will be tightened in Phase 1; Any is fine for the scaffold.
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // Mutating routes that require the session token.
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
        .merge(protected)
        .layer(cors)
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("127.0.0.1:7700")
        .await
        .unwrap();
    axum::serve(listener, app).await.unwrap();
}
