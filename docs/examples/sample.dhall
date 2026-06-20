-- Sample Dhall configuration
let Prelude = https://prelude.dhall-lang.org/v21.1.0/package.dhall sha256:0fed19a88330e9a8a3fbe1e8442aa11d12e38da51eb12ba8bcb56f3c25d0854a

let Config =
  { Type =
    { host : Text
    , port : Natural
    , debug : Bool
    , tags : List Text
    }
  , default =
    { host = "localhost"
    , port = 8080
    , debug = False
    , tags = [] : List Text
    }
  }

let mkConfig : Config.Type -> Config.Type =
  \(overrides : Config.Type) ->
    Config.default // overrides

in mkConfig
  { host = "example.com"
  , port = 443
  , debug = False
  , tags = [ "production", "web" ]
  }
