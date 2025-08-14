// src/lib/blockly/game/blocks.ts
import * as Blockly from "blockly/core";

const CANVAS_COLOUR = "#3A827D";
const SPRITE_COLOUR = "#4C97FF";
const SENSING_COLOUR = "#2E8997";
const GAME_STATE_COLOUR = "#CF8B17";
const INPUT_COLOUR = "#823A6D";

const defineBlock = (json: object) => {
  Blockly.common.defineBlocksWithJsonArray([json]);
};

const generateSpriteDropdown = function(this: Blockly.FieldDropdown) {
  const block = this.getSourceBlock();
  if (!block || !block.workspace) {
    return [['(no workspace)', 'NULL_SPRITE']];
  }
  
  this.setValidator(function(this: Blockly.FieldDropdown, newValue) {
    const allOptions = this.getOptions(false);
    const doesOptionExist = allOptions.some(option => option[1] === newValue);
    if (doesOptionExist) {
      return newValue;
    }
    if (allOptions.length > 1) {
      return allOptions[0][1];
    }
    return 'NULL_SPRITE';
  });

  const spriteCreateBlocks = block.workspace.getBlocksByType('sprite_create', false);
  const spriteNames = new Set<string>();

  spriteCreateBlocks.forEach(b => {
    const nameBlock = b.getInputTargetBlock('NAME');
    if (nameBlock && nameBlock.type === 'text') {
      const name = nameBlock.getFieldValue('TEXT');
      if (name) {
        spriteNames.add(name);
      }
    }
  });

  if (spriteNames.size === 0) {
    return [['create a sprite first', 'NULL_SPRITE']];
  }

  return Array.from(spriteNames).map(name => [name, name]);
};
// --- Game Lifecycle Blocks ---
defineBlock({
  type: "game_on_start",
  message0: "on game start",
  message1: "%1",
  args1: [{ type: "input_statement", name: "STACK" }],
  previousStatement: null,
  nextStatement: null,
  tooltip: "Runs once when the game starts.",
  style: "hat_blocks",
});
defineBlock({
  type: "game_on_tick",
  message0: "on game tick",
  message1: "%1",
  args1: [{ type: "input_statement", name: "STACK" }],
  previousStatement: null,
  nextStatement: null,
  tooltip: "Runs on every frame of the game.",
  style: "hat_blocks",
});

// --- RESTORED: Canvas Blocks ---
defineBlock({
  type: "canvas_clear",
  message0: "clear canvas",
  previousStatement: null,
  nextStatement: null,
  colour: CANVAS_COLOUR,
  tooltip: "Clears the entire game canvas.",
});
defineBlock({
  type: "canvas_draw_rect",
  message0: "draw rectangle at x: %1 y: %2 with width: %3 height: %4 color: %5",
  args0: [
    { type: "input_value", name: "X", check: "Number" },
    { type: "input_value", name: "Y", check: "Number" },
    { type: "input_value", name: "WIDTH", check: "Number" },
    { type: "input_value", name: "HEIGHT", check: "Number" },
    { type: "input_value", name: "COLOUR", check: "String" },
  ],
  inputsInline: false,
  previousStatement: null,
  nextStatement: null,
  colour: CANVAS_COLOUR,
  tooltip: "Draws a filled rectangle on the canvas.",
});
defineBlock({
  type: "canvas_draw_text",
  message0: "draw text %1 at x: %2 y: %3 color: %4 font: %5",
  args0: [
    { type: "input_value", name: "TEXT", check: "String" },
    { type: "input_value", name: "X", check: "Number" },
    { type: "input_value", name: "Y", check: "Number" },
    { type: "input_value", name: "COLOUR", check: "String" },
    { type: "input_value", name: "FONT", check: "String" },
  ],
  inputsInline: false,
  previousStatement: null,
  nextStatement: null,
  colour: CANVAS_COLOUR,
  tooltip: "Draws text on the canvas.",
});

// --- Sprite Blocks ---
defineBlock({
  type: "sprite_create",
  message0: "create sprite named %1 with image url %2 at x: %3 y: %4",
  args0: [
    { type: "input_value", name: "NAME", check: "String" },
    { type: "input_value", name: "IMAGE_URL", check: "String" },
    { type: "input_value", name: "X", check: "Number" },
    { type: "input_value", name: "Y", check: "Number" },
  ],
  previousStatement: null,
  nextStatement: null,
  colour: SPRITE_COLOUR,
  tooltip: "Creates a new sprite with an image from a URL.",
});

defineBlock({
  type: 'sprite_set_property',
  message0: 'set %1 of sprite %2 to %3',
  args0: [
    { type: 'field_dropdown', name: 'PROP', options: [['x', 'x'], ['y', 'y'], ['rotation', 'rotation'], ['speedX', 'speedX'], ['speedY', 'speedY']] },
    { type: 'field_dropdown', name: 'NAME', options: generateSpriteDropdown },
    { type: 'input_value', name: 'VALUE', check: 'Number' },
  ],
  previousStatement: null,
  nextStatement: null,
  colour: SPRITE_COLOUR,
  tooltip: 'Sets a property of a specified sprite.',
});

defineBlock({
  type: 'sprite_get_property',
  message0: 'get %1 of sprite %2',
  args0: [
    { type: 'field_dropdown', name: 'PROP', options: [['x', 'x'], ['y', 'y'], ['rotation', 'rotation'], ['width', 'width'], ['height', 'height']] },
    { type: 'field_dropdown', name: 'NAME', options: generateSpriteDropdown },
  ],
  output: 'Number',
  colour: SPRITE_COLOUR,
  tooltip: 'Gets a property of a specified sprite.',
});

defineBlock({
  type: 'sprite_change_property',
  message0: 'change %1 of sprite %2 by %3',
  args0: [
    { type: 'field_dropdown', name: 'PROP', options: [['x', 'x'], ['y', 'y'], ['rotation', 'rotation']] },
    { type: 'field_dropdown', name: 'NAME', options: generateSpriteDropdown },
    { type: 'input_value', name: 'VALUE', check: 'Number' },
  ],
  previousStatement: null,
  nextStatement: null,
  colour: SPRITE_COLOUR,
  tooltip: 'Changes a property of a sprite by a certain amount.',
});

// --- Sensing Blocks ---
defineBlock({
  type: "input_is_key_down",
  message0: "is key %1 pressed?",
  args0: [
    {
      type: "field_dropdown",
      name: "KEY",
      options: [
        ["ArrowUp", "ArrowUp"],
        ["ArrowDown", "ArrowDown"],
        ["ArrowLeft", "ArrowLeft"],
        ["ArrowRight", "ArrowRight"],
        ["Space", " "],
        ["Enter", "Enter"],
      ],
    },
  ],
  output: "Boolean",
  colour: INPUT_COLOUR,
  tooltip: "Checks if a specific key is currently held down.",
});
defineBlock({
  type: 'sensing_sprite_collides',
  message0: 'sprite %1 collides with sprite %2 ?',
  args0: [
    { type: 'field_dropdown', name: 'SPRITE1', options: generateSpriteDropdown },
    { type: 'field_dropdown', name: 'SPRITE2', options: generateSpriteDropdown },
  ],
  output: 'Boolean',
  colour: SENSING_COLOUR,
  tooltip: 'Checks if two sprites are touching.',
});

// --- Game State Blocks ---
defineBlock({
  type: "game_set_gravity",
  message0: "set global gravity to %1",
  args0: [{ type: "input_value", name: "GRAVITY", check: "Number" }],
  previousStatement: null,
  nextStatement: null,
  colour: GAME_STATE_COLOUR,
  tooltip: "Sets a downward force that affects all sprites.",
});
defineBlock({
  type: "game_change_score",
  message0: "change score by %1",
  args0: [{ type: "input_value", name: "SCORE", check: "Number" }],
  previousStatement: null,
  nextStatement: null,
  colour: GAME_STATE_COLOUR,
  tooltip: "Adds to the score.",
});
defineBlock({
  type: "game_get_score",
  message0: "score",
  output: "Number",
  colour: GAME_STATE_COLOUR,
  tooltip: "Gets the current score value.",
});
