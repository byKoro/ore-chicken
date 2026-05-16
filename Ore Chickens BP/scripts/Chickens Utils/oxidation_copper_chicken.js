import { Dimension, system, BlockPermutation, world } from '@minecraft/server';

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

export function oxidationChickens(config) {
  const { copperChickens } = config;

  for (const c of copperChickens) {
    if (c.getProperty('oc:wax')) continue;

    let stage = c.getProperty('oc:oxidation') ?? 0;

    if (stage < 4 && Math.random() < 0.2) {
      stage++;
      c.setProperty('oc:oxidation', stage);

      if (stage === 3) {
        c.triggerEvent('oc:become_statue');
      }
    }

    if (stage !== 4) continue;

    const loc = c.location;
    const dimension = c.dimension;

    const blockLoc = {
      x: Math.floor(loc.x),
      y: Math.floor(loc.y),
      z: Math.floor(loc.z),
    };

    const block = dimension.getBlock(blockLoc);

    if (!block || block.typeId !== 'minecraft:air') continue;

    const rot = c.getRotation();

    const permutation = BlockPermutation.resolve(
      'oc:copper_chicken_statue_oxidized',
      {
        'minecraft:cardinal_direction': yawToCardinal(rot.y),
        'oc:pose': randomInt(0, 3),
      }
    );

    block.setPermutation(permutation);

    dimension.spawnParticle('minecraft:large_explosion_emitter', {
      x: loc.x,
      y: loc.y + 0.5,
      z: loc.z,
    });

    c.remove();
  }
}
