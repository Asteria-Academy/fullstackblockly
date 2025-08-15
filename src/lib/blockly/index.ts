// src/lib/blockly/index.ts

import * as Blockly from 'blockly';
import { installAllBlocks } from '@blockly/field-colour';
import { javascriptGenerator } from 'blockly/javascript';
import { pythonGenerator } from 'blockly/python';
import './game';

const createSpriteButtonCallback = (button: Blockly.FlyoutButton) => {
  const workspace = button.getTargetWorkspace();
  
  const spriteCreateBlocks = workspace.getBlocksByType('sprite_create', false);
  const existingNames = new Set(spriteCreateBlocks.map(b => {
      const nameBlock = b.getInputTargetBlock('NAME');
      return nameBlock ? nameBlock.getFieldValue('TEXT') : null;
  }));
  
  let newSpriteName = 'mySprite';
  let counter = 1;
  while(existingNames.has(newSpriteName)) {
    newSpriteName = `mySprite${counter++}`;
  }

  const blockXml = `
    <xml>
      <block type="sprite_create" x="100" y="100">
        <value name="NAME">
          <shadow type="text">
            <field name="TEXT">${newSpriteName}</field>
          </shadow>
        </value>
        <value name="IMAGE_URL">
          <shadow type="text">
            <field name="TEXT">https://www.w3schools.com/graphics/pic_the_scream.jpg</field>
          </shadow>
        </value>
        <value name="X">
          <shadow type="math_number">
            <field name="NUM">100</field>
          </shadow>
        </value>
        <value name="Y">
          <shadow type="math_number">
            <field name="NUM">100</field>
          </shadow>
        </value>
      </block>
    </xml>
  `;

  const xmlDom = Blockly.utils.xml.textToDom(blockXml);
  Blockly.Xml.domToWorkspace(xmlDom, workspace);
};

const spriteCategoryCallback = (workspace: Blockly.WorkspaceSvg): Blockly.utils.toolbox.FlyoutDefinition => {
  workspace.registerButtonCallback('CREATE_SPRITE', createSpriteButtonCallback);

  const spriteCreateBlocks = workspace.getBlocksByType('sprite_create', false);

  const blockList: Blockly.utils.toolbox.ToolboxItemInfo[] = [
    {
      kind: 'button',
      text: 'Create Sprite',
      callbackkey: 'CREATE_SPRITE',
    }
  ];

  if (spriteCreateBlocks.length > 0) {
    blockList.push(
      { kind: 'block', type: 'sprite_set_property' },
      { kind: 'block', type: 'sprite_get_property' },
      { kind: 'block', type: 'sprite_change_property' },
      { kind: 'block', type: 'sprite_bounce_on_edge' },
      { kind: 'sep', gap: '8'},
      { kind: 'block', type: 'sprite_show' },
      { kind: 'block', type: 'sprite_hide' },
      { kind: 'block', type: 'sprite_set_size' },
      { kind: 'sep', gap: '8'},
      { kind: 'block', type: 'sensing_sprite_collides' },
    );
  }
  
  return blockList;
};

export function initializeGenerators() {
  installAllBlocks({
    javascript: javascriptGenerator,
    python: pythonGenerator,
  });
}

export function registerDynamicCategories(workspace: Blockly.WorkspaceSvg) {
  workspace.registerToolboxCategoryCallback('SPRITE', spriteCategoryCallback);
}

export { coreToolbox } from './core';
export { colourToolboxCategory } from './colour';
export { gameToolboxCategories } from './game';