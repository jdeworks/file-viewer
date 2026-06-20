package authz

import rego.v1
import data.roles

default allow := false
default deny := false

allow if {
    input.method == "GET"
    input.path == ["api", "public"]
}

allow if {
    some role in data.roles[input.user]
    role == "admin"
}

deny if {
    input.path[0] == "admin"
    not is_admin(input.user)
}

deny if {
    input.method == "DELETE"
    not is_owner(input.user, input.resource)
}

is_admin(user) if {
    some role in data.roles[user]
    role == "admin"
}

is_owner(user, resource) if {
    data.ownership[resource] == user
}
