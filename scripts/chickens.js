import {
  Dimension,
  DimensionType,
  ItemStack,
  system,
  world,
} from '@minecraft/server';
import { ChickenUtils } from './utils';

export function drop_chicken(
  chicken_ore,
  block_boost,
  spawn_item,
  quantity,
  min,
  max
) {
  const chickens = ChickenUtils.get_entities(chicken_ore);
  const item = new ItemStack(spawn_item, quantity);
  for (const ch of chickens) {
    let count = ch.entity.getDynamicProperty('count') ?? 0;
    let spawn = ch.entity.getDynamicProperty('spawn');

    let multiplicar;
    if (ch.block?.typeId === block_boost) {
      ch.entity.setDynamicProperty('boost', true);
      multiplicar = 0.2;
    } else {
      ch.entity.setDynamicProperty('boost', false);
      multiplicar = 1;
    }

    if (spawn === undefined) {
      const random = ChickenUtils.randomInt(min, max) * multiplicar;
      spawn = random;
      ch.entity.setDynamicProperty('spawn', spawn);
    }

    count++;
    ch.entity.setDynamicProperty('count', count);

    const status = ch.entity.getDynamicProperty('boost');
    if (status == true) {
      console.warn(`[Boost On: spawn: ${spawn}, count: ${count}]`);
    } else {
      console.warn(`[Boost Off: spawn: ${spawn}, count: ${count}]`);
    }

    if (spawn <= count) {
      world.getDimension(ch.dimension).spawnItem(item, ch.location);
      world
        .getDimension(ch.dimension)
        .playSound('mob.chicken.plop', ch.location);
      world
        .getDimension(ch.dimension)
        .spawnParticle('minecraft:crop_growth_emitter', {
          x: ch.location.x,
          y: ch.location.y + 0.5,
          z: ch.location.z,
        });
      ch.entity.setDynamicProperty('count', 0);

      const newSpawn = Math.floor(
        ChickenUtils.randomInt(min, max) * multiplicar
      );

      ch.entity.setDynamicProperty('spawn', newSpawn);
    }
  }
}
