import { CopperChicken } from './copper_chicken';
import { cage, spawn_cage } from './Items/cage';
import './Chickens Utils/main_chickens';
import { registerTestEvents } from './oc_test';

CopperChicken.copper_chicken_statue();

cage();
spawn_cage();
registerTestEvents();
