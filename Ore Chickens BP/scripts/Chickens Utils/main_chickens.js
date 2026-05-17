import { system } from '@minecraft/server';
import { getEntities, boostChickens } from './boost_chickens';
import { oxidationChickens } from './oxidation_copper_chicken';
import { convertToOreChicken } from './convert_chicken';

// Boost roda a cada segundo (60 ticks)
system.runInterval(() => {
  boostChickens(getEntities());
}, 60);

// Oxidação roda a cada 20 minutos (24000 ticks)
system.runInterval(() => {
  oxidationChickens(getEntities());
}, 24000);

convertToOreChicken();
