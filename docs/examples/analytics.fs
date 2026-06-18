type Sample =
  { Name: string
    Category: string
    SizeBytes: int64 }

let samples =
  [ { Name = "main.py"; Category = "Code"; SizeBytes = 640L }
    { Name = "sample.pdf"; Category = "Documents"; SizeBytes = 42100L }
    { Name = "query.sql"; Category = "Code"; SizeBytes = 512L } ]

let totalByCategory items =
  items
  |> List.groupBy _.Category
  |> List.map (fun (category, group) ->
    category, group |> List.sumBy _.SizeBytes)

totalByCategory samples
|> List.iter (fun (category, bytes) ->
  printfn "%s: %d bytes" category bytes)
