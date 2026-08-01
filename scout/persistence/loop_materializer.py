"""Deterministic materialization of a completed report into loop records.

The report artifact stays immutable. This module converts it into the living
validation state exactly once per run: claims and evidence, ranked assumptions,
suggested experiments, and — for the first completed run — the initial project
thesis version.

Nothing here calls a model. The synthesis agent already produced the report;
turning it into typed rows is application logic so provenance stays honest and
repeated materialization is idempotent.
"""

from __future__ import annotations

from typing import Any

MATERIALIZER_VERSION = "loop-materializer-v1"

# Assumption ranking. Distribution and monetization risk kill more pre-revenue
# B2B ideas than market size does, and an unanswerable investor objection is
# usually a real gap rather than a presentation problem.
CATEGORY_KEYWORDS: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("pricing", ("pricing", "price", "willingness to pay", "wtp", "monetization", "monetisation")),
    ("distribution", ("distribution", "channel", "acquisition", "gtm", "go-to-market", "cac", "outbound")),
    ("customer", ("customer", "icp", "buyer", "user", "segment", "persona", "adopter")),
    ("problem", ("problem", "pain", "workflow", "frequency", "urgency")),
    ("competition", ("competitor", "incumbent", "platform risk", "moat", "defensib")),
    ("solution", ("solution", "product", "build", "technical", "accuracy", "trust")),
    ("timing", ("timing", "why now", "regulat")),
    ("execution", ("execution", "team", "hiring", "capacity", "runway")),
)

CATEGORY_WEIGHTS: dict[str, int] = {
    "customer": 100,
    "problem": 95,
    "pricing": 90,
    "distribution": 85,
    "solution": 70,
    "competition": 60,
    "timing": 45,
    "execution": 40,
    "general": 30,
}

THESIS_FIELDS: tuple[str, ...] = (
    "problem",
    "customer",
    "solution",
    "alternatives",
    "pricing",
    "distribution",
)

STOP_WORDS = frozenset(
    """the a an and or but for with without that this these those will would could
    should can may are was were has have had not from into than then there their
    them they you your our its it of to in on at by is be as if do does what why
    how who when which""".split()
)


def _clean(value: Any, limit: int = 2_000) -> str | None:
    if not isinstance(value, str):
        return None
    collapsed = " ".join(value.split())
    return collapsed[:limit] or None


def _clean_items(values: Any, limit: int = 20) -> list[str]:
    if not isinstance(values, list):
        return []
    seen: set[str] = set()
    items: list[str] = []
    for value in values:
        text = _clean(value)
        if not text or text.casefold() in seen:
            continue
        seen.add(text.casefold())
        items.append(text)
        if len(items) >= limit:
            break
    return items


def _dicts(values: Any, limit: int = 20) -> list[dict[str, Any]]:
    if not isinstance(values, list):
        return []
    return [value for value in values if isinstance(value, dict)][:limit]


def classify_category(text: str) -> str:
    lowered = text.casefold()
    for category, keywords in CATEGORY_KEYWORDS:
        if any(keyword in lowered for keyword in keywords):
            return category
    return "general"


def _tokens(text: str) -> set[str]:
    return {
        token
        for token in "".join(
            character if character.isalnum() else " " for character in text.casefold()
        ).split()
        if len(token) > 2 and token not in STOP_WORDS
    }


def weakest_dimensions(report: dict[str, Any]) -> list[str]:
    scores = report.get("scores")
    if not isinstance(scores, dict):
        return []
    ranked: list[tuple[int, str]] = []
    for name, value in scores.items():
        if name == "overall" or not isinstance(value, dict):
            continue
        score = value.get("score")
        if isinstance(score, int):
            ranked.append((score, name))
    ranked.sort()
    return [name for _score, name in ranked]


def build_claims(report: dict[str, Any]) -> list[dict[str, Any]]:
    """Source-backed statements grouped by which way they cut."""
    claims: list[dict[str, Any]] = []

    def add(stance: str, text: str | None, origin: str) -> None:
        if text:
            claims.append({"stance": stance, "text": text, "origin": origin})

    for opportunity in _clean_items(report.get("opportunities")):
        add("supporting", opportunity, "VC partner")

    market = report.get("market_analysis")
    if isinstance(market, dict):
        for trend in _clean_items(market.get("trends")):
            add("supporting", trend, "Market analyst")
        add("supporting", _clean(market.get("why_now")), "Market analyst")
        add("unknown", _clean(market.get("why_not_already_won")), "Market analyst")

    pain = report.get("customer_pain")
    if isinstance(pain, dict):
        for point in _clean_items(pain.get("pain_points")):
            add("pain", point, "Customer analyst")
        for trigger in _clean_items(pain.get("switching_triggers")):
            add("supporting", trigger, "Customer analyst")
        for workaround in _clean_items(pain.get("current_workarounds")):
            add("contradicting", workaround, "Customer analyst")

    for risk in _dicts(report.get("risks")):
        name = _clean(risk.get("name"))
        reason = _clean(risk.get("reason"))
        if name:
            add("contradicting", f"{name}: {reason}" if reason else name, "Risk analysis")

    for competitor in _dicts(report.get("competitor_snapshot")):
        name = _clean(competitor.get("name"))
        weakness = _clean(competitor.get("weakness"))
        if name:
            add(
                "competitor",
                f"{name} — {weakness}" if weakness else name,
                "Competitor analyst",
            )

    for objection in _dicts(report.get("yc_objections")):
        add("unknown", _clean(objection.get("question")), "VC partner")

    return claims


def build_evidence(report: dict[str, Any]) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    seen: set[str] = set()
    for source in _dicts(report.get("sources"), limit=40):
        url = _clean(source.get("url"), limit=1_000)
        if not url or url in seen:
            continue
        seen.add(url)
        records.append(
            {
                "source_url": url,
                "source_title": _clean(source.get("title"), limit=500),
                "snippet": _clean(source.get("snippet"), limit=1_000),
                "workflow": "startup_research_v2",
            }
        )
    return records


def build_experiments(report: dict[str, Any]) -> list[dict[str, Any]]:
    experiments: list[dict[str, Any]] = []
    for index, experiment in enumerate(_dicts(report.get("experiments"))):
        name = _clean(experiment.get("name")) or _clean(experiment.get("goal"))
        if not name:
            continue
        experiments.append(
            {
                "source_key": f"report-experiment-{index}",
                "name": name,
                "goal": _clean(experiment.get("goal")),
                "method": _clean(experiment.get("method")),
                "success_metric": _clean(experiment.get("success_criteria")),
                "success_threshold": _clean(experiment.get("success_criteria")),
                "failure_threshold": _clean(experiment.get("failure_criteria")),
                "estimated_time": _clean(experiment.get("time"), limit=120),
                "estimated_cost": _clean(experiment.get("cost"), limit=120),
                "status": "suggested",
                "sprint_position": index,
            }
        )
    return experiments


def build_assumptions(report: dict[str, Any]) -> list[dict[str, Any]]:
    """Rank what most plausibly invalidates the idea.

    Risk and objection order from the model is treated as a weak signal only;
    the category weight and the scored dimensions carry the ranking so the same
    report always produces the same priority list.
    """
    weakest = weakest_dimensions(report)
    assumptions: list[dict[str, Any]] = []

    def score_for(category: str, position: int) -> int:
        weight = CATEGORY_WEIGHTS.get(category, CATEGORY_WEIGHTS["general"])
        if category in weakest[:2]:
            weight += 25
        elif category in weakest[:4]:
            weight += 10
        return weight - position

    for index, risk in enumerate(_dicts(report.get("risks"))):
        statement = _clean(risk.get("name"))
        if not statement:
            continue
        reason = _clean(risk.get("reason"))
        category = classify_category(f"{statement} {reason or ''}")
        assumptions.append(
            {
                "source_key": f"risk-{index}",
                "statement": statement,
                "category": category,
                "kind": "risk",
                "why_it_matters": reason,
                "suggested_response": _clean(risk.get("mitigation")),
                "evidence_text": _clean(risk.get("evidence")),
                "_weight": score_for(category, index),
            }
        )

    for index, objection in enumerate(_dicts(report.get("yc_objections"))):
        statement = _clean(objection.get("question"))
        if not statement:
            continue
        why = _clean(objection.get("why_it_matters"))
        category = classify_category(f"{statement} {why or ''}")
        assumptions.append(
            {
                "source_key": f"objection-{index}",
                "statement": statement,
                "category": category,
                "kind": "objection",
                "why_it_matters": why,
                "suggested_response": _clean(objection.get("best_answer")),
                "evidence_text": None,
                "_weight": score_for(category, index) - 5,
            }
        )

    assumptions.sort(key=lambda item: (-item["_weight"], item["source_key"]))
    for rank, assumption in enumerate(assumptions, start=1):
        assumption["risk_rank"] = rank
        assumption.pop("_weight", None)
    return assumptions


def link_experiments_to_assumptions(
    assumptions: list[dict[str, Any]],
    experiments: list[dict[str, Any]],
) -> dict[str, list[str]]:
    """Map assumption source keys to experiment source keys by token overlap.

    A heuristic on purpose: a wrong link is cheap for the founder to change,
    and determinism keeps the board stable between renders.
    """
    links: dict[str, list[str]] = {}
    haystacks = {
        experiment["source_key"]: _tokens(
            " ".join(
                value
                for value in (
                    experiment.get("name"),
                    experiment.get("goal"),
                    experiment.get("method"),
                )
                if value
            )
        )
        for experiment in experiments
    }
    for assumption in assumptions:
        needle = _tokens(
            f"{assumption['statement']} {assumption.get('why_it_matters') or ''}"
        )
        if not needle:
            continue
        best_key: str | None = None
        best_overlap = 0
        for key, haystack in haystacks.items():
            overlap = len(needle & haystack)
            if overlap > best_overlap:
                best_overlap = overlap
                best_key = key
        if best_key and best_overlap >= 2:
            links.setdefault(assumption["source_key"], []).append(best_key)
    return links


def build_initial_thesis(
    request_payload: dict[str, Any],
    report: dict[str, Any],
) -> dict[str, Any]:
    """Founder framing first, Scout's inference only where the composer was blank."""
    gtm = report.get("gtm_strategy") if isinstance(report.get("gtm_strategy"), dict) else {}
    pain = report.get("customer_pain") if isinstance(report.get("customer_pain"), dict) else {}
    moat = report.get("moat_analysis") if isinstance(report.get("moat_analysis"), dict) else {}

    def field(founder: Any, scout: Any) -> dict[str, Any] | None:
        founder_text = _clean(founder)
        if founder_text:
            return {"value": founder_text, "origin": "founder"}
        scout_text = _clean(scout)
        if scout_text:
            return {"value": scout_text, "origin": "scout"}
        return None

    def joined(values: Any) -> str | None:
        items = _clean_items(values)
        return ", ".join(items) if items else None

    candidates = {
        "problem": field(request_payload.get("problem"), pain.get("why_users_switch")),
        "customer": field(
            request_payload.get("target_customer"),
            gtm.get("first_customer"),
        ),
        "solution": field(
            request_payload.get("proposed_solution"),
            moat.get("realistic_moat"),
        ),
        "alternatives": field(
            joined(request_payload.get("current_alternatives")),
            joined(pain.get("current_workarounds")),
        ),
        "pricing": field(request_payload.get("pricing_hypothesis"), gtm.get("pricing")),
        "distribution": field(
            request_payload.get("gtm_constraints"),
            joined(gtm.get("acquisition_channels")),
        ),
    }
    return {key: value for key, value in candidates.items() if value is not None}


def build_materialization(
    *,
    request_payload: dict[str, Any],
    report_payload: dict[str, Any],
) -> dict[str, Any]:
    """One deterministic plan the persistence service commits in a transaction."""
    assumptions = build_assumptions(report_payload)
    experiments = build_experiments(report_payload)
    return {
        "claims": build_claims(report_payload),
        "evidence": build_evidence(report_payload),
        "assumptions": assumptions,
        "experiments": experiments,
        "links": link_experiments_to_assumptions(assumptions, experiments),
        "thesis": build_initial_thesis(request_payload, report_payload),
        "thesis_summary": _clean(report_payload.get("verdict")),
        "provenance": {
            "materializer": MATERIALIZER_VERSION,
            "schema_version": "v2",
        },
    }
