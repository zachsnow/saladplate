#! /usr/bin/env ts-node
import { exec } from "child_process";
import fs from "fs";
import { FileHandle } from "fs/promises";
import path from "path";
import process from "process";
import util from "util";

const BIN = "simplate";

let debug = false;

const parseArgsConfig = {
  // Exclude the first two arguments: node and the script itself.
  args: process.argv.slice(2),
  options: {
    debug: {
      type: "boolean",
      default: false,
      description: "enable debug mode",
    },
    version: {
      type: "boolean",
      default: false,
      short: "v",
      description: "show version information",
    },
    help: {
      type: "boolean",
      default: false,
      short: "h",
      description: "show this help message",
    },
    directory: {
      type: "string",
      short: "d",
      description: "output directory",
    },
    suffix: {
      type: "string",
      short: "s",
      description: "output suffix; only applies when using --directory",
    },
    output: {
      type: "string",
      short: "o",
      description: "output file; overrides --directory and --suffix",
    },
  },
  allowPositionals: true,
} as const;

function help() {
  console.info(`Usage: ${BIN} [options] <file>...`);
  console.info(`Options:`);

  const entries = Object.entries(parseArgsConfig.options)

  const prefixes: Record<string, string> = {};
  entries.forEach(([name, option]) => {
    const short = "short" in option ? `-${option.short}, ` : "";
    const prefix = `  ${short}--${name}`;
    prefixes[name] = prefix;
  });

  const len = Math.max(...entries.map(([name, option]) => prefixes[name].length)) + 2;

  entries.forEach(([name, option]) => {
    const prefix = prefixes[name];
    console.info(`${prefix}${" ".repeat(len - prefix.length)}${option.description ?? ""}`);
  });
  console.info("");
}

function version() {
  const version = process.env.npm_package_version;
  console.info(`${BIN}: version ${version ?? "unknown"}`);
}

type OutputFile = {
  file: FileHandle | string,
  filename: string,
};
let output: OutputFile | null = null;

async function outputForFilename(filename: string, options: Options): Promise<OutputFile> {
  if (output) {
    return output
  }

  if (options.output) {
    output = {
      file: await fs.promises.open(options.output, "w"),
      filename: options.output,
    };
    return output;
  }

  if (options.directory) {
    const basename = path.basename(filename);
    let outputFilename = path.join(options.directory, basename);
    if (options.suffix) {
      outputFilename = outputFilename.replace(/\.[^.]+$/, options.suffix);
    }
    return {
      file: outputFilename,
      filename: outputFilename,
    };
  }

  output = {
    file: await fs.promises.open("/dev/stdout", "w"),
    filename: "/dev/stdout",
  };
  return output;
}

const VAR_RE = /\$\{\{([^\}]+)\}\}/g;
const FILE_RE = /\$\<\<([^\>]+)\>\>/g;
const EXEC_RE = /\$\(\(([^\)]+)\)\)/g;

async function replaceAsync(input: string, regexp: RegExp, fn: (match: RegExpMatchArray) => string | Promise<string>) {
  const replacements = await Promise.all(Array.from(input.matchAll(regexp), (match) => fn(match)));
  let i = 0;
  return input.replace(regexp, () => replacements[i++]);
};

const replaceVar = (filename: string, variable: string, options: Options): string => {
  debug && console.debug(`${BIN}: ${filename}: evaluating ${variable} for replacement...`);
  return process.env[variable] ?? "";
};

const replaceFile = async (filename: string, includeFilename: string, options: Options): Promise<string> => {
  const dir = path.dirname(filename);
  const include = path.join(dir, includeFilename);
  debug && console.debug(`${BIN}: ${filename}: reading ${include} for replacement...`);
  const content = await fs.promises.readFile(include, { encoding: "utf-8" });
  return template(include, content, options);
};

const replaceExec = async (filename: string, command: string, options: Options): Promise<string> => {
  debug && console.debug(`${BIN}: ${filename}: executing ${command} for replacement...`);
  const { stdout } = await util.promisify(exec)(command);
  return stdout;
};

async function template(filename: string, content: string, options: Options): Promise<string> {
  content = await replaceAsync(content, VAR_RE, (match) => {
    return replaceVar(filename, match[1].trim(), options);
  });
  content = await replaceAsync(content, FILE_RE, (match) => {
    return replaceFile(filename, match[1].trim(), options);
  });
  content = await replaceAsync(content, EXEC_RE, (match) => {
    return replaceExec(filename, match[1].trim(), options);
  });
  content = content.replace(/\n+$/m, "\n");
  return content;
}

type Options = ReturnType<typeof parseArgs>["options"];

const parseArgs = () => {
  const { values: options, positionals: filenames } = util.parseArgs(parseArgsConfig);
  return { options, filenames };
};

async function main(): Promise<number | undefined> {
  const { options, filenames } = parseArgs();

  debug = options.debug ?? false;
  if (debug) {
    console.debug(`${BIN}: debug mode enabled`);
  }

  if (options.help) {
    help();
    return;
  }

  if (options.version) {
    version();
    return;
  }

  if (filenames.length === 0) {
    console.error(`${BIN}: no input files; use -- for stdin`);
    help();
    return -1;
  }

  await Promise.all(filenames.map(async (filename) => {
    if (filename === "--") {
      filename = "/dev/stdin";
    }

    debug && console.debug(`${BIN}: reading ${filename}...`);
    const content = await fs.promises.readFile(filename, { encoding: "utf-8" });
    debug && console.debug(`${BIN}: templating ${filename}...`);
    const output = await template(filename, content, options);

    const { file: outputFile, filename: outputFilename } = await outputForFilename(filename, options);
    debug && console.debug(`${BIN}: writing ${outputFilename}...`);
    await fs.promises.writeFile(outputFile, output, {
      encoding: "utf-8",
    });
  }));

  console.info(`${BIN}: done`);
}

main()
  .then((i) => {
    process.exit(i ?? 0);
  })
  .catch((e) => {
    console.error(`${BIN}: unhandled error:`, e);
    process.exit(-1);
  });
