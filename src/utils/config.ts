import { parse as parseYaml } from "https://deno.land/std@0.210.0/yaml/mod.ts";
import { join, dirname } from "https://deno.land/std@0.210.0/path/mod.ts";
import { Config, ProjectConfig } from "../types.ts";

const DEFAULT_CONFIG: Config = {
  projects: {},
};

// Config is always in the moby project directory
const CONFIG_PATH = new URL("../../.moby.yaml", import.meta.url).pathname;

let currentConfig: Config | null = null;
let currentProject: string | null = null;

export function getCurrentProjectPath(): string {
  if (!currentConfig || !currentProject) {
    throw new Error("No project selected. Run loadConfig(projectName) first.");
  }
  return currentConfig.projects[currentProject].path;
}

export async function loadConfig(projectName?: string): Promise<ProjectConfig> {
  try {
    // Load config if not already loaded
    if (!currentConfig) {
      const configFile = await Deno.readTextFile(CONFIG_PATH);
      currentConfig = parseYaml(configFile) as Config;
    }

    if (!projectName) {
      throw new Error("Project name is required");
    }

    // Get project config
    const projectConfig = currentConfig.projects[projectName];
    if (!projectConfig) {
      throw new Error(`Project ${projectName} not found in .moby.yaml`);
    }

    // Store current project
    currentProject = projectName;
    
    return projectConfig;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      throw new Error("Configuration file .moby.yaml not found in moby project directory");
    }
    throw error;
  }
}

export async function loadEcrConfig(): Promise<Record<string, string>> {
  try {
    if (!currentConfig || !currentProject) {
      throw new Error("No project selected. Run loadConfig(projectName) first.");
    }

    const projectPath = currentConfig.projects[currentProject].path;
    const envPath = join(projectPath, ".env.ecr");
    const envFile = await Deno.readTextFile(envPath);
    const config: Record<string, string> = {};
    
    envFile.split("\n").forEach(line => {
      line = line.trim();
      if (line && !line.startsWith("#")) {
        const [key, value] = line.split("=").map(s => s.trim());
        if (key && value) {
          config[key] = value;
        }
      }
    });

    return config;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      console.warn("No .env.ecr found");
      return {};
    }
    throw error;
  }
} 