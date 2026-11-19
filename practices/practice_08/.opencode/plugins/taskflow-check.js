// TaskFlow auto-check hook (opencode plugin).
//
// After the agent edits a source/test file, this runs `npm test` and appends the
// result to the tool output the model sees — so every edit is verified in the same
// turn, without the agent having to remember to run the tests itself.
//
// Contract:
//   - only reacts to file-editing tools, and only for watched paths (src/, public/,
//     test/, mcp/, scripts/, server.js) -> no noise for docs/README edits.
//   - never throws: a failing test must not abort the edit, only be surfaced.
export const TaskFlowCheck = async ({ $, directory, worktree }) => {
  const EDIT_TOOLS = new Set(["edit", "write", "apply_patch", "patch"]);
  const WATCH = /(^|\/)(src|public|test|mcp|scripts)\/|(^|\/)server\.js$/;
  const root = directory || worktree;

  const touched = (tool, args) => {
    if (tool === "apply_patch") {
      const text = String(args?.patchText ?? "");
      const out = [];
      for (const m of text.matchAll(/^\*\*\* (?:Add|Update|Delete|Move) File: (.+)$/gm)) {
        out.push(m[1].trim());
      }
      if (args?.filePath) out.push(String(args.filePath));
      return out;
    }
    const p = args?.filePath || args?.path;
    return p ? [String(p)] : [];
  };

  return {
    "tool.execute.after": async (input, output) => {
      if (!EDIT_TOOLS.has(input.tool)) return;
      if (!touched(input.tool, input.args).some((p) => WATCH.test(p))) return;

      let res;
      try {
        res = await $`npm test`.cwd(root).quiet().nothrow();
      } catch {
        return; // shell unavailable — stay silent, never block the edit
      }

      const text = `${res.stdout?.toString() ?? ""}\n${res.stderr?.toString() ?? ""}`;
      const num = (name) => new RegExp(`(?:^|\\s)${name} (\\d+)`, "m").exec(text)?.[1] ?? "?";
      const summary =
        res.exitCode === 0
          ? `[taskflow-check] npm test: PASS (${num("pass")} passed, 0 failed)`
          : `[taskflow-check] npm test: FAIL (exit ${res.exitCode}, ${num("fail")} failed)\n` +
            text.split("\n").filter(Boolean).slice(-10).join("\n");

      output.output = `${output.output}\n\n${summary}`;
      console.error(summary);
    },
  };
};
