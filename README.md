# Saladplate

_Simple templating; it's smaller than usual._

Saladplate is a very simple templating tool, with 3 features:

1. Replace `${{ VAR }}` with the contents of the environment variable `VAR`.
2. Replace `$<< filename >>` with the contents of the file `filename`.
3. Replace `$(( some command ))` with the output of the command `some command`.

If you need more functionality that that, this is not the templating tool for you.

## Installation

```bash
$ npm -g install saladplate
$ saladplate --version
saladplate: version 0.1.2
```

## Usage

The easiest way to use Saladplate with via the `saladplate` command line tool:

```bash
$ saladplate --help

Usage: saladplate [options] <file>...
Options:
  --debug          enable debug mode
  -v, --version    show version information
  -h, --help       show this help message
  -d, --directory  output directory
  -s, --suffix     output suffix; only applies when using --directory
  -o, --output     output file; overrides --directory and --suffix
```

Saladplate generally operates in 2 modes. If you pass `--directory`, then
each file you pass will be templated independently, and the output written
into the given directory. Use `--suffix` to change the extension of the output
file -- for instance, if you template the files `some.template` and `another.txt`
with `--directory=out` and `--suffix=.html` you will end up with a file `out/some.html`
and `out/another.html`:

```bash
$ saladplate --directory=out --suffix=.html *.template
```

If instead you pass `--output`, then each file will be templated, with the
results _concatenated_ into the single given output file.

```bash
$ saladplate --output=index.html *.template
```

You can also use the exported `template` function to template a string:

```typescript
import { template } from "saladplate";
console.info(template("The current PATH is: $PATH"));
```

## Development

When developing locally, you can test your changes using the _script_ `saladplate`,
which uses `ts-node`. Note the use of `run` below, as well as the use of `--` to
separate arguments to `npm run` from arguments to `saladplate`:

```bash
$ npm run saladplate -- --version

> saladplate@0.1.2 saladplate
> ts-node ./bin/saladplate.ts

saladplate: version 0.1.2
```

Tests are located in `tests/` and consist of input templates `tests/*.test` and
corresponding expected outputs `tests/*.expected`. To run tests:

```bash
$ npm run test
```
