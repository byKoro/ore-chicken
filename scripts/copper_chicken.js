import { system, BlockPermutation, world } from '@minecraft/server';

// ─────────────────────────────────────────────
//  Constantes globais do componente
// ─────────────────────────────────────────────

const STAGES = {
  '01': 'oc:copper_chicken_statue_unoxidized',
  '02': 'oc:copper_chicken_statue_exposed',
  '03': 'oc:copper_chicken_statue_weathered',
  '04': 'oc:copper_chicken_statue_oxidized',
};

const STAGE_ORDER = ['01', '02', '03', '04'];

const ALL_STATUE_IDS = new Set(Object.values(STAGES));

const PARTICLES = {
  wax_off_big: 'oc:wax_off_big',
  wax_off_small: 'oc:wax_off_small',
  scrap_big: 'oc:scrap_big',
  scrap_small: 'oc:scrap_small',
  wax_off_shine: 'oc:wax_off_small_shine',
  scrap_shine: 'oc:scrap_small_shine',
  wax_on_small: 'oc:wax_on_small',
  wax_on_shine: 'oc:wax_on_small_shine',
  wax_on_big: 'oc:wax_on_big',
  wax_off_burst: 'oc:wax_off',
  oxidize: 'oc:oxidize', // partícula exibida ao oxidar naturalmente
};

const SOUNDS = {
  pose: 'mob.copper_golem.becoming_statue',
  honey: 'dig.honey_block',
  wax_off: 'copper.wax.off',
  spawn: 'mob.copper_golem.spawn',
  break_tool: 'random.break',
  oxidize: 'random.fizz', // som exibido ao oxidar naturalmente
};

const DIRECTION_TO_ROTATION = {
  north: 180,
  south: 0,
  east: -90,
  west: 90,
};

// ─────────────────────────────────────────────
//  Configuração de oxidação natural
//  ↓ Edite esses valores para ajustar o comportamento ↓
// ─────────────────────────────────────────────

export const OXIDATION_CONFIG = {
  /**
   * Intervalo entre cada tentativa de oxidação, em ticks.
   * 20 ticks = 1 segundo | 1200 ticks = 1 minuto
   *
   * Padrão: 1200 (1 minuto)
   */
  intervalTicks: 1200 * 10,

  /**
   * Probabilidade de oxidar a cada tentativa, por estátua.
   * Valor entre 0.0 (nunca oxidiza) e 1.0 (sempre oxidiza).
   *
   * Padrão: 0.05 (5% de chance a cada tentativa)
   */
  chance: 0.45,

  /**
   * Se true, emite partícula e som ao oxidar naturalmente.
   * Padrão: true
   */
  showEffects: true,
};

// ─────────────────────────────────────────────
//  Utilitários
// ─────────────────────────────────────────────

/**
 * Retorna o container do inventário do jogador e o slot selecionado.
 */
function getPlayerSlot(player) {
  const container = player.getComponent('minecraft:inventory').container;
  const slot = player.selectedSlotIndex;
  return { container, slot };
}

/**
 * Retorna a localização central do bloco (offset +0.5 em X e Z).
 * yOffset é opcional (padrão 0).
 */
function getBlockCenter(location, yOffset = 0) {
  return {
    x: location.x + 0.5,
    y: location.y + yOffset,
    z: location.z + 0.5,
  };
}

/**
 * Retorna a chave do estágio atual ('01'–'04') baseado no typeId do bloco.
 * Retorna null se o bloco não for uma estátua de cobre.
 */
function getCurrentStageKey(block) {
  return STAGE_ORDER.find(key => STAGES[key] === block.typeId) ?? null;
}

/**
 * Gera uma chave de string única para uma localização + dimensão.
 * Formato: "dimensionId:x:y:z"
 */
function makeLocationKey(dimensionId, location) {
  return `${dimensionId}:${location.x}:${location.y}:${location.z}`;
}

// ─────────────────────────────────────────────
//  Ações do machado
// ─────────────────────────────────────────────

/**
 * Reduz 1 ponto de durabilidade do machado no slot ativo.
 * Se atingir o limite máximo, destrói a ferramenta.
 */
function damageAxe(player, dimension, location) {
  const { container, slot } = getPlayerSlot(player);
  const item = container.getItem(slot);
  if (!item) return;

  const durability = item.getComponent('minecraft:durability');
  if (!durability) return;

  durability.damage += 1;

  if (durability.damage >= durability.maxDurability) {
    container.setItem(slot, undefined);
    dimension.playSound(SOUNDS.break_tool, location);
  } else {
    container.setItem(slot, item);
  }
}

/**
 * Emite as partículas e som padrão de raspar/usar machado.
 */
function playAxeEffects(dimension, location, particleLoc) {
  dimension.spawnParticle(PARTICLES.wax_off_big, particleLoc);
  dimension.spawnParticle(PARTICLES.wax_off_small, particleLoc);
  dimension.spawnParticle(PARTICLES.wax_off_shine, particleLoc);
  dimension.playSound(SOUNDS.wax_off, location);
}

// ─────────────────────────────────────────────
//  Ações de encerar / raspar a cera
// ─────────────────────────────────────────────

/**
 * Consome 1 honeycomb do slot ativo do jogador.
 */
function consumeHoneycomb(player) {
  const { container, slot } = getPlayerSlot(player);
  const item = container.getItem(slot);
  if (!item) return;

  if (item.amount > 1) {
    item.amount -= 1;
    container.setItem(slot, item);
  } else {
    container.setItem(slot, undefined);
  }
}

/**
 * Aplica cera na estátua, consome 1 honeycomb e emite efeitos visuais/sonoros.
 * Retorna true se aplicou cera, false se já estava encerada.
 */
function handleWaxOn(
  block,
  player,
  dimension,
  location,
  particleLoc,
  soundHoney
) {
  const wax_state = block.permutation.getState('oc:wax');
  if (wax_state) return false;

  block.setPermutation(block.permutation.withState('oc:wax', true));
  dimension.playSound(SOUNDS.honey, location, soundHoney);
  dimension.spawnParticle(PARTICLES.wax_on_small, particleLoc);
  dimension.spawnParticle(PARTICLES.wax_on_shine, particleLoc);
  dimension.spawnParticle(PARTICLES.wax_on_big, particleLoc);
  consumeHoneycomb(player);
  return true;
}

/**
 * Remove a cera da estátua e emite efeitos visuais/sonoros.
 * Retorna true se raspou, false se não havia cera.
 */
function handleWaxOff(block, player, dimension, location, particleLoc) {
  const wax_state = block.permutation.getState('oc:wax');
  if (!wax_state) return false;

  block.setPermutation(block.permutation.withState('oc:wax', false));
  dimension.spawnParticle(PARTICLES.scrap_big, particleLoc);
  dimension.spawnParticle(PARTICLES.scrap_small, particleLoc);
  dimension.spawnParticle(PARTICLES.scrap_shine, particleLoc);
  dimension.playSound(SOUNDS.wax_off, location);
  damageAxe(player, dimension, location);
  return true;
}

// ─────────────────────────────────────────────
//  Ações de estágio (oxidação) com machado
// ─────────────────────────────────────────────

/**
 * Avança a estátua para o estágio anterior de oxidação usando o machado.
 * Se estiver no estágio '01' (não oxidado), libera a galinha de cobre.
 */
function handleAxeOnStage(
  block,
  player,
  dimension,
  location,
  particleLoc,
  stageKey,
  direction,
  currentPose,
  wax_state
) {
  playAxeEffects(dimension, location, particleLoc);
  damageAxe(player, dimension, location);

  if (stageKey === '01') {
    dimension.setBlockType(location, 'air');
    dimension.playSound(SOUNDS.spawn, location);
    dimension.spawnParticle(
      PARTICLES.wax_off_burst,
      getBlockCenter(location, 0.5)
    );

    const chicken = dimension.spawnEntity(
      'oc:copper_chicken',
      getBlockCenter(location)
    );
    chicken.triggerEvent('minecraft:ageable_grow_up');
    chicken.setRotation({ x: 0, y: DIRECTION_TO_ROTATION[direction] });
    return;
  }

  const prevKey = STAGE_ORDER[STAGE_ORDER.indexOf(stageKey) - 1];
  block.setPermutation(
    BlockPermutation.resolve(STAGES[prevKey], {
      'minecraft:cardinal_direction': direction,
      'oc:pose': currentPose,
      'oc:wax': wax_state,
    })
  );
}

// ─────────────────────────────────────────────
//  Sistema de oxidação natural
// ─────────────────────────────────────────────

/**
 * Mapa de todas as estátuas conhecidas no mundo.
 * Chave: "dimensionId:x:y:z"
 * Valor: { dimensionId, location }
 */
const statueRegistry = new Map();

/**
 * Registra uma estátua para ser monitorada pelo sistema de oxidação.
 * Chamado na primeira interação e ao colocar o bloco.
 */
function registerStatue(dimensionId, location) {
  const key = makeLocationKey(dimensionId, location);
  if (!statueRegistry.has(key)) {
    statueRegistry.set(key, { dimensionId, location: { ...location } });
  }
}

/**
 * Remove uma estátua do registro.
 * Chamado quando o bloco é destruído.
 */
function unregisterStatue(dimensionId, location) {
  statueRegistry.delete(makeLocationKey(dimensionId, location));
}

/**
 * Avança a estátua um estágio de oxidação naturalmente.
 * - Estátuas enceradas (oc:wax = true) são ignoradas.
 * - Estátuas no estágio '04' são ignoradas (já estão no máximo).
 * - Emite efeitos visuais se OXIDATION_CONFIG.showEffects for true.
 *
 * Retorna true se oxidou, false caso contrário.
 */
function oxidizeBlock(block, dimension, location) {
  const stageKey = getCurrentStageKey(block);
  const wax_state = block.permutation.getState('oc:wax');

  if (!stageKey || stageKey === '04' || wax_state) return false;

  const nextKey = STAGE_ORDER[STAGE_ORDER.indexOf(stageKey) + 1];
  const direction = block.permutation.getState('minecraft:cardinal_direction');
  const currentPose = block.permutation.getState('oc:pose');

  block.setPermutation(
    BlockPermutation.resolve(STAGES[nextKey], {
      'minecraft:cardinal_direction': direction,
      'oc:pose': currentPose,
      'oc:wax': false,
    })
  );

  if (OXIDATION_CONFIG.showEffects) {
    dimension.spawnParticle(PARTICLES.oxidize, getBlockCenter(location, 0.6));
    dimension.playSound(SOUNDS.oxidize, location, { volume: 0.4, pitch: 0.8 });
  }

  return true;
}

/**
 * Inicia o loop de oxidação natural.
 * A cada OXIDATION_CONFIG.intervalTicks, cada estátua registrada
 * tem OXIDATION_CONFIG.chance de avançar um estágio de oxidação.
 */
function startOxidationSystem() {
  system.runInterval(() => {
    if (statueRegistry.size === 0) return;

    for (const [key, { dimensionId, location }] of statueRegistry) {
      // Rola a chance antes de qualquer operação pesada
      if (Math.random() >= OXIDATION_CONFIG.chance) continue;

      try {
        const dimension = world.getDimension(dimensionId);
        const block = dimension.getBlock(location);

        // Chunk descarregado → pula, mantém no registro para tentar depois
        if (!block) continue;

        // Bloco foi destruído ou substituído → remove do registro
        if (!ALL_STATUE_IDS.has(block.typeId)) {
          statueRegistry.delete(key);
          continue;
        }

        oxidizeBlock(block, dimension, location);
      } catch {
        // Erro inesperado (ex.: chunk descarregado) → pula silenciosamente
      }
    }
  }, OXIDATION_CONFIG.intervalTicks);
}

// ─────────────────────────────────────────────
//  Handler principal de interação
// ─────────────────────────────────────────────

function onPlayerInteract(event) {
  const { player, block } = event;
  if (!player) return;

  const dimension = block.dimension;
  const location = block.location;
  const inventory = player.getComponent('minecraft:inventory');
  const item = inventory?.container.getItem(player.selectedSlotIndex);

  const currentPose = block.permutation.getState('oc:pose');
  const wax_state = block.permutation.getState('oc:wax');
  const direction = block.permutation.getState('minecraft:cardinal_direction');

  const particleLoc = getBlockCenter(location, 0.6);
  const soundHoney = { volume: 3, pitch: 1.2 };

  // Registra a estátua no sistema de oxidação ao primeiro contato
  registerStatue(dimension.id, location);

  // Sem item na mão → muda a pose da estátua
  if (!item) {
    const nextStage = (currentPose + 1) % 4;
    block.setPermutation(block.permutation.withState('oc:pose', nextStage));
    dimension.playSound(SOUNDS.pose, location, { volume: 0.8, pitch: 1 });
    return;
  }

  // Honeycomb → encerar
  if (item.typeId === 'minecraft:honeycomb') {
    handleWaxOn(block, player, dimension, location, particleLoc, soundHoney);
    return;
  }

  // Machado → raspar cera ou recuar estágio de oxidação
  if (item.hasTag('minecraft:is_axe')) {
    if (handleWaxOff(block, player, dimension, location, particleLoc)) return;

    const stageKey = getCurrentStageKey(block);
    if (stageKey) {
      handleAxeOnStage(
        block,
        player,
        dimension,
        location,
        particleLoc,
        stageKey,
        direction,
        currentPose,
        wax_state
      );
    }
  }
}

// ─────────────────────────────────────────────
//  Exportação da classe
// ─────────────────────────────────────────────

export class CopperChicken {
  static copper_chicken_statue() {
    system.beforeEvents.startup.subscribe(ev => {
      ev.blockComponentRegistry.registerCustomComponent('oc:on_interact', {
        onPlayerInteract,
      });
    });

    // Registra estátuas recém-colocadas pelo jogador
    world.afterEvents.playerPlaceBlock.subscribe(ev => {
      if (ALL_STATUE_IDS.has(ev.block.typeId)) {
        registerStatue(ev.dimension.id, ev.block.location);
      }
    });

    // Remove do registro estátuas destruídas
    world.afterEvents.playerBreakBlock.subscribe(ev => {
      if (ALL_STATUE_IDS.has(ev.brokenBlockPermutation.type.id)) {
        unregisterStatue(ev.dimension.id, ev.block.location);
      }
    });

    startOxidationSystem();
  }
}
