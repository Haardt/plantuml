/**
 * AST node definitions for a subset of the PlantUML activity diagram syntax.
 */

export interface Color {
  background?: string;
  text?: string;
  line?: string;
}

export interface Stereotype {
  name: string;
  char?: string;
  style?: string; // For now, just a string, could be more detailed
}

export type BoxStyle = 'activity' | 'file' | 'folder' | 'database' | 'cloud' | 'rect' | 'hexagon' | 'ellipse' | 'diamond';


export interface LinkRendering {
  text?: string;
  color?: string; // Simplified for now
  // Future: Add more PlantUML arrow styling options if needed
}

export type ActivityNode =
  | { type: 'start'; color?: Color; stereotype?: Stereotype; linkRendering?: LinkRendering }
  | { type: 'stop'; color?: Color; stereotype?: Stereotype; linkRendering?: LinkRendering }
  | { type: 'end'; color?: Color; stereotype?: Stereotype; linkRendering?: LinkRendering }
  | {
      type: 'activity';
      text: string;
      boxStyle?: BoxStyle;
      color?: Color;
      stereotype?: Stereotype;
      url?: string;
      linkRendering?: LinkRendering;
    }
  | { type: 'arrow'; text?: string; style?: string; color?: string } // style might be deprecated by richer LinkRendering
  | {
      type: 'if';
      condition: string; // Condition for the initial if
      label?: string; // Optional "then" label for the initial if
      color?: Color; // Color for the 'if' keyword/diamond
      stereotype?: Stereotype;
      branches: { condition?: string; label?: string; body: ActivityNode[] }[]; // condition/label for elseif
      elseBranch?: ActivityNode[];
      linkRendering?: LinkRendering;
    }
  | {
      type: 'while';
      condition: string;
      body: ActivityNode[];
      yesLabel?: string;
      outLabel?: string; // For arrow coming out when condition is false
      color?: Color; // Color for the 'while' keyword/diamond
      linkRendering?: LinkRendering;
      // TODO: backward activity?
    }
  | {
      type: 'repeat';
      body: ActivityNode[];
      testCondition?: string; // Condition for the 'repeat while'
      yesLabel?: string;
      outLabel?: string;
      color?: Color; // Color for the 'repeat' keyword
      linkRendering?: LinkRendering;
      // TODO: backward activity?
    }
  | {
      type: 'fork';
      branches: ActivityNode[][];
      endForkLabel?: string;
      linkRendering?: LinkRendering;
    }
  | {
      type: 'split';
      branches: ActivityNode[][];
      linkRendering?: LinkRendering;
      // TODO: endSplit label?
    }
  | {
      type: 'switch';
      testLabel?: string; // Label for the switch condition
      color?: Color; // Color for the 'switch' keyword
      cases: { label?: string; body: ActivityNode[] }[];
      linkRendering?: LinkRendering;
    }
  | { type: 'break'; linkRendering?: LinkRendering; }
  | { type: 'kill'; linkRendering?: LinkRendering; }
  | { type: 'detach'; linkRendering?: LinkRendering; } // Java equivalent?
  | { type: 'goto'; target: string; linkRendering?: LinkRendering; }
  | { type: 'label'; name: string; linkRendering?: LinkRendering; }
  | {
      type: 'note';
      position?: 'left' | 'right' | 'top' | 'bottom' | 'end' | 'on_link' | 'floating'; // More specific positions
      text: string;
      color?: Color;
      stereotype?: Stereotype; // Notes can have stereotypes
      // TODO: NoteType (shape)
    }
  // TODO: Swimlane/Partition/Group nodes

export interface ActivityDiagram {
  type: 'ActivityDiagram';
  nodes: ActivityNode[];
}

export function parseActivity(input: string): ActivityDiagram {
  const lines = input
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('@') && !l.startsWith("'")); // Also filter single-quote comments
  let index = 0;

  // Helper to parse [#color]<stereotype> syntax
  function parseStyleAttributes(input: string): { color?: Color, stereotype?: Stereotype, remaining: string } {
    let remaining = input;
    let color: Color | undefined;
    let stereotype: Stereotype | undefined;

    const colorMatch = remaining.match(/^\[(#\w+(?:;\w+)?)\]\s*/);
    if (colorMatch) {
      // Rudimentary color parsing for now, PlantUML is more complex (e.g. #red;line:blue)
      // This will capture something like [#red] or [#red;blue]
      // For now, just taking the first color as background
      const parts = colorMatch[1].split(';');
      color = { background: parts[0] };
      if (parts[1]) { // Very basic text color if second part exists
        color.text = parts[1];
      }
      remaining = remaining.substring(colorMatch[0].length);
    }

    const stereoMatch = remaining.match(/^<<\s*(?:([^>\s]+)\s*)?([^>>]+)\s*>>\s*/);
    if (stereoMatch) {
      stereotype = { name: stereoMatch[2].trim() };
      if (stereoMatch[1]) {
        stereotype.char = stereoMatch[1].trim();
      }
      remaining = remaining.substring(stereoMatch[0].length);
    }
    return { color, stereotype, remaining };
  }


  function parseBlock(endKeywords: string[] = []): ActivityNode[] {
    const nodes: ActivityNode[] = [];
    let pendingLinkRendering: LinkRendering | undefined = undefined;

    function addNode(node: ActivityNode) {
      if (pendingLinkRendering) {
        // Check if the node type *can* have linkRendering
        if ('linkRendering' in node) {
           (node as any).linkRendering = pendingLinkRendering;
        } else {
          // If the current node cannot take a linkRendering (e.g. an 'arrow' itself)
          // and the linkRendering is just a color, it might be a standalone arrow color definition.
          // This is a tricky case. For now, we'll assume linkRendering is consumed if the node can take it.
          // Otherwise, it might need to become a general 'style' for the next arrow, or be ignored if next isn't arrow.
          // This part of PlantUML logic (contextual styling) is complex.
          // For now, let's prioritize attaching to nodes that explicitly support it.
        }
        pendingLinkRendering = undefined; // Consume it
      }
      nodes.push(node);
    }

    while (index < lines.length) {
      let lineContent = lines[index]; // Use let to allow modification by style parsing
      if (endKeywords.some((k) => lineContent.startsWith(k))) break;

      // Try to parse optional leading style attributes for any line
      const styleAttrs = parseStyleAttributes(lineContent);
      let color = styleAttrs.color;
      let stereotype = styleAttrs.stereotype;
      lineContent = styleAttrs.remaining; // This is the line after consuming [color]<stereotype>

      // Arrow processing must happen before other keywords if it's a bare arrow
      // to set pendingLinkRendering
      const arrowMatch = lineContent.match(/^(?:(\-\[[^\]]+\]\->)|(-(?:\[[^\]]+\])?(?:left|right|up|down)?->)|(->))\s*(.*);?$/);
      if (arrowMatch) {
        const arrowTextRaw = arrowMatch[4]?.trim();
        const arrowStyleRaw = arrowMatch[1] || arrowMatch[2] || arrowMatch[3];

        let arrowColorOnly: string | undefined; // Color from the arrow syntax itself e.g. -[#red]->
        const colorMatchInArrow = arrowStyleRaw.match(/\[(#\w+)\]/);
        if (colorMatchInArrow) {
            arrowColorOnly = colorMatchInArrow[1];
        }

        if (arrowTextRaw && arrowTextRaw.length > 0) {
          const arrowNode: ActivityNode = { type: 'arrow', text: arrowTextRaw, color: arrowColorOnly, style: arrowStyleRaw };
          // Arrow with text is a node. It doesn't consume pendingLinkRendering from a *previous* line's bare arrow.
          // It also doesn't typically have its own [color]<stereotype> prefix.
          nodes.push(arrowNode);
          pendingLinkRendering = undefined;
        } else {
          // Arrow without a label modifies the next element's link.
          // color here is from a potential [#green] prefix on the arrow line itself.
          // arrowColorOnly is from -[#red]-> part. The latter should probably take precedence for the link itself.
          pendingLinkRendering = { color: arrowColorOnly || color?.background, text: undefined };
        }
        index++;
        continue;
      }


      if (lineContent === 'start') {
        addNode({ type: 'start', color, stereotype });
        index++;
        continue;
      }
      if (lineContent === 'stop') {
        addNode({ type: 'stop', color, stereotype });
        index++;
        continue;
      }
      if (lineContent === 'end') {
        addNode({ type: 'end', color, stereotype });
        index++;
        continue;
      }

      const activityPattern = /^:([^;/\\|\]}]+?)([/\\|\]};])\s*(?:\[\[(.+?)\]\])?\s*$/;
      const activityMatchCurrent = lineContent.match(activityPattern);
      if (activityMatchCurrent) {
        const actText = activityMatchCurrent[1].trim();
        const actTerminator = activityMatchCurrent[2];
        const actUrl = activityMatchCurrent[3];

        let boxStyle: BoxStyle = 'activity';
        switch (actTerminator) {
          case '/': boxStyle = 'file'; break;
          case '\\': boxStyle = 'folder'; break;
          case '|': boxStyle = 'rect'; break;
          case ']': boxStyle = 'database'; break;
        }
        addNode({ type: 'activity', text: actText, boxStyle, color, stereotype, url: actUrl });
        index++;
        continue;
      }

      const labelMatch = lineContent.match(/^label\s+(\S+)/);
      if (labelMatch) {
        addNode({ type: 'label', name: labelMatch[1], color, stereotype });
        index++;
        continue;
      }

      const gotoMatch = lineContent.match(/^goto\s+(\S+)/);
      if (gotoMatch) {
        addNode({ type: 'goto', target: gotoMatch[1], color, stereotype });
        index++;
        continue;
      }

      if (lineContent === 'break') {
        addNode({ type: 'break', color, stereotype });
        index++;
        continue;
      }
      if (lineContent === 'detach') {
        addNode({ type: 'detach', color, stereotype });
        index++;
        continue;
      }
      if (lineContent === 'kill') {
        addNode({ type: 'kill', color, stereotype });
        index++;
        continue;
      }

      const noteMatch = lineContent.match(/^(floating\s+)?note(?:\s+(left|right|top|bottom|end|on_link))?:?\s*(.*)?$/);
      if (noteMatch) {
        index++; // Consume the note definition line
        const noteTextLines: string[] = [];
        const isFloating = !!noteMatch[1];
        const specifiedPosition = noteMatch[2];
        let textOnSameLine = noteMatch[3]?.trim();

        let finalPosition: ActivityNode['position']; // No default here, let it be undefined if not set
        if (isFloating) {
            finalPosition = 'floating';
        } else if (specifiedPosition) {
            finalPosition = specifiedPosition as any;
        }
        // If neither floating nor specified, position remains undefined (optional in type)


        if (textOnSameLine && textOnSameLine.endsWith(':')) { // Multi-line note starts here
            noteTextLines.push(textOnSameLine.slice(0, -1).trim()); // Add text before colon
            while (index < lines.length) {
                if (lines[index] === 'end note') {
                    index++; // consume 'end note'
                    break;
                }
                noteTextLines.push(lines[index]);
                index++;
            }
        } else if (textOnSameLine && textOnSameLine.length > 0) { // Single line note with text on same line
            noteTextLines.push(textOnSameLine);
        } else if (!textOnSameLine) { // Note keyword alone, text might be on next line
            if (index < lines.length && lines[index] !== 'end note' &&
                !lines[index].match(/^(if|while|repeat|fork|split|switch|label|goto|note|:|@|else|elseif|endif|endwhile|repeat while|fork again|end fork|split again|end split|case|endswitch)/)) {
                noteTextLines.push(lines[index]);
                index++; // Consume the line used as note text
            }
            // If next line is 'end note' or a keyword, note remains empty (or could error)
        }

        addNode({
            type: 'note',
            position: finalPosition,
            text: noteTextLines.join('\n').trim(),
            color,
            stereotype
        });
        continue;
      }

      const ifKeywordMatch = lineContent.match(/^if\s*\((.*)\)(?:\s*then(?:\s*\((.*)\))?)?/);
      if (ifKeywordMatch) {
        index++;
        const initialCondition = ifKeywordMatch[1].trim();
        const initialLabel = ifKeywordMatch[2]?.trim();

        const ifBranches: { condition?: string; label?: string; body: ActivityNode[] }[] = [];
        ifBranches.push({
          condition: initialCondition, // Condition for the first branch is from the 'if' line itself
          label: initialLabel,
          body: parseBlock(['elseif', 'else', 'endif']),
        });

        while (index < lines.length && lines[index].startsWith('elseif')) {
          const elseifLine = lines[index];
          // Apply style parsing to elseif line too
          const elseifStyleAttrs = parseStyleAttributes(elseifLine);
          const elseifContent = elseifStyleAttrs.remaining; // TODO: Use color/stereo for elseif diamond?

          const m = elseifContent.match(/^elseif\s*\((.*)\)(?:\s*then(?:\s*\((.*)\))?)?/);
          if (!m) break;
          index++;
          ifBranches.push({
            condition: m[1].trim(),
            label: m[2]?.trim(),
            body: parseBlock(['elseif', 'else', 'endif']),
          });
        }

        let elseBranch: ActivityNode[] | undefined;
        if (lines[index] && lines[index].startsWith('else')) {
          index++;
          elseBranch = parseBlock(['endif']);
        }

        if (index < lines.length && lines[index] === 'endif') index++;
        // Correctly pass parsed attributes for the main if node
        addNode({ type: 'if', condition: initialCondition, label: initialLabel, branches: ifBranches, elseBranch, color, stereotype });
        continue;
      }

      const whileKeywordMatch = lineContent.match(/^while\s*\((.*)\)(?:\s*is\s*\((.*)\))?/);
      if (whileKeywordMatch) {
        index++;
        const whileCondition = whileKeywordMatch[1].trim();
        const yesLabel = whileKeywordMatch[2]?.trim() || undefined; // Label for "yes" path

        const body = parseBlock(['endwhile']);
        let outLabel: string | undefined;
        if (index < lines.length && lines[index].startsWith('endwhile')) {
            const endWhileMatch = lines[index].match(/^endwhile(?:\s*is\s*\((.*)\))?/);
            if (endWhileMatch && endWhileMatch[1]) {
                outLabel = endWhileMatch[1].trim(); // Label for "out" path
            }
            index++;
        }
        addNode({ type: 'while', condition: whileCondition, body, yesLabel, outLabel, color, stereotype });
        continue;
      }

      if (lineContent === 'repeat') {
        index++;
        const body = parseBlock(['repeat while']);
        let repeatTestCondition: string | undefined;
        let repeatYesLabel: string | undefined;

        if (index < lines.length && lines[index].startsWith('repeat while')) {
          const repeatWhileMatch = lines[index].match(/^repeat while\s*\((.*)\)(?:\s*is\s*\((.*)\))?/);
          if (repeatWhileMatch) {
            repeatTestCondition = repeatWhileMatch[1].trim();
            if (repeatWhileMatch[2]) repeatYesLabel = repeatWhileMatch[2].trim();
          }
          index++;
        }
        addNode({ type: 'repeat', body, testCondition: repeatTestCondition, yesLabel: repeatYesLabel, color, stereotype });
        continue;
      }

      if (lineContent === 'fork') {
        index++;
        const branches: ActivityNode[][] = [];
        branches.push(parseBlock(['fork again', 'end fork']));
        while (index < lines.length && lines[index].startsWith('fork again')) {
          index++;
          branches.push(parseBlock(['fork again', 'end fork']));
        }
        let endForkLabel: string | undefined;
        if (index < lines.length && lines[index].startsWith('end fork')) {
            const endForkMatch = lines[index].match(/^end fork(?:\s+(.*))?/);
            if (endForkMatch && endForkMatch[1]) {
                endForkLabel = endForkMatch[1].trim();
            }
            index++;
        }
        addNode({ type: 'fork', branches, endForkLabel, color, stereotype });
        continue;
      }

      if (lineContent === 'split') {
        index++;
        const branches: ActivityNode[][] = [];
        branches.push(parseBlock(['split again', 'end split']));
        while (index < lines.length && lines[index].startsWith('split again')) {
          index++;
          branches.push(parseBlock(['split again', 'end split']));
        }
        if (index < lines.length && lines[index].startsWith('end split')) {
            // TODO: end split label? Java parser seems to support it.
            index++;
        }
        addNode({ type: 'split', branches, color, stereotype });
        continue;
      }

      const switchKeywordMatch = lineContent.match(/^switch\s*(?:\((.*)\))?/);
      if (switchKeywordMatch) {
        index++;
        const testLabel = switchKeywordMatch[1]?.trim();
        const cases: { label?: string; body: ActivityNode[] }[] = [];

        while (index < lines.length && !lines[index].startsWith('endswitch')) {
          const caseLine = lines[index];
          // TODO: Color/Stereotype for case?
          const caseMatch = caseLine.match(/^case(?:\s*\((.*)\))?/);
          if (caseMatch) {
            index++;
            const body = parseBlock(['case', 'endswitch']);
            cases.push({ label: caseMatch[1]?.trim(), body });
            continue;
          }
          // unexpected line inside switch, skip
          index++;
        }
        if (index < lines.length && lines[index] === 'endswitch') index++;
        addNode({ type: 'switch', testLabel, cases, color, stereotype });
        continue;
      }

      // skip unrecognised lines if nothing else matched
      index++;
    }
    return nodes;
  }

  return { type: 'ActivityDiagram', nodes: parseBlock() };
}
