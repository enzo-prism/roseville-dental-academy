#!/usr/bin/env python3
"""Apply September 12 DA-full copy updates onto origin/main file versions."""
from __future__ import annotations

import pathlib
import subprocess
import sys

ROOT = pathlib.Path(".")

SITE = [
    (
        "Saturday Academy, the Saturday class option, starts September 12, 2026.",
        "Saturday Academy, the Saturday class option, starts September 12, 2026 (full). The next available Dental Assisting start is October 12, 2026.",
    ),
    (
        "September 12, 2026 (Saturday Academy), October 12, 2026",
        "September 12, 2026 (Saturday Academy) (full), October 12, 2026",
    ),
    (
        "The June 19, July 13, and September 4, 2026 starts are full; the next available start is September 12, 2026 (Saturday Academy).",
        "The June 19, July 13, September 4, and September 12, 2026 (Saturday Academy) starts are full; the next available start is October 12, 2026.",
    ),
    (
        "Dental Assisting Training Course: June 19, July 13, and September 4, 2026 are full; next available start is September 12, 2026 (Saturday Academy)",
        "Dental Assisting Training Course: June 19, July 13, September 4, and September 12, 2026 (Saturday Academy) are full; next available start is October 12, 2026",
    ),
    (
        "June 19, July 13, and September 4, 2026 are full. Next available starts: September 12 (Saturday Academy), October 12, and November 20, 2026.",
        "June 19, July 13, September 4, and September 12, 2026 (Saturday Academy) are full. Next available starts: October 12 and November 20, 2026.",
    ),
    (
        "The June 19, July 13, and September 4, 2026 starts are full. The next available starts are September 12 (Saturday Academy), October 12, and November 20, 2026.",
        "The June 19, July 13, September 4, and September 12, 2026 (Saturday Academy) starts are full. The next available starts are October 12 and November 20, 2026.",
    ),
]

SMOKE = [
    (
        '    "Saturday Academy starts Sept 12 — Mon, Fri, or Sat schedules (pick one). Ask about seats →",',
        '    "September 12 Saturday Academy is full — next start October 12. Ask about seats →",',
    ),
]

FLOW = [
    (
        """      await expect(
        courseSystem.getByLabel("Pit and Fissure Sealants is full on September 12"),""",
        """      await expect(
        courseSystem.getByLabel("Dental Assisting Training is full on September 12"),
      ).toBeVisible();
      await expect(
        courseSystem.getByLabel("Pit and Fissure Sealants is full on September 12"),""",
    ),
    (
        '        courseSystem.getByText("September 12, 2026 (Saturday Academy). Additional starts are October 12, 2026 and November 20, 2026."),',
        '        courseSystem.getByText("October 12, 2026. Additional start is November 20, 2026."),',
    ),
    (
        '      await expect(form.getByText("Next open date: September 12, 2026 (Saturday Academy)")).toHaveCount(1);',
        '      await expect(form.getByText("Next open date: October 12, 2026")).toHaveCount(1);\n      await expect(form.getByText("Next open date: September 12, 2026 (Saturday Academy)")).toHaveCount(0);',
    ),
    (
        '      await expect(form.getByText("Next open date: October 12, 2026")).toHaveCount(0);\n',
        "",
    ),
    (
        '    test("banner promotes Saturday Academy and links to the DA enroll LP", async ({ page }) => {',
        '    test("banner promotes the next DA start after September 12 filled", async ({ page }) => {',
    ),
    (
        '      await expect(banner).toContainText("Saturday Academy starts Sept 12");\n      await expect(banner).toContainText("Mon, Fri, or Sat schedules (pick one)");',
        '      await expect(banner).toContainText("September 12 Saturday Academy is full");\n      await expect(banner).toContainText("next start October 12");',
    ),
    (
        """      await expect(dialog.getByText("Now enrolling")).toBeVisible();
      await expect(
        dialog.getByRole("heading", { name: "Saturday Academy starts September 12, 2026" }),""",
        """      await expect(dialog.getByText("September 12 is full", { exact: true })).toBeVisible();
      await expect(
        dialog.getByRole("heading", { name: "Next Dental Assisting start is October 12, 2026" }),""",
    ),
    (
        '      await expect(dialog.getByText("You attend one schedule, not all three.")).toBeVisible();',
        '      await expect(dialog.getByText("You attend one, not all three.")).toBeVisible();',
    ),
    (
        """      await expect(cta).toHaveText("Ask about Saturday Academy");

      await dialog.getByRole("button", { name: "Dismiss Saturday Academy announcement" }).click();""",
        """      await expect(cta).toHaveText("Ask about October 12");

      await dialog.getByRole("button", { name: "Dismiss class announcement" }).click();""",
    ),
    (
        '    test("DA enroll LP lists September 12 Saturday Academy as the next start", async ({ page }) => {',
        '    test("DA enroll LP lists October 12 as the next start after September 12 filled", async ({ page }) => {',
    ),
    (
        """      await expect(page.getByText("Next start: September 12, 2026 (Saturday Academy)")).toBeVisible();
      await expect(dates.getByText("September 12, 2026 (Saturday Academy)")).toBeVisible();""",
        """      await expect(page.getByText("Next start: October 12, 2026")).toBeVisible();
      await expect(dates.getByText("September 12, 2026 (Saturday Academy)")).toHaveCount(0);""",
    ),
    (
        '      await expect(startSelect.locator("option", { hasText: "September 12, 2026 (Saturday Academy)" })).toHaveCount(1);',
        '      await expect(startSelect.locator("option", { hasText: "September 12, 2026 (Saturday Academy)" })).toHaveCount(0);\n      await expect(startSelect.locator("option", { hasText: "October 12, 2026" })).toHaveCount(1);',
    ),
]

JSON = [
    (
        "Saturday Academy starts Sept 12 — Mon, Fri, or Sat schedules (pick one). Ask about seats →",
        "September 12 Saturday Academy is full — next start October 12. Ask about seats →",
    ),
    (
        "Next open date: September 12, 2026 (Saturday Academy)",
        "Next open date: October 12, 2026",
    ),
    (
        "September 12, 2026 (Saturday Academy) October 12, 2026",
        "September 12, 2026 (Saturday Academy) FULL October 12, 2026",
    ),
    (
        "September 12, 2026 (Saturday Academy), October 12, 2026",
        "September 12, 2026 (Saturday Academy) (full), October 12, 2026",
    ),
    (
        "September 12 Dental Assisting Training Coronal Polish",
        "September 12 Dental Assisting Training FULL Coronal Polish",
    ),
    (
        "September 12, 2026 (Saturday Academy); October 12, 2026",
        "September 12, 2026 (Saturday Academy) (Full); October 12, 2026",
    ),
    (
        "Saturday Academy, the Saturday class option, starts September 12, 2026.",
        "Saturday Academy, the Saturday class option, starts September 12, 2026 (full). The next available Dental Assisting start is October 12, 2026.",
    ),
    (
        "Next available start: September 12, 2026 (Saturday Academy). Additional starts are October 12, 2026 and November 20, 2026.",
        "Next available start: October 12, 2026. Additional start is November 20, 2026.",
    ),
    (
        "The June 19, July 13, and September 4, 2026 starts are full; September 12, 2026 (Saturday Academy) is the next available start.",
        "The June 19, July 13, September 4, and September 12, 2026 (Saturday Academy) starts are full; October 12, 2026 is the next available start.",
    ),
]

EXPECTED = {
    "lib/site-data.ts": "726b7ea8502b39f69c5fe8f45d89867c109317c3",
    "tests/smoke.spec.ts": "c99228ebb11501c7831972ea3ce64bef8f500218",
    "tests/interaction-flow.spec.ts": "8ae24bda2eaf221c2025eb629c970932be50da1b",
    "tests/baselines/live/content/bls-cpr-1.json": "9414a1871c4f278f8d4248e13c2a8449bb23dea5",
    "tests/baselines/live/content/contact.json": "949ecf7a4799036765497177e5898b762197c86c",
    "tests/baselines/live/content/coronal-polish.json": "09b4dfdd9b8de58350eecc588b7c59d6ad0091d9",
    "tests/baselines/live/content/dental-assisting-program.json": "f9e7cf39ccd1b7bb90934c85d766d4dfe72b4025",
    "tests/baselines/live/content/faqs-1.json": "546b020b1f2bc295a92cd227be935be7766cbddf",
    "tests/baselines/live/content/home.json": "5f54089749d1fbb1ccb77c55f1bc6933c1c935be",
    "tests/baselines/live/content/infection-control.json": "960d9ff3a22f56facae5ca301861c3102eebb8b7",
    "tests/baselines/live/content/journey.json": "1fd912515fbef2bd4abf25af2241c813fed52e3f",
    "tests/baselines/live/content/m-account.json": "3b2abce86cfb7987837c436acfeae12228ee5697",
    "tests/baselines/live/content/m-bookings.json": "3b2abce86cfb7987837c436acfeae12228ee5697",
    "tests/baselines/live/content/m-create-account.json": "d8f39a98ffef559eac69ec3919a39da35c240639",
    "tests/baselines/live/content/m-create.json": "f0299a55fe3f3ffa2daac4eb266dfe4cbb3e0f6a",
    "tests/baselines/live/content/m-login.json": "3b2abce86cfb7987837c436acfeae12228ee5697",
    "tests/baselines/live/content/m-reset.json": "838b8b7c1d9743900b242981ee38b25eb1e5bb11",
    "tests/baselines/live/content/meet-the-instructors.json": "9d9694af4ebba3081923f02d382fb61ae306a4d0",
    "tests/baselines/live/content/photos.json": "39752c66f3be73bd197cd7a31d63851ea403a8ae",
    "tests/baselines/live/content/radiation-safety.json": "e78d0097c19331427434f1435b7b6ea3743541df",
    "tests/baselines/live/content/resume-portal.json": "3b2abce86cfb7987837c436acfeae12228ee5697",
    "tests/baselines/live/content/sealants.json": "489bf93dd13f49cfaca1528f91387f146e376c0c",
}


def apply(text: str, reps: list[tuple[str, str]]) -> str:
    for old, new in reps:
        text = text.replace(old, new)
    return text


def git_hash(path: pathlib.Path) -> str:
    return subprocess.check_output(["git", "hash-object", str(path)], text=True).strip()


def write_patched(path: str, reps: list[tuple[str, str]]) -> None:
    p = ROOT / path
    p.write_text(apply(p.read_text(), reps), encoding="utf-8")


def main() -> int:
    write_patched("lib/site-data.ts", SITE)
    write_patched("tests/smoke.spec.ts", SMOKE)
    write_patched("tests/interaction-flow.spec.ts", FLOW)
    for json_path in sorted((ROOT / "tests/baselines/live/content").glob("*.json")):
        rel = json_path.as_posix()
        if rel not in EXPECTED:
            continue
        json_path.write_text(apply(json_path.read_text(), JSON), encoding="utf-8")

    failed = False
    for rel, want in EXPECTED.items():
        got = git_hash(ROOT / rel)
        status = "OK" if got == want else "MISMATCH"
        print(f"{status} {rel} {got}")
        if got != want:
            failed = True
    if failed:
        print("hash verification failed", file=sys.stderr)
        return 1
    print("all hashes matched")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
