import { javascriptGenerator, Order } from 'blockly/javascript';
import * as Blockly from 'blockly/core';

javascriptGenerator.forBlock['game_on_start'] = function (block: Blockly.Block) {
  const statements = javascriptGenerator.statementToCode(block, 'STACK');
  javascriptGenerator.addReservedWords('runOnStart');
  const code = `game.onStart(() => {\n${statements}\n});\n`;
  return code;
};

javascriptGenerator.forBlock['game_on_tick'] = function (block: Blockly.Block) {
  const statements = javascriptGenerator.statementToCode(block, 'STACK');
  javascriptGenerator.addReservedWords('runOnTick');
  const code = `game.onTick(() => {\n${statements}\n});\n`;
  return code;
};

javascriptGenerator.forBlock['canvas_clear'] = function () {
  return 'game.clearCanvas();\n';
};

javascriptGenerator.forBlock['canvas_draw_rect'] = function (block: Blockly.Block) {
  const x = javascriptGenerator.valueToCode(block, 'X', Order.ATOMIC) || '0';
  const y = javascriptGenerator.valueToCode(block, 'Y', Order.ATOMIC) || '0';
  const width = javascriptGenerator.valueToCode(block, 'WIDTH', Order.ATOMIC) || '10';
  const height = javascriptGenerator.valueToCode(block, 'HEIGHT', Order.ATOMIC) || '10';
  const colour = javascriptGenerator.valueToCode(block, 'COLOUR', Order.ATOMIC) || "'black'";
  return `game.drawRect(${x}, ${y}, ${width}, ${height}, ${colour});\n`;
};

javascriptGenerator.forBlock['canvas_draw_text'] = function (block: Blockly.Block) {
  const text = javascriptGenerator.valueToCode(block, 'TEXT', Order.ATOMIC) || "''";
  const x = javascriptGenerator.valueToCode(block, 'X', Order.ATOMIC) || '0';
  const y = javascriptGenerator.valueToCode(block, 'Y', Order.ATOMIC) || '0';
  const colour = javascriptGenerator.valueToCode(block, 'COLOUR', Order.ATOMIC) || "'black'";
  const font = javascriptGenerator.valueToCode(block, 'FONT', Order.ATOMIC) || "'16px Arial'";
  return `game.drawText(${text}, ${x}, ${y}, ${colour}, ${font});\n`;
};


javascriptGenerator.forBlock['sprite_create'] = function (block: Blockly.Block) {
  const name = javascriptGenerator.valueToCode(block, 'NAME', Order.ATOMIC) || "''";
  const imageUrl = javascriptGenerator.valueToCode(block, 'IMAGE_URL', Order.ATOMIC) || "''";
  const x = javascriptGenerator.valueToCode(block, 'X', Order.ATOMIC) || '0';
  const y = javascriptGenerator.valueToCode(block, 'Y', Order.ATOMIC) || '0';
  return `game.createSprite(${name}, ${imageUrl}, ${x}, ${y});\n`;
};

javascriptGenerator.forBlock['sprite_set_property'] = function (block: Blockly.Block) {
  const prop = block.getFieldValue('PROP');
  const name = javascriptGenerator.valueToCode(block, 'NAME', Order.ATOMIC) || "''";
  const value = javascriptGenerator.valueToCode(block, 'VALUE', Order.ATOMIC) || '0';
  return `var sprite = game.getSprite(${name});\nif (sprite) sprite.${prop} = ${value};\n`;
};

javascriptGenerator.forBlock['sprite_get_property'] = function (block: Blockly.Block) {
  const prop = block.getFieldValue('PROP');
  const name = javascriptGenerator.valueToCode(block, 'NAME', Order.ATOMIC) || "''";
  const code = `(game.getSprite(${name}) ? game.getSprite(${name}).${prop} : 0)`;
  return [code, Order.ATOMIC];
};

javascriptGenerator.forBlock['sprite_change_property'] = function (block: Blockly.Block) {
  const prop = block.getFieldValue('PROP');
  const name = javascriptGenerator.valueToCode(block, 'NAME', Order.ATOMIC) || "''";
  const value = javascriptGenerator.valueToCode(block, 'VALUE', Order.ATOMIC) || '0';
  return `var sprite = game.getSprite(${name});\nif (sprite) sprite.${prop} += ${value};\n`;
};

javascriptGenerator.forBlock['input_is_key_down'] = function(block: Blockly.Block) {
  const key = block.getFieldValue('KEY');
  const code = `game.isKeyDown('${key}')`;
  return [code, Order.ATOMIC];
};

javascriptGenerator.forBlock['sensing_sprite_collides'] = function (block: Blockly.Block) {
  const sprite1Name = javascriptGenerator.valueToCode(block, 'SPRITE1', Order.ATOMIC) || "''";
  const sprite2Name = javascriptGenerator.valueToCode(block, 'SPRITE2', Order.ATOMIC) || "''";
  const code = `(function() {
    var s1 = game.getSprite(${sprite1Name});
    var s2 = game.getSprite(${sprite2Name});
    return s1 && s2 ? s1.collidesWith(s2) : false;
  })()`;
  return [code, Order.FUNCTION_CALL];
};

// --- NEW: Game State Generators ---
javascriptGenerator.forBlock['game_set_gravity'] = function (block: Blockly.Block) {
  const gravity = javascriptGenerator.valueToCode(block, 'GRAVITY', Order.ATOMIC) || '0';
  return `game.setGravity(${gravity});\n`;
};

javascriptGenerator.forBlock['game_change_score'] = function (block: Blockly.Block) {
  const score = javascriptGenerator.valueToCode(block, 'SCORE', Order.ATOMIC) || '0';
  return `game.changeScore(${score});\n`;
};

javascriptGenerator.forBlock['game_get_score'] = function () {
  return ['game.score', Order.MEMBER];
};