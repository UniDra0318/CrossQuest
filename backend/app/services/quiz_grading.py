"""Server-side quiz answer grading helper (SEC-26, Round 11 Part 3d)."""

import re
from typing import Any, Dict, List, Optional


def _normalise_text(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip()).casefold()


def grade_answer(question: Any, key: Optional[Any], submitted: Any) -> bool:
    """Grades a single trainee answer against the server-side QuizAnswerKey.

    Supports Phase 1 question types:
    - multiple_choice, true_false: integer equality with key.correct_answer
    - identification: normalised string membership in answer_payload['accepted']
    - sequence: submitted order list equals answer_payload['order'] (index list)
      or matching ordered step strings from question.payload['steps']
    Full points or zero (no partial credit).
    """
    if submitted is None:
        return False

    q_type = (getattr(question, "question_type", None) or "multiple_choice").strip().lower()
    expected_int = getattr(key, "correct_answer", None) if key is not None else getattr(question, "correct_answer", None)
    answer_payload: Dict[str, Any] = (getattr(key, "answer_payload", None) if key is not None else None) or {}
    public_payload: Dict[str, Any] = getattr(question, "payload", None) or {}

    if q_type in ("multiple_choice", "true_false"):
        if isinstance(submitted, bool):
            return False
        try:
            return expected_int is not None and int(submitted) == int(expected_int)
        except (TypeError, ValueError):
            return False

    if q_type == "identification":
        accepted = answer_payload.get("accepted") or []
        if not accepted:
            return False
        norm_sub = _normalise_text(submitted)
        if not norm_sub:
            return False
        norm_accepted = {_normalise_text(a) for a in accepted if str(a).strip()}
        return norm_sub in norm_accepted

    if q_type == "sequence":
        if not isinstance(submitted, list) or not submitted:
            return False
        expected_order: List[int] = answer_payload.get("order") or []
        steps: List[str] = public_payload.get("steps") or []
        if not expected_order:
            if steps:
                expected_order = list(range(len(steps)))
            else:
                return False

        # Support index list (e.g. [2, 0, 1])
        if all(isinstance(x, int) and not isinstance(x, bool) for x in submitted):
            return submitted == expected_order

        # Support ordered step strings (e.g. ['Step A', 'Step B', 'Step C'])
        if steps and len(submitted) == len(expected_order):
            try:
                expected_steps = [steps[i] for i in expected_order]
                return [str(x) for x in submitted] == [str(s) for s in expected_steps]
            except IndexError:
                return False
        return False

    # Fallback for any legacy/unknown type
    return expected_int is not None and submitted == expected_int
