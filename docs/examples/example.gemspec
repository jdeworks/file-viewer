Gem::Specification.new do |spec|
  spec.name          = "my-gem"
  spec.version       = "1.4.2"
  spec.authors       = ["Alice Dev", "Bob Hacker"]
  spec.email         = ["alice@example.com", "bob@example.com"]
  spec.summary       = "A handy utility gem for everyday tasks"
  spec.description   = "Provides a collection of helpers for string manipulation, file processing, and HTTP requests."
  spec.homepage      = "https://github.com/example/my-gem"
  spec.license       = "MIT"

  spec.required_ruby_version = ">= 2.7.0"

  spec.files         = Dir["lib/**/*.rb", "README.md", "LICENSE"]
  spec.require_paths = ["lib"]

  spec.add_dependency "activesupport", ">= 6.0"
  spec.add_dependency "faraday", "~> 2.0"
  spec.add_dependency "oj", ">= 3.10"

  spec.add_development_dependency "rspec", "~> 3.12"
  spec.add_development_dependency "rubocop", "~> 1.50"
  spec.add_development_dependency "simplecov", ">= 0.21"
end
