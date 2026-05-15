import {
  ItemStack,
  ItemType,
  system,
  world,
  EquipmentSlot,
} from '@minecraft/server';

export function cage() {
  world.beforeEvents.playerInteractWithEntity.subscribe(ev => {
    const player = ev.player;
    const itemStack = ev.itemStack;
    const target = ev.target;
    let isBaby = target.getComponent('is_baby');
    const inventory = player.getComponent('inventory');
    const hud = inventory?.container;

    if (!target.typeId.startsWith('oc:')) return;
    if (!itemStack) return;

    if (itemStack?.typeId === 'oc:cage') {
      isBaby ? (isBaby = 'Baby') : (isBaby = 'Adult');

      system.run(() => {
        const chicken_cage = new ItemStack('oc:chicken_cage', 1);
        chicken_cage.setLore([target.typeId, isBaby]);

        hud?.addItem(chicken_cage);
        target.remove();
      });
    }
  });
}

export function spawn_cage() {
  system.beforeEvents.startup.subscribe(ev => {
    ev.itemComponentRegistry.registerCustomComponent('oc:spawn_cage', {
      onUseOn({ source, itemStack, block, faceLocation }) {
        const player = source;
        const location = block.location;
        const chicken_spawn = itemStack.getLore()[0];

        let isBaby = itemStack.getLore()[1];
        isBaby = isBaby === 'Baby';

        const spawnLocation = block.center();

        system.run(() => {
          const newChicken = player.dimension.spawnEntity(
            chicken_spawn,
            spawnLocation
          );
          if (isBaby) {
            newChicken.triggerEvent('minecraft:entity_born');
          } else {
            newChicken.triggerEvent('minecraft:ageable_grow_up');
          }

          player.dimension.playSound('mob.chicken.say', player.location);

          const inventory = player.getComponent('inventory');
          const container = inventory.container;
          const item = container.getItem(player.selectedSlotIndex);

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
