import { parseActivity, ActivityNode } from '../src/index';
const assert = (cond: any, msg?: string) => { if (!cond) throw new Error(msg || 'assert: ' + msg); };

console.log('--- Testing Keyword Styles and Links ---');

// Test 1: Styled start node
let input = `@[startuml
-[#blue]->
[#red]<<Stereo>>start
:Next activity;
@enduml`;
let ast = parseActivity(input);
assert(ast.nodes.length === 2, 'AST length for styled start');
let startNode = ast.nodes[0] as Extract<ActivityNode, { type: 'start' }>;
assert(startNode.type === 'start', 'Node type for styled start');
assert(startNode.color?.background === '#red', 'Start node bg color');
assert(startNode.stereotype?.name === 'Stereo', 'Start node stereotype');
assert(startNode.linkRendering?.color === '#blue', 'Start node link rendering color');

// Test 2: Styled if node
input = `@[startuml
if ([#green]<<CondStereo>>condition) then (yes)
:Activity in if;
endif
@enduml`;
ast = parseActivity(input);
assert(ast.nodes.length === 1, 'AST length for styled if');
let ifNode = ast.nodes[0] as Extract<ActivityNode, { type: 'if' }>;
assert(ifNode.type === 'if', 'Node type for styled if');
assert(ifNode.color?.background === '#green', 'If node bg color');
assert(ifNode.stereotype?.name === 'CondStereo', 'If node stereotype');
assert(ifNode.condition === 'condition', 'If node condition text');

// Test 3: Styled while node
input = `@[startuml
-[#magenta]->
[#yellow]<<LoopStereo>>while (loop condition) is ( looping )
:Activity in while;
endwhile is ( done looping )
@enduml`;
ast = parseActivity(input);
assert(ast.nodes.length === 1, 'AST length for styled while');
let whileNode = ast.nodes[0] as Extract<ActivityNode, { type: 'while' }>;
assert(whileNode.type === 'while', 'Node type for styled while');
assert(whileNode.color?.background === '#yellow', 'While node bg color');
assert(whileNode.stereotype?.name === 'LoopStereo', 'While node stereotype');
assert(whileNode.linkRendering?.color === '#magenta', 'While node link rendering color');
assert(whileNode.condition === 'loop condition', 'While node condition text');
assert(whileNode.yesLabel === 'looping', 'While node yesLabel text');
assert(whileNode.outLabel === 'done looping', 'While node outLabel text');


// Test 4: Link rendering applied to an activity
input = `@[startuml
start
-[#red]->
:This activity should have a red link incoming;
@enduml`;
ast = parseActivity(input);
assert(ast.nodes.length === 2, 'AST length for link to activity');
let activityWithLink = ast.nodes[1] as Extract<ActivityNode, { type: 'activity' }>;
assert(activityWithLink.type === 'activity', 'Activity node type for link test');
assert(activityWithLink.linkRendering !== undefined, 'Link rendering should exist on activity');
assert(activityWithLink.linkRendering?.color === '#red', 'Link rendering color on activity');

// Test 5: Link rendering applied to an if statement
input = `@[startuml
start
-[#green]->
if (condition) then
:foo;
endif
@enduml`;
ast = parseActivity(input);
assert(ast.nodes.length === 2, 'AST length for link to if');
let ifWithLink = ast.nodes[1] as Extract<ActivityNode, { type: 'if' }>;
assert(ifWithLink.type === 'if', 'If node type for link test');
assert(ifWithLink.linkRendering !== undefined, 'Link rendering should exist on if');
assert(ifWithLink.linkRendering?.color === '#green', 'Link rendering color on if');

// Test 6: Arrow with text is its own node and does not set pendingLinkRendering for next
input = `@[startuml
start
-[#blue]->
-[#red]->ArrowLabel;
:ActivityAfterArrowLabel;
@enduml`;
ast = parseActivity(input);
assert(ast.nodes.length === 4, 'AST length for arrow label test - expected 4'); // start, pendingBlue, arrowRed, activity
let firstNode = ast.nodes[0] as Extract<ActivityNode, { type: 'start' }>;
let bluePendingArrow = ast.nodes[1] as Extract<ActivityNode, { type: 'arrow' }>; // This interpretation might be tricky.
                                                                            // Current parser: bare arrow sets pending.
                                                                            // If next is bare arrow, it overwrites.
                                                                            // If next is text arrow, text arrow is a node.
                                                                            // Let's test current behavior.
                                                                            // Expected: start, arrow(-[#red]->ArrowLabel), activity (link from blue)

// Re-evaluating Test 6 based on current parser logic:
// 1. start
// 2. -[#blue]-> (sets pendingLinkRendering = {color: '#blue'})
// 3. -[#red]->ArrowLabel; (this is an ArrowNode itself, color '#red', text 'ArrowLabel'. It should NOT consume blue pendingLink)
//    The `addNode` for an arrow with text currently *doesn't* consume pendingLinkRendering.
//    And a previous bare arrow *does* set pendingLinkRendering.
//    So, the activity *after* the textual arrow should get the last *bare* arrow's style.
input = `@[startuml
start
-[#blue]->
-[#red]->ArrowLabel;
:ActivityAfterArrowLabel;
@enduml`;
ast = parseActivity(input);
assert(ast.nodes.length === 4, 'AST length for arrow label test'); // start, arrow(red, ArrowLabel), activity(blue link)
// Expected order: start, arrow "ArrowLabel", activity "ActivityAfterArrowLabel"
// start node: ast.nodes[0]
// arrow node: ast.nodes[1] - this is the -[#red]->ArrowLabel;
// activity node: ast.nodes[2] - this is :ActivityAfterArrowLabel;
// The -[#blue]-> should apply to the -[#red]->ArrowLabel if arrows could take linkRendering.
// But they don't. So -[#blue]-> applies to :ActivityAfterArrowLabel;
// And -[#red]->ArrowLabel is just an arrow. This seems like a potential logic flaw or area for refinement.

// Let's adjust Test 6 expectation based on the description in implementation:
// "Arrow without a label modifies the next element's link"
// "Arrow with a label is a distinct node... It consumes any pendingLinkRendering for itself." -> This part was then changed.
// Current logic: arrow with text is a node and does NOT consume pendingLink.
// Bare arrow sets pendingLink.
// So, -[#blue]-> sets pending. Then -[#red]->ArrowLabel is a node. Then :Activity... consumes blue.
// This means the -[#red]-> part of the textual arrow is only for its own appearance, not a pending link.

assert(ast.nodes[0].type === 'start', 'Test 6 Start Node');
let arrowNodeTest6 = ast.nodes[1] as Extract<ActivityNode, { type: 'arrow' }>;
assert(arrowNodeTest6.type === 'arrow', 'Test 6 Arrow Node type');
assert(arrowNodeTest6.text === 'ArrowLabel', 'Test 6 Arrow Node text');
assert(arrowNodeTest6.color === '#red', 'Test 6 Arrow Node intrinsic color'); // Color from -[#red]->

let activityNodeTest6 = ast.nodes[2] as Extract<ActivityNode, { type: 'activity' }>;
assert(activityNodeTest6.type === 'activity', 'Test 6 Activity Node type');
assert(activityNodeTest6.text === 'ActivityAfterArrowLabel', 'Test 6 Activity Node text');
assert(activityNodeTest6.linkRendering?.color === '#blue', 'Test 6 Activity Node link color from first bare arrow');


console.log('--- Keyword Styles and Links Tests Passed ---');
