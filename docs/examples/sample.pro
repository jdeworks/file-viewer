:- module(animals, [animal/2, can_fly/1, mammal/1, describe/2]).

:- use_module(library(lists)).
:- use_module(library(aggregate)).

% Facts about animals
animal(eagle, bird).
animal(penguin, bird).
animal(dog, mammal).
animal(cat, mammal).
animal(salmon, fish).
animal(cobra, reptile).
animal(frog, amphibian).

% Mammal facts
mammal(dog).
mammal(cat).
mammal(whale).
mammal(bat).

% Flight rules
can_fly(X) :-
    animal(X, bird),
    X \= penguin.
can_fly(bat).

% Predicate: is X a vertebrate?
vertebrate(X) :-
    animal(X, mammal).
vertebrate(X) :-
    animal(X, bird).
vertebrate(X) :-
    animal(X, fish).
vertebrate(X) :-
    animal(X, reptile).
vertebrate(X) :-
    animal(X, amphibian).

% Description rule
describe(X, Desc) :-
    animal(X, Class),
    format(atom(Desc), "~w is a ~w", [X, Class]).

% DCG grammar for animal sentences
sentence --> noun_phrase, verb_phrase.
noun_phrase --> [the], animal_word.
animal_word --> [eagle].
animal_word --> [dog].
verb_phrase --> [flies].
verb_phrase --> [runs].

% Helper: collect all flying animals
all_flyers(Flyers) :-
    findall(X, can_fly(X), Flyers).
