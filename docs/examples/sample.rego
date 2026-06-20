package authz

import rego.v1
import future.keywords.if
import future.keywords.contains

default allow := false
default deny := true

# Allow access if the user is an admin
allow if {
    input.user.role == "admin"
}

# Allow read access for authenticated users
allow if {
    input.method == "GET"
    input.user.authenticated == true
}

# Deny access to sensitive paths for non-admins
deny contains msg if {
    input.path == "/admin"
    input.user.role != "admin"
    msg := "Access to /admin requires admin role"
}

# Helper: check if user has a specific permission
has_permission(permission) if {
    permission in input.user.permissions
}

# Helper: check if request is from a trusted network
trusted_network if {
    net.cidr_contains("10.0.0.0/8", input.source_ip)
}
