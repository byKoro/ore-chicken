import { ChickenUtils } from './utils';
import { drop_chicken, Chicken } from './chickens';

import { system } from '@minecraft/server';

system.runInterval(() => {
  drop_chicken(Chicken.gold);
}, 20);
