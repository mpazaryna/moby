# 🐳 Moby - Docker Project Manager

Moby is a Docker project manager that helps you manage Docker containers and deployments through a simple command-line interface. It uses a YAML configuration file (`moby.yaml`) to define project-specific settings.

## Quick Start

1. Create a `moby.yaml` file in your project root:

```yaml
projects:
  my-project:
    path: /path/to/your/project
    docker:
      ports: [8000]
      container_name: my-project-server
      image_name: my-project
      health_check: "/health"
    aws:
      region: us-east-1
      repository: my-project
      platforms: [amd64]
```

2. Use Moby commands to manage your containers:

```bash
# Start development container
moby dev start my-project

# Deploy to ECR
moby deploy all my-project --version v1.0.0
```

## Command Reference

| Command                       | Description                                  | Example                            |
|-------------------------------|----------------------------------------------|------------------------------------|
| `dev start <project>`         | Start development container                  | `moby dev start my-project`        |
| `dev stop <project>`          | Stop and remove container                    | `moby dev stop my-project`         |
| `dev restart <project>`       | Restart container                            | `moby dev restart my-project`      |
| `dev rebuild <project>`       | Rebuild and restart container                | `moby dev rebuild my-project`      |
| `dev logs <project>`          | Show container logs                          | `moby dev logs my-project`         |
| `dev logs <project> --follow` | Follow container logs                        | `moby dev logs my-project --follow`|
| `dev clean <project>`         | Remove project containers and images         | `moby dev clean my-project`        |
| `dev ps`                      | List all containers                          | `moby dev ps`                      |
| `dev ps <project>`            | List project containers                      | `moby dev ps my-project`           |
| `dev prune`                   | Remove all stopped containers                | `moby dev prune`                   |
| `deploy all <project>`        | Build and push to ECR                        | `moby deploy all my-project`       |
| `deploy build <project>`      | Build image only                             | `moby deploy build my-project`     |
| `deploy push <project>`       | Push to ECR only                             | `moby deploy push my-project`      |
| `deploy login <project>`      | Login to ECR                                 | `moby deploy login my-project`     |

## Development Commands

### Container Management

- **Start Container**

  ```bash
  moby dev start <project> [--port <port>]
  ```

  Starts a development container for the specified project. Optionally specify a custom port.

- **Stop Container**

  ```bash
  moby dev stop <project>
  ```

  Stops and removes the project's container.

- **Restart Container**

  ```bash
  moby dev restart <project> [--port <port>]
  ```

  Restarts the project's container. Optionally specify a custom port.

- **Rebuild Container**

  ```bash
  moby dev rebuild <project> [--port <port>]
  ```

  Rebuilds the image and restarts the container. Optionally specify a custom port.

### Logs and Monitoring

- **View Logs**

  ```bash
  moby dev logs <project> [--follow]
  ```

  Shows container logs. Use `--follow` to stream logs in real-time.

- **List Containers**

  ```bash
  moby dev ps [<project>]
  ```

  Lists all containers or filters by project name.

### Cleanup

- **Clean Project**

  ```bash
  moby dev clean <project>
  ```

  Removes all containers and images for the specified project.

- **Prune Containers**

  ```bash
  moby dev prune
  ```

  Removes all stopped containers.

## Deployment Commands

### ECR Deployment

- **Full Deployment**

  ```bash
  moby deploy all <project> [--version <version>]
  ```

  Builds and pushes the image to ECR. Optionally specify a version tag.

- **Build Only**

  ```bash
  moby deploy build <project>
  ```

  Builds the Docker image without pushing.

- **Push Only**

  ```bash
  moby deploy push <project> [--version <version>]
  ```

  Pushes an existing image to ECR. Optionally specify a version tag.

- **ECR Login**

  ```bash
  moby deploy login <project>
  ```

  Logs into AWS ECR for the specified project.

## Configuration

The `moby.yaml` file defines project-specific settings:

```yaml
projects:
  my-project:
    path: /path/to/your/project
    docker:
      ports: [8000]              # Container ports
      container_name: my-server  # Container name
      image_name: my-project     # Image name
      health_check: "/health"    # Health check endpoint
    aws:
      region: us-east-1         # AWS region
      repository: my-project    # ECR repository
      platforms: [amd64]        # Target platforms
```

## Requirements

- Docker
- Deno
- AWS CLI (for ECR deployment)

## License

MIT
