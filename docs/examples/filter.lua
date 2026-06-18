local readings = { 21.4, 19.8, 22.1, 18.9 }

local function above(values, threshold)
  local result = {}
  for _, value in ipairs(values) do
    if value > threshold then
      table.insert(result, value)
    end
  end
  return result
end

print(table.concat(above(readings, 20), ", "))
