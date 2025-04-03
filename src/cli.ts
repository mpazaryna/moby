import { parse } from "std/flags/mod.ts";
import { dev } from "./commands/dev.ts";
import { deploy } from "./commands/deploy.ts";
import { version } from "./version.ts";

interface Args {
  _: string[];
  help?: boolean;
  version?: string;
  tag?: string;
  region?: string;
  port?: number;
  follow?: boolean;
}

const COMMANDS = {
  dev: "Manage development environment",
  deploy: "Deploy to ECR",
  version: "Show version information"
};

function showHelp() {
  console.log(`🐳 Moby - Docker Project Manager v${version}\n`);
  console.log("Usage: moby <command> [options]\n");
  console.log("Commands:");
  Object.entries(COMMANDS).forEach(([cmd, desc]) => {
    console.log(`  ${cmd.padEnd(10)} ${desc}`);
  });
}

async function main() {
  const args = parse(Deno.args, {
    string: ["version", "tag", "region", "port"],
    boolean: ["help", "follow"],
    alias: {
      h: "help",
      t: "tag",
      r: "region",
      p: "port",
      f: "follow"
    },
  }) as Args;

  // Convert port to number if provided
  if (args.port) {
    args.port = parseInt(args.port as string);
  }

  const command = args._[0] as string;

  if (args.help || !command) {
    showHelp();
    return;
  }

  try {
    switch (command) {
      case "version":
        console.log(`v${version}`);
        break;
      case "dev":
        await dev(args);
        break;
      case "deploy":
        await deploy(args);
        break;
      default:
        console.error(`Unknown command: ${command}`);
        showHelp();
        Deno.exit(1);
    }
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : String(error));
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main();
} 