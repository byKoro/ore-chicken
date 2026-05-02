import { ChickenUtils } from './utils';
import { Boost_chicken } from './boost_chicken';

import { system } from '@minecraft/server';

system.runInterval(() => {
  Boost_chicken(
    'minecraft:cow',
    'minecraft:grass_block',
    'minecraft:emerald',
    1,
    5,
    10
  );

    
}, 20);
