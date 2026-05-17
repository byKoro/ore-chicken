import { world } from '@minecraft/server';
import { Chickens } from '../Configs/chickens_config';

const chickenMap = new Map(Object.values(Chickens).map(c => [c.entity, c]));

export function getEntities() {
  const players = [...world.getAllPlayers()];
  if (players.length === 0)
    return { validChickens: [], invalidChickens: [], copperChickens: [] };

  const validChickens = [],
    invalidChickens = [],
    copperChickens = [];
  const seen = new Set();

  for (const player of players) {
    for (const chicken of player.dimension.getEntities({
      families: ['chicken'],
      location: player.location,
      maxDistance: 48,
    })) {
      if (!chicken.isValid || seen.has(chicken.id)) continue;
      seen.add(chicken.id);

      const chickenData = chickenMap.get(chicken.typeId);
      if (!chickenData) continue;

      const blockY = Math.floor(chicken.location.y) - 1;
      if (blockY < -64) continue;

      if (chicken.typeId === 'oc:copper_chicken') copperChickens.push(chicken);

      const block = chicken.dimension.getBlock({
        x: Math.floor(chicken.location.x),
        y: blockY,
        z: Math.floor(chicken.location.z),
      });

      chickenData.block.includes(block?.typeId)
        ? validChickens.push(chicken)
        : invalidChickens.push(chicken);
    }
  }

  return { validChickens, invalidChickens, copperChickens };
}

export function boostChickens({ validChickens, invalidChickens }) {
  for (const chicken of validChickens) {
    if (!chicken.isValid) continue;

    if (Math.random() < 0.3) {
      chicken.dimension.spawnParticle('oc:boosted', {
        x: chicken.location.x,
        y: chicken.location.y + 0.6,
        z: chicken.location.z,
      });
    }

    if (chicken.getDynamicProperty('boosted') !== true) {
      chicken.triggerEvent('oc:start_ore_egg_fast');
      chicken.setDynamicProperty('boosted', true);
    }
  }

  for (const chicken of invalidChickens) {
    if (!chicken.isValid) continue;
    if (chicken.getDynamicProperty('boosted') !== false) {
      chicken.triggerEvent('oc:start_ore_egg_normal');
      chicken.setDynamicProperty('boosted', false);
    }
  }
}
