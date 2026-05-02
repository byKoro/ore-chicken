import { world, system, Dimension, DimensionTypes } from '@minecraft/server';

export class ChickenUtils {
  static get_entities(entity) {
    const result = [];

    for (const dimType of DimensionTypes.getAll()) {
      const dimension = world.getDimension(dimType.typeId);
      const entities = dimension.getEntities({
        type: entity,
      });

      result.push(...entities);
    }
    return result;
  }

  static get_loc_entities(entityType) {
    const result = [];
    const dimensionId = ['overworld', 'nether', 'the_end'];
    const entities = ChickenUtils.get_entities(entityType);
    for (const dimId of dimensionId) {
      const dimension = world.getDimension(dimId);
      const entities = dimension.getEntities({
        type: entityType,
      });

      for (const e of entities) {
        const loc = e.location;

        result.push({
          entity: e,
          location: loc,
          dimension: dimId,
        });
      }
    }
    return result;
  }

  static get_below_block(entityType, below_block) {
    const dimensionId = ['overworld', 'nether', 'the_end'];
    const result = [];

    for (const dimId of dimensionId) {
      const dimension = world.getDimension(dimId);

      const entities = dimension.getEntities({
        type: entityType,
      });

      for (const e of entities) {
        const loc = e.location;

        const block = dimension.getBlock({
          x: Math.floor(loc.x),
          y: Math.floor(loc.y - 1),
          z: Math.floor(loc.z),
        });

        if (block?.typeId == below_block) {
          result.push({
            block: block?.typeId,
            entity: e,
            location: loc,
            dimension: dimId,
          });
        }
      }
    }
    return result;
  }

  static randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }
}
