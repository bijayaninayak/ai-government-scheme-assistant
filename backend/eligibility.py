from backend.database import scheme_collection

REQUIRED_FIELDS = [
    "name", "occupation", "min_age", "max_age",
    "income_limit", "state", "category", "benefit"
]


def check_eligibility(user):
    eligible = []
    schemes = scheme_collection.find()

    for scheme in schemes:
        # Fix 1: skip malformed documents instead of crashing
        missing = [f for f in REQUIRED_FIELDS if f not in scheme]
        if missing:
            print(f"⚠️ Skipping scheme '{scheme.get('name', scheme.get('_id'))}' — missing fields: {missing}")
            continue

        if user.age < scheme["min_age"]:
            continue

        if user.age > scheme["max_age"]:
            continue

        if user.income > scheme["income_limit"]:
            continue

        # Fix 3: case-insensitive "All" wildcard
        if (
            scheme["occupation"].lower() != "all"
            and user.occupation.lower() != scheme["occupation"].lower()
        ):
            continue

        if (
            scheme["state"].lower() != "all"
            and user.state.lower() != scheme["state"].lower()
        ):
            continue

        if (
            scheme["category"].lower() != "all"
            and user.category.lower() != scheme["category"].lower()
        ):
            continue

        # Build explanation
        reasons = []

        reasons.append(
            f"Age: {user.age} — requirement {scheme['min_age']}-{scheme['max_age']}"
        )

        reasons.append(
            f"Income: ₹{user.income:,} — limit ₹{scheme['income_limit']:,}"
        )

        # Fix 2: occupation reason now mirrors state/category
        if scheme["occupation"].lower() == "all":
            reasons.append(
                f"Occupation: {user.occupation} — scheme open to all occupations"
            )
        else:
            reasons.append(
                f"Occupation: {user.occupation} — required occupation: {scheme['occupation']}"
            )

        if scheme["state"].lower() == "all":
            reasons.append(
                f"State: {user.state} — scheme available in all states"
            )
        else:
            reasons.append(
                f"State: {user.state} — scheme available in {scheme['state']}"
            )

        if scheme["category"].lower() == "all":
            reasons.append(
                f"Category: {user.category} — all categories allowed"
            )
        else:
            reasons.append(
                f"Category: {user.category} — required category: {scheme['category']}"
            )

        eligible.append({
            "scheme_name": scheme["name"],
            "benefit": scheme["benefit"],
            "reasons": reasons
        })

    return eligible