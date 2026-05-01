import { world, system, Dimension, DimensionTypes } from '@minecraft/server';

export class ChickenUtils {
  static get_entities(entity) {
    const result = [];

    for (const dimType of DimensionTypes.getAll()) {
      const dimension = world.getDimension(dimType.typeId);
      const chickens = dimension.getEntities({
        type: entity,
      });

      result.push(...chickens);
    }
    return result;
  }

  static get_loc_entities(entity) {
    const location = [];
    const entities = ChickenUtils.get_entities(entity);
    for (const e of entities) {
      if (!entities) return [];
      const location_entities = {
        x: e.location.x,
        y: e.location.y,
        z: e.location.z,
      };

      location.push(location_entities);
    }
    return location;
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
            entity: e,
            location: loc,
            dimension: dimId,
          });
        }
      }
    }
    console.warn(result);
    const str = JSON.stringify(result);
    console.warn(str);
    return result;
  }

  static chat(entity) {
    const loc = ChickenUtils.get_loc_entities(entity);
    console.warn(loc);
  }
}
