# Create a Project

## Requirements

The published scaffold command runs through Deno, so install Deno first and
confirm it is available in your shell:

```sh
deno --version
```

Curio currently assumes a Deno `2.x` workflow. If the command is not available
yet, install Deno through the official guide:
[https://docs.deno.com/runtime/getting_started/installation/](https://docs.deno.com/runtime/getting_started/installation/)

## Scaffold

Use the published `@curio/init` package:

```sh
deno run -Ar jsr:@curio/init my-app
```

The target directory is required. During interactive runs, Curio also asks which
IDE you use:

- `VS Code`: adds `.vscode/settings.json`, `.vscode/extensions.json`, and a Deno
  workspace note in the generated README
- `Other`: skips editor-specific files

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

## First-Time Configuration

Before using the admin for the first time, run the interactive bootstrap
command:

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
