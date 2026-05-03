import { ChickenUtils } from './utils';
import { drop_chicken, Chickens, convert_chicken, oxidation } from './chickens';

import { PlaceJigsawError, system, world } from '@minecraft/server';

system.runInterval(() => {
  drop_chicken(Chickens.gold);
  drop_chicken(Chickens.iron);
  drop_chicken(Chickens.coal);
  drop_chicken(Chickens.lapis);
  drop_chicken(Chickens.amethyst);
  drop_chicken(Chickens.redstone);
  drop_chicken(Chickens.copper);
  drop_chicken(Chickens.diamond);
}, 20);

convert_chicken(Chickens.gold);
convert_chicken(Chickens.iron);
convert_chicken(Chickens.coal);
convert_chicken(Chickens.lapis);
convert_chicken(Chickens.amethyst);
convert_chicken(Chickens.redstone);
convert_chicken(Chickens.copper);
convert_chicken(Chickens.diamond);

oxidation(Chickens.copper, 20);
