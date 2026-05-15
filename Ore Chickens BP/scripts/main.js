import { ChickensUtils } from './chickens';
import { Chickens } from './chickens_config';
import { system, world, BlockPermutation, Entity } from '@minecraft/server';
import { utils } from './utils';
import { CopperChicken } from './copper_chicken';
import { cage, spawn_cage } from './cage';
import { convertToOreChicken } from './Chickens Utils/convert_chicken';

convertToOreChicken();
const { drop_chicken, convert_chicken, oxidation } = ChickensUtils;

// ── Galinhas de recurso ──────────────────────────────────────────
system.runInterval(() => {
  drop_chicken(Chickens.gold);
  drop_chicken(Chickens.iron);
  drop_chicken(Chickens.coal);
  drop_chicken(Chickens.lapis);
  drop_chicken(Chickens.amethyst);
  drop_chicken(Chickens.redstone);
  drop_chicken(Chickens.copper);
  drop_chicken(Chickens.diamond);
  drop_chicken(Chickens.emerald);
  drop_chicken(Chickens.quartz);
}, 20);

oxidation(Chickens.copper, 120000);

// ── Estátua de cobre ─────────────────────────────────────────────
CopperChicken.copper_chicken_statue();
cage();
spawn_cage();
