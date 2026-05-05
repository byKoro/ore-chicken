import {
  Dimension,
  DimensionType,
  ItemStack,
  system,
  world,
} from '@minecraft/server';
import { utils } from './utils';
const { get_entities, isActive, randomInt, detectItem } = utils;

export class ChickensUtils {
  static drop_chicken(config) {
    const { entity, block, item, quantity, min, max } = config;
    const chickens = get_entities(entity);
    const itemSpawn = new ItemStack(item, quantity);

    for (const ch of chickens) {
      if (!isActive(ch.location)) {
        continue;
      }
      if (!ch.entity.hasComponent('is_baby')) {
        let count = ch.entity.getDynamicProperty('count') ?? 0;
        let spawn = ch.entity.getDynamicProperty('spawn');

        const isBlock = block.includes(ch.block?.typeId);

        const lastBoost = ch.entity.getDynamicProperty('boost');

        if (lastBoost !== isBlock) {
          spawn = undefined;
          ch.entity.setDynamicProperty('boost', isBlock);
        }

        const multiplicar = isBlock ? 0.2 : 1;

        if (spawn === undefined) {
          spawn = Math.floor(randomInt(min, max) * multiplicar);
          ch.entity.setDynamicProperty('spawn', spawn);
        }

        count++;
        if (spawn <= count) {
          try {
            const dimension = world.getDimension(ch.dimension);

            dimension.spawnItem(itemSpawn, ch.location);
            dimension.playSound('mob.chicken.plop', ch.location);

            dimension.spawnParticle('minecraft:crop_growth_emitter', {
              x: ch.location.x,
              y: ch.location.y + 0.5,
              z: ch.location.z,
            });

            count = 0;

            spawn = Math.floor(ChickenUtils.randomInt(min, max) * multiplicar);

            ch.entity.setDynamicProperty('spawn', spawn);
          } catch {}
        }
        ch.entity.setDynamicProperty('count', count);
      }
    }
  }

  static convert_chicken(config) {
    world.afterEvents.playerInteractWithEntity.subscribe(data => {
      const player = data.player;
      const item = data.itemStack;
      const mob = data.target;
      const { itemConvert, entityToConvert, entity, sound } = config;
      for (const itemC of itemConvert) {
        if (item?.typeId == itemC && mob.typeId == entityToConvert) {
          const newMob = mob.dimension.spawnEntity(entity, mob.location);
          const rot = mob.getRotation();
          const loc = mob.location;
          newMob.setRotation(rot);
          //newMob.runCommand(`tp @s ${loc.x} ${loc.y} ${loc.z} ${rot.y} ${rot.x}`);
          newMob.dimension.spawnParticle(
            'minecraft:ice_evaporation_emitter',
            newMob.location
          );
          if (sound) {
            player.playSound(sound, newMob.location);
          }
          newMob.triggerEvent('minecraft:ageable_grow_up');
          mob.remove();
        }
      }
    });
  }

  static oxidation(config, timeInMinutes) {
    const interval = timeInMinutes;

    system.runInterval(() => {
      const dimensions = ['overworld', 'nether', 'the_end'];

      for (const dimId of dimensions) {
        const dimension = world.getDimension(dimId);

        const chickens = dimension.getEntities({
          type: config.entity,
        });

        for (const c of chickens) {
          if (c.getProperty('oc:wax') == false) {
            let stage = c.getProperty('oc:oxidation') ?? 0;

            const chance = Math.random();

            if (stage < 3 && chance < 0.2) {
              const newStage = stage + 1;
              c.setProperty('oc:oxidation', newStage);

              if (newStage === 3) {
                c.triggerEvent('oc:become_statue');
              }
            }
          }
        }
      }
    }, interval);
  }

  static waxOn(config) {
    world.afterEvents.playerInteractWithEntity.subscribe(interact => {
      const player = interact.player;
      const item = interact.itemStack;
      const target = interact.target;
      const { entity, itemFilter, waxProperty, stageProperty } = config;

      if (!item) return;
      if (target.typeId !== entity) return;

      let stage = target.getProperty(stageProperty);
      const waxed = target.getProperty(waxProperty);
      // cera
      if (item.typeId == itemFilter) {
        if (target.getProperty(waxProperty) == false) {
          target.setProperty(waxProperty, true);
        }
        // machado
      } else if (item?.typeId.endsWith('_axe')) {
        if (stage > 0) {
          target.setProperty(stageProperty, stage - 1);
        }
      }
    });
  }
}
