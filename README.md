# Simplate

_Simple templating._

Simplate is a very simple templating tool, with 3 features:

1. Replace `${{ VAR }}` with the contents of the environment variable `VAR`.
2. Replace `$<< filename >>` with the contents of the file `filename`.
3. Replace `$(( some command ))` with the output of the command `some command`.

If you need more functionality that that, this is not the templating tool for you.

## Installation

```bash
$ npm -g install https://github.com/zachsnow/simplate
$ simplate --version
simplate: version 0.0.1
```

## Usage

Currently the only way to use Simplate with via the `simplate` command line tool:

```bash
$ simplate --help

Usage: simplate [options] <file>...
Options:
  --debug          enable debug mode
  -v, --version    show version information
  -h, --help       show this help message
  -d, --directory  output directory
  -s, --suffix     output suffix; only applies when using --directory
  -o, --output     output file; overrides --directory and --suffix
```

Simplate generally operates in 2 modes. If you pass `--directory`, then
each file you pass will be templated independently, and the output written
into the given directory. Use `--suffix` to change the extension of the output
file -- for instance, if you template the files `some.template` and `another.txt`
with `--directory=out` and `--suffix=.html` you will end up with a file `out/some.html`
and `out/another.html`:

```bash
$ simplate --directory=out --suffix=.html *.template
```

If instead you pass `--output`, then each file will be templated, with the
results _concatenated_ into the single given output file.

```bash
$ simplate --output=index.html *.template
```
