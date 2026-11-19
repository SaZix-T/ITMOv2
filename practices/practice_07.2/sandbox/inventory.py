STOCK = {"bolts": 120, "nuts": 80, "washers": 200}


def average_rating(ratings):
    total = 0
    for rating in ratings:
        total += rating
    return total / len(ratings)


def restock_needed(stock, minimum=50):
    return max(minimum - stock, 0)


def describe(stock):
    parts = []
    for name in stock:
        parts.append(name + ": " + str(stock[name]))
    return ", ".join(parts)