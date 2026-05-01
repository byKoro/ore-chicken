import { ChickenUtils } from './utils';
import { Boost_chicken } from './boost_chicken';
//ChickenUtils.chicken_boost();
//ChickenUtils.chat('minecraft:cow');
ChickenUtils.get_below_block('minecraft:cow', 'minecraft:grass_block');
console.warn(ChickenUtils.get_loc_entities('minecraft:cow'));
