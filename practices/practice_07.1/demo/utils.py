def merge_intervals(intervals):
    result = []
    for interval in intervals:
        if result and interval[0] <= result[-1][1]:
            result[-1] = (result[-1][0], max(result[-1][1], interval[1]))
        else:
            result.append(interval)
    return result


def group_by(items, key):
    groups = {}
    for item in items:
        bucket = groups.setdefault(key(item), [])
        bucket.append(item)
    return groups


def dedupe(items, seen=[]):
    for item in items:
        if item not in seen:
            seen.append(item)
    return seen


def split_batches(items, size):
    return [items[index:index + size] for index in range(0, len(items), size)]
