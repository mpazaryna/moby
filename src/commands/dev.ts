import { Args } from "../types.ts";
import { loadConfig } from "../utils/config.ts";
import { runCommand } from "../utils/shell.ts";

export async function getGitHash(projectPath: string): Promise<string> {
  try {
    const result = await runCommand(["git", "rev-parse", "--short", "HEAD"], { 
      quiet: true,
      cwd: projectPath 
    });
    return result.stdout.trim();
  } catch {
    return "dev";
  }
}

function showHelp() {
  console.log(`
Usage: moby dev <command> <project-name>

Commands:
  start     - Build and start the development container
  stop      - Stop and remove the development container
  restart   - Restart the development container
  rebuild   - Rebuild the image and restart the container
  logs      - Show container logs (with optional follow)
  clean     - Remove all development containers and images
  ps        - List all Docker containers
  prune     - Remove all stopped containers

Options:
  --port    - Specify port (default: from moby.yaml)
  --follow  - Follow logs (only with logs command)
  --help    - Show this help message

Examples:
  moby dev start variant-be
  moby dev logs variant-be --follow
  moby dev rebuild variant-be --port 3000
  moby dev ps
  moby dev prune
  `);
}

async function buildImage(config: any, gitHash: string) {
  console.log("🏗️ Building Docker image...");
  await runCommand([
    "docker", "build",
    "-t", `${config.docker.image_name}:latest`,
    "-t", `${config.docker.image_name}:dev`,
    "-t", `${config.docker.image_name}:${gitHash}`,
    "."
  ], { cwd: config.path });
}

async function startContainer(config: any, port: number) {
  console.log(`🚀 Starting container on port ${port}...`);
  await runCommand([
    "docker", "run", "-d",
    "--name", config.docker.container_name,
    "-p", `${port}:${port}`,
    "-e", `PORT=${port}`,
    `${config.docker.image_name}:dev`
  ]);
}

async function stopContainer(config: any) {
  console.log("🛑 Stopping container...");
  try {
    await runCommand(["docker", "stop", config.docker.container_name]);
  } catch {
    // Container might not exist
  }
  try {
    await runCommand(["docker", "rm", config.docker.container_name]);
  } catch {
    // Container might not exist
  }
}

async function listContainers(projectName?: string) {
  console.log("📦 Listing Docker containers...\n");
  
  // Base command
  const cmd = ["docker", "ps", "-a"];
  
  // Add filter if project name is provided
  if (projectName) {
    const config = await loadConfig(projectName);
    cmd.push("--filter", `name=${config.docker.container_name}`);
  }
  
  // Add format
  cmd.push("--format", "table {{.ID}}\t{{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.Image}}");
  
  await runCommand(cmd);
}

async function pruneContainers() {
  console.log("🧹 Removing all stopped containers...");
  await runCommand(["docker", "container", "prune", "-f"]);
  console.log("✅ All stopped containers removed!");
}

export async function dev(args: Args) {
  const subcommand = args._[1] as string;
  const projectName = args._[2] as string;

  if (!subcommand || args.help) {
    showHelp();
    return;
  }

  // Special cases for commands that don't need project name
  if (subcommand === "ps") {
    await listContainers(projectName);
    return;
  }

  if (subcommand === "prune") {
    await pruneContainers();
    return;
  }

  if (!projectName) {
    console.error("Error: Project name is required for this command");
    showHelp();
    return;
  }

  const config = await loadConfig(projectName);
  const port = args.port || config.docker.ports[0];
  const gitHash = await getGitHash(config.path);

  try {
    switch (subcommand) {
      case "start": {
        const containerExists = await runCommand([
          "docker", "ps", "-a",
          "--filter", `name=${config.docker.container_name}`,
          "--format", "{{.Names}}"
        ], { quiet: true });

        if (containerExists.stdout.trim()) {
          console.error("Container already exists. Use 'restart' or 'rebuild' instead.");
          Deno.exit(1);
        }

        await buildImage(config, gitHash);
        await startContainer(config, port);
        console.log(`✅ Container started! Available at http://localhost:${port}`);
        break;
      }

      case "stop": {
        await stopContainer(config);
        console.log("✅ Container stopped and removed.");
        break;
      }

      case "restart": {
        await stopContainer(config);
        await startContainer(config, port);
        console.log(`✅ Container restarted! Available at http://localhost:${port}`);
        break;
      }

      case "rebuild": {
        await stopContainer(config);
        await buildImage(config, gitHash);
        await startContainer(config, port);
        console.log(`✅ Container rebuilt and started! Available at http://localhost:${port}`);
        break;
      }

      case "logs": {
        const follow = args.follow ? "-f" : "";
        const cmd = ["docker", "logs"];
        if (follow) cmd.push(follow);
        cmd.push(config.docker.container_name);
        await runCommand(cmd);
        break;
      }

      case "clean": {
        console.log("🧹 Cleaning up Docker resources...");
        await stopContainer(config);
        try {
          await runCommand([
            "docker", "rmi",
            `${config.docker.image_name}:latest`,
            `${config.docker.image_name}:dev`,
            `${config.docker.image_name}:${gitHash}`
          ]);
        } catch {
          // Images might not exist
        }
        console.log("✅ Cleanup complete!");
        break;
      }

      default:
        console.error(`Unknown command: ${subcommand}`);
        showHelp();
        Deno.exit(1);
    }
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : String(error));
    Deno.exit(1);
  }
} 