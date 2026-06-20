-- sample.lua: A Lua module demonstrating common patterns

local json = require("json")
local utils = require("utils.helpers")
local http = require("socket.http")

-- Class-like pattern
Animal = {}
Animal.__index = Animal

function Animal:new(name, sound)
  local self = setmetatable({}, Animal)
  self.name = name
  self.sound = sound
  return self
end

function Animal:speak()
  return self.name .. " says " .. self.sound
end

-- Subclass
Dog = setmetatable({}, { __index = Animal })

function Dog:new(name)
  local self = Animal.new(self, name, "Woof")
  return setmetatable(self, { __index = Dog })
end

function Dog:fetch(item)
  return self.name .. " fetches the " .. item
end

-- Global functions
function greet(who)
  return "Hello, " .. tostring(who) .. "!"
end

function deepCopy(orig)
  local copy = {}
  for k, v in pairs(orig) do
    if type(v) == "table" then
      copy[k] = deepCopy(v)
    else
      copy[k] = v
    end
  end
  return copy
end

-- Local helper
local function clamp(value, min, max)
  if value < min then return min end
  if value > max then return max end
  return value
end

local function lerp(a, b, t)
  t = clamp(t, 0, 1)
  return a + (b - a) * t
end

-- Configuration table
local config = {
  version = "1.0.0",
  debug = false,
  maxRetries = 3,
  endpoints = {
    api = "https://api.example.com",
    auth = "https://auth.example.com",
  },
}

-- Return module table
return {
  Animal = Animal,
  Dog = Dog,
  greet = greet,
  deepCopy = deepCopy,
  lerp = lerp,
  config = config,
}
