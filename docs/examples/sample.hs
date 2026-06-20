module DataStructures.BinaryTree
  ( Tree(..)
  , insert
  , search
  , toList
  , fromList
  , depth
  , mapTree
  ) where

import Data.List (sort, nub, foldl')
import Data.Maybe (fromMaybe, isJust)
import qualified Data.Map.Strict as Map
import qualified Data.Set as Set

-- | A simple binary search tree parameterised by element type.
data Tree a
  = Leaf
  | Node (Tree a) a (Tree a)
  deriving (Show, Eq)

-- | A rose tree (n-ary tree) for comparison.
data RoseTree a = RoseNode a [RoseTree a]
  deriving (Show)

-- | Type alias for a lookup table.
type Index a = Map.Map a Int

-- | Wrapper around a list with O(1) length.
newtype SizedList a = SizedList { unSized :: [a] }

-- | Trees that can be queried for membership.
class Container f where
  member  :: (Ord a) => a -> f a -> Bool
  toList  :: f a -> [a]
  isEmpty :: f a -> Bool

-- | Functor-like class for our tree.
class TreeFunctor t where
  mapTree :: (a -> b) -> t a -> t b

instance Container Tree where
  member _ Leaf = False
  member x (Node l v r)
    | x == v    = True
    | x < v     = member x l
    | otherwise = member x r

  toList Leaf         = []
  toList (Node l v r) = toList l ++ [v] ++ toList r

  isEmpty Leaf = True
  isEmpty _    = False

instance TreeFunctor Tree where
  mapTree _ Leaf         = Leaf
  mapTree f (Node l v r) = Node (mapTree f l) (f v) (mapTree f r)

instance Functor Tree where
  fmap = mapTree

-- | Insert a value into a BST.
insert :: (Ord a) => a -> Tree a -> Tree a
insert x Leaf = Node Leaf x Leaf
insert x (Node l v r)
  | x == v    = Node l v r
  | x < v     = Node (insert x l) v r
  | otherwise = Node l v (insert x r)

-- | Search for a value; returns the subtree rooted at the match.
search :: (Ord a) => a -> Tree a -> Maybe (Tree a)
search _ Leaf = Nothing
search x node@(Node l v r)
  | x == v    = Just node
  | x < v     = search x l
  | otherwise  = search x r

-- | Build a balanced-ish BST from a list.
fromList :: (Ord a) => [a] -> Tree a
fromList = foldl' (flip insert) Leaf . sort . nub

-- | Compute the depth of the tree.
depth :: Tree a -> Int
depth Leaf         = 0
depth (Node l _ r) = 1 + max (depth l) (depth r)

-- | Build an index mapping values to their insertion positions.
buildIndex :: (Ord a) => [a] -> Index a
buildIndex xs = Map.fromList (zip xs [0..])

-- | Pretty-print a tree (for debugging).
prettyTree :: (Show a) => Tree a -> String
prettyTree t = go t 0
  where
    go Leaf         _ = ""
    go (Node l v r) d =
      let pad = replicate (d * 2) ' '
      in go r (d + 1) ++ pad ++ show v ++ "\n" ++ go l (d + 1)
