import { parseActivity } from '../src/index';
const assert = (cond: any, msg?: string) => { if (!cond) throw new Error(msg || 'assert'); };

const input = `@startuml
start
if (test?) then (yes)
:foo;
else (no)
:bar;
endif
stop
@enduml`;

const ast = parseActivity(input);
assert(ast.nodes.length === 3);
const ifNode = ast.nodes[1] as any;
assert(ifNode.type === 'if');
assert(ifNode.branches.length === 1);
assert(ifNode.branches[0].body[0].type === 'activity');
assert(ifNode.elseBranch[0].type === 'activity');
console.log('if passed');
