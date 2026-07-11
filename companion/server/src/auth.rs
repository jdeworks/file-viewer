use axum::{
    extract::Request,
    http::{header, HeaderValue, StatusCode},
    middleware::Next,
    response::Response,
};

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

/// Browser origins trusted to read the Companion are deliberately narrow: the configured deployed
/// origin plus exact HTTP loopback hostnames. String-prefix checks are not sufficient because
/// `localhost.evil.example` and malformed authority lookalikes must never pass.
pub fn is_allowed_origin(origin: &HeaderValue, pages_origin: &str) -> bool {
    let Ok(origin) = origin.to_str() else {
        return false;
    };
    if origin == pages_origin {
        return true;
    }
    let Some(authority) = origin.strip_prefix("http://") else {
        return false;
    };
    if authority == "localhost" || authority == "127.0.0.1" {
        return true;
    }
    for host in ["localhost", "127.0.0.1"] {
        let Some(port) = authority
            .strip_prefix(host)
            .and_then(|rest| rest.strip_prefix(':'))
        else {
            continue;
        };
        if !port.is_empty()
            && port.bytes().all(|byte| byte.is_ascii_digit())
            && port.parse::<u16>().is_ok()
        {
            return true;
        }
    }
    false
}

/// Reject a request carrying a hostile browser `Origin` before it reaches a handler. CORS response
/// headers alone only stop JavaScript from reading a response; they do not prevent an explicitly
/// forged actual request from mutating state. Requests without Origin remain available to local CLI
/// clients, matching the documented local-process trust model.
pub async fn require_allowed_origin(
    pages_origin: String,
    req: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    match req.headers().get(header::ORIGIN) {
        None if req
            .headers()
            .get("sec-fetch-site")
            .and_then(|value| value.to_str().ok())
            .is_some_and(|value| value.eq_ignore_ascii_case("cross-site")) =>
        {
            // Browsers do not always attach Origin to no-cors subresource GETs. Sec-Fetch-Site is a
            // forbidden request header in browsers, so reject a blind cross-site image/script load
            // while continuing to permit headerless local CLI clients.
            Err(StatusCode::FORBIDDEN)
        }
        None => Ok(next.run(req).await),
        Some(origin) if is_allowed_origin(origin, &pages_origin) => Ok(next.run(req).await),
        Some(_) => Err(StatusCode::FORBIDDEN),
    }
}

#[cfg(test)]
mod tests {
    use super::is_allowed_origin;
    use axum::http::HeaderValue;

    #[test]
    fn origin_policy_accepts_exact_deployed_and_loopback_origins() {
        let deployed = "https://jdeworks.github.io";
        for value in [
            "https://jdeworks.github.io",
            "http://localhost",
            "http://localhost:80",
            "http://localhost:49152",
            "http://127.0.0.1",
            "http://127.0.0.1:7700",
        ] {
            assert!(
                is_allowed_origin(&HeaderValue::from_str(value).unwrap(), deployed),
                "{value}"
            );
        }
    }

    #[test]
    fn origin_policy_rejects_hostile_lookalike_and_opaque_origins() {
        let deployed = "https://jdeworks.github.io";
        for value in [
            "null",
            "https://evil.example",
            "https://jdeworks.github.io.evil.example",
            "http://localhost.evil.example:7700",
            "http://127.0.0.1.evil.example:7700",
            "http://localhost:7700/path",
            "http://localhost:7700?query",
            "http://localhost:+7700",
            "http://localhost:99999",
            "https://localhost:7700",
        ] {
            assert!(
                !is_allowed_origin(&HeaderValue::from_str(value).unwrap(), deployed),
                "{value}"
            );
        }
    }
}
