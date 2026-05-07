import { ChickensUtils } from './chickens';
import { Chickens } from './chickens_config';
import { system, world, BlockPermutation, Entity } from '@minecraft/server';
import { utils } from './utils';
import { CopperChicken } from './copper_chicken';

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

convert_chicken(Chickens.gold);
convert_chicken(Chickens.iron);
convert_chicken(Chickens.coal);
convert_chicken(Chickens.lapis);
convert_chicken(Chickens.amethyst);
convert_chicken(Chickens.redstone);
convert_chicken(Chickens.copper);
convert_chicken(Chickens.diamond);
convert_chicken(Chickens.emerald);
convert_chicken(Chickens.quartz);
convert_chicken(Chickens.netherite);

oxidation(Chickens.copper, 12000);

// ── Estátua de cobre ─────────────────────────────────────────────
CopperChicken.copper_chicken_statue();
