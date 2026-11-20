def slugify(text):
    return text.lower().replace(" ", "-")


def word_count(text):
    words = text.split()
    return len(words)


def first_word(text):
    parts = text.split(" ")
    return parts[0] if parts else ""