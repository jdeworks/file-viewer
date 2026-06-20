module Main exposing (main)

import Browser
import Html exposing (Html, button, div, h1, p, text)
import Html.Attributes as Attr
import Html.Events exposing (onClick)

-- MODEL

type alias Model =
    { count : Int
    , label : String
    }

init : Model
init =
    { count = 0, label = "Counter" }

-- UPDATE

type Msg
    = Increment
    | Decrement
    | Reset

update : Msg -> Model -> Model
update msg model =
    case msg of
        Increment ->
            { model | count = model.count + 1 }

        Decrement ->
            { model | count = model.count - 1 }

        Reset ->
            { model | count = 0 }

-- VIEW

view : Model -> Html Msg
view model =
    div [ Attr.class "counter" ]
        [ h1 [] [ text model.label ]
        , p [] [ text (String.fromInt model.count) ]
        , button [ onClick Increment ] [ text "+" ]
        , button [ onClick Decrement ] [ text "-" ]
        , button [ onClick Reset ] [ text "Reset" ]
        ]

-- MAIN

main : Program () Model Msg
main =
    Browser.sandbox
        { init = init
        , update = update
        , view = view
        }
