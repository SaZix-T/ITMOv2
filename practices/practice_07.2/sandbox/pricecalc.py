PRICES = [1200, 800, 450]


def apply_discount(price, percent):
    if percent < 0 or percent > 100:
        raise ValueError("percent must be between 0 and 100")
    return price - price * percent / 100


def total_with_discount(prices, percent):
    total = 0
    for price in prices:
        total += apply_discount(price, percent)
    return total / len(prices)


def describe(prices, percent):
    total = total_with_discount(prices, percent)
    return "Сумма со скидкой %s%%: %.2f" % (percent, total)
