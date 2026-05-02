import { world, system, Dimension, DimensionTypes } from '@minecraft/server';

export class ChickenUtils {
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
}
