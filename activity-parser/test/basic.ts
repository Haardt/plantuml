import { parseActivity } from '../src/index';
const assert = (cond: any, msg?: string) => { if (!cond) throw new Error(msg || 'assert'); };

const input = `@startuml
start
:Hello world;
stop
@enduml`;

const ast = parseActivity(input);
assert(ast.nodes.length === 3, 'length');
assert(ast.nodes[0].type === 'start');
assert(ast.nodes[1].type === 'activity');
assert((ast.nodes[1] as any).text === 'Hello world');
assert(ast.nodes[2].type === 'stop');
console.log('basic passed');
