import { world, system, ItemStack } from '@minecraft/server';

const spawnTimers = new Map(); // rastreia o timer de cada galinha

system.runInterval(() => {
  for (const entity of world
    .getDimension('overworld')
    .getEntities({ type: 'oc:gold_chicken' })) {
    const id = entity.id;

    // inicializa o timer se for nova
    if (!spawnTimers.has(id)) {
      spawnTimers.set(id, 0);
    }

    const blockBelow = entity.dimension.getBlock({
      x: entity.location.x,
      y: entity.location.y - 1,
      z: entity.location.z,
    });

    const onGold = blockBelow?.typeId === 'minecraft:gold_block';
    const interval = onGold ? 100 : 200; // ticks até spawnar

    let ticks = spawnTimers.get(id) + 20;

    if (ticks >= interval) {
      // spawna o ouro
      entity.dimension.spawnItem(
        new ItemStack('minecraft:gold_ingot', 1),
        entity.location
      );
      ticks = 0;
    }

    spawnTimers.set(id, ticks);

    // limpa entidades mortas do Map
    if (!entity.isValid()) {
      spawnTimers.delete(id);
    }
  }
}, 20);

world.afterEvents.itemUseOnEntity.subscribe(event => {
  const { source: player, target: entity, itemStack } = event;

  if (entity.typeId !== 'minecraft:chicken') return;
  if (itemStack?.typeId !== 'minecraft:gold_block') return;

  const location = entity.location;
  const dimension = entity.dimension;

  // remove a galinha comum
  entity.remove();

  // spawna a gold_chicken no mesmo lugar
  dimension.spawnEntity('oc:gold_chicken', location);

  // remove um gold_block do inventário do jogador
  const inventory = player.getComponent('minecraft:inventory').container;
  const slot = player.selectedSlotIndex;
  const item = inventory.getItem(slot);

  if (item && item.amount > 1) {
    item.amount -= 1;
    inventory.setItem(slot, item);
  } else {
    inventory.setItem(slot, undefined);
  }
});
