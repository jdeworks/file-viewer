# Elvish script example
use str
use path
use re

var project-root = (path:dir (src))
var config-file = $project-root/config.json

fn greet {|name|
  echo "Hello, "$name"!"
}

fn build {|&release=$false|
  if $release {
    echo "Building in release mode..."
    cargo build --release
  } else {
    echo "Building in debug mode..."
    cargo build
  }
}

fn test {|&filter=""|}
  if (not-eq $filter "") {
    cargo test $filter
  } else {
    cargo test
  }
}

fn deploy {|env|
  if (not (has-value [staging production] $env)) {
    fail "Unknown environment: "$env
  }
  echo "Deploying to "$env"..."
  rsync -av ./dist/ user@server:/var/www/$env/
}

set edit:prompt = {
  var branch = (git rev-parse --abbrev-ref HEAD 2>/dev/null | str:trim-right "\n")
  put "["$branch"] $ "
}

for f [(find . -name "*.log" -mtime +7)] {
  rm $f
}

while $true {
  var status = (curl -s https://api.example.com/health | from-json)
  if (eq $status[ok] $true) {
    echo "Service healthy"
    break
  }
  sleep 5
}
