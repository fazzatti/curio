# Create a Project

## Scaffold

Use the published init package:

```sh
deno run -Ar jsr:@curio/init my-app
```

Local workspace equivalent:

```sh
deno task init -- my-app
```

## Initialize the Generated App

Inside the generated project:

```sh
cp .env.example .env
deno task db:up
deno task start
```

Development mode:

```sh
deno task dev
```

Static validation:

```sh
deno task check
```

## Bootstrap the First Superadmin

The default template includes an interactive bootstrap command:

```sh
deno task admin:create
```

That command:

- prepares the DB schema if needed
- seeds built-in admin roles and permissions
- creates the first `superadmin`
- refuses to create a second `superadmin`

## What You Get

The default template ships with:

- `GET /health`
- `GET /users`
- `GET /admin/login`
- `GET /admin`

And an opinionated admin setup with:

- server-rendered admin pages
- DB-backed cookie sessions
- explicit RBAC
- read-only audit and sessions resources
- editable users, roles, and permissions resources

## Where To Go Next

- [Build a First API](first-api.md)
- [Init](../init/README.md)
- [Admin](../core/admin.md)
