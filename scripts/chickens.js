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

export function oxidation(config, timeInMinutes) {
  const interval = 20 * 60; // roda a cada 1 minuto

  system.runInterval(() => {
    const dimensions = ['overworld', 'nether', 'the_end'];

    for (const dimId of dimensions) {
      const dimension = world.getDimension(dimId);

      const chickens = dimension.getEntities({
        type: config.entity,
      });

      for (const c of chickens) {
        let stage = c.getProperty('oc:oxidation') ?? 0;

        const chance = Math.random();

        if (stage < 3 && chance < 0.2) {
          c.setProperty('oc:oxidation', stage + 1);
        }
      }
    }
  }, interval);
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
  amethyst: {
    entity: 'oc:amethyst_chicken',
    block: 'minecraft:amethyst_block',
    item: 'minecraft:amethyst_shard',
    quantity: 1,
    min: 180,
    max: 300,
    itemConvert: 'minecraft:budding_amethyst',
    entityToConvert: 'minecraft:chicken',
  },
  redstone: {
    entity: 'oc:redstone_chicken',
    block: 'minecraft:redstone_block',
    item: 'minecraft:redstone',
    quantity: 1,
    min: 180,
    max: 300,
    itemConvert: 'minecraft:redstone_block',
    entityToConvert: 'minecraft:chicken',
  },
  copper: {
    entity: 'oc:copper_chicken',
    block: 'minecraft:copper_block',
    item: 'minecraft:copper_ingot',
    quantity: 1,
    min: 180,
    max: 300,
    itemConvert: 'minecraft:copper_block',
    entityToConvert: 'minecraft:chicken',
  },
  diamond: {
    entity: 'oc:diamond_chicken',
    block: 'minecraft:diamond_block',
    item: 'minecraft:diamond',
    quantity: 1,
    min: 180,
    max: 300,
    itemConvert: 'minecraft:diamod',
    entityToConvert: 'minecraft:chicken',
  },
};
