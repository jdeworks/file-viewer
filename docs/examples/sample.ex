defmodule MyApp.Calculator do
  @moduledoc "A simple calculator module demonstrating Elixir syntax and patterns."

  alias MyApp.Logger
  import Enum, only: [reduce: 3]
  use GenServer

  @doc "Adds two numbers together."
  def add(a, b) do
    a + b
  end

  @doc "Subtracts b from a."
  def subtract(a, b) do
    a - b
  end

  @doc "Multiplies two numbers."
  def multiply(a, b) do
    a * b
  end

  @doc "Divides a by b, returning {:ok, result} or {:error, reason}."
  def divide(_a, 0), do: {:error, :division_by_zero}
  def divide(a, b), do: {:ok, a / b}

  @doc "Computes the sum of a list of numbers using a pipeline."
  def sum(numbers) do
    numbers
    |> Enum.filter(&is_number/1)
    |> reduce(0, fn x, acc -> x + acc end)
  end

  @doc "Returns the factorial of n."
  def factorial(0), do: 1
  def factorial(n) when n > 0 do
    n * factorial(n - 1)
  end

  defp validate_number(n) when is_integer(n) and n >= 0, do: {:ok, n}
  defp validate_number(_), do: {:error, :invalid_input}

  defp format_result({:ok, val}), do: "Result: #{val}"
  defp format_result({:error, reason}), do: "Error: #{reason}"

  # GenServer callbacks
  def init(state), do: {:ok, state}

  def handle_call({:add, a, b}, _from, state) do
    {:reply, add(a, b), state}
  end

  def handle_cast({:log, message}, state) do
    Logger.info(message)
    {:noreply, state}
  end
end
