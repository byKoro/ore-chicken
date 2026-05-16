import { ChickensUtils } from './chickens';
import { Chickens } from './Configs/chickens_config';
import { CopperChicken } from './copper_chicken';
import { cage, spawn_cage } from './Items/cage';
import { convertToOreChicken } from './Chickens Utils/convert_chicken';
import { boostChickens } from './Chickens Utils/boost_chickens';
import { system } from '@minecraft/server';
import { getEntities } from './Chickens Utils/boost_chickens';

convertToOreChicken();

system.runInterval(() => {
  const entities = getEntities();
  boostChickens(entities);
}, 20);

ChickensUtils.oxidation(Chickens.copper, 120000);

CopperChicken.copper_chicken_statue();
cage();
spawn_cage();
