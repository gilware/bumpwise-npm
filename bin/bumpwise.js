#!/usr/bin/env node
// Launcher for the Bumpwise command line (https://gilware.com/bumpwise/cli/). Downloads the published jar once,
// checks its SHA-256, and runs it with Java 17 or later. As an MCP server (`bumpwise mcp`) stdout belongs to the
// protocol, so this launcher only ever writes to stderr.
"use strict";
const { spawn, spawnSync } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const https = require("node:https");
const os = require("node:os");
const path = require("node:path");

const VERSION = "1.1.4";
const SHA256 = "2b3459aa44312ccb0944c25a7dee563600722b0589a25bfc0182ea577fe26877";
const URL = `https://gilware.com/bumpwise/cli/bumpwise-${VERSION}.jar`;

function fail(message) {
  process.stderr.write(`bumpwise: ${message}\n`);
  process.exit(2);
}

function cacheDir() {
  if (process.env.BUMPWISE_HOME) return process.env.BUMPWISE_HOME;
  if (process.platform === "win32") return path.join(process.env.LOCALAPPDATA || os.homedir(), "bumpwise");
  return path.join(process.env.XDG_CACHE_HOME || path.join(os.homedir(), ".cache"), "bumpwise");
}

function javaCommand() {
  const exe = process.platform === "win32" ? "java.exe" : "java";
  if (process.env.JAVA_HOME) {
    const candidate = path.join(process.env.JAVA_HOME, "bin", exe);
    if (fs.existsSync(candidate)) return candidate;
  }
  return "java";
}

function checkJava(java) {
  const result = spawnSync(java, ["-version"], { encoding: "utf8" });
  if (result.error) fail("Java was not found. Bumpwise needs Java 17 or later: install one (for example from https://adoptium.net) or set JAVA_HOME.");
  const match = /version "(\d+)(?:\.(\d+))?/.exec(`${result.stderr}${result.stdout}`);
  const major = match ? (match[1] === "1" ? Number(match[2]) : Number(match[1])) : 0;
  if (major < 17) fail(`Bumpwise needs Java 17 or later, and '${java}' is ${match ? match[0].slice(9) : "an unknown version"}.`);
}

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function download(url, file, redirects = 0) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, { headers: { "User-Agent": `bumpwise-npm/${VERSION}` } }, (response) => {
      if ([301, 302, 303, 307, 308].includes(response.statusCode) && response.headers.location && redirects < 5) {
        response.resume();
        resolve(download(new globalThis.URL(response.headers.location, url).toString(), file, redirects + 1));
        return;
      }
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`HTTP ${response.statusCode} from ${url}`));
        return;
      }
      const out = fs.createWriteStream(file);
      response.pipe(out);
      out.on("finish", () => out.close(resolve));
      out.on("error", reject);
    });
    request.on("error", reject);
  });
}

async function jar() {
  const dir = cacheDir();
  const file = path.join(dir, `bumpwise-${VERSION}.jar`);
  if (fs.existsSync(file) && sha256(file) === SHA256) return file;
  fs.mkdirSync(dir, { recursive: true });
  const part = `${file}.${process.pid}.part`;
  process.stderr.write(`bumpwise: downloading the command line ${VERSION} (once)...\n`);
  for (let attempt = 1; ; attempt++) {
    try {
      await download(URL, part);
      break;
    } catch (e) {
      fs.rmSync(part, { force: true });
      if (attempt >= 3) fail(`the download from ${URL} failed (${e.message}). Check the internet connection and try again.`);
      process.stderr.write(`bumpwise: download failed (${e.message}), trying again...\n`);
    }
  }
  if (sha256(part) !== SHA256) {
    fs.rmSync(part, { force: true });
    fail("the downloaded file is not the published one (SHA-256 mismatch). Nothing was changed; try again later.");
  }
  fs.renameSync(part, file);
  return file;
}

(async () => {
  const java = javaCommand();
  checkJava(java);
  const file = await jar();
  const child = spawn(java, ["-jar", file, ...process.argv.slice(2)], { stdio: "inherit" });
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
  child.on("exit", (code, signal) => (signal ? process.kill(process.pid, signal) : process.exit(code ?? 2)));
  child.on("error", (e) => fail(e.message));
})();
