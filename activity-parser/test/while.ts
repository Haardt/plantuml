import { parseActivity } from '../src/index';
const assert = (cond: any, msg?: string) => { if (!cond) throw new Error(msg || 'assert'); };

const input = `@startuml
while (data?)
:read;
endwhile
@enduml`;

const ast = parseActivity(input);
assert(ast.nodes.length === 1);
const whileNode = ast.nodes[0] as any;
assert(whileNode.type === 'while');
assert(whileNode.body[0].type === 'activity');
console.log('while passed');
