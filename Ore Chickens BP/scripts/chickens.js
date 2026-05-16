import {
  Dimension,
  DimensionType,
  ItemStack,
  system,
  world,
  BlockPermutation,
} from '@minecraft/server';

function yawToCardinal(yaw) {
  const n = ((yaw % 360) + 360) % 360; // normaliza para 0–360
  if (n < 45 || n >= 315) return 'south';
  if (n < 135) return 'west';
  if (n < 225) return 'north';
  return 'east';
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

export class ChickensUtils {
  static oxidation(config, intervalTicks) {
    system.runInterval(() => {
      const dimensions = ['overworld', 'nether', 'the_end'];

      for (const dimId of dimensions) {
        const dimension = world.getDimension(dimId);
        const chickens = dimension.getEntities({ type: config.entity });

        for (const c of chickens) {
          if (c.getProperty('oc:wax') == false) {
            let stage = c.getProperty('oc:oxidation') ?? 0;
            const chance = Math.random();

            if (stage < 4 && chance < 0.2) {
              const newStage = stage + 1;
              c.setProperty('oc:oxidation', newStage);

              if (newStage === 3) {
                c.triggerEvent('oc:become_statue');
              }
            }

            if (stage == 4) {
              const loc = c.location;
              const rot = c.getRotation();

              const blockLoc = {
                x: Math.floor(loc.x),
                y: Math.floor(loc.y),
                z: Math.floor(loc.z),
              };

              const direction = yawToCardinal(rot.y);
              const pose = randomInt(0, 3); // 0–3 inclusive

              system.run(() => {
                try {
                  const block = dimension.getBlock(blockLoc);
                  if (!block) return;

                  const permutation = BlockPermutation.resolve(
                    'oc:copper_chicken_statue_oxidized',
                    {
                      'minecraft:cardinal_direction': direction,
                      'oc:pose': 0,
                    }
                  );

                  block.setPermutation(permutation);

                  dimension.spawnParticle('minecraft:large_explosion_emitter', {
                    x: loc.x,
                    y: loc.y + 0.5,
                    z: loc.z,
                  });
                } catch (e) {
                  console.warn('[oxidation] falha ao colocar bloco:', e);
                }

                c.remove();
              });
            }
          }
        }
      }
    }, intervalTicks);
  }
}
