import { Args } from "../types.ts";
import { loadConfig } from "../utils/config.ts";
import { runCommand } from "../utils/shell.ts";
import { getGitHash } from "./dev.ts";

async function getAwsRegion(): Promise<string> {
  try {
    const result = await runCommand(["aws", "configure", "get", "region"], { quiet: true });
    return result.stdout.trim() || "us-east-1";
  } catch {
    return "us-east-1";
  }
}

async function getAwsAccountId(): Promise<string> {
  const result = await runCommand(["aws", "sts", "get-caller-identity", "--query", "Account", "--output", "text"], { quiet: true });
  return result.stdout.trim();
}

async function loginToEcr(region: string) {
  console.log("🔑 Logging into ECR...");
  const accountId = await getAwsAccountId();
  const ecrUrl = `${accountId}.dkr.ecr.${region}.amazonaws.com`;
  
  // Get ECR password
  const pwdResult = await runCommand([
    "aws", "ecr", "get-login-password",
    "--region", region
  ], { quiet: true });

  // Use password to login
  await runCommand([
    "docker", "login",
    "--username", "AWS",
    "--password-stdin",
    ecrUrl
  ], {
    input: pwdResult.stdout
  });
  
  console.log("✅ Successfully logged into ECR");
}

async function ensureRepository(region: string, repoName: string) {
  try {
    await runCommand([
      "aws", "ecr", "describe-repositories",
      "--repository-names", repoName,
      "--region", region
    ], { quiet: true });
  } catch {
    console.log(`📦 Creating ECR repository: ${repoName}`);
    await runCommand([
      "aws", "ecr", "create-repository",
      "--repository-name", repoName,
      "--region", region
    ]);
  }
}

async function tagAndPushImage(localImage: string, ecrUrl: string, tags: string[]) {
  for (const tag of tags) {
    const remoteTag = `${ecrUrl}:${tag}`;
    console.log(`🏷️  Tagging: ${localImage}:${tag} -> ${remoteTag}`);
    await runCommand(["docker", "tag", `${localImage}:${tag}`, remoteTag]);
    
    console.log(`⬆️  Pushing: ${remoteTag}`);
    await runCommand(["docker", "push", remoteTag]);
  }
}

function showHelp() {
  console.log(`
Usage: moby deploy <command> <project-name>

Commands:
  build         Build image for deployment
  push          Push image to ECR
  login         Login to ECR
  all           Build and push to ECR (recommended)

Options:
  --version     Specify version tag (defaults to git hash)
  --region      AWS region (defaults to AWS CLI config)
  --help        Show this help message

Examples:
  moby deploy all variant-be --version v1.0.0
  moby deploy build variant-be
  moby deploy push variant-be --version v1.0.0
  `);
}

export async function deploy(args: Args) {
  const subcommand = args._[1] as string;
  const projectName = args._[2] as string;

  if (!subcommand || !projectName || args.help) {
    showHelp();
    return;
  }

  try {
    const config = await loadConfig(projectName);
    const { path: projectPath, docker } = config;
    const imageName = docker.image_name || projectName;
    
    // Get version tag from args or git hash
    const version = args.version ? String(args.version) : await getGitHash(projectPath);
    if (!version) {
      throw new Error("No version specified and couldn't get git hash. Use --version to specify version.");
    }

    console.log(`🚀 Deploying version: ${version}`);

    // Get AWS region
    const region = args.region ? String(args.region) : await getAwsRegion();
    const accountId = await getAwsAccountId();
    const ecrUrl = `${accountId}.dkr.ecr.${region}.amazonaws.com/${imageName}`;

    switch (subcommand) {
      case "build":
        console.log("🏗️  Building deployment image...");
        await runCommand([
          "docker", "build",
          "-t", `${imageName}:${version}`,
          "-t", `${imageName}:latest`,
          "."
        ], { cwd: projectPath });
        console.log("✅ Build complete");
        break;

      case "login":
        await loginToEcr(region);
        break;

      case "push":
        await loginToEcr(region);
        await ensureRepository(region, imageName);
        await tagAndPushImage(imageName, ecrUrl, [version, "latest"]);
        console.log("✅ Push complete");
        break;

      case "all":
        // Build
        console.log("\n🏗️  Building deployment image...");
        await runCommand([
          "docker", "build",
          "-t", `${imageName}:${version}`,
          "-t", `${imageName}:latest`,
          "."
        ], { cwd: projectPath });
        console.log("✅ Build complete");

        // Push to ECR
        await loginToEcr(region);
        await ensureRepository(region, imageName);
        await tagAndPushImage(imageName, ecrUrl, [version, "latest"]);
        
        console.log("\n✨ Deployment complete!");
        console.log(`📦 Image: ${ecrUrl}:${version}`);
        break;

      default:
        console.error("❌ Unknown command:", subcommand);
        showHelp();
        Deno.exit(1);
    }
  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : String(error));
    Deno.exit(1);
  }
} 