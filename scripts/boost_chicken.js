import {
  Dimension,
  DimensionType,
  ItemStack,
  system,
  world,
} from '@minecraft/server';
import { ChickenUtils } from './utils';

export function Boost_chicken(
  chicken_boost,
  block_boost,
  spawn_item,
  quantity,
  min,
  max
) {
  const chickens = ChickenUtils.get_below_block(chicken_boost, block_boost);

  for (const ch of chickens) {
    const random = ChickenUtils.randomInt(min, max);
    let count = ch.entity.getDynamicProperty('count') ?? 0;
    let spawn = ch.entity.getDynamicProperty('spawn');
    const item = new ItemStack(spawn_item, quantity);
    console.warn(count);
    if (spawn === undefined) {
      spawn = random;
      ch.entity.setDynamicProperty('spawn', spawn);
    }
    console.warn(spawn);
    count++;

    ch.entity.setDynamicProperty('count', count);
    if (spawn <= count) {
      world.getDimension(ch.dimension).spawnItem(item, ch.location);
      ch.entity.setDynamicProperty('count', 0);
      const newSpawn = ChickenUtils.randomInt(min, max);
      ch.entity.setDynamicProperty('spawn', newSpawn);
    }
  }
}
