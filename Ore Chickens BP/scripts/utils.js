import { world, system, Dimension, DimensionTypes } from '@minecraft/server';

export class utils {
  static get_entities(entityType) {
    const result = [];
    const dimensionId = ['overworld', 'nether', 'the_end'];

    for (const dimId of dimensionId) {
      const dimension = world.getDimension(dimId);

      const entities = dimension.getEntities({
        type: entityType,
      });

      for (const e of entities) {
        const loc = e.location;

        const blockPos = {
          x: Math.floor(loc.x),
          y: Math.floor(loc.y) - 1,
          z: Math.floor(loc.z),
        };

        const block = dimension.getBlock(blockPos);

        result.push({
          block: block,
          entity: e,
          location: loc,
          dimension: dimId,
        });
      }
    }
    return result;
  }

  static randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  static isActive(pos) {
    for (const p of world.getAllPlayers()) {
      const dx = p.location.x - pos.x;
      const dz = p.location.z - pos.z;
      if (dx * dx + dz * dz < 4096) return true; // 64 blocks
    }
    return false;
  }
}
