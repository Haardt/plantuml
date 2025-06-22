import { parseActivity, ActivityNode } from '../src/index';
const assert = (cond: any, msg?: string) => { if (!cond) throw new Error(msg || 'assert: ' + msg); };

console.log('--- Testing Note Parsing ---');

// Test 1: Simple note on right
let input = `@startuml
:Activity1;
note right: This is a note.
:Activity2;
@enduml`;
let ast = parseActivity(input);
assert(ast.nodes.length === 3, 'AST length for simple note right');
let noteNode = ast.nodes[1] as Extract<ActivityNode, { type: 'note' }>;
assert(noteNode.type === 'note', 'Node type for simple note right');
assert(noteNode.position === 'right', 'Position for simple note right');
assert(noteNode.text === 'This is a note.', 'Text for simple note right');

// Test 2: Multi-line note with colon
input = `@startuml
:Activity;
note left:
  This is a
  multi-line note.
end note
@enduml`;
ast = parseActivity(input);
assert(ast.nodes.length === 2, 'AST length for multi-line note colon');
noteNode = ast.nodes[1] as Extract<ActivityNode, { type: 'note' }>;
assert(noteNode.type === 'note', 'Node type for multi-line note colon');
assert(noteNode.position === 'left', 'Position for multi-line note colon');
assert(noteNode.text === 'This is a\nmulti-line note.', 'Text for multi-line note colon');

// Test 3: Note with text on the same line (no colon)
input = `@startuml
note: Text on same line.
@enduml`;
ast = parseActivity(input);
assert(ast.nodes.length === 1, 'AST length for note same line');
noteNode = ast.nodes[0] as Extract<ActivityNode, { type: 'note' }>;
assert(noteNode.type === 'note', 'Node type for note same line');
assert(noteNode.text === 'Text on same line.', 'Text for note same line');
assert(noteNode.position === undefined, 'Position for note same line (default)');


// Test 4: Note with text on the next line
input = `@startuml
note
  Text on next line.
:Activity;
@enduml`;
ast = parseActivity(input);
assert(ast.nodes.length === 2, 'AST length for note next line');
noteNode = ast.nodes[0] as Extract<ActivityNode, { type: 'note' }>;
assert(noteNode.type === 'note', 'Node type for note next line');
assert(noteNode.text === 'Text on next line.', 'Text for note next line');

// Test 5: Floating note
input = `@startuml
floating note: I am floating.
@enduml`;
ast = parseActivity(input);
assert(ast.nodes.length === 1, 'AST length for floating note');
noteNode = ast.nodes[0] as Extract<ActivityNode, { type: 'note' }>;
assert(noteNode.type === 'note', 'Node type for floating note');
assert(noteNode.position === 'floating', 'Position for floating note');
assert(noteNode.text === 'I am floating.', 'Text for floating note');

// Test 6: Note with color and stereotype
input = `@startuml
[#AliceBlue]<<Meta>>note right: Styled note.
@enduml`;
ast = parseActivity(input);
noteNode = ast.nodes[0] as Extract<ActivityNode, { type: 'note' }>;
assert(noteNode.type === 'note', 'Node type for styled note');
assert(noteNode.position === 'right', 'Position for styled note');
assert(noteNode.text === 'Styled note.', 'Text for styled note');
assert(noteNode.color?.background === '#AliceBlue', 'Background for styled note');
assert(noteNode.stereotype?.name === 'Meta', 'Stereotype for styled note');

// Test 7: Empty note (keyword alone, next line is another keyword)
input = `@startuml
:Activity1;
note
:Activity2;
@enduml`;
ast = parseActivity(input);
assert(ast.nodes.length === 3, 'AST length for empty note');
noteNode = ast.nodes[1] as Extract<ActivityNode, { type: 'note' }>;
assert(noteNode.type === 'note', 'Node type for empty note');
assert(noteNode.text === '', 'Text for empty note should be empty');

// Test 8: Multi-line note with text on first line before colon
input = `@startuml
note left: First line text:
  Second line.
  Third line.
end note
@enduml`;
ast = parseActivity(input);
noteNode = ast.nodes[0] as Extract<ActivityNode, { type: 'note' }>;
assert(noteNode.type === 'note', 'Node type for multi-line with initial text');
assert(noteNode.position === 'left', 'Position for multi-line with initial text');
assert(noteNode.text === 'First line text\nSecond line.\nThird line.', 'Text for multi-line with initial text');


console.log('--- Note Parsing Tests Passed ---');
