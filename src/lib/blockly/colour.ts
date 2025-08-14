// src/lib/blockly/colour.ts

export const colourToolboxCategory = {
  kind: 'category',
  name: 'Colour',
  colour: '#A6745C',
  contents: [
    { kind: 'block', type: 'colour_picker' },
    { kind: 'block', type: 'colour_random' },
    { kind: 'block', type: 'colour_rgb', 
      inputs: { 
        RED: { shadow: { type: 'math_number', fields: { NUM: 100 } } }, 
        GREEN: { shadow: { type: 'math_number', fields: { NUM: 50 } } }, 
        BLUE: { shadow: { type: 'math_number', fields: { NUM: 0 } } } 
      } 
    },
    { kind: 'block', type: 'colour_blend', 
      inputs: { 
        COLOUR1: { shadow: { type: 'colour_picker', fields: { COLOUR: '#ff0000' } } }, 
        COLOUR2: { shadow: { type: 'colour_picker', fields: { COLOUR: '#3333ff' } } }, 
        RATIO: { shadow: { type: 'math_number', fields: { NUM: 0.5 } } } 
      } 
    },
  ],
};