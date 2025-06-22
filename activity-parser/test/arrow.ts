import { parseActivity } from '../src/index';
const assert = (c: any, m?: string) => { if (!c) throw new Error(m || 'assert'); };

const input = `@startuml
start
-> next step;
:done;
@enduml`;

const ast = parseActivity(input);
assert(ast.nodes.length === 3);
const arrow = ast.nodes[1] as any;
assert(arrow.type === "arrow");
assert(arrow.text === "next step");
console.log('arrow passed');
