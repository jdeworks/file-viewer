module Data.Sample where

import Prelude
import Data.Maybe (Maybe(..), fromMaybe)
import Data.Either (Either(..))
import Data.List (List, filter, map)
import Data.String as String
import Control.Monad.State (State, get, put)
import Effect (Effect)
import Effect.Console (log)

-- | A simple product type
data Point = Point
  { x :: Number
  , y :: Number
  }

-- | A sum type
data Shape
  = Circle Point Number
  | Rectangle Point Point
  | Triangle Point Point Point

-- | Newtype wrapper for validated email
newtype Email = Email String

-- | Type alias
type Name = String

type Config =
  { host :: String
  , port :: Int
  , debug :: Boolean
  }

-- | Type class for things that can be rendered
class Renderable a where
  render :: a -> String

-- | Type class for geometric area computation
class HasArea a where
  area :: a -> Number

-- | Instances
instance renderableShape :: Renderable Shape where
  render (Circle _ r) = "Circle(r=" <> show r <> ")"
  render (Rectangle _ _) = "Rectangle"
  render (Triangle _ _ _) = "Triangle"

instance hasAreaShape :: HasArea Shape where
  area (Circle _ r) = 3.14159 * r * r
  area _ = 0.0

-- | Top-level functions
distance :: Point -> Point -> Number
distance (Point p1) (Point p2) =
  let dx = p2.x - p1.x
      dy = p2.y - p1.y
  in sqrt (dx * dx + dy * dy)

validateEmail :: String -> Maybe Email
validateEmail s =
  if String.contains (String.Pattern "@") s
  then Just (Email s)
  else Nothing

defaultConfig :: Config
defaultConfig =
  { host: "localhost"
  , port: 8080
  , debug: false
  }

main :: Effect Unit
main = do
  log "PureScript sample"
  let c = Circle (Point { x: 0.0, y: 0.0 }) 5.0
  log (render c)
