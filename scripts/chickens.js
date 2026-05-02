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
    if (!ch.entity.hasComponent('is_baby')) {
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
        try {
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
        } catch (e) {
          continue;
        }
      }
    }
  }
}

export function convert_chicken(config) {
  world.afterEvents.playerInteractWithEntity.subscribe(data => {
    const player = data.player;
    const item = data.itemStack;
    const mob = data.target;
    if (
      item?.typeId == config.itemConvert &&
      mob.typeId == config.entityToConvert
    ) {
      const newMob = mob.dimension.spawnEntity(config.entity, mob.location);
      const rot = mob.getRotation();
      const loc = mob.location;
      newMob.setRotation(rot);
      newMob.runCommand(`tp @s ${loc.x} ${loc.y} ${loc.z} ${rot.y} ${rot.x}`);
      newMob.dimension.spawnParticle(
        'minecraft:ice_evaporation_emitter',
        newMob.location
      );
      newMob.triggerEvent('minecraft:ageable_grow_up');
      mob.remove();
    }
  });
}

export const Chickens = {
  gold: {
    entity: 'oc:gold_chicken',
    block: 'minecraft:gold_block',
    item: 'minecraft:gold_ingot',
    quantity: 1,
    min: 180,
    max: 300,
    itemConvert: 'minecraft:gold_block',
    entityToConvert: 'minecraft:chicken',
  },
  iron: {
    entity: 'oc:iron_chicken',
    block: 'minecraft:iron_block',
    item: 'minecraft:iron_ingot',
    quantity: 1,
    min: 180,
    max: 300,
    itemConvert: 'minecraft:iron_block',
    entityToConvert: 'minecraft:chicken',
  },
  coal: {
    entity: 'oc:coal_chicken',
    block: 'minecraft:coal_block',
    item: 'minecraft:coal',
    quantity: 1,
    min: 180,
    max: 300,
    itemConvert: 'minecraft:coal_block',
    entityToConvert: 'minecraft:chicken',
  },
  lapis: {
    entity: 'oc:lapis_chicken',
    block: 'minecraft:lapis_block',
    item: 'minecraft:lapis_lazuli',
    quantity: 1,
    min: 180,
    max: 300,
    itemConvert: 'minecraft:lapis_block',
    entityToConvert: 'minecraft:chicken',
  },
};
