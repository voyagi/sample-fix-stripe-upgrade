// Claude Code PostToolUse hook, wired in .claude/settings.json.
//
// After Claude edits a code file, run the typecheck and the tests. Stay quiet
// when both pass. When one fails, print its output on stderr and exit 2: for a
// PostToolUse hook that is the exit code whose stderr Claude reads, so it sees
// the failure in the same turn and can fix it. Exit 0 output never reaches Claude.
import { spawnSync } from "node:child_process";

const CODE_FILE = /\.(ts|tsx|js|jsx|mjs|cjs|mts|cts)$/i;
const SKIPPED_DIRS = ["/node_modules/", "/.next/"];
const MAX_OUTPUT_LINES = 60;

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}

function lastLines(text, count) {
  return text.trimEnd().split(/\r?\n/).slice(-count).join("\n");
}

// Returns null when the command passes, or a message for Claude when it fails.
function runCheck(label, command, cwd) {
  const result = spawnSync(command, { cwd, shell: true, encoding: "utf8" });
  if (result.error) {
    return `${label} could not start (${command}): ${result.error.message}`;
  }
  if (result.status !== 0) {
    const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
    return `${label} failed (${command}, exit ${result.status}):\n${lastLines(output, MAX_OUTPUT_LINES)}`;
  }
  return null;
}

const raw = await readStdin();

let input;
try {
  input = JSON.parse(raw);
} catch (error) {
  process.stderr.write(`check-after-edit: the hook input was not valid JSON (${error.message}). No checks ran.\n`);
  process.exit(1);
}

// Claude Code sends absolute paths with the platform's own separators.
const filePath = String(input?.tool_input?.file_path ?? "").replaceAll("\\", "/");
const isCodeFile = CODE_FILE.test(filePath) && !SKIPPED_DIRS.some((dir) => filePath.includes(dir));
if (!isCodeFile) {
  process.exit(0);
}

const projectDir = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
const failures = [
  runCheck("Typecheck", "npm run typecheck --silent", projectDir),
  runCheck("Tests", "npm test --silent", projectDir),
].filter((message) => message !== null);

if (failures.length > 0) {
  process.stderr.write(`${failures.join("\n\n")}\n`);
  process.exit(2);
}
