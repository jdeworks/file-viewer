defmodule Pipeline do
  def normalize(events) do
    events
    |> Enum.map(&String.trim/1)
    |> Enum.reject(&(&1 == ""))
  end
end

IO.inspect(Pipeline.normalize([" opened ", "", "saved "]))
