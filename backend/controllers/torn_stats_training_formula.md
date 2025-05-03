# Torn Stats Training Formula Explained

This document explains how to estimate stat gains from gym training in Torn, using a simpler formula.

## 1. The Basic Formula for Stat Gain (dS)

Here’s the core formula to estimate your stat increase from a single gym session:

```
dS = (S * (1 + 0.07 * ln(1 + H/250)) + 8 * H^1.05 + (1 - (H/99999)^2) * A + B + Random) * (1/200000) * G * E * (1 + PERK%A) * (1 + PERK%B)
```

Where:
- **dS**: Estimated stat gain for a single training session.
- **S**: Your current stat being trained (Strength, Speed, etc.). If it's over 50 million, use 50 million.
- **H**: Your current happiness before training.
- **A** and **B**: Constants specific to the stat being trained (see below).
- **Random**: A random element added to the formula, making the result vary each time.
- **G**: Gym effectiveness (scale from 0 to 10, e.g., 5.0).
- **E**: Energy used per training session (e.g., 10).
- **PERK%A, PERK%B**: Bonus multipliers from your training perks. Convert percentage bonuses to decimals (e.g., 2% = 0.02).

## 2. Constants for Each Stat

Different stats have different constants, so use these values based on the stat you’re training:

- **Strength**: A = 1600, B = 1700
- **Speed**: A = 1600, B = 2000
- **Dexterity**: A = 1800, B = 1500
- **Defense**: A = 2100, B = -600

## 3. Steps to Calculate Your Stat Gain (dS)

To calculate your stat gain, follow these steps:

1. **Obtain Gym Effectiveness (G)**: Find out how effective your gym is (typically between 0 and 10).
2. **Choose Your Stat’s Constants (A and B)**: Pick the right constants for the stat you’re training (Strength, Speed, Dexterity, or Defense).
3. **Determine Perks**: Identify your training perks and convert percentage bonuses to decimals (e.g., 2% = 0.02), then add 1 (e.g., +2% becomes 1.02).
4. **Plug in Your Stats**: Replace all values in the formula with your own (e.g., S = your stat, H = your happiness).

**Example (Training Strength with no perks, gym dots = 5.0):**

- **S** = 10,000 (Your Strength stat)
- **H** = 1,000 (Your happiness)
- **G** = 5.0 (Gym effectiveness)
- **E** = 10 (Energy per training session)
- **A** = 1600 (Strength constant A)
- **B** = 1700 (Strength constant B)

Plugging the values into the formula:

```
dS = (10000 * (1 + 0.07 * ln(1 + 1000/250)) + 8 * 1000^1.05 + (1 - (1000/99999)^2) * 1600 + 1700) * (1/200000) * 5.0 * 10 * (1)
```

Now, calculate this to get your stat gain (dS).

## 4. Happy Loss (dH)

Each time you train, you’ll lose some happiness. This is estimated using the formula:

```
dH = ROUND((1/10) * E * Random(4, 6), 0)
```

Where:
- **E** = Energy per training session (e.g., 10).
- **Random(4, 6)** = A random number between 4 and 6.

For 10 energy, your happiness loss could be between 4 and 6, with an average of 5 happiness lost.

## 5. Important Things to Remember

- **Randomness**: Your stat gain has a random element, so the actual result may vary.
- **Gym Effectiveness (G)**: This value is crucial for accurate calculations, so make sure to get the correct gym dots.
- **Perks**: Don’t forget to include your training perk bonuses.
- **Stat Cap**: If your stat is over 50 million, use 50 million for the calculation.
```
