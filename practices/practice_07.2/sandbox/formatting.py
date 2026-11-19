def format_price(value):
    return str(value) + " RUB"


def format_list(values):
    parts = []
    for value in values:
        parts.append(format_price(value))
    return "; ".join(parts)


def parse_price(text):
    return float(text.replace(" RUB", ""))