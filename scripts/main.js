import { ChickenUtils } from './utils';
import { drop_chicken, Chickens, convert_chicken } from './chickens';

import { PlaceJigsawError, system, world } from '@minecraft/server';

system.runInterval(() => {
  drop_chicken(Chickens.gold);
  drop_chicken(Chickens.iron);
  drop_chicken(Chickens.coal);
  drop_chicken(Chickens.lapis);
}, 20);

convert_chicken(Chickens.gold);
convert_chicken(Chickens.iron);
convert_chicken(Chickens.coal);
convert_chicken(Chickens.lapis);
