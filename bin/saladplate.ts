#!/usr/bin/env ts-node
import fs from "fs";
import { FileHandle } from "fs/promises";
import path from "path";
import process from "process";
import util from "util";
import { BIN, Options, template } from "../src/index";

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

  const entries = Object.entries(parseArgsConfig.options);

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

const SALADPLATE_VERSION = "${{ SALADPLATE_VERSION }}";
function version() {
  let version = SALADPLATE_VERSION;
  if (version.startsWith("${{")) {
    version = process.env.npm_package_version ?? "";
  }
  console.info(`${BIN}: version ${version || "unknown"}`);
}

type CommandLineOptions = Options & {
  version?: boolean;
  help?: boolean;
  directory?: string;
  suffix?: string;
  output?: string;
};

const parseArgs = (): { options: CommandLineOptions; filenames: string[] } => {
  const { values: options, positionals: filenames } = util.parseArgs(parseArgsConfig);
  return { options, filenames };
};

type OutputFile = {
  file: FileHandle | string;
  filename: string;
};
let output: OutputFile | null = null;

async function outputForFilename(
  filename: string,
  options: CommandLineOptions,
): Promise<OutputFile> {
  if (output) {
    return output;
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

async function main(): Promise<number | undefined> {
  const { options, filenames } = parseArgs();

  if (options.debug) {
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

  await Promise.all(
    filenames.map(async (filename) => {
      if (filename === "--") {
        filename = "/dev/stdin";
      }

      options.debug && console.debug(`${BIN}: reading ${filename}...`);
      const content = await fs.promises.readFile(filename, {
        encoding: "utf-8",
      });
      options.debug && console.debug(`${BIN}: templating ${filename}...`);
      const output = await template(content, filename, options);

      const { file: outputFile, filename: outputFilename } = await outputForFilename(
        filename,
        options,
      );
      options.debug && console.debug(`${BIN}: writing ${outputFilename}...`);
      await fs.promises.writeFile(outputFile, output, {
        encoding: "utf-8",
      });
    }),
  );
}

main()
  .then((i) => {
    process.exit(i ?? 0);
  })
  .catch((e) => {
    console.error(`${BIN}: unhandled error:`, e);
    process.exit(-1);
  });
