export interface Args {
  _: string[];
  [key: string]: any;
  help?: boolean;
  version?: string;
  tag?: string;
  region?: string;
  port?: number;
  follow?: boolean;
}

export interface DockerConfig {
  ports: number[];
  container_name?: string;
  image_name?: string;
  health_check?: string;
}

export interface ProjectConfig {
  path: string;
  docker: DockerConfig;
}

export interface AwsConfig {
  region?: string;
  repository?: string;
  platforms?: string[];
}

export interface Config {
  projects: {
    [name: string]: ProjectConfig;
  };
}

export interface GlobalConfig {
  projects: {
    [name: string]: string;  // project name -> project path
  };
} 