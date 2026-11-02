"""Validate design artifacts and prove this documentation stage changed no tracked code.

This is NOT a gameplay test, simulator, browser benchmark, or runtime dependency.
Run from any cwd: python docs/game-bach-dang-938/evidence/architecture-2026-11-01/validate_design.py
"""
from pathlib import Path
import hashlib
import json
import re
import subprocess

HERE = Path(__file__).resolve().parent
DOCS = HERE.parent.parent
ROOT = DOCS.parent.parent
config = json.loads((DOCS / "gameplay-defaults.json").read_text(encoding="utf-8-sig"))
checks = []


def check(name, condition):
    checks.append({"name": name, "passed": bool(condition)})


sim = config["simulation"]
chapter = config["chapter"]
check("Marked as design, not runtime", config["status"] == "design-proposal-not-runtime")
check("Cloud is off by default", config["persistence"]["cloudDefaultEnabled"] is False)
check("Version present", bool(config["configVersion"]) and config["schemaVersion"] >= 1)
check("Scheduled rates divide tick rate", all(sim["tickHz"] % sim[k] == 0 for k in ["sensingHz", "tacticalAIHz", "pathPlanningHz", "hudHz", "mapHz"]))
check("Positive catch-up bound", 0 < sim["maxCatchUpTicks"] <= sim["tickHz"])
check("Collision epsilon below replay tolerance", 0 < sim["collisionEpsilonM"] < sim["replayPositionToleranceM"])
check("Chapter goal lies within 15 to 25 minutes", 900 <= chapter["targetDurationS"] <= 1500)
check("Guide phases sum to target", sum(chapter["phaseGuideS"]) == chapter["targetDurationS"])
check("Deadline covers target", chapter["hardDeadlineS"] >= chapter["targetDurationS"])
check("Four main heroes", chapter["friendlyRoster"]["heroes"] == 4)
check("Reserve officers exist", chapter["friendlyRoster"]["reserveOfficers"] > 0)
check("Friendly roster totals 50", sum(chapter["friendlyRoster"].values()) == 50)
check("Boat capacity covers roster", sum(chapter["friendlyBoatCapacities"]) >= sum(chapter["friendlyRoster"].values()))
check("Two objective transports in sample", chapter["enemyBoatRoles"].count("transport") == 2)
check("Required crates can be obtained", 0 < chapter["supplyCratesRequired"] <= chapter["supplyCratesAvailable"])
check("Loss thresholds ordered", 0 < chapter["retreatWarningLossFraction"] <= chapter["defaultSquadWithdrawLossFraction"] <= 1)
keys = config["river"]["tideKeys"]
check("Tide keys strictly ordered", all(a[0] < b[0] for a, b in zip(keys, keys[1:])))
check("Tide covers complete chapter", keys[0][0] == 0 and keys[-1][0] >= chapter["hardDeadlineS"])
check("Tide is falling in sample", all(a[1] >= b[1] for a, b in zip(keys, keys[1:])))
check("Lease renews before expiry", 0 < config["persistence"]["leaseRenewS"] < config["persistence"]["leaseDurationS"])
check("Benchmark covers required force scales", config["benchmark"]["friendlyCounts"] == [50, 100, 200, 400, 480])
check("Benchmark includes enemies", config["benchmark"]["enemyRatio"] == 1)
check("All quality presets have positive budgets", all(all(isinstance(v, (int, float)) and v > 0 for v in preset.values()) for preset in config["quality"].values()))
check("Camp convalescence without kit costs more time", chapter["campRecoveryWithoutKitTimeMultiplier"] > 1)

required = ["architecture.md", "system-contracts.md", "save-and-recovery.md", "chapter-sample.md", "gameplay-parameters.md", "performance-and-art.md", "architecture-handoff.md"]
check("All handoff documents exist", all((DOCS / name).is_file() for name in required))
broken = []
whitespace = []
encoding_errors = []
for path in DOCS.glob("*.md"):
    text = path.read_text(encoding="utf-8-sig")
    if "\ufffd" in text:
        encoding_errors.append(path.name)
    for line_num, line in enumerate(text.splitlines(), 1):
        if line.rstrip() != line:
            whitespace.append(f"{path.name}:{line_num}")
    for target in re.findall(r"\]\(([^)]+)\)", text):
        if re.match(r"https?://|#", target):
            continue
        target = target.split("#")[0].strip("<>")
        if target and not (path.parent / target).exists():
            broken.append({"file": path.name, "target": target})
check("Local markdown links resolve", not broken)
check("No trailing whitespace in top-level dossier", not whitespace)
check("No Unicode replacement characters", not encoding_errors)

before = json.loads((HERE / "tracked-hashes-before.json").read_text(encoding="utf-8"))
after = {p: hashlib.sha256((ROOT / p).read_bytes()).hexdigest() if (ROOT / p).is_file() else None for p in before}
changed = [p for p in before if before[p] != after[p]]
check("All tracked files outside docs unchanged", not changed)
check("No game runtime route created", not (ROOT / "game-bach-dang-938").exists())
diff = subprocess.run(["git", "diff", "--check"], cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace")
check("git diff --check", diff.returncode == 0)
report = {
    "kind": "documentation-and-configuration-consistency-only",
    "newGameImplemented": False,
    "newGamePlaytested": False,
    "newGameBenchmarked": False,
    "trackedFilesCompared": len(before),
    "changedTrackedFilesOutsideDocs": changed,
    "passed": sum(item["passed"] for item in checks),
    "total": len(checks),
    "checks": checks,
    "brokenLinks": broken,
    "trailingWhitespace": whitespace,
    "encodingErrors": encoding_errors,
    "gitDiffCheckExitCode": diff.returncode,
    "gitDiffCheckStderr": diff.stderr,
}
(HERE / "tracked-hashes-after.json").write_text(json.dumps(after, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
(HERE / "design-validation.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({key: report[key] for key in ["passed", "total", "trackedFilesCompared", "changedTrackedFilesOutsideDocs", "brokenLinks"]}, ensure_ascii=False))
raise SystemExit(0 if report["passed"] == report["total"] else 1)
