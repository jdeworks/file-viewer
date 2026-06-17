use axum::{extract::Request, http::StatusCode, middleware::Next, response::Response};

use crate::AppState;

pub async fn require_token(
    axum::extract::State(state): axum::extract::State<AppState>,
    req: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    let token_header = req
        .headers()
        .get("X-Companion-Token")
        .and_then(|v| v.to_str().ok());

    match token_header {
        Some(t) if t == state.token => Ok(next.run(req).await),
        _ => Err(StatusCode::UNAUTHORIZED),
    }
}
