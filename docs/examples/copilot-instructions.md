# GitHub Copilot Instructions

## General Coding Style

- Use TypeScript with strict mode enabled
- Prefer immutability: `const` over `let`, `readonly` arrays and objects where possible
- Avoid `any`; use `unknown` and narrow with type guards
- Use early returns to reduce nesting

## Naming Conventions

- Variables and functions: `camelCase`
- Types and interfaces: `PascalCase`
- Constants: `SCREAMING_SNAKE_CASE`
- Files: `kebab-case.ts`

## Error Handling

- Always handle promise rejections; never leave `.catch()` empty
- Use typed error classes for domain errors
- Surface errors to the user with friendly messages, not raw stack traces

## React Guidelines

- Use function components exclusively
- Extract reusable logic into custom hooks (`use` prefix)
- Keep components pure: no side effects in render
- Use `React.memo` only when you have measured a performance issue

## API & Data Fetching

- Use React Query (`@tanstack/react-query`) for all server state
- Define API response types in `src/types/api.ts`
- Use `zod` to validate responses at the network boundary

## Testing

- Prefer `describe` blocks to group related tests
- Test behavior, not implementation details
- Mock external services, not internal functions
- Aim for meaningful coverage, not 100% line coverage
