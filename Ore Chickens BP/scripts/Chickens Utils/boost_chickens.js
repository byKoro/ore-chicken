import {
  Dimension,
  DimensionType,
  DimensionTypes,
  Entity,
  system,
  world,
} from '@minecraft/server';

import { Chickens } from '../Configs/chickens_config';
import { CopperChicken } from '../copper_chicken';

const chickenMap = new Map(Object.values(Chickens).map(c => [c.entity, c]));

export function getEntities() {
  const validChickens = [];
  const invalidChickens = [];
  const copperChickens = [];
  for (const dimension of DimensionTypes.getAll()) {
    const dim = world.getDimension(dimension.typeId);

    const chickens = dim.getEntities({ families: ['chicken'] });

    for (const chicken of chickens) {
      const chickenData = chickenMap.get(chicken.typeId);
      if (!chicken.isValid) continue;
      if (!chickenData) continue;

      const loc = chicken.location;
      if (loc.y < -64 || loc.y > 320) continue;

      const block = dim.getBlock({
        x: Math.floor(loc.x),
        y: Math.floor(loc.y) - 1,
        z: Math.floor(loc.z),
      });

      if (chicken.typeId === 'oc:copper_chicken') copperChickens.push(chicken);

      if (chickenData && chickenData.block.includes(block?.typeId)) {
        validChickens.push(chicken);
      } else {
        invalidChickens.push(chicken);
      }
    }
  }

  return { validChickens, invalidChickens, copperChickens };
}

export function boostChickens(config) {
  const { validChickens, invalidChickens } = config;

  for (const chicken of validChickens) {
    if (!chicken.isValid) continue;
    const location = {
      x: chicken.location.x,
      y: chicken.location.y + 0.6,
      z: chicken.location.z,
    };

    if (Math.random() < 0.3) {
      chicken.dimension.spawnParticle('oc:boosted', location);
    }
    if (chicken.getDynamicProperty('boosted') !== true) {
      chicken.triggerEvent('oc:start_ore_egg_fast');
      chicken.setDynamicProperty('boosted', true);
    }
  }

  for (const chicken of invalidChickens) {
    if (!chicken?.isValid) continue;
    if (chicken.getDynamicProperty('boosted') !== false) {
      chicken.triggerEvent('oc:start_ore_egg_normal');
      chicken.setDynamicProperty('boosted', false);
    }
  }
}
