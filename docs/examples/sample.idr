module Main

import Data.List
import Data.String

data Shape = Circle Double
           | Rectangle Double Double
           | Triangle Double Double Double

total
area : Shape -> Double
area (Circle r) = pi * r * r
area (Rectangle w h) = w * h
area (Triangle a b c) =
  let s = (a + b + c) / 2
  in sqrt (s * (s - a) * (s - b) * (s - c))

total
perimeter : Shape -> Double
perimeter (Circle r) = 2 * pi * r
perimeter (Rectangle w h) = 2 * (w + h)
perimeter (Triangle a b c) = a + b + c

partial
largest : List Shape -> Shape
largest (x :: xs) = foldl (\acc, s => if area s > area acc then s else acc) x xs

main : IO ()
main = do
  let shapes = [Circle 5.0, Rectangle 3.0 4.0, Triangle 3.0 4.0 5.0]
  putStrLn "Shapes:"
  traverse_ (\s => putStrLn ("Area: " ++ show (area s))) shapes
