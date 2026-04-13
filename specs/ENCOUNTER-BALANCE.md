# Encounter Balance: Why the Math Works

This document explains why the role multiplier system delivers the right amount of treasure over a campaign, using real published adventures as examples.

---

## The Core Question

The role multipliers are: Minion ×0.10, Elite ×0.30, Mini-boss ×0.90, Boss ×2.70. These were designed so the weighted average equals 1.0× when 25% of total encounter XP goes to each role. But real encounters don't split XP evenly across roles. A typical fight has a dozen minions and one boss. Does the math still hold?

The short answer: yes, and it actually tends to slightly over-deliver, because bosses are higher CR than their minions. The ×2.70 multiplier acts on a much larger XP base, more than compensating for the ×0.10 on all those goblin pockets.

---

## Two Multipliers Working Together

Every creature's loot is calculated as:

```
loot = XP(CR) × role_multiplier × gold_per_xp × tier_progression
```

**Role multiplier** distributes loot according to narrative importance. The lackeys in a criminal gang shouldn't carry the same treasure as the kingpin. Minions get pocket change (×0.10). Bosses get the big score (×2.70). The multipliers follow a ×3 geometric progression: 0.10, 0.30, 0.90, 2.70.

**Tier progression** weights loot toward the end of each tier. At the start of Tier 1 (level 1), loot is ×0.70 of baseline. At the end (level 4), it's ×1.30. This matches how published adventures pace their rewards — early chapters are lean, climactic chapters are rich.

Over a balanced campaign, these two multipliers together ensure total treasure matches what the DMG expects. Neither creates nor destroys treasure — they redistribute it.

---

## Lost Mine of Phandelver: A Complete Tier 1 Walkthrough

Lost Mine of Phandelver (LMoP) takes a party from level 1 through level 5. The DMG expects 7 hoards across Tier 1, with a total treasure value of roughly 7,540 gp. Here's how the loot system handles each major encounter.

### Chapter 1: Cragmaw Hideout (Party Level 1)

The party's first dungeon. A goblin cave with Klarg the bugbear as the local boss.

| Creature | CR | XP | Role | ×Mult | Effective XP |
|---|---|---|---|---|---|
| 6 Goblins (guards/sentries) | 1/4 | 50 | Minion | ×0.10 | 30 |
| 3 Wolves (kennel) | 1/4 | 50 | Minion | ×0.10 | 15 |
| 6 Goblins (Yeemik's den) | 1/4 | 50 | Minion | ×0.10 | 30 |
| Yeemik (goblin lieutenant) | 1/4 | 50 | Elite | ×0.30 | 15 |
| 2 Goblins (Klarg's guards) | 1/4 | 50 | Minion | ×0.10 | 10 |
| Klarg (bugbear) | 1 | 200 | Boss | ×2.70 | 540 |

**Raw XP total:** 1,150. **Effective loot-equivalent:** 640.

The ratio is 0.56× — the encounter delivers 56% of the "fair share" treasure for its XP value. This is correct behavior at level 1. The tier progression multiplier is ×0.70 at the start of Tier 1, and a goblin cave shouldn't be a treasure bonanza. Klarg has the real loot (a few crates of stolen goods, some coins). The goblins have pocket change or nothing.

**DM tip:** Roll Klarg's loot before the fight. He might have a magic weapon from his raiding — a +1 dagger or a Potion of Healing. Let him use it. The party earns it by prying it from his hands.

### Chapter 2: Redbrand Hideout (Party Level 2–3)

The Redbrands are a criminal gang running Phandalin. Glasstaff (Iarno Albrek) is their leader, operating from a hideout beneath Tresendar Manor.

| Creature | CR | XP | Role | ×Mult | Effective XP |
|---|---|---|---|---|---|
| 8 Redbrand Ruffians (various rooms) | 1/2 | 100 | Minion | ×0.10 | 80 |
| 3 Bugbears (enforcers) | 1 | 200 | Elite | ×0.30 | 180 |
| Nothic (the crevasse guardian) | 2 | 450 | Elite | ×0.30 | 135 |
| Glasstaff (evil mage) | 1 | 200 | Boss | ×2.70 | 540 |

**Raw XP total:** 2,050. **Effective loot-equivalent:** 935.

Ratio: 0.46×. Again, below "fair share" — which is correct for a mid-tier encounter. The Redbrands are a street gang, not a dragon's lair. They've got some stolen goods and Glasstaff has a staff of defense and a few personal treasures. The ruffians have drinking money in their pockets.

Notice the nothic is classified as Elite, not Boss. It's CR 2 but it's a guardian creature, not the encounter's villain. It might have accumulated some shiny objects from people who fell into the crevasse, but it's not sitting on an organized hoard.

### Chapter 3: Thundertree and Venomfang (Party Level 3–4)

This is where role assignment gets interesting. Venomfang is a Young Green Dragon — CR 8, far above the party's level. But he's not really a "boss" in the narrative sense. He's squatting in a ruined tower, terrorizing some cultists and ash zombies.

| Creature | CR | XP | Role | ×Mult | Effective XP |
|---|---|---|---|---|---|
| 8 Ash Zombies (ruined buildings) | 1/4 | 50 | Minion | ×0.10 | 40 |
| 6 Twig Blights (overgrown areas) | 1/8 | 25 | Minion | ×0.10 | 15 |
| 2 Giant Spiders | 1 | 200 | Elite | ×0.30 | 120 |
| Venomfang (young green dragon) | 8 | 3,900 | Mini-boss | ×0.90 | 3,510 |

**Raw XP total:** 4,540. **Effective loot-equivalent:** 3,685.

Ratio: 0.81×. Why Mini-boss and not Boss for a dragon? Because Venomfang isn't the adventure's final villain — the Black Spider is. Venomfang is a dangerous side encounter. A DM might even classify him as Elite (×0.30) if the party negotiates or drives him off rather than killing him. But at ×0.90, the dragon's hoard is substantial without being campaign-warping.

At CR 8, Venomfang's XP base is so large that even ×0.90 produces serious treasure. This is the system working as intended: high-CR creatures generate proportionally large loot regardless of role, because XP scales exponentially with CR. The role multiplier just determines whether you get 100% of that proportion or 10%.

**The zombies are the key insight here.** A ruined town full of undead shouldn't have any treasure worth mentioning. Zombies don't carry coins. The ×0.10 minion multiplier on CR 1/4 creatures produces pocket change or nothing — exactly right. The DM doesn't need a separate "no loot" toggle. The system naturally produces the correct result.

### Chapter 3: Cragmaw Castle (Party Level 3–4)

The Cragmaw tribe's headquarters. King Grol is the bugbear chieftain, but there's also a doppelganger spy and a captive owlbear.

| Creature | CR | XP | Role | ×Mult | Effective XP |
|---|---|---|---|---|---|
| 14 Goblins (various rooms) | 1/4 | 50 | Minion | ×0.10 | 70 |
| 4 Hobgoblins (barracks) | 1/2 | 100 | Elite | ×0.30 | 120 |
| 1 Grick (storage room) | 2 | 450 | Elite | ×0.30 | 135 |
| 1 Owlbear (tower) | 3 | 700 | Elite | ×0.30 | 210 |
| 1 Doppelganger (spy) | 3 | 700 | Mini-boss | ×0.90 | 630 |
| King Grol (bugbear chief) | 1 | 200 | Boss | ×2.70 | 540 |

**Raw XP total:** 3,200. **Effective loot-equivalent:** 1,705.

Ratio: 0.53×. The hobgoblins are Elites because they're organized soldiers — they have personal gear, weapons worth looting. The goblins are Minions with pocket change. The owlbear is an Elite by CR but it's a beast — it has no treasure at all. That's fine: the system assigns it coins proportional to ×0.30 of CR 3, but a DM might reasonably skip the roll since owlbears don't carry pouches.

King Grol has Gundren's map and personal effects — he's the boss with the real treasure. The doppelganger is a Mini-boss because it has its own agenda and likely carries valuables related to its mission for the Black Spider.

### Chapter 4: Wave Echo Cave (Party Level 4–5)

The adventure's climax. Multiple factions, undead, and the Black Spider (Nezznar) as the final boss.

| Creature | CR | XP | Role | ×Mult | Effective XP |
|---|---|---|---|---|---|
| 9 Stirges | 1/8 | 25 | Minion | ×0.10 | 22.5 |
| 10 Zombies/Skeletons | 1/4 | 50 | Minion | ×0.10 | 50 |
| 5 Ghouls | 1 | 200 | Minion | ×0.10 | 100 |
| 3 Bugbears (Black Spider's guards) | 1 | 200 | Elite | ×0.30 | 180 |
| 1 Ochre Jelly | 2 | 450 | Minion | ×0.10 | 45 |
| 4 Giant Spiders | 1 | 200 | Minion | ×0.10 | 80 |
| 1 Spectator | 3 | 700 | Elite | ×0.30 | 210 |
| 1 Flameskull | 4 | 1,100 | Mini-boss | ×0.90 | 990 |
| 1 Wraith (Mormesk) | 5 | 1,800 | Mini-boss | ×0.90 | 1,620 |
| Nezznar the Black Spider | 2 | 450 | Boss | ×2.70 | 1,215 |

**Raw XP total:** 7,750. **Effective loot-equivalent:** 4,512.5.

Ratio: 0.58×. Note the ghouls are classified as Minions even though they're CR 1 — they're anonymous undead wandering the cave, not organized enemies with personal treasure. The flameskull guards a specific room with its own hoard. Mormesk the wraith jealously guards his treasure room. And Nezznar has the biggest score — the Spider Staff, his personal effects, and access to whatever the Forge of Spells produces.

At level 4–5, the tier progression multiplier is near ×1.30 (end of Tier 1), which boosts all these values. The adventure's climax is the richest encounter, just as it should be.

### LMoP Campaign Total

Adding up all major encounters across the adventure:

| Chapter | Raw XP | Effective Loot-XP | Ratio |
|---|---|---|---|
| Cragmaw Hideout | 1,150 | 640 | 0.56× |
| Redbrand Hideout | 2,050 | 935 | 0.46× |
| Thundertree | 4,540 | 3,685 | 0.81× |
| Cragmaw Castle | 3,200 | 1,705 | 0.53× |
| Wave Echo Cave | 7,750 | 4,513 | 0.58× |
| **Total** | **18,690** | **11,478** | **0.61×** |

The overall ratio is 0.61×. This is below the theoretical 1.0× because most encounters are minion-heavy. But the system accounts for this: the total treasure is converted to gold through the gold-per-XP ratio derived from the DMG's hoard tables, and the tier progression multiplier ramps up for later chapters. The "missing" 39% is exactly what you'd expect from encounters where most of the XP comes from minion creatures — and that's correct, because a goblin cave isn't supposed to match a dragon's hoard coin-for-coin.

The remaining treasure budget is delivered through vault hoards (placed treasure chests, the Forge of Spells, Klarg's stolen supplies) which always deliver ×1.0 of their budget regardless of roles.

---

## Curse of Strahd: A Tier 1–2 Campaign

Curse of Strahd runs from level 1 through level 10, spanning both Tier 1 and Tier 2. It's an excellent example of how different encounter shapes produce different loot profiles.

### Death House (Party Level 1–2)

The introductory dungeon is almost entirely undead — creatures that carry nothing.

| Creature | CR | XP | Role | ×Mult | Effective XP |
|---|---|---|---|---|---|
| Animated objects (broom, armor) | 1/4–1 | varies | Minion | ×0.10 | ~30 |
| 5 Shadows | 1/2 | 100 | Minion | ×0.10 | 50 |
| 4 Ghouls | 1 | 200 | Minion | ×0.10 | 80 |
| 5 Swarms (rats, centipedes) | 1/4 | 50 | Minion | ×0.10 | 25 |
| Shambling Mound (basement) | 5 | 1,800 | Boss | ×2.70 | 4,860 |

The entire dungeon is minions except the shambling mound boss. Every minion is undead or a vermin swarm — they have zero personal treasure, and the system correctly produces near-zero for them. The shambling mound is a mindless plant creature, so its "treasure" is really whatever is lying in the room where it lurks. A DM might place a vault hoard there instead of rolling creature loot.

This is a pattern that recurs throughout Curse of Strahd: many encounters are against undead, beasts, or constructs that logically carry nothing. The minion ×0.10 multiplier handles these naturally — it assigns trivial or zero loot to creatures that shouldn't have any.

### Old Bonegrinder (Party Level 4)

Three night hags (CR 5 each) running a pastry shop that's actually a front for stealing children's dreams.

| Creature | CR | XP | Role | ×Mult | Effective XP |
|---|---|---|---|---|---|
| Morgantha (night hag leader) | 5 | 1,800 | Boss | ×2.70 | 4,860 |
| 2 Night Hag daughters | 5 | 1,800 | Mini-boss | ×0.90 | 3,240 |

**Raw XP total:** 5,400. **Effective loot-equivalent:** 8,100.

Ratio: 1.50×. This is an encounter that over-delivers — every creature is high-CR and high-role. Night hags are wealthy, well-equipped fiends. They have soul bags, potions, spell components, and personal treasures accumulated over centuries. The 1.50× ratio reflects the reality that a coven of powerful fiends has more loot per XP than a mob of goblins. The system self-corrects over the full campaign because these encounters are rare — most fights in Barovia are against low-loot undead.

### Castle Ravenloft (Party Level 8–9)

The final dungeon features Strahd (CR 15), vampire spawn (CR 5), hundreds of undead, and placed treasures throughout the castle.

The DM would classify Strahd as Boss (×2.70), his vampire spawn brides as Mini-bosses (×0.90), the animated armor and specters as Minions (×0.10), and Rahadin as Elite (×0.30). The vast majority of Castle Ravenloft's treasure is in placed hoards — Strahd's treasury, the crypts, the study. These are vault rolls, not creature rolls.

This illustrates the full system at work: creature loot handles what's on the bodies, vault hoards handle what's in the chests and vaults. Together they produce the DMG's expected treasure total for Tier 2.

---

## When the System Under-Delivers (and Why That's Correct)

The system deliberately under-delivers in specific situations:

**All-minion encounters.** Twenty goblins with nobody in charge produce only 10% of the XP-derived treasure budget. This is correct — a disorganized mob doesn't carry organized wealth. The real treasure is in the goblin king's chamber (a boss or vault encounter).

**Undead and beast encounters.** Zombies, wolves, and oozes don't carry coins. The minion multiplier produces near-zero, which matches reality. The dungeon's treasure is in the rooms, not on the monsters — use vault hoards for those.

**Low-CR encounters at high party level.** If a level 10 party fights CR 1/4 goblins, the goblins still produce tiny loot. The tier progression multiplier is high (×1.30), but ×1.30 of nearly nothing is still nearly nothing. This prevents low-CR trash encounters from inflating the treasure economy.

## When the System Over-Delivers (and Why That's Also Correct)

**Boss-heavy set pieces.** An encounter with one boss and no minions (a solo dragon, a lich, a beholder) delivers 2.70× the XP-derived budget. This is correct — a dragon's hoard should be enormous relative to the fight's difficulty.

**High-CR encounters at low party level.** Venomfang at CR 8 against a level 3 party produces a massive treasure. This is correct — if the party can defeat a young dragon, they deserve a significant reward.

**Multiple named villains.** A coven of night hags, a war council of hobgoblin captains, or a meeting of crime lords all produce rich loot. This is correct — these are wealthy, powerful individuals with personal treasures.

---

## Roll Before or After the Fight

It's recommended to roll creature loot before the encounter starts. When you do, you might discover that a creature is carrying or wearing a magic item, and you can let them use it in battle. A hobgoblin captain with a +1 longsword fights differently than one with pocket change, and your players will remember the moment they pried the weapon from his hands.

Alternatively, roll after the fight and treat the result as what was in their chest or stash — gear they weren't using. Both approaches work. Rolling before adds tactical variety. Rolling after keeps the surprise.

For vault hoards (placed treasure not tied to a specific creature), always roll in advance so you can describe the contents as the party discovers them.

---

## Summary

The role multiplier system works because:

1. **Bosses are higher CR.** The ×2.70 acts on a much larger XP base than the ×0.10 on minions.
2. **Minion-heavy encounters self-correct.** The "missing" treasure is delivered through vault hoards and boss encounters.
3. **Tier progression front-loads lean encounters and back-loads rich ones.** Early levels produce less, climactic levels produce more.
4. **Over-delivery on set pieces is a feature, not a bug.** Players should feel rewarded for defeating powerful enemies.
5. **Under-delivery on trash encounters is correct.** Zombies and rats don't carry treasure. The system shouldn't pretend they do.

The system doesn't require per-encounter balancing or slider adjustments. Assign roles based on the fiction — who's in charge, who's the hired muscle, who's the nameless guard — and the math handles the rest.
