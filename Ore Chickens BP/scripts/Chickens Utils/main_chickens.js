import { system } from '@minecraft/server';
import { getEntities } from './boost_chickens';
import { oxidationChickens } from './oxidation_copper_chicken';
import { convertToOreChicken } from './convert_chicken';
import { boostChickens } from './boost_chickens';

let tickCounter = 0;

system.runInterval(() => {
  const entities = getEntities();

  boostChickens(entities);

  tickCounter++;

  if (tickCounter >= 1200) {
    // 20 min
    oxidationChickens(entities);
    tickCounter = 0;
  }
}, 20);

convertToOreChicken();
