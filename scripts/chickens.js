import {
  Dimension,
  DimensionType,
  ItemStack,
  system,
  world,
} from '@minecraft/server';
import { ChickenUtils } from './utils';

export function drop_chicken(config) {
  const chicken_ore = config.entity;
  const block_boost = config.block;
  const spawn_item = config.item;
  const quantity = config.quantity;
  const min = config.min;
  const max = config.max;
  const chickens = ChickenUtils.get_entities(chicken_ore);
  const item = new ItemStack(spawn_item, quantity);
  for (const ch of chickens) {
    let count = ch.entity.getDynamicProperty('count') ?? 0;
    let spawn = ch.entity.getDynamicProperty('spawn');

    let multiplicar;
    if (ch.block?.typeId === block_boost) {
      multiplicar = 0.2;
    } else {
      multiplicar = 1;
    }

    if (spawn === undefined) {
      const random = ChickenUtils.randomInt(min, max) * multiplicar;
      spawn = random;
      ch.entity.setDynamicProperty('spawn', spawn);
    }

    count++;
    ch.entity.setDynamicProperty('count', count);

    if (spawn <= count) {
      const dimension = world.getDimension(ch.dimension);
      dimension.spawnItem(item, ch.location);
      dimension.playSound('mob.chicken.plop', ch.location);
      dimension.spawnParticle('minecraft:crop_growth_emitter', {
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

export const Chicken = {
  gold: {
    entity: 'oc:gold_chicken',
    block: 'minecraft:gold_block',
    item: 'minecraft:gold_ingot',
    quantity: 1,
    min: 180,
    max: 300,
  },
};
