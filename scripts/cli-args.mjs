export const ACTIVATE_USAGE =
  "Unrecognized argument. Valid flags: --dry-run, --disable, --origin <url>";
export const MIGRATE_USAGE = "Unrecognized argument. Valid flags: --check, --dry-run";
export const VERIFY_USAGE = "Unrecognized argument. Valid flags: none";

export function stripArgvSeparator(argv) {
  return [...argv].filter((arg) => arg !== "--");
}

export function parseKnownFlags(argv, { flags, valued, usage }) {
  const args = stripArgvSeparator(argv);
  const parsed = { flags: new Set(), values: {} };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg.startsWith("--") && arg.includes("=")) {
      const name = arg.slice(0, arg.indexOf("="));
      const value = arg.slice(arg.indexOf("=") + 1);
      if (!valued.has(name) || value === "") throw new Error(usage);
      parsed.values[name] = value;
      continue;
    }
    if (valued.has(arg)) {
      const value = args[index + 1];
      if (value === undefined || value.startsWith("-")) throw new Error(usage);
      parsed.values[arg] = value;
      index += 1;
      continue;
    }
    if (flags.has(arg)) {
      parsed.flags.add(arg);
      continue;
    }
    throw new Error(usage);
  }
  return parsed;
}
