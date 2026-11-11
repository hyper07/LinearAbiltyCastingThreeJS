# Adaptive monster AI (AI LM mode)

[← Back to the README](../README.md)

> **Status: planned, not built yet.** We are collecting more training situations first. Today's
> monsters run hand-written behaviour (see [The fight](combat.md)).

## The idea

Today each monster follows hand-written rules: it comes at you and attacks once you are in range.
In **AI LM mode** the monsters read *how you play*. They watch where you are running, which spells
are on your keys and which are cooling down, whether you blink away when cornered, and how you aim
far casts. Then they choose the attack most likely to land. A player who repeats the same pattern
finds the horde has learned it. The goal is a hard mode that is difficult to clear.

## How it works

The brain is a small **LM model** (a language model fine-tuned for decisions). It does not steer a
monster frame by frame. Instead it answers short **multiple-choice questions** about the moment,
with a probability for each answer. The game splits the work:

```mermaid
flowchart LR
  A["Game describes the moment<br/>2× a second"] --> B["LM model answers<br/>the decision questions"]
  B --> C["A tactic for each monster"]
  C --> D["Game code turns it into<br/>paths, lead points, timing"]
  D --> A
```

1. **The game describes the moment:** the player's position and speed, recent dodges, armed spell
   and cooldowns, health, and where each monster is.
2. **The LM model walks the decision tree** for each monster (below) and picks a tactic.
3. **The game turns the tactic into movement.** Lead points, timing and paths are computed by code,
   because geometry is something code does exactly and a language model does not.

## Decision trees

Each diamond is a question the LM model answers from the description of the moment. Each box is the
tactic the monster then carries out. The questions stay the same; training changes *how well* the
model answers them for each player.

### Melee monsters — Skeleton Minion and Skeleton Warrior

They close in and swing. The Brute's 18% armour makes it the shield: when both are on the field,
the Brute walks in front and the Imps follow in its shadow.

```mermaid
flowchart TD
  Q1{"Does the player have<br/>a spell armed?"}
  Q1 -->|"far cast"| T1["Spread out —<br/>one circle can't catch everyone"]
  Q1 -->|"line cast"| T2["Step off the aim line"]
  Q1 -->|"nothing ready"| Q2{"Is the player hurt<br/>or sitting to heal?"}
  Q2 -->|yes| T3["Rush in now"]
  Q2 -->|no| Q3{"Where is the player going?"}
  Q3 -->|"coming at me"| T4["Hold, swing as they arrive"]
  Q3 -->|"kiting in a circle"| T5["Cut across the circle"]
  Q3 -->|"towards a wall or corner"| T6["Close in from both sides"]
  Q3 -->|"standing still"| T7["Close in and swing"]
```

### Ranged monster — Skeleton Mage

It never closes; it fires a dodgeable bolt from 11 m. Its job is to make standing still costly.

```mermaid
flowchart TD
  Q1{"How far away<br/>is the player?"}
  Q1 -->|"too close, under 6 m"| T1["Back off to 11 m"]
  Q1 -->|"out of range or behind cover"| T2["Move to a clear line of sight,<br/>away from the other wisps"]
  Q1 -->|"in range"| Q2{"How is the player moving?"}
  Q2 -->|"straight line"| T3["Lead the bolt to where<br/>they will be"]
  Q2 -->|"zig-zagging"| Q3{"Is a dodge or blink<br/>about to end?"}
  Q3 -->|yes| T4["Fire at the landing spot"]
  Q3 -->|no| T5["Hold fire, wait<br/>for them to stop"]
  Q2 -->|"stopped to cast or sit"| T6["Fire now"]
```

### Heavy monster — Bone Colossus

Slow, 30% armour, slams the floor for area damage. It controls space rather than chasing.

```mermaid
flowchart TD
  Q1{"Is the player inside<br/>the slam radius?"}
  Q1 -->|yes| Q2{"Is the player's<br/>Blink Strike ready?"}
  Q2 -->|"no"| T1["Slam now"]
  Q2 -->|"yes"| T2["Wind up, slam where<br/>they are about to land"]
  Q1 -->|no| Q3{"Are other monsters<br/>closing on the player?"}
  Q3 -->|yes| T3["Block the player's<br/>escape route"]
  Q3 -->|no| Q4{"Is the player kiting?"}
  Q4 -->|yes| T4["Walk to the open side<br/>of the arena, herd them"]
  Q4 -->|no| T5["Walk straight in"]
```

### Boss — the Emberwyrm

Two phases, read off its health bar: grounded (bite and tail sweep) above half health, airborne
(fire breath) below.

```mermaid
flowchart TD
  Q0{"Health above half?"}

  Q0 -->|"yes — grounded"| G1{"Where is the player?"}
  G1 -->|"close, in front"| G2{"Is the player about<br/>to blink away?"}
  G2 -->|yes| B1["Feint: rear back,<br/>bite at the landing spot"]
  G2 -->|no| B2["Bite"]
  G1 -->|"close, at the sides or behind"| B3["Tail sweep"]
  G1 -->|"mid range"| G3{"Is a big spell<br/>cooling down?"}
  G3 -->|yes| B4["Charge in now"]
  G3 -->|no| B5["Stalk, cut off<br/>the escape route"]
  G1 -->|"far, kiting"| B6["Trot to the side the<br/>player keeps running to"]

  Q0 -->|"no — airborne"| A1{"How is the player moving?"}
  A1 -->|"straight line"| F1["Breathe ahead of them,<br/>lead the jet"]
  A1 -->|"stopped to cast or sit"| F2["Breathe right on them"]
  A1 -->|"zig-zagging"| F3["Sweep the jet across<br/>their path"]
  A1 -->|"behind cover"| F4["Circle to see them,<br/>then breathe"]
  F1 & F2 & F3 & F4 --> A2{"Is the player low on health<br/>with no potions left?"}
  A2 -->|yes| F5["Hold the breath longer"]
  A2 -->|no| F6["Short burst, reposition"]
```

## Training

The LM model learns from games played in this arena:

1. **Play and record.** Each moment becomes a record: the situation, the answer chosen at each
   question, and what happened over the next 0.5–2 seconds.
2. **Label by hindsight.** Once we know where the player actually went, we can mark which answer
   *would have* landed the attack. Those become the right answers.
3. **Fine-tune** the LM model on the records.
4. **Measure by playing.** Win rates of trained monsters against the hand-written ones, over the
   same waves.

### Situations to train on

The model is only as good as the situations it has seen. Examples (this list is still growing):

| Situation | What a smart horde should learn |
| --- | --- |
| Player kites in a circle | Cut across the circle instead of following |
| Player blinks away when cornered | Hold a monster back to cover the landing spot |
| Big spell is cooling down | Commit to the attack now |
| Far cast is armed | Spread out so one circle cannot catch everyone |
| Player sits to heal | Rush before health comes back |
| Player hides behind a wall or prop | Split up and come round both sides |
| One monster left, low health | Retreat and pull the player into the others |

## For game studios

The trained LM model is separate from this game's code. A game only has to describe its own
situations and map the tactics onto its own movement, so the same approach can be offered to
studios for their own products.
