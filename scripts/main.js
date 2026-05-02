import { ChickenUtils } from './utils';
import { drop_chicken } from './chickens';

import { system } from '@minecraft/server';

system.runInterval(() => {
  drop_chicken(
    'oc:gold_chicken',
    'minecraft:gold_block',
    'minecraft:gold_ingot',
    1,
    180,
    300
  );
}, 20);
