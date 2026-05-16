import random

def roll_dice(pool_size, is_gilded=False):
    if pool_size == 0:
        die1 = random.randint(1, 6)
        die2 = random.randint(1, 6)
        return {
            "type": "zero",
            "dice": [die1, die2],
            "result": min(die1, die2)
        }

    dice = []
    for i in range(pool_size):
        dice.append({
            "value": random.randint(1, 6),
            "is_gilded": is_gilded and i == 0
        })

    return {
        "type": "standard",
        "dice": dice
    }

def calculate_resistance_max(max_drive):
    return max_drive // 3
