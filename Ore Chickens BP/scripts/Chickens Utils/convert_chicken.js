import { Component, system, world } from '@minecraft/server';
import { Chickens } from '../Configs/chickens_config';

export function convertToOreChicken() {
  world.afterEvents.playerInteractWithEntity.subscribe(ev => {
    const { target, player } = ev;

    const inventory = player.getComponent('inventory');
    const currentItem = inventory?.container.getItem(player.selectedSlotIndex);

    if (!currentItem) return;
    if (target.typeId !== 'minecraft:chicken') return;

    const isBaby = target.getComponent('is_baby');

    for (const chicken of Object.values(Chickens)) {
      // Checa se o item da mão é aceito pela galinha
      if (!chicken.itemConvert.includes(currentItem?.typeId)) continue;

      const newOreChicken = spawnOreChicken(target, chicken);
      setAdult(newOreChicken);
      setView(target, newOreChicken);

      break;
    }

    target.remove();
  });
}

function spawnOreChicken(target, chicken) {
  const locationSpawn = target.location;
  const chickenType = chicken.entity;

  const newOreChicken = target.dimension.spawnEntity(
    chickenType,
    locationSpawn
  );

  return newOreChicken;
}

function setView(target, newOreChicken) {
  const direction = target.getRotation();
  newOreChicken.setRotation(direction);
}

function setAdult(newOreChicken) {
  newOreChicken.triggerEvent('minecraft:ageable_grow_up');
}
