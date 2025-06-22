import { parseActivity, ActivityNode } from '../src/index';
const assert = (cond: any, msg?: string) => { if (!cond) throw new Error(msg || 'assert: ' + msg); };

console.log('--- Testing Activity Styles ---');

// Test 1: Activity with color
let input = `@startuml
start
-[#blue]->
:[#red]Activity Text;
stop
@enduml`;
let ast = parseActivity(input);
assert(ast.nodes.length === 3, 'AST length for color test');
let activityNode = ast.nodes[1] as Extract<ActivityNode, { type: 'activity' }>;
assert(activityNode.type === 'activity', 'Node type for color test');
assert(activityNode.text === 'Activity Text', 'Text for color test');
assert(activityNode.color?.background === '#red', 'Background color for color test');
assert(activityNode.linkRendering?.color === '#blue', 'Link rendering color for activity');

// Test 2: Activity with stereotype
input = `@startuml
start
<<Stereo1>>:Activity with Stereo;
stop
@enduml`;
ast = parseActivity(input);
activityNode = ast.nodes[1] as Extract<ActivityNode, { type: 'activity' }>;
assert(activityNode.type === 'activity', 'Node type for stereo test');
assert(activityNode.text === 'Activity with Stereo', 'Text for stereo test');
assert(activityNode.stereotype?.name === 'Stereo1', 'Stereotype name for stereo test');

// Test 3: Activity with color and stereotype
input = `@startuml
start
[#green]<<Stereo2>>:Colored Stereo Activity;
stop
@enduml`;
ast = parseActivity(input);
activityNode = ast.nodes[1] as Extract<ActivityNode, { type: 'activity' }>;
assert(activityNode.type === 'activity', 'Node type for color+stereo test');
assert(activityNode.text === 'Colored Stereo Activity', 'Text for color+stereo test');
assert(activityNode.color?.background === '#green', 'Background color for color+stereo test');
assert(activityNode.stereotype?.name === 'Stereo2', 'Stereotype name for color+stereo test');

// Test 4: Activity with URL
input = `@startuml
:Activity with URL [[http://example.com]];
@enduml`;
ast = parseActivity(input);
activityNode = ast.nodes[0] as Extract<ActivityNode, { type: 'activity' }>;
assert(activityNode.type === 'activity', 'Node type for URL test');
assert(activityNode.text === 'Activity with URL', 'Text for URL test');
assert(activityNode.url === 'http://example.com', 'URL for URL test');

// Test 5: Box style - file
input = `@startuml
:File Activity/;
@enduml`;
ast = parseActivity(input);
activityNode = ast.nodes[0] as Extract<ActivityNode, { type: 'activity' }>;
assert(activityNode.boxStyle === 'file', 'Box style file test');

// Test 6: Box style - folder
input = `@startuml
:Folder Activity\\;
@enduml`;
ast = parseActivity(input);
activityNode = ast.nodes[0] as Extract<ActivityNode, { type: 'activity' }>;
assert(activityNode.boxStyle === 'folder', 'Box style folder test');

// Test 7: Box style - database
input = `@startuml
:DB Activity];
@enduml`;
ast = parseActivity(input);
activityNode = ast.nodes[0] as Extract<ActivityNode, { type: 'activity' }>;
assert(activityNode.boxStyle === 'database', 'Box style database test');


// Test 8: Activity with stereotype and char
input = `@startuml
start
<<S,C>>:Stereo with Char;
stop
@enduml`;
ast = parseActivity(input);
activityNode = ast.nodes[1] as Extract<ActivityNode, { type: 'activity' }>;
assert(activityNode.type === 'activity', 'Node type for stereo+char test');
assert(activityNode.text === 'Stereo with Char', 'Text for stereo+char test');
assert(activityNode.stereotype?.name === 'S', 'Stereotype name for stereo+char test');
assert(activityNode.stereotype?.char === 'C', 'Stereotype char for stereo+char test');

// Test 9: Activity with complex color (background + text)
input = `@startuml
:[#red;white]Activity Colors;
@enduml`;
ast = parseActivity(input);
activityNode = ast.nodes[0] as Extract<ActivityNode, { type: 'activity' }>;
assert(activityNode.color?.background === '#red', 'Complex color bg');
assert(activityNode.color?.text === 'white', 'Complex color text');


console.log('--- Activity Styles Tests Passed ---');
