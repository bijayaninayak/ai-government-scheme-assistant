from backend.database import scheme_collection

# A scheme record must have at least these fields to be checked.
# min_age, max_age and income_limit are optional: missing or null means
# "the scheme states no such limit". The same goes for gender, area,
# disability_required and bpl_required (missing = no such rule).
REQUIRED_FIELDS = ["name", "occupation", "state", "category", "benefit"]

# How the website names some values (the database uses the short form).
DISPLAY = {"Employee": "Salaried employee"}


def _as_list(value):
    """Turn "Farmer" or ["OBC", "SC"] into a list of texts."""
    if value is None:
        return []
    if isinstance(value, str):
        return [value]
    return list(value)


def _is_all(values):
    return any(v.strip().lower() == "all" for v in values)


def _matches(values, user_value):
    return _is_all(values) or user_value.strip().lower() in [
        v.strip().lower() for v in values
    ]


def _join(values):
    return ", ".join(DISPLAY.get(v, v) for v in values)


def _show(value):
    return DISPLAY.get(value, value)


def _rupees(amount):
    """Format a number the Indian way, e.g. 250000 -> ₹2,50,000."""
    digits = str(int(amount))
    if len(digits) <= 3:
        return f"₹{digits}"
    head, tail = digits[:-3], digits[-3:]
    groups = []
    while len(head) > 2:
        groups.insert(0, head[-2:])
        head = head[:-2]
    if head:
        groups.insert(0, head)
    return "₹" + ",".join(groups + [tail])


def _public(scheme):
    """A scheme record as the website should see it (no database _id)."""
    data = {k: v for k, v in scheme.items() if k != "_id"}
    for key in ("occupation", "state", "category", "gender", "area"):
        data[key] = _as_list(data.get(key, "All"))
    return data


def _answer(user, name):
    return getattr(user, name, None)


# Fields an "any_of" group may use, and how to read the user's answer for each.
GROUP_FIELDS = {
    "category": lambda u: u.category,
    "occupation": lambda u: u.occupation,
    "state": lambda u: u.state,
    "gender": lambda u: _answer(u, "gender"),
    "area": lambda u: _answer(u, "area"),
}


def _group_status(user, group):
    """True = the user fits every condition, False = a condition is not met,
    None = no condition failed but at least one needs an answer we do not have."""
    unknown = False
    for key, wanted in group.items():
        read = GROUP_FIELDS.get(key)
        if read is None:
            return False  # an unknown condition can never be confirmed
        values = _as_list(wanted)
        if _is_all(values):
            continue
        answer = read(user)
        if answer is None:
            unknown = True
        elif not _matches(values, answer):
            return False
    return None if unknown else True


def _describe_group(group):
    return " and ".join(f"{key}: {_join(_as_list(v))}" for key, v in group.items())


def _describe_user(user, groups):
    keys = []
    for group in groups:
        for key in group:
            if key not in keys:
                keys.append(key)
    parts = []
    for key in keys:
        read = GROUP_FIELDS.get(key)
        value = read(user) if read else None
        parts.append(f"{key}: {_show(value) if value else 'not given'}")
    return ", ".join(parts)


def _check(user, scheme):
    """Compare one user with one scheme.

    Returns (failures, reasons, criteria_met, to_verify):
      failures     - plain-language reasons the user does NOT match
      reasons      - what matched
      criteria_met - how many limits the scheme sets that the user passed
      to_verify    - rules the tool cannot settle (the user must confirm them)
    """
    failures, reasons, to_verify = [], [], []
    criteria_met = 0

    # Age
    min_age = scheme.get("min_age")
    max_age = scheme.get("max_age")
    if min_age is not None and user.age < min_age:
        failures.append(f"Your age ({user.age}) is below the minimum age of {min_age}.")
    elif max_age is not None and user.age > max_age:
        failures.append(f"Your age ({user.age}) is above the maximum age of {max_age}.")
    elif min_age is not None and max_age is not None:
        reasons.append(f"Age {user.age} is within the required range of {min_age} to {max_age}")
        criteria_met += 1
    elif min_age is not None:
        reasons.append(f"Age {user.age} meets the minimum age of {min_age}")
        criteria_met += 1
    elif max_age is not None:
        reasons.append(f"Age {user.age} is within the maximum age of {max_age}")
        criteria_met += 1
    else:
        reasons.append("No age limit is stated for this scheme")

    # Income
    income_limit = scheme.get("income_limit")
    if income_limit is not None:
        if user.income > income_limit:
            failures.append(
                f"Your annual family income ({_rupees(user.income)}) is above the limit of {_rupees(income_limit)}."
            )
        else:
            reasons.append(
                f"Annual income {_rupees(user.income)} is within the limit of {_rupees(income_limit)}"
            )
            criteria_met += 1
    else:
        reasons.append("No income limit is stated for this scheme")

    # Occupation, state, category (always answered)
    for label, key, user_value, noun in (
        ("Occupation", "occupation", user.occupation, "occupation"),
        ("State", "state", user.state, "state"),
        ("Category", "category", user.category, "category"),
    ):
        values = _as_list(scheme.get(key))
        if not _matches(values, user_value):
            failures.append(
                f"This scheme is for these {noun} groups: {_join(values)}. You selected: {_show(user_value)}."
            )
        elif _is_all(values):
            reasons.append(f"{label}: open to all ({_show(user_value)})")
        else:
            reasons.append(f"{label}: {_show(user_value)} matches the scheme's target group ({_join(values)})")
            criteria_met += 1

    # Gender and area (optional answers)
    for label, key, user_value in (
        ("Gender", "gender", _answer(user, "gender")),
        ("Area", "area", _answer(user, "area")),
    ):
        values = _as_list(scheme.get(key, "All"))
        if not values or _is_all(values):
            continue
        if user_value is None:
            to_verify.append(
                f"{label}: this scheme is meant for {_join(values)}. You did not tell us yours, so please confirm."
            )
        elif not _matches(values, user_value):
            failures.append(
                f"This scheme is meant for {label.lower()}: {_join(values)}. You selected: {user_value}."
            )
        else:
            reasons.append(f"{label}: {user_value} matches the scheme's target group ({_join(values)})")
            criteria_met += 1

    # Disability and BPL (optional yes/no answers)
    for label, key, user_value, need, have in (
        ("Disability", "disability_required", _answer(user, "disability"),
         "for persons with disability", "you said you do not have a disability"),
        ("BPL", "bpl_required", _answer(user, "bpl"),
         "for families below the poverty line (BPL)", "you said your family is not BPL"),
    ):
        if not scheme.get(key):
            continue
        if user_value is None:
            to_verify.append(
                f"{label}: this scheme is {need}. You did not tell us, so please confirm."
            )
        elif user_value is False:
            failures.append(f"This scheme is {need}, but {have}.")
        else:
            reasons.append(f"{label}: you said yes, which this scheme requires")
            criteria_met += 1

    # "A or B" rule: the user must fit at least one of the listed groups
    groups = [g for g in (scheme.get("any_of") or []) if isinstance(g, dict) and g]
    if groups:
        statuses = [_group_status(user, g) for g in groups]
        wording = " OR ".join(_describe_group(g) for g in groups)
        if any(s is True for s in statuses):
            winner = groups[statuses.index(True)]
            reasons.append(f"You fit one of the groups this scheme is meant for ({_describe_group(winner)})")
            criteria_met += 1
        elif any(s is None for s in statuses):
            to_verify.append(
                f"This scheme is meant for people in any one of these groups: {wording}. "
                "You did not give all the details needed to tell, so please confirm."
            )
        else:
            failures.append(
                f"This scheme is meant for people in any one of these groups: {wording}. "
                f"Your details: {_describe_user(user, groups)}."
            )

    # Girl-child scheme: the applicant is usually the parent or guardian
    limit = scheme.get("girl_child_under_age")
    if limit is not None:
        has_daughter = _answer(user, "girl_child")
        is_girl_child = _answer(user, "gender") == "Female" and user.age < limit
        if is_girl_child:
            reasons.append(
                f"You are a girl under {limit}, so a parent or guardian can open this account for you"
            )
            criteria_met += 1
        elif has_daughter is True:
            reasons.append(f"You said you have a daughter under {limit}")
            criteria_met += 1
        elif has_daughter is False:
            failures.append(
                f"This scheme is for a girl child under {limit} years of age, opened by a parent or guardian. "
                "You said you do not have a daughter that age."
            )
        else:
            to_verify.append(
                f"This scheme is for a girl child under {limit} years of age. "
                "You did not tell us whether you have a daughter that age, so please confirm."
            )

    to_verify = list(scheme.get("other_requirements") or []) + to_verify
    return failures, reasons, criteria_met, to_verify


def evaluate_scheme(user, scheme):
    """Returns None if the user does not match. Otherwise returns the scheme
    plus `reasons`, `criteria_met` and `to_verify`."""
    failures, reasons, criteria_met, to_verify = _check(user, scheme)
    if failures:
        return None

    result = _public(scheme)
    result["scheme_name"] = scheme["name"]
    result["reasons"] = reasons
    result["criteria_met"] = criteria_met
    result["to_verify"] = to_verify
    return result


def explain_not_eligible(user, scheme):
    """For a scheme the user does not match: why not. None if they match."""
    failures, _, _, _ = _check(user, scheme)
    if not failures:
        return None
    return {
        "id": scheme.get("id"),
        "scheme_name": scheme["name"],
        "benefit": scheme.get("benefit", ""),
        "department": scheme.get("department", ""),
        "official_url": scheme.get("official_url", ""),
        "why_not": failures,
    }


def check_eligibility_full(user):
    """Returns (eligible, not_eligible) lists."""
    eligible, not_eligible = [], []

    for scheme in scheme_collection.find():
        # Skip malformed documents instead of crashing
        missing = [f for f in REQUIRED_FIELDS if f not in scheme]
        if missing:
            print(f"Skipping scheme '{scheme.get('name', scheme.get('_id'))}' - missing fields: {missing}")
            continue

        result = evaluate_scheme(user, scheme)
        if result is not None:
            eligible.append(result)
        else:
            not_eligible.append(explain_not_eligible(user, scheme))

    # Schemes with more matching limits first, then alphabetical
    eligible.sort(key=lambda s: (-s["criteria_met"], s["name"]))
    not_eligible.sort(key=lambda s: (len(s["why_not"]), s["scheme_name"]))
    return eligible, not_eligible


def check_eligibility(user):
    return check_eligibility_full(user)[0]
