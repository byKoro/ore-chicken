import { ItemStack, system, world, EquipmentSlot } from '@minecraft/server';

export function cage() {
  world.beforeEvents.playerInteractWithEntity.subscribe(ev => {
    const { player, itemStack, target } = ev;

    if (!target.typeId.startsWith('oc:')) return;
    if (itemStack?.typeId !== 'oc:cage') return;

    const isBaby = target.getComponent('is_baby') ? 'Baby' : 'Adult';
    const inventory = player.getComponent('inventory');

    system.run(() => {
      const chicken_cage = new ItemStack('oc:chicken_cage', 1);
      chicken_cage.setLore([target.typeId, isBaby]);
      inventory?.container.addItem(chicken_cage);
      target.remove();
    });
  });
}

export function spawn_cage() {
  system.beforeEvents.startup.subscribe(ev => {
    ev.itemComponentRegistry.registerCustomComponent('oc:spawn_cage', {
      onUseOn({ source: player, itemStack, block }) {
        const chicken_spawn = itemStack.getLore()[0];
        const isBaby = itemStack.getLore()[1] === 'Baby';
        const spawnLocation = block.center();

        system.run(() => {
          const newChicken = player.dimension.spawnEntity(chicken_spawn, spawnLocation);
          newChicken.triggerEvent(
            isBaby ? 'minecraft:entity_born' : 'minecraft:ageable_grow_up'
          );

          // Som toca no local do spawn, não do jogador
          player.dimension.playSound('mob.chicken.say', spawnLocation);

          const container = player.getComponent('inventory').container;
          const item = container.getItem(player.selectedSlotIndex);
          if (!item) return;

          if (item.amount > 1) {
            item.amount -= 1;
            container.setItem(player.selectedSlotIndex, item);
          } else {
            container.setItem(player.selectedSlotIndex, undefined);
          }
        });
      },
    });
  });
}
