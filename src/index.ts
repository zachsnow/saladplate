import { exec } from "child_process";
import fs from "fs";
import path from "path";
import process from "process";
import util from "util";

/**
 * The name of the tool; prefixes most output.
 */
export const BIN = "simplate";

/**
 * Templating options for `template`.
 */
export type Options = {
  debug?: boolean;
};

const cwdForFilename = (filename: string): string => {
  return filename === "/dev/stdin" ? process.cwd() : path.dirname(filename);
};

const VAR_RE = /\$\{\{([^\}]+)\}\}/g;
const FILE_RE = /\$\<\<([^\>]+)\>\>/g;
const EXEC_RE = /\$\(\(([^\)]+)\)\)/g;

async function replaceAsync(
  input: string,
  regexp: RegExp,
  fn: (match: RegExpMatchArray) => string | Promise<string>,
) {
  const replacements = await Promise.all(Array.from(input.matchAll(regexp), (match) => fn(match)));
  let i = 0;
  return input.replace(regexp, () => replacements[i++]);
}

const replaceVar = (filename: string, variable: string, options: Options): string => {
  options.debug && console.debug(`${BIN}: ${filename}: evaluating ${variable} for replacement...`);
  return process.env[variable] ?? "";
};

const replaceFile = async (
  filename: string,
  includeFilename: string,
  options: Options,
): Promise<string> => {
  // Resolve the include filename relative to the current file; if the current file is stdin
  // then keep the current working directory.
  const cwd = cwdForFilename(filename);
  const include = path.join(cwd, includeFilename);
  options.debug && console.debug(`${BIN}: ${filename}: reading ${include} for replacement...`);
  const content = await fs.promises.readFile(include, { encoding: "utf-8" });
  return template(include, content, options);
};

const replaceExec = async (
  filename: string,
  command: string,
  options: Options,
): Promise<string> => {
  // Execute the command in the working directory containing the file we are processing; if
  // the current file is stdin then keep the current working directory.
  const cwd = cwdForFilename(filename);
  options.debug && console.debug(`${BIN}: ${filename}: executing ${command} for replacement...`);
  const { stdout } = await util.promisify(exec)(command, {
    cwd,
  });
  return stdout;
};

/**
 * Replace variables, file includes, and command executions in the given `content`, which
 * is assumed to have been read from the given `filename`. Collapses newlines at the end of
 * the output so that there's just one.
 */
export const template = async (
  filename: string,
  content: string,
  options?: Options,
): Promise<string> => {
  options ??= {};

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
};
