module Main

import Data.List
import Data.String

||| A geometric shape (algebraic data type)
data Shape = Circle Double
           | Rectangle Double Double
           | Triangle Double Double Double

-- An interface describing things that have an area and a perimeter
interface HasArea a where
  area : a -> Double
  perimeter : a -> Double

-- A record bundling a shape with a human-readable label
record Figure where
  constructor MkFigure
  label : String
  shape : Shape

{- GADT-style indexed expression type:
   the type index guarantees well-typedness. -}
data Expr : Type -> Type where
  IntLit  : Int -> Expr Int
  BoolLit : Bool -> Expr Bool
  Add     : Expr Int -> Expr Int -> Expr Int

total
shapeArea : Shape -> Double
shapeArea (Circle r) = pi * r * r
shapeArea (Rectangle w h) = w * h
shapeArea (Triangle a b c) =
  let s = (a + b + c) / 2
  in sqrt (s * (s - a) * (s - b) * (s - c))

partial
largest : List Shape -> Shape
largest (x :: xs) = foldl (\acc, s => if shapeArea s > shapeArea acc then s else acc) x xs

implementation HasArea Shape where
  area = shapeArea
  perimeter (Circle r) = 2 * pi * r
  perimeter (Rectangle w h) = 2 * (w + h)
  perimeter (Triangle a b c) = a + b + c

eval : Expr a -> a
eval (IntLit n) = n
eval (BoolLit b) = b
eval (Add x y) = eval x + eval y

main : IO ()
main = do
  let shapes = [Circle 5.0, Rectangle 3.0 4.0, Triangle 3.0 4.0 5.0]
  putStrLn "Shapes:"
  traverse_ (\s => putStrLn ("Area: " ++ show (area s))) shapes
