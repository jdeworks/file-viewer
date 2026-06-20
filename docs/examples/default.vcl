vcl 4.1;

import directors;
import std;

# Default backend
backend web1 {
    .host = "192.168.1.10";
    .port = "8080";
    .probe = {
        .url = "/health";
        .interval = 5s;
        .timeout = 2s;
        .window = 5;
        .threshold = 3;
    }
}

backend web2 {
    .host = "192.168.1.11";
    .port = "8080";
    .probe = {
        .url = "/health";
        .interval = 5s;
        .timeout = 2s;
    }
}

# Round-robin director
sub vcl_init {
    new cluster = directors.round_robin();
    cluster.add_backend(web1);
    cluster.add_backend(web2);
}

# IP allowlist for admin paths
acl admin_ips {
    "localhost";
    "127.0.0.1";
    "192.168.1.0"/24;
}

sub vcl_recv {
    # Set the backend
    set req.backend_hint = cluster.backend();

    # Block admin access from unauthorized IPs
    if (req.url ~ "^/admin" && !client.ip ~ admin_ips) {
        return(synth(403, "Forbidden"));
    }

    # Remove cookies for static assets
    if (req.url ~ "\.(css|js|png|jpg|gif|ico|woff2?)$") {
        unset req.http.Cookie;
        return(hash);
    }

    # Pass requests with authorization headers
    if (req.http.Authorization) {
        return(pass);
    }
}

sub vcl_hash {
    hash_data(req.url);
    if (req.http.host) {
        hash_data(req.http.host);
    }
    return(lookup);
}

sub vcl_backend_response {
    # Cache 404s for 1 minute
    if (beresp.status == 404) {
        set beresp.ttl = 1m;
    }

    # Cache static assets for 1 year
    if (bereq.url ~ "\.(css|js|png|jpg|gif|ico|woff2?)$") {
        set beresp.ttl = 365d;
        unset beresp.http.Set-Cookie;
    }
}

sub vcl_deliver {
    # Add cache hit/miss header for debugging
    if (obj.hits > 0) {
        set resp.http.X-Cache = "HIT";
    } else {
        set resp.http.X-Cache = "MISS";
    }
    set resp.http.X-Cache-Hits = obj.hits;
}
