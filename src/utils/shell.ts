export interface CommandResult {
  stdout: string;
  stderr: string;
  code: number;
}

export interface CommandOptions {
  cwd?: string;
  quiet?: boolean;
  input?: string;
}

export async function runCommand(args: string[], options: CommandOptions = {}): Promise<CommandResult> {
  const cmd = new Deno.Command(args[0], {
    args: args.slice(1),
    stdout: "piped",
    stderr: "piped",
    cwd: options.cwd,
    stdin: options.input ? "piped" : undefined,
  });

  let process;
  if (options.input) {
    const encoder = new TextEncoder();
    process = cmd.spawn();
    const writer = process.stdin.getWriter();
    await writer.write(encoder.encode(options.input));
    await writer.close();
    const output = await process.output();
    process = { ...output, success: output.code === 0 };
  } else {
    process = await cmd.output();
  }
  
  const result = {
    stdout: new TextDecoder().decode(process.stdout),
    stderr: new TextDecoder().decode(process.stderr),
    code: process.code,
  };

  if (!options.quiet) {
    if (result.stdout) console.log(result.stdout);
    if (result.stderr) console.error(result.stderr);
  }

  if (result.code !== 0) {
    throw new Error(`Command failed with code ${result.code}: ${result.stderr}`);
  }

  return result;
} 