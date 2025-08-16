// src/lib/blockly/game/toolbox.ts

export const gameToolboxCategories = [
  { kind: 'sep' },
  {
    kind: 'category',
    name: 'Game Events',
    colour: '#4B823A',
    contents: [
      { kind: 'block', type: 'game_on_start' },
      { kind: 'block', type: 'game_on_tick' },
  { kind: 'block', type: 'game_on_assets_loaded' },
    ],
  },
  {
    kind: 'category',
    name: 'Sprites',
    colour: '#4C97FF',
    custom: 'SPRITE'
  },
  {
    kind: 'category',
    name: 'Sprite Physics',
    colour: '#4C97FF',
    contents: [
      { kind: 'block', type: 'sprite_set_gravity' },
      { kind: 'block', type: 'sprite_set_terminal_speed' },
      { kind: 'block', type: 'sprite_jump' },
    ],
  },
  {
    kind: 'category',
    name: 'Sensing',
    colour: '#2E8997',
    contents: [
      { kind: 'block', type: 'input_is_key_down' },
      { kind: 'block', type: 'sensing_sprite_collides' },
    ],
  },
  {
    kind: 'category',
    name: 'Game State',
    colour: '#CF8B17',
    contents: [
      { kind: 'block', type: 'game_change_score' },
      { kind: 'block', type: 'game_get_score' },
  { kind: 'block', type: 'game_set_fixed_timestep' },
    ],
  },
  {
    kind: 'category',
    name: 'Canvas (Drawing)',
    colour: '#3A827D',
    contents: [
      { kind: 'block', type: 'canvas_clear' },
      { kind: 'block', type: 'canvas_draw_rect' },
      { kind: 'block', type: 'canvas_draw_text' },
    ],
  },
]; 