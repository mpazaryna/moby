# Docker Setup for Variant Backend

## Overview

This document describes the process of containerizing the Variant backend server using Docker, including troubleshooting steps and important considerations for handling the mock API data files.

## Docker Configuration

### Dockerfile

```dockerfile
# Use a specific version of Deno for better reproducibility
FROM denoland/deno:2.0.5 as builder

# Set the working directory
WORKDIR /app

# Copy the entire application first
COPY . .

# Cache the dependencies
RUN deno cache --lock=deno.lock src/bin/server.ts

# Create a minimal production image
FROM denoland/deno:2.0.5

WORKDIR /app

# Copy the cached dependencies and source code from builder
COPY --from=builder /app .

# The port that your application listens to
EXPOSE 8000

# Set default PORT environment variable
ENV PORT=8000

# Run the server with necessary permissions
CMD ["deno", "run", "--allow-net", "--allow-read", "--allow-env", "src/bin/server.ts"]
```

### .dockerignore

```plaintext
.git
.gitignore
.DS_Store
.env
.env.*
!.env.example
.vscode
.cursor
node_modules
tmp/*
!tmp/.gitkeep
logs/*
!logs/.gitkeep
docs/
tests/
README.md
CHANGELOG.md
LICENSE
TODO.md
```

## Important Notes

1. **Cross-Platform Compatibility**: The Dockerfile is now platform-agnostic and will work on both ARM64 (Apple Silicon, AWS Graviton) and AMD64 (traditional x86_64) architectures. For local development on Apple Silicon machines, you can optionally add `--platform=linux/arm64` to the FROM commands if you want to ensure ARM-specific optimizations.

2. **Data Directory**: The `data` directory must NOT be included in `.dockerignore` as it contains essential mock API files needed by the server.

3. **Deno Permissions**: The server requires the following permissions:
   - `--allow-net`: For network access
   - `--allow-read`: For reading files (mock API data)
   - `--allow-env`: For environment variables (PORT)

## Building and Running

### Build the Docker Image

```bash
# Default build (uses host architecture)
docker build -t variant-be .

# Force specific architecture (if needed)
docker build --platform linux/amd64 -t variant-be .  # For x86_64/amd64
docker build --platform linux/arm64 -t variant-be .  # For ARM64
```

### Run the Container

```bash
# Run with default port (8000)
docker run -p 8000:8000 variant-be

# Run with a custom port
docker run -e PORT=3000 -p 3000:3000 variant-be
```

## Deployment

### AWS EC2 Deployment

When deploying to AWS EC2, consider the following:

1. **Instance Type Selection**:
   - For AMD64: Use regular EC2 instances (t2, t3, c5, etc.)
   - For ARM64: Use Graviton-based instances (t4g, c6g, etc.)

2. **Building for EC2**:
   - If using regular EC2 instances (AMD64), build with:
     ```bash
     docker build --platform linux/amd64 -t variant-be .
     ```
   - If using Graviton instances (ARM64), build with:
     ```bash
     docker build --platform linux/arm64 -t variant-be .
     ```

3. **Multi-Architecture Builds**:
   For supporting both architectures, you can use Docker buildx:
   ```bash
   # Set up buildx
   docker buildx create --use

   # Build for multiple platforms
   docker buildx build --platform linux/amd64,linux/arm64 -t your-registry/variant-be:latest .
   ```

## Troubleshooting

### Common Issues

1. **500 Internal Server Error when accessing `/mock` endpoint**
   - **Symptom**: Server fails to list available endpoints
   - **Cause**: Missing `data` directory in the container
   - **Solution**: Ensure `data/` is not listed in `.dockerignore`

2. **Platform Mismatch Warning**
   - **Symptom**: Warning about platform mismatch
   - **Solution**: Use `--platform` flag during build to match your target environment

### Verifying the Setup

1. Check if the container has the necessary files:
```bash
docker run -it variant-be ls -la /app/data/sample
```

2. Verify the server is running:
```bash
curl http://localhost:8000/mock
```

## Development vs Production

The current setup is suitable for both development and production environments. However, consider the following for production:

1. Use multi-stage builds to minimize image size
2. Implement proper logging configuration
3. Add health check endpoints
4. Configure appropriate CORS settings
5. Set up proper environment variable management
6. Consider using Docker Compose for managing multiple services
7. Implement proper monitoring and logging solutions

## Local Development Workflow

We provide a convenient development script at `scripts/docker-dev.sh` for managing the Docker development environment.

### Basic Commands

```bash
# Start the development container
./scripts/docker-dev.sh start

# Stop the container
./scripts/docker-dev.sh stop

# Rebuild and restart the container
./scripts/docker-dev.sh rebuild

# View container logs
./scripts/docker-dev.sh logs
./scripts/docker-dev.sh logs -f  # Follow logs

# Clean up all containers and images
./scripts/docker-dev.sh clean

# Start on a different port
./scripts/docker-dev.sh start -p 3000
```

### Development Features

1. **Hot Reload**: The development setup includes Deno's watch mode, automatically reloading when source files change.

2. **Environment Variables**: Easily configurable through the development script:
   - `PORT`: Server port (default: 8000)
   - `DENO_ENV`: Environment setting (default: development)

3. **Git Integration**: The development script automatically tags images with:
   - `latest`: Most recent build
   - `dev`: Development version
   - Current git commit hash

### Best Practices

1. **Daily Development**:
   ```bash
   # Start your day with
   ./scripts/docker-dev.sh start

   # End your day with
   ./scripts/docker-dev.sh stop
   ```

2. **After Dependency Changes**:
   ```bash
   ./scripts/docker-dev.sh rebuild
   ```

3. **Troubleshooting**:
   ```bash
   # Check logs
   ./scripts/docker-dev.sh logs -f
   
   # Clean and restart
   ./scripts/docker-dev.sh clean
   ./scripts/docker-dev.sh start
   ```

### Third-Party Tools

Consider these additional tools to enhance your Docker development workflow:

1. **Docker Desktop**: GUI for container management
2. **Lazydocker**: Terminal UI for Docker
3. **ctop**: Top-like interface for container metrics
4. **dive**: Tool for exploring Docker image layers

## Future Improvements

1. Implement container health checks
2. Optimize cache layers for faster builds
3. Add production-specific configurations
4. Set up automated multi-architecture builds in CI/CD pipeline
5. Add development convenience scripts ✅ 

## Amazon ECR Deployment

We provide a helper script at `scripts/ecr-helper.sh` for managing Docker images in Amazon ECR.

### Prerequisites

1. AWS CLI installed and configured with appropriate credentials
2. Docker installed and running
3. Permissions to create and manage ECR repositories

### Basic Usage

```bash
# Show help and available commands
./scripts/ecr-helper.sh --help

# Create ECR repository
./scripts/ecr-helper.sh create

# Login to ECR
./scripts/ecr-helper.sh login

# Build and push image with a tag
./scripts/ecr-helper.sh push -t v1.0.0

# Build for specific platform
./scripts/ecr-helper.sh push -t v1.0.0 -p amd64  # For x86_64
./scripts/ecr-helper.sh push -t v1.0.0 -p arm64  # For ARM64

# List available tags
./scripts/ecr-helper.sh list-tags

# Delete a specific tag
./scripts/ecr-helper.sh delete-tag -t v1.0.0
```

### Common Workflows

1. **Initial Setup**:
   ```bash
   # Create repository and push first version
   ./scripts/ecr-helper.sh create
   ./scripts/ecr-helper.sh push -t latest
   ```

2. **Release New Version**:
   ```bash
   # Push with version tag and update latest
   ./scripts/ecr-helper.sh push -t v1.0.0
   ./scripts/ecr-helper.sh push -t latest
   ```

3. **Multi-Architecture Build**:
   ```bash
   # Push for both AMD64 and ARM64
   ./scripts/ecr-helper.sh push -t v1.0.0 -p amd64
   ./scripts/ecr-helper.sh push -t v1.0.0 -p arm64
   ```

### Configuration

The script uses these default values which can be configured using a `.env.ecr` file:

1. **Create your configuration**:
   ```bash
   # Copy the example file
   cp .env.ecr.example .env.ecr
   
   # Edit with your settings
   nano .env.ecr
   ```

2. **Available Settings**:
   ```bash
   # AWS Configuration
   AWS_REGION=us-east-1        # Your preferred AWS region
   AWS_PROFILE=default         # AWS CLI profile to use
   
   # ECR Configuration
   ECR_REPOSITORY_NAME=variant-be
   ECR_DEFAULT_PLATFORM=       # Optional: Set to 'amd64' or 'arm64'
   
   # Optional: Override AWS account ID
   # AWS_ACCOUNT_ID=123456789012
   ```

The `.env.ecr` file is gitignored by default, allowing each developer to maintain their own configuration.

### Best Practices

1. **Versioning**:
   - Use semantic versioning for release tags (e.g., v1.0.0)
   - Always maintain a `latest` tag for the most recent stable version
   - Consider using git commit hashes for development builds

2. **Security**:
   - Enable image scanning in ECR (enabled by default in our script)
   - Regularly review and remove unused images
   - Use IAM roles with minimal required permissions

3. **Cost Management**:
   - Clean up old/unused images regularly
   - Consider implementing lifecycle policies
   - Monitor storage usage

### Troubleshooting

1. **Authentication Issues**:
   ```bash
   # Re-login to ECR
   ./scripts/ecr-helper.sh login
   ```

2. **Platform Mismatch**:
   - Ensure you're using the correct platform flag for your target environment
   - For EC2: Use `-p amd64` for regular instances, `-p arm64` for Graviton

3. **Push Failures**:
   - Check AWS credentials and permissions
   - Verify repository exists
   - Ensure sufficient disk space for builds ✅ 

### Deploying Specific Versions

To deploy a specific version from ECR:

```bash
# Login to ECR
./scripts/ecr-helper.sh login

# Pull the image (use either a specific version or latest)
docker pull 430417542477.dkr.ecr.us-east-1.amazonaws.com/variant-be:v0.10.0

# Run the container
docker run -p 8000:8000 430417542477.dkr.ecr.us-east-1.amazonaws.com/variant-be:v0.10.0

# To stop the container when you're done
docker stop $(docker ps -q --filter ancestor=430417542477.dkr.ecr.us-east-1.amazonaws.com/variant-be:v0.10.0)
```

Available versions can be checked using:
```bash
./scripts/ecr-helper.sh list-tags
```

The server will start and be available at `http://localhost:8000`. You can verify it's running by checking the `/mock` endpoint:
```bash
curl http://localhost:8000/mock
```

## Development Workflow

We provide several npm-style scripts to streamline development. These can be run using `deno task <command>`.

### Local Development

```bash
# Start development server with hot reload
deno task dev

# Start production server
deno task start

# Run tests
deno task test
```

### Docker Development

```bash
# Start Docker development environment
deno task docker:dev

# View logs
deno task docker:logs

# Stop Docker environment
deno task docker:stop

# Clean up Docker resources
deno task docker:clean
```

### ECR Deployment

```bash
# Login to ECR
deno task ecr:login

# Push image with specific tag
deno task ecr:push -t v1.0.0

# List available tags
deno task ecr:list
```

### Release Process

We use semantic versioning (MAJOR.MINOR.PATCH) for releases. The release process is automated using our release script.

```bash
# Create a patch release (0.0.X)
deno task release:patch

# Create a minor release (0.X.0)
deno task release:minor

# Create a major release (X.0.0)
deno task release:major
```

The release process:
1. Bumps the version number
2. Updates version in relevant files
3. Creates and pushes a git tag
4. Builds and pushes Docker image to ECR
5. Updates the `latest` tag

### Development Stages

1. **Local Development**
   - Use `deno task dev` for rapid development
   - Changes are immediately reflected
   - Full access to debugging tools

2. **Docker Testing**
   - Use `deno task docker:dev` to test in container
   - Verifies application works in production environment
   - Tests volume mounts and environment variables

3. **Release**
   - Use `deno task release:(patch|minor|major)` to create new version
   - Automatically handles versioning and deployment
   - Creates reproducible builds

4. **Deployment**
   - Pull specific version from ECR
   - Use version tags for production stability
   - Use `latest` tag for development/staging

### Best Practices

1. **Version Control**
   - Follow semantic versioning
   - Use descriptive commit messages
   - Tag all releases

2. **Docker Images**
   - Test locally before pushing
   - Use specific versions in production
   - Clean up unused images regularly

3. **Development Flow**
   - Start with local development
   - Test in Docker before release
   - Use staging environment before production

4. **Monitoring**
   - Check container logs regularly
   - Monitor resource usage
   - Set up alerts for container health

### Troubleshooting

1. **Local Development Issues**
   ```bash
   # Clear Deno cache
   deno cache --reload src/bin/server.ts
   ```

2. **Docker Issues**
   ```bash
   # Clean up Docker resources
   deno task docker:clean
   
   # Rebuild from scratch
   deno task docker:dev --no-cache
   ```

3. **ECR Issues**
   ```bash
   # Re-login to ECR
   deno task ecr:login
   
   # Check available tags
   deno task ecr:list
   ```

### Future Improvements

1. Implement container health checks ✅
2. Optimize cache layers for faster builds ✅
3. Add production-specific configurations
4. Set up automated multi-architecture builds in CI/CD pipeline
5. Add development convenience scripts ✅
6. Automated release process ✅ 