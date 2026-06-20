// sample.fs — F# module example
module MyApp.Domain

open System
open System.Collections.Generic

type Shape =
    | Circle of radius: float
    | Rectangle of width: float * height: float
    | Triangle of base': float * height: float

type Person = {
    Name: string
    Age: int
    Email: string
}

[<EntryPoint>]
let main argv =
    let area shape =
        match shape with
        | Circle r -> Math.PI * r * r
        | Rectangle (w, h) -> w * h
        | Triangle (b, h) -> 0.5 * b * h

    let shapes = [ Circle 5.0; Rectangle (3.0, 4.0); Triangle (6.0, 8.0) ]
    shapes
    |> List.map area
    |> List.iter (printfn "Area: %.2f")

    let fetchAsync url = async {
        let! result = Async.Sleep 100
        return sprintf "Fetched: %s" url
    }

    0
