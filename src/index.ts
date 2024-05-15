import { exec } from "child_process";
import fs from "fs";
import path from "path";
import process from "process";
import util from "util";

/**
 * The name of the tool; prefixes most output.
 */
export const BIN = "saladplate";

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

const replaceVar = (variable: string, filename: string, options: Options): string => {
  options.debug && console.debug(`${BIN}: ${filename}: evaluating ${variable} for replacement...`);
  return process.env[variable] ?? "";
};

const replaceFile = async (
  includeFilename: string,
  filename: string,
  options: Options,
): Promise<string> => {
  // Resolve the include filename relative to the current file; if the current file is stdin
  // then keep the current working directory.
  const cwd = cwdForFilename(filename);
  const include = path.join(cwd, includeFilename);
  options.debug && console.debug(`${BIN}: ${filename}: reading ${include} for replacement...`);
  const content = await fs.promises.readFile(include, { encoding: "utf-8" });
  return template(content, include, options);
};

const replaceExec = async (
  command: string,
  filename: string,
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
 * is assumed to have been read from the given `filename` (or stdin). Collapses newlines
 * at the end of the output so that there's just one.
 */
export const template = async (
  content: string,
  filename?: string,
  options?: Options,
): Promise<string> => {
  filename ??= "/dev/stdin";
  options ??= {};

  content = await replaceAsync(content, VAR_RE, (match) => {
    return replaceVar(match[1].trim(), filename, options);
  });
  content = await replaceAsync(content, FILE_RE, (match) => {
    return replaceFile(match[1].trim(), filename, options);
  });
  content = await replaceAsync(content, EXEC_RE, (match) => {
    return replaceExec(match[1].trim(), filename, options);
  });
  content = content.replace(/\n+$/m, "\n");
  return content;
};
