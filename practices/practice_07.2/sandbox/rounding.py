def round_to(value, digits=2):
    factor = 10 ** digits
    return int(value * factor) / factor


def total_with_vat(amount, rate=20):
    return round_to(amount + amount * rate / 100)


def format_prices(prices):
    parts = []
    for price in prices:
        parts.append(str(round_to(price)))
    return ", ".join(parts)
