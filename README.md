# Bumpwise command line and MCP server

[![Bumpwise MCP server – quality and maintenance score on Glama](https://glama.ai/mcp/servers/gilware/bumpwise-npm/badges/score.svg)](https://glama.ai/mcp/servers/gilware/bumpwise-npm)

Bumpwise checks Java and Kotlin projects for breaking changes, from their compiled classes:

- **Before a dependency upgrade:** which places in your project (file and line) the new version breaks. Maven
  Central and Google Maven (AndroidX, Compose, Firebase), including BOMs such as `compose-bom`.
- **Before a library release:** whether the build breaks the last published version, and which version number the
  release needs.

This package is a small launcher: it downloads the Bumpwise command line once from gilware.com, checks its SHA-256,
and runs it. It needs Java 17 or later.

## As an MCP server for AI coding agents

```sh
claude mcp add bumpwise -- npx -y @gilware/bumpwise mcp
```

Other clients: run `npx -y @gilware/bumpwise mcp` as a stdio server. Tools: `check_api_compatibility` and
`check_dependency_upgrade`. Build the project first; Bumpwise reads the build output.

The [Bumpwise skills](https://github.com/gilware/bumpwise-skills) tell the agent when to use them (before a version
change, after an API change): `npx skills add gilware/bumpwise-skills`.

## In a terminal

```sh
npx @gilware/bumpwise upgrade com.google.guava:guava
npx @gilware/bumpwise upgrade --changed-since origin/main
npx @gilware/bumpwise check
```

Exit codes: 0 safe, 1 breaks, 2 could not tell. Full documentation: https://gilware.com/bumpwise/cli/

The launcher is MIT. The Bumpwise command line is free to use and not open source
(https://gilware.com/legal/eula/). Made by Gilware.

<!-- mcp-name: io.github.gilware/bumpwise -->
