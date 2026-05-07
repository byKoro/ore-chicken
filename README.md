# Ore Chickens — Developer Documentation

> Documentation for contributors who want to add new chickens, modify drops, or adjust configurations.

<!-- Banner image -->
<!-- ![Ore Chickens Banner](docs/images/banner.png) -->

---

## Table of Contents

- [Project Structure](#project-structure)
- [How It Works](#how-it-works)
- [Adding a New Chicken](#adding-a-new-chicken)
  - [1. Register in the config](#1-register-in-the-config)
  - [2. Behavior Pack entity](#2-behavior-pack-entity)
  - [3. Loot table (death drops)](#3-loot-table-death-drops)
  - [4. Resource Pack entity](#4-resource-pack-entity)
  - [5. Register in main.js](#5-register-in-mainjs)
  - [6. Translations](#6-translations)
- [Changing Drops or Spawn Intervals](#changing-drops-or-spawn-intervals)
- [Changing the Conversion Recipe](#changing-the-conversion-recipe)
- [The Copper Chicken — Special Mechanics](#the-copper-chicken--special-mechanics)
- [File Reference](#file-reference)

---

## Project Structure

```
Ore Chickens BP/                  ← Behavior Pack
├── entities/                     ← One .behavior.json per chicken
├── loot_tables/entities/         ← Death drops per chicken
├── scripts/
│   ├── main.js                   ← Entry point, wires everything together
│   ├── chickens_config.js        ← Central config for all chickens
│   ├── chickens.js               ← Core logic (drop, convert, oxidation)
│   ├── copper_chicken.js         ← Copper-specific statue logic
│   └── utils.js                  ← Shared helpers
└── manifest.json

Ore Chickens RP/                  ← Resource Pack
├── entity/                       ← Client entity definitions
├── models/entity/                ← .geo.json models
├── textures/entity/              ← Skin PNGs
├── textures/items/spawn_eggs/    ← Spawn egg icons
├── animations/                   ← Walk/idle animations
└── texts/                        ← en_US.lang, pt_BR.lang
```

---

## How It Works

Every resource chicken follows the same lifecycle:

1. **Conversion** — A player right-clicks a vanilla (or ore) chicken while holding a specific block item. The chicken is replaced by the ore variant.
2. **Passive drops** — A `system.runInterval` loop runs every 20 ticks (~1 second). For each loaded adult chicken it increments an internal counter. When the counter reaches a random value between `min` and `max`, the configured item is spawned at the chicken's feet.
3. **Block boost** — If the chicken is standing on its matching ore block, the drop timer is multiplied by `0.2` (5× faster).
4. **Death drops** — Handled by a standard loot table referenced in the behavior file.
5. **Breeding** — The chicken breeds with its own kind and is fed with the same block used for conversion.

<!-- Diagram placeholder -->
<!-- ![Lifecycle Diagram](docs/images/lifecycle.png) -->

---

## Adding a New Chicken

The steps below use a hypothetical **Ruby Chicken** as an example.

### 1. Register in the config

Open `scripts/chickens_config.js` and add a new entry to the `Chickens` object:

```js
// scripts/chickens_config.js
ruby: {
  entity: 'oc:ruby_chicken',           // Must match the BP entity identifier
  block: ['minecraft:nether_brick'],   // Block(s) that trigger the drop boost
  item: 'minecraft:nether_brick',      // Item spawned passively
  quantity: 1,                         // Items spawned per drop
  min: 180,                            // Minimum ticks between drops
  max: 300,                            // Maximum ticks between drops
  itemConvert: ['minecraft:nether_brick'], // Item(s) used to convert a chicken
  entityToConvert: 'minecraft:chicken',   // Target entity for conversion
},
```

**Key fields explained:**

| Field | Type | Description |
|---|---|---|
| `entity` | `string` | Full identifier of the new entity (`namespace:id`) |
| `block` | `string[]` | Block IDs under the chicken that activate the boost |
| `item` | `string` | Item ID dropped passively |
| `quantity` | `number` | Amount of items per passive drop |
| `min` / `max` | `number` | Tick range for the drop cooldown |
| `itemConvert` | `string[]` | Items the player must hold to trigger conversion |
| `entityToConvert` | `string` | The entity the player must right-click |
| `sound` *(optional)* | `string` | Sound played on conversion (see Netherite for reference) |

---

### 2. Behavior Pack entity

Create `entities/ruby_chicken.behavior.json`. Copy any existing file (e.g. `iron_chicken.behavior.json`) and replace every occurrence of `iron` with `ruby`. Pay attention to:

- `"identifier": "oc:ruby_chicken"`
- `"breed_items"` and `"feed_items"` — should use your conversion block.
- `"table": "loot_tables/entities/ruby_chicken.json"` — must point to the loot table you will create next.

```jsonc
// Minimal required structure
{
  "format_version": "1.16.0",
  "minecraft:entity": {
    "description": {
      "identifier": "oc:ruby_chicken",
      "runtime_identifier": "minecraft:chicken",
      "is_spawnable": true,
      "is_summonable": true
    },
    "component_groups": { /* copy from an existing chicken and rename */ },
    "components": { /* copy from an existing chicken */ },
    "events": { /* copy from an existing chicken */ }
  }
}
```

---

### 3. Loot table (death drops)

Create `loot_tables/entities/ruby_chicken.json`:

```json
{
  "pools": [
    {
      "rolls": 1,
      "entries": [
        {
          "type": "item",
          "name": "minecraft:nether_brick",
          "weight": 1,
          "functions": [
            {
              "function": "set_count",
              "count": 1
            }
          ]
        }
      ]
    }
  ]
}
```

To drop multiple item types on death, add more objects to the `entries` array with their own `weight` values.

---

### 4. Resource Pack entity

Create the following files in the RP:

| File | Purpose |
|---|---|
| `RP/entity/ruby_chicken.entity.json` | Links model, texture, and animations |
| `RP/models/entity/ruby_chicken.geo.json` | 3D model (Blockbench) |
| `RP/textures/entity/ruby_chicken.png` | Skin texture |
| `RP/textures/items/spawn_eggs/ruby_chicken_spawn_egg.png` | Spawn egg icon |
| `RP/animations/ruby_chicken.animation.json` | Walk and idle animations |

The entity client file (`ruby_chicken.entity.json`) must reference the correct identifiers:

```json
{
  "format_version": "1.10.0",
  "minecraft:client_entity": {
    "description": {
      "identifier": "oc:ruby_chicken",
      "textures": { "default": "textures/entity/ruby_chicken" },
      "geometry": { "default": "geometry.ruby_chicken" },
      "animations": {
        "move": "animation.ruby_chicken.move",
        "general": "animation.ruby_chicken.general",
        "look_at_target": "animation.common.look_at_target",
        "baby_transform": "animation.ruby_chicken.baby_transform"
      },
      "scripts": {
        "animate": [
          "general",
          { "move": "query.modified_move_speed" },
          "look_at_target",
          { "baby_transform": "query.is_baby" }
        ]
      },
      "render_controllers": ["controller.render.chicken"],
      "spawn_egg": { "texture": "ruby_chicken_spawn_egg" }
    }
  }
}
```

Register the spawn egg texture in `RP/textures/item_texture.json`:

```json
"ruby_chicken_spawn_egg": {
  "textures": "textures/items/spawn_eggs/ruby_chicken_spawn_egg"
}
```

---

### 5. Register in main.js

Open `scripts/main.js` and add the two required calls:

```js
// Inside the system.runInterval for passive drops
drop_chicken(Chickens.ruby);

// Outside the interval, for the conversion listener
convert_chicken(Chickens.ruby);
```

---

### 6. Translations

Add the display name to both language files:

```
# RP/texts/en_US.lang
entity.oc:ruby_chicken.name=Ruby Chicken

# RP/texts/pt_BR.lang
entity.oc:ruby_chicken.name=Galinha de Rubi
```

---

## Changing Drops or Spawn Intervals

All passive drop behavior is controlled in `scripts/chickens_config.js`. No script logic needs to change.

**To change the item dropped:**
```js
item: 'minecraft:diamond',  // Any valid item identifier
quantity: 2,                // Change quantity here
```

**To adjust how often it drops:**
```js
min: 100,   // Faster — minimum ticks
max: 200,   // Faster — maximum ticks
```

**To change the boost block:**
```js
block: ['minecraft:diamond_block'],  // Block that speeds up drops
```

The boost multiplies the cooldown by `0.2`, making the chicken drop items roughly 5× faster when standing on the specified block. This factor is hardcoded in `chickens.js` — search for `const multiplicar` to change it.

---

## Changing the Conversion Recipe

The conversion item is defined by `itemConvert` in the config. The entity the player must click is `entityToConvert`.

```js
// Example: require a diamond block to convert, target a gold chicken instead
itemConvert: ['minecraft:diamond_block'],
entityToConvert: 'oc:gold_chicken',
```

Multiple items can trigger the same conversion by adding more entries to `itemConvert`:

```js
itemConvert: ['minecraft:iron_block', 'minecraft:iron_ingot'],
```

The conversion logic lives in `ChickensUtils.convert_chicken()` inside `chickens.js`.

---

## The Copper Chicken — Special Mechanics

The Copper Chicken has additional behavior that does not exist on other chickens. This is handled by `scripts/copper_chicken.js` and the `oxidation()` method in `chickens.js`.

**Oxidation stages** (`oc:oxidation` entity property, 0–4):

| Value | State |
|---|---|
| 0 | Fresh copper |
| 1 | Slightly exposed |
| 2 | Weathered |
| 3 | Oxidized (triggers `oc:become_statue` event) |
| 4 | Fully oxidized — turns into a `oc:copper_chicken_statue_oxidized` block |

The oxidation check runs every **12000 ticks** (~10 minutes) and has a **20% random chance** to advance one stage. A chicken wearing wax (`oc:wax == true`) skips this entirely.

**The statue block** supports four oxidation variants, four cardinal directions, and multiple poses. These are registered in `BP/blocks/` and have corresponding models in `RP/models/blocks/`.

To adjust the oxidation rate, change the interval in `main.js`:

```js
oxidation(Chickens.copper, 12000); // Change 12000 to your desired tick interval
```

To change the advance probability, edit `chickens.js`:

```js
if (stage < 4 && chance < 0.2) { // Change 0.2 (20%) to your desired probability
```

---

## File Reference

| File | What to edit |
|---|---|
| `scripts/chickens_config.js` | Drop items, quantities, timers, conversion recipes |
| `scripts/main.js` | Register new chickens with `drop_chicken` and `convert_chicken` |
| `scripts/chickens.js` | Core drop/convert/oxidation logic |
| `scripts/copper_chicken.js` | Copper statue interaction logic |
| `BP/entities/<name>.behavior.json` | Breeding items, health, loot table reference |
| `BP/loot_tables/entities/<name>.json` | Items dropped on death |
| `RP/entity/<name>.entity.json` | Model, texture, animation references |
| `RP/texts/en_US.lang` | English display names |
| `RP/texts/pt_BR.lang` | Portuguese display names |
