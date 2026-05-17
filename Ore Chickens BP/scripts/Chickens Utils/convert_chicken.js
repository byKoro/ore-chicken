import { system, world } from '@minecraft/server';
import { Chickens } from '../Configs/chickens_config';

// Set dos entityToConvert para early-exit sem iterar todas as configs
const allowedEntities = new Set(Object.values(Chickens).map(c => c.entityToConvert));

// Map de itemId → config da galinha (leitura O(1) no lugar de O(n) por loop)
const itemToChicken = new Map();
for (const chicken of Object.values(Chickens)) {
  for (const item of chicken.itemConvert) {
    // Um item pode mapear para várias galinhas; a mais específica
    // (entityToConvert diferente de 'minecraft:chicken') tem prioridade.
    if (!itemToChicken.has(item) || chicken.entityToConvert !== 'minecraft:chicken') {
      itemToChicken.set(item, chicken);
    }
  }
}

export function convertToOreChicken() {
  world.afterEvents.playerInteractWithEntity.subscribe(ev => {
    const { target, player } = ev;

    // Early-exit: entidade não é conversível
    if (!allowedEntities.has(target.typeId)) return;

    const inventory = player.getComponent('inventory');
    const currentItem = inventory?.container.getItem(player.selectedSlotIndex);
    if (!currentItem) return;

    const chicken = itemToChicken.get(currentItem.typeId);
    if (!chicken) return;

    // Garante que a entidade-alvo é do tipo correto para essa conversão
    if (target.typeId !== chicken.entityToConvert) return;

    const newOreChicken = target.dimension.spawnEntity(chicken.entity, target.location);
    newOreChicken.triggerEvent('minecraft:ageable_grow_up');
    newOreChicken.setRotation(target.getRotation());

    if (chicken.sound) {
      target.dimension.playSound(chicken.sound, newOreChicken.location);
    }

    target.remove();
  });
}
