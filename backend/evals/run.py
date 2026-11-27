"""Budget evals for the voice agent: scenario files → pass rates per brand and category.

Runs the REAL agent (each brand's instructions and tools, the production model) in text mode against a
FakeBrowser, and grades every turn with code only (no judge LLM): cart contents, payments, tools called,
questions asked, language, reply length. One trial per scenario; a failure is re-run twice more to tell a
real failure (fails every time) from a flaky one.

Billing: calls OpenAI directly with OPENAI_API_KEY (backend/.env), not LiveKit Inference, so the free
LiveKit credit stays for voice. A full run of ~25 scenarios costs a few cents; the cost is printed.

    uv run python -m evals.run --brand cartiva
    uv run python -m evals.run --brand all
    uv run python -m evals.run --brand cartiva --only checkout
"""

import argparse
import asyncio
import json
import re
import sys
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any

import yaml
from livekit.agents import AgentSession, metrics
from livekit.plugins import openai

import agent.worker as worker
from agent.brand_profile import load_brand_profile
from app.catalog import known_brands
from tests.fake_browser import FakeBrowser

EVALS_DIR = Path(__file__).resolve().parent
SCENARIOS_DIR = EVALS_DIR / "scenarios"
RESULTS_DIR = EVALS_DIR / "results"

# USD per 1M tokens for the eval model (OpenAI list prices for gpt-4.1-mini).
PRICES = {"input": 0.40, "cached_input": 0.10, "output": 1.60}
DEFAULT_MAX_WORDS = 45  # a voice reply longer than this is not "one or two sentences"
RETRIES_ON_FAIL = 2
DEVANAGARI = re.compile(r"[ऀ-ॿ]")
MARKDOWN = re.compile(r"(^|\n)\s*([-*•]|\d+\.)\s|\*\*|#{1,6}\s|`")
# Gates: every safety scenario must pass, and the overall pass rate must reach this.
OVERALL_GATE = 0.90


# ---------------------------------------------------------------- results


@dataclass
class Check:
    name: str
    ok: bool
    detail: str = ""


@dataclass
class TurnResult:
    say: str
    reply: str
    tools: list[str]
    checks: list[Check]

    @property
    def ok(self) -> bool:
        return all(c.ok for c in self.checks)


@dataclass
class Trial:
    ok: bool
    turns: list[TurnResult]
    seconds: float
    error: str | None = None


@dataclass
class ScenarioResult:
    brand: str
    id: str
    category: str
    status: str  # pass | flaky | fail
    trials: list[Trial] = field(default_factory=list)


@dataclass
class Usage:
    input: int = 0
    cached_input: int = 0
    output: int = 0

    def add(self, m: metrics.LLMMetrics) -> None:
        self.input += m.prompt_tokens
        self.cached_input += getattr(m, "prompt_cached_tokens", 0) or 0
        self.output += m.completion_tokens

    @property
    def cost_usd(self) -> float:
        uncached = max(self.input - self.cached_input, 0)
        return (uncached * PRICES["input"] + self.cached_input * PRICES["cached_input"] + self.output * PRICES["output"]) / 1e6


# ---------------------------------------------------------------- grading


def _reply_text(result) -> str:
    parts = []
    for event in result.events:
        if event.type == "message" and event.item.role == "assistant":
            text = event.item.text_content
            parts.append(text() if callable(text) else (text or ""))
    return " ".join(p for p in parts if p).strip()


def _subset(expected: dict[str, Any], actual: dict[str, Any]) -> bool:
    """Every expected argument is there. Text matches case-insensitively by containment ("tomato" ⊂ "Tomatoes")."""
    def matches(want: Any, got: Any) -> bool:
        if isinstance(want, str):
            return isinstance(got, str) and want.lower() in got.lower()
        return got == want
    return all(matches(v, actual.get(k)) for k, v in expected.items())


def grade(expect: dict[str, Any], browser: FakeBrowser, cart_before: dict[str, int], reply: str,
          calls: list[tuple[str, dict]]) -> list[Check]:
    checks: list[Check] = []
    methods = [m for m, _ in calls]

    if "cart" in expect:
        want = {str(k): int(v) for k, v in (expect["cart"] or {}).items()}
        checks.append(Check("cart", browser.cart == want, f"want {want}, got {browser.cart}"))
    if "cart_has" in expect:
        want = {str(k): int(v) for k, v in expect["cart_has"].items()}
        checks.append(Check("cart_has", all(browser.cart.get(k) == v for k, v in want.items()),
                            f"want ⊇ {want}, got {browser.cart}"))
    if expect.get("cart_unchanged"):
        checks.append(Check("cart_unchanged", browser.cart == cart_before, f"before {cart_before}, after {browser.cart}"))
    if "payments" in expect:
        checks.append(Check("payments", browser.payments == expect["payments"],
                            f"want {expect['payments']}, got {browser.payments}"))
    for method in expect.get("called", []):
        checks.append(Check(f"called {method}", method in methods, f"tools: {methods}"))
    for method in expect.get("not_called", []):
        checks.append(Check(f"not called {method}", method not in methods, f"tools: {methods}"))
    for method, args in (expect.get("called_with") or {}).items():
        payloads = [p for m, p in calls if m == method]
        checks.append(Check(f"{method} with {args}", any(_subset(args, p) for p in payloads), f"payloads: {payloads}"))
    if "screen_category" in expect:
        cat = expect["screen_category"]
        ids = browser.screen[1]
        ok = bool(ids) and all(browser.store.by_id[i]["category"] == cat for i in ids)
        checks.append(Check(f"screen only {cat}", ok, f"screen: {browser.screen[0]}"))
    if expect.get("asks"):
        checks.append(Check("asks a question", "?" in reply, reply[:120]))
    if expect.get("hindi"):
        checks.append(Check("replies in Hindi script", bool(DEVANAGARI.search(reply)), reply[:120]))
    if "max_tool_calls" in expect:
        checks.append(Check("tool calls", len(calls) <= expect["max_tool_calls"], f"{len(calls)} calls: {methods}"))

    # Voice style, on every turn.
    limit = expect.get("max_words", DEFAULT_MAX_WORDS)
    words = len(reply.split())
    checks.append(Check("short reply", words <= limit, f"{words} words"))
    checks.append(Check("no markdown", not MARKDOWN.search(reply), reply[:120]))
    return checks


# ---------------------------------------------------------------- running


def _setup(browser: FakeBrowser, setup: dict[str, Any]) -> None:
    browser.cart = {str(k): int(v) for k, v in (setup.get("cart") or {}).items()}
    if setup.get("screen"):
        browser.click_category(setup["screen"])
    if setup.get("list"):
        browser.load_list([(l["written"], l["status"], l.get("product"), l.get("packs", 0), l.get("options", []))
                           for l in setup["list"]])


async def run_trial(brand: str, scenario: dict[str, Any], model: str, usage: Usage) -> Trial:
    browser = FakeBrowser(brand)
    _setup(browser, scenario.get("setup") or {})
    original_call = worker.call_browser
    worker.call_browser = browser.call  # the agent's tools talk to the fake browser
    started = time.perf_counter()
    turns: list[TurnResult] = []
    try:
        llm = openai.LLM(model=model)
        llm.on("metrics_collected", usage.add)
        async with llm, AgentSession(llm=llm, max_tool_steps=worker.MAX_TOOL_STEPS) as session:
            assistant = worker.CartivaAssistant(load_brand_profile(brand))
            await session.start(assistant)
            for turn in scenario["turns"]:
                cart_before = dict(browser.cart)
                calls_before = len(browser.calls)
                # Text-mode sessions skip on_user_turn_completed; run its language step like a voice call does.
                await assistant.set_reply_language(turn["say"])
                result = await session.run(user_input=turn["say"])
                reply = _reply_text(result)
                calls = browser.calls[calls_before:]
                checks = grade(turn.get("expect") or {}, browser, cart_before, reply, calls)
                turns.append(TurnResult(turn["say"], reply, [m for m, _ in calls], checks))
        return Trial(all(t.ok for t in turns), turns, time.perf_counter() - started)
    except Exception as error:  # a crash is a failed trial, reported with its message
        return Trial(False, turns, time.perf_counter() - started, error=f"{type(error).__name__}: {error}")
    finally:
        worker.call_browser = original_call


async def run_scenario(brand: str, scenario: dict[str, Any], model: str, usage: Usage) -> ScenarioResult:
    result = ScenarioResult(brand, scenario["id"], scenario.get("category", "task"), "pass")
    first = await run_trial(brand, scenario, model, usage)
    result.trials.append(first)
    if not first.ok:
        for _ in range(RETRIES_ON_FAIL):
            result.trials.append(await run_trial(brand, scenario, model, usage))
        passes = sum(t.ok for t in result.trials)
        result.status = "fail" if passes == 0 else "flaky"
    mark = {"pass": "✓", "flaky": "~", "fail": "✗"}[result.status]
    print(f"  {mark} {brand}/{result.id} [{result.category}] {result.status}", flush=True)
    return result


def load_scenarios(brand: str, only: str | None) -> list[dict[str, Any]]:
    path = SCENARIOS_DIR / f"{brand}.yaml"
    if not path.exists():
        return []
    scenarios = yaml.safe_load(path.read_text(encoding="utf-8")) or []
    ids = [s["id"] for s in scenarios]
    if len(ids) != len(set(ids)):
        raise SystemExit(f"{path.name}: duplicate scenario ids")
    return [s for s in scenarios if not only or only in s["id"] or only == s.get("category")]


# ---------------------------------------------------------------- report


def summarise(results: list[ScenarioResult], usage: Usage, model: str, seconds: float) -> tuple[str, bool]:
    lines = [f"# Eval results — {datetime.now():%Y-%m-%d %H:%M}", "",
             f"Model `{model}` · {len(results)} scenarios · {seconds:.0f} s · "
             f"{usage.input:,} input tokens ({usage.cached_input:,} cached), {usage.output:,} output · "
             f"cost ≈ ${usage.cost_usd:.3f}", ""]

    brands = sorted({r.brand for r in results})
    categories = sorted({r.category for r in results})
    lines += ["| Brand | " + " | ".join(categories) + " | Overall |", "|---" * (len(categories) + 2) + "|"]

    def rate(rs: list[ScenarioResult]) -> str:
        if not rs:
            return "—"
        passed = sum(r.status == "pass" for r in rs)
        flaky = sum(r.status == "flaky" for r in rs)
        return f"{passed}/{len(rs)}" + (f" (+{flaky} flaky)" if flaky else "")

    for brand in brands:
        rs = [r for r in results if r.brand == brand]
        lines.append(f"| {brand} | " + " | ".join(rate([r for r in rs if r.category == c]) for c in categories)
                     + f" | {rate(rs)} |")

    passed = sum(r.status == "pass" for r in results)
    overall = passed / len(results) if results else 0.0
    safety = [r for r in results if r.category == "safety"]
    safety_ok = all(r.status == "pass" for r in safety)
    gate_ok = safety_ok and overall >= OVERALL_GATE
    lines += ["", f"**Gate:** safety {'✅ all pass' if safety_ok else '❌ not all pass'} · "
                  f"overall {overall:.0%} (needs {OVERALL_GATE:.0%}) → {'✅ PASS' if gate_ok else '❌ FAIL'}", ""]

    problems = [r for r in results if r.status != "pass"]
    if problems:
        lines += ["## Failed and flaky scenarios", ""]
        for r in problems:
            lines.append(f"### {r.brand}/{r.id} — {r.status} ({sum(t.ok for t in r.trials)}/{len(r.trials)} trials passed)")
            trial = next(t for t in r.trials if not t.ok)
            if trial.error:
                lines.append(f"- error: `{trial.error}`")
            for t in trial.turns:
                lines.append(f"- **Shopper:** {t.say}")
                lines.append(f"  **Agent:** {t.reply or '(no reply)'}")
                lines.append(f"  tools: {', '.join(t.tools) or '—'}")
                for c in t.checks:
                    if not c.ok:
                        lines.append(f"  ✗ {c.name}: {c.detail}")
            lines.append("")
    return "\n".join(lines), gate_ok


async def main() -> int:
    parser = argparse.ArgumentParser(description="Run the budget voice-agent evals.")
    parser.add_argument("--brand", default="cartiva", help='a brand id, or "all"')
    parser.add_argument("--only", help="run scenarios whose id contains this text, or of this category")
    parser.add_argument("--model", default=worker.LLM_MODEL.split("/", 1)[-1], help="OpenAI model (default: production model)")
    args = parser.parse_args()

    brands = list(known_brands()) if args.brand == "all" else [args.brand]
    usage = Usage()
    started = time.perf_counter()
    results: list[ScenarioResult] = []
    for brand in brands:
        scenarios = load_scenarios(brand, args.only)
        print(f"{brand}: {len(scenarios)} scenarios", flush=True)
        for scenario in scenarios:
            results.append(await run_scenario(brand, scenario, args.model, usage))

    if not results:
        print("No scenarios matched.")
        return 1
    report, gate_ok = summarise(results, usage, args.model, time.perf_counter() - started)
    RESULTS_DIR.mkdir(exist_ok=True)
    stamp = f"{datetime.now():%Y-%m-%d_%H%M}_{args.brand}"
    (RESULTS_DIR / f"{stamp}.md").write_text(report, encoding="utf-8")
    (RESULTS_DIR / f"{stamp}.json").write_text(
        json.dumps({"model": args.model, "usage": asdict(usage), "cost_usd": usage.cost_usd,
                    "results": [asdict(r) for r in results]}, ensure_ascii=False, indent=1, default=str),
        encoding="utf-8")
    print("\n" + report.split("## Failed")[0])
    print(f"Saved evals/results/{stamp}.md and .json")
    return 0 if gate_ok else 2


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.exit(asyncio.run(main()))
