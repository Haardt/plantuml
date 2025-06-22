import { parseActivity, ActivityNode } from '../src/index';
const assert = (cond: any, msg?: string) => { if (!cond) throw new Error(msg || 'assert: ' + msg); };

console.log('--- Testing Loop and Fork Labels ---');

// Test 1: While loop with yes and out labels
let input = `@startuml
while (condition) is (go on)
  :Do something;
endwhile is (finished)
@enduml`;
let ast = parseActivity(input);
assert(ast.nodes.length === 1, 'AST length for while with labels');
let whileNode = ast.nodes[0] as Extract<ActivityNode, { type: 'while' }>;
assert(whileNode.type === 'while', 'Node type for while with labels');
assert(whileNode.condition === 'condition', 'Condition for while with labels');
assert(whileNode.yesLabel === 'go on', 'YesLabel for while with labels');
assert(whileNode.outLabel === 'finished', 'OutLabel for while with labels');
assert(whileNode.body.length === 1, 'Body length for while with labels');
assert(whileNode.body[0].type === 'activity', 'Body content for while with labels');

// Test 2: While loop with only yes label
input = `@startuml
while (condition) is (keep going)
  :Processing;
endwhile
@enduml`;
ast = parseActivity(input);
whileNode = ast.nodes[0] as Extract<ActivityNode, { type: 'while' }>;
assert(whileNode.yesLabel === 'keep going', 'YesLabel for while partial labels');
assert(whileNode.outLabel === undefined, 'OutLabel for while partial labels should be undefined');

// Test 3: While loop with only out label
input = `@startuml
while (condition)
  :Work;
endwhile is (done)
@enduml`;
ast = parseActivity(input);
whileNode = ast.nodes[0] as Extract<ActivityNode, { type: 'while' }>;
assert(whileNode.yesLabel === undefined, 'YesLabel for while out-only label should be undefined');
assert(whileNode.outLabel === 'done', 'OutLabel for while out-only label');

// Test 4: Repeat loop with test condition and yes label
input = `@startuml
repeat
  :Action;
repeat while (check) is (again)
@enduml`;
ast = parseActivity(input);
assert(ast.nodes.length === 1, 'AST length for repeat with labels');
let repeatNode = ast.nodes[0] as Extract<ActivityNode, { type: 'repeat' }>;
assert(repeatNode.type === 'repeat', 'Node type for repeat with labels');
assert(repeatNode.testCondition === 'check', 'Test condition for repeat');
assert(repeatNode.yesLabel === 'again', 'YesLabel for repeat');
assert(repeatNode.body.length === 1, 'Body length for repeat');

// Test 5: Fork with endfork label
input = `@startuml
fork
  :Branch 1;
fork again
  :Branch 2;
end fork MergePoint
@enduml`;
ast = parseActivity(input);
assert(ast.nodes.length === 1, 'AST length for fork with label');
let forkNode = ast.nodes[0] as Extract<ActivityNode, { type: 'fork' }>;
assert(forkNode.type === 'fork', 'Node type for fork with label');
assert(forkNode.branches.length === 2, 'Branch count for fork with label');
assert(forkNode.endForkLabel === 'MergePoint', 'EndForkLabel for fork with label');

console.log('--- Loop and Fork Label Tests Passed ---');
