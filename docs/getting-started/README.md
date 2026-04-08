# Getting Started

The fastest way to start with Curio is:

1. scaffold a new project with `@curio/init`
2. bring up the local database
3. start the server
4. extend the generated API and admin from there

## Recommended Path

- [Create a Project](create-a-project.md)
- [Build a First API](first-api.md)

## Mental Model

Curio is structured so that generated projects already reflect the intended
runtime shape:

- Oak handles HTTP transport
- Valibot handles schema-backed request and response validation
- Curio's DB layer owns models, repositories, and admin data access
- the admin is mounted inside the backend, not split into a separate frontend

The generated template is not a demo separate from the framework. It is the
canonical starting point produced by `@curio/init`.
