"""Checks data/schemes.json before it is loaded into the database.

Run it from the project's main folder:

    python -m backend.validate_schemes

Errors mean the data is wrong and the import will refuse to run.
Warnings are advice (for example a link that is not a government website).
This file needs no database and no .env file.
"""
import datetime
import json
import sys
from pathlib import Path
from urllib.parse import urlparse

# These must match the options on the website's eligibility form
# (OCCUPATIONS, CATEGORIES and STATES in frontend src/App.tsx). A scheme that
# uses any other spelling will never match anybody.
KNOWN_OCCUPATIONS = ["Student", "Farmer", "Employee", "Self-employed", "Unemployed", "Other"]
KNOWN_CATEGORIES = ["General", "OBC", "SC", "ST", "EWS"]
KNOWN_STATES = [
    'Andhra Pradesh',
    'Arunachal Pradesh',
    'Assam',
    'Bihar',
    'Chhattisgarh',
    'Goa',
    'Gujarat',
    'Haryana',
    'Himachal Pradesh',
    'Jharkhand',
    'Karnataka',
    'Kerala',
    'Madhya Pradesh',
    'Maharashtra',
    'Manipur',
    'Meghalaya',
    'Mizoram',
    'Nagaland',
    'Odisha',
    'Punjab',
    'Rajasthan',
    'Sikkim',
    'Tamil Nadu',
    'Telangana',
    'Tripura',
    'Uttar Pradesh',
    'Uttarakhand',
    'West Bengal',
    'Andaman and Nicobar Islands',
    'Chandigarh',
    'Dadra and Nagar Haveli and Daman and Diu',
    'Delhi',
    'Jammu and Kashmir',
    'Ladakh',
    'Lakshadweep',
    'Puducherry',
]

KNOWN_GENDERS = ["Female", "Male", "Other"]
KNOWN_AREAS = ["Rural", "Urban"]

GOVERNMENT_DOMAINS = (".gov.in", ".nic.in", ".mygov.in")
# Official sites that do not end in .gov.in. Each one was checked by hand:
#   aicte-india.org  - the website of AICTE, a statutory body under the Ministry of Education
#   standupmitra.in  - the Stand-Up India portal, which the Ministry of Finance factsheet names as the official portal
REVIEWED_OFFICIAL_SITES = ("aicte-india.org", "standupmitra.in")
STALE_AFTER_DAYS = 180
LIST_FIELDS = ["eligibility_criteria", "other_requirements", "documents", "how_to_apply", "notes"]


def _is_int(value):
    return isinstance(value, int) and not isinstance(value, bool)


def _text_list(value):
    """Turn "Farmer" or ["OBC", "EBC"] into a list, or None if it is neither."""
    if isinstance(value, str):
        return [value]
    if isinstance(value, list) and all(isinstance(v, str) for v in value):
        return value
    return None


def _check_url(label, url, errors, warnings, required):
    if not url:
        if required:
            errors.append(f"{label} is missing")
        return
    if not isinstance(url, str) or not url.startswith("https://"):
        errors.append(f"{label} must be a web link starting with https:// (got {url!r})")
        return
    host = (urlparse(url).hostname or "").lower()
    if not host.endswith(GOVERNMENT_DOMAINS) and host.removeprefix("www.") not in REVIEWED_OFFICIAL_SITES:
        warnings.append(f"{label} is not on a government website ({host}). Use an official source if one exists")


def validate(schemes, today=None):
    """Return (errors, warnings): two lists of readable messages."""
    today = today or datetime.date.today()
    errors, warnings = [], []

    if not isinstance(schemes, list) or not all(isinstance(s, dict) for s in schemes):
        return ["schemes.json must be a list of schemes ({ ... } blocks)"], []

    seen_ids, seen_names = {}, {}

    for position, scheme in enumerate(schemes, start=1):
        sid = scheme.get("id")
        tag = f"[id {sid}] {scheme.get('name', '?')}" if sid is not None else f"[scheme number {position}]"
        e = lambda message: errors.append(f"{tag}: {message}")
        w = lambda message: warnings.append(f"{tag}: {message}")

        # id and name
        if not _is_int(sid) or sid < 1:
            e("id must be a whole number of 1 or more")
        elif sid in seen_ids:
            e(f"id {sid} is already used by '{seen_ids[sid]}'")
        else:
            seen_ids[sid] = scheme.get("name")

        name = scheme.get("name")
        if not isinstance(name, str) or not name.strip():
            e("name is missing")
        elif name.strip().lower() in seen_names:
            e("the same name is used twice")
        else:
            seen_names[name.strip().lower()] = sid

        # text that people will read
        for field in ("benefit", "description", "source_name"):
            value = scheme.get(field)
            if not isinstance(value, str) or not value.strip():
                e(f"{field} is missing")

        # lists of text
        for field in LIST_FIELDS:
            value = scheme.get(field, [])
            if not isinstance(value, list) or not all(isinstance(v, str) and v.strip() for v in value):
                e(f"{field} must be a list of non-empty text lines")
        if not scheme.get("eligibility_criteria"):
            e("eligibility_criteria is empty. List what the official source says")

        # limits: null means the scheme states none
        limits = {}
        for field in ("min_age", "max_age", "income_limit"):
            value = scheme.get(field)
            if value is None:
                limits[field] = None
            elif not _is_int(value) or value < 0:
                e(f"{field} must be a whole number of 0 or more, or null (got {value!r})")
            else:
                limits[field] = value
        if limits.get("max_age") is not None and limits["max_age"] > 120:
            e("max_age is above 120")
        if None not in (limits.get("min_age"), limits.get("max_age")) and limits["min_age"] > limits["max_age"]:
            e(f"min_age ({limits['min_age']}) is higher than max_age ({limits['max_age']})")

        # who the scheme is for
        for field, known in (("occupation", KNOWN_OCCUPATIONS), ("state", KNOWN_STATES), ("category", KNOWN_CATEGORIES)):
            values = _text_list(scheme.get(field))
            if not values or any(not v.strip() for v in values):
                e(f'{field} must be "All" or a list of values')
                continue
            lowered = [v.strip().lower() for v in values]
            if "all" in lowered and len(values) > 1:
                w(f'{field} mixes "All" with other values. "All" already covers everything')
            options = {k.lower() for k in known}
            for value in values:
                if value.strip().lower() not in options and value.strip().lower() != "all":
                    w(f"{field} '{value}' is not an option on the website form, so nobody can match it")

        # optional rules: gender, area (missing = no rule), and yes/no rules
        for field, known in (("gender", KNOWN_GENDERS), ("area", KNOWN_AREAS)):
            if field not in scheme:
                continue
            values = _text_list(scheme.get(field))
            if not values or any(not v.strip() for v in values):
                e(f'{field} must be "All" or a list of values')
                continue
            options = {k.lower() for k in known}
            for value in values:
                if value.strip().lower() not in options and value.strip().lower() != "all":
                    w(f"{field} '{value}' is not an option on the website form, so nobody can match it")
        if "any_of" in scheme:
            groups = scheme["any_of"]
            allowed = {"category": KNOWN_CATEGORIES, "gender": KNOWN_GENDERS, "occupation": KNOWN_OCCUPATIONS,
                       "area": KNOWN_AREAS, "state": KNOWN_STATES}
            if not isinstance(groups, list) or any(not isinstance(g, dict) or not g for g in groups):
                e("any_of must be a list of non-empty groups")
            else:
                for group in groups:
                    for key, wanted in group.items():
                        if key not in allowed:
                            e(f"any_of uses '{key}', which the matcher cannot check")
                            continue
                        values = _text_list(wanted)
                        if not values or any(not v.strip() for v in values):
                            e(f"any_of '{key}' must be a value or a list of values")
                            continue
                        options = {k.lower() for k in allowed[key]}
                        for value in values:
                            if value.strip().lower() not in options and value.strip().lower() != "all":
                                w(f"any_of {key} '{value}' is not an option on the website form, so nobody can match it")
        if scheme.get("girl_child_under_age") is not None:
            age_limit = scheme["girl_child_under_age"]
            if not _is_int(age_limit) or age_limit < 1:
                e("girl_child_under_age must be a whole number of years, 1 or more")
            elif age_limit != 10:
                w("girl_child_under_age is not 10, but the website form asks about a daughter under 10")
        for field in ("disability_required", "bpl_required"):
            if field in scheme and not isinstance(scheme[field], bool):
                e(f"{field} must be true or false")

        # where the facts come from
        _check_url("official_url", scheme.get("official_url"), errors, warnings, required=False)
        _check_url("source_url", scheme.get("source_url"), errors, warnings, required=True)
        if scheme.get("official_url") in (None, ""):
            w("official_url is empty, so the website cannot show an Apply button")

        verified = scheme.get("last_verified")
        try:
            verified_on = datetime.date.fromisoformat(verified)
        except (TypeError, ValueError):
            e("last_verified must be a date like 2026-10-27")
        else:
            if verified_on > today:
                e(f"last_verified ({verified}) is in the future")
            elif (today - verified_on).days > STALE_AFTER_DAYS:
                w(f"last_verified is {(today - verified_on).days} days old. Check the official source again")

    return errors, warnings


def main():
    path = Path(__file__).resolve().parent.parent / "data" / "schemes.json"
    try:
        schemes = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as problem:
        sys.exit(f"Cannot read {path}: {problem}")

    errors, warnings = validate(schemes)
    print(f"Checked {len(schemes)} schemes in {path.name}")
    for message in warnings:
        print("  Warning:", message)
    for message in errors:
        print("  ERROR:  ", message)

    if errors:
        print(f"FAILED: {len(errors)} error(s). Fix them before importing.")
        sys.exit(1)
    print(f"OK: no errors ({len(warnings)} warning(s)).")


if __name__ == "__main__":
    main()
