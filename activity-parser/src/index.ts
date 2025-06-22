/**
 * AST node definitions for a subset of the PlantUML activity diagram syntax.
 */
export type ActivityNode =
  | { type: 'start' }
  | { type: 'stop' }
  | { type: 'end' }
  | { type: 'activity'; text: string }
  | { type: 'arrow'; text?: string; style?: string }
  | {
      type: 'if'
      branches: { condition: string; label?: string; body: ActivityNode[] }[]
      elseBranch?: ActivityNode[]
    }
  | { type: 'while'; condition: string; body: ActivityNode[] }
  | { type: 'repeat'; condition: string; body: ActivityNode[] }
  | { type: 'fork'; branches: ActivityNode[][] }
  | { type: 'split'; branches: ActivityNode[][] }
  | { type: 'switch'; cases: { label?: string; body: ActivityNode[] }[] }
  | { type: 'break' }
  | { type: 'kill' }
  | { type: 'detach' }
  | { type: 'goto'; target: string }
  | { type: 'label'; name: string }
  | { type: 'note'; position?: string; text: string };

export interface ActivityDiagram {
  type: 'ActivityDiagram';
  nodes: ActivityNode[];
}

export function parseActivity(input: string): ActivityDiagram {
  const lines = input
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('@'));
  let index = 0;

  function parseBlock(endKeywords: string[] = []): ActivityNode[] {
    const nodes: ActivityNode[] = [];
    while (index < lines.length) {
      const line = lines[index];
      if (endKeywords.some((k) => line.startsWith(k))) break;

      if (line === 'start') {
        nodes.push({ type: 'start' });
        index++;
        continue;
      }
      if (line === 'stop') {
        nodes.push({ type: 'stop' });
        index++;
        continue;
      }
      if (line === 'end') {
        nodes.push({ type: 'end' });
        index++;
        continue;
      }

      // arrow such as -> label; or -[#green]-> label;
      const arrow = line.match(/^(\-\[[^\]]*\])?->\s*(.*);$/);
      if (arrow) {
        const text = arrow[2].trim();
        const style = arrow[1] ? arrow[1].slice(1, -1) : undefined;
        nodes.push({ type: 'arrow', text: text.length ? text : undefined, style });
        index++;
        continue;
      }

      // simple activity :text;
      const act = line.match(/^:(.+);$/);
      if (act) {
        nodes.push({ type: 'activity', text: act[1].trim() });
        index++;
        continue;
      }

      // label
      const label = line.match(/^label\s+(\S+)/);
      if (label) {
        nodes.push({ type: 'label', name: label[1] });
        index++;
        continue;
      }

      // goto
      const go = line.match(/^goto\s+(\S+)/);
      if (go) {
        nodes.push({ type: 'goto', target: go[1] });
        index++;
        continue;
      }

      if (line === 'break') {
        nodes.push({ type: 'break' });
        index++;
        continue;
      }

      if (line === 'detach') {
        nodes.push({ type: 'detach' });
        index++;
        continue;
      }

      if (line === 'kill') {
        nodes.push({ type: 'kill' });
        index++;
        continue;
      }

      // note (single or multi line)
      const noteMatch = line.match(/^(floating\s+)?note(?:\s+(left|right|top|bottom))?:?\s*(.*)?$/);
      if (noteMatch) {
        index++;
        const linesText: string[] = [];
        if (noteMatch[3]) linesText.push(noteMatch[3]);
        while (index < lines.length && lines[index] !== 'end note') {
          linesText.push(lines[index]);
          index++;
        }
        if (lines[index] === 'end note') index++;
        nodes.push({ type: 'note', position: noteMatch[2] as any, text: linesText.join('\n') });
        continue;
      }

      // if/elseif/else/endif
      const ifMatch = line.match(/^if\s*\((.*)\)(?:\s*then(?:\s*\((.*)\))?)?/);
      if (ifMatch) {
        index++;
        const branches: { condition: string; label?: string; body: ActivityNode[] }[] = [];
        branches.push({
          condition: ifMatch[1].trim(),
          label: ifMatch[2]?.trim(),
          body: parseBlock(['elseif', 'else', 'endif']),
        });

        while (lines[index] && lines[index].startsWith('elseif')) {
          const m = lines[index].match(/^elseif\s*\((.*)\)(?:\s*then(?:\s*\((.*)\))?)?/);
          if (!m) break;
          index++;
          branches.push({
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

        if (lines[index] === 'endif') index++;
        nodes.push({ type: 'if', branches, elseBranch });
        continue;
      }

      // while loop
      const whileMatch = line.match(/^while\s*\((.*)\)/);
      if (whileMatch) {
        index++;
        const body = parseBlock(['endwhile']);
        if (lines[index] && lines[index].startsWith('endwhile')) index++;
        nodes.push({ type: 'while', condition: whileMatch[1].trim(), body });
        continue;
      }

      // repeat loop
      if (line === 'repeat') {
        index++;
        const body = parseBlock(['repeat while']);
        let condition = '';
        if (lines[index] && lines[index].startsWith('repeat while')) {
          const m = lines[index].match(/^repeat while\s*\((.*)\)/);
          if (m) condition = m[1].trim();
          index++;
        }
        nodes.push({ type: 'repeat', condition, body });
        continue;
      }

      // fork structure
      if (line === 'fork') {
        index++;
        const branches: ActivityNode[][] = [];
        branches.push(parseBlock(['fork again', 'end fork']));
        while (lines[index] && lines[index].startsWith('fork again')) {
          index++;
          branches.push(parseBlock(['fork again', 'end fork']));
        }
        if (lines[index] === 'end fork') index++;
        nodes.push({ type: 'fork', branches });
        continue;
      }

      // split structure
      if (line === 'split') {
        index++;
        const branches: ActivityNode[][] = [];
        branches.push(parseBlock(['split again', 'end split']));
        while (lines[index] && lines[index].startsWith('split again')) {
          index++;
          branches.push(parseBlock(['split again', 'end split']));
        }
        if (lines[index] === 'end split') index++;
        nodes.push({ type: 'split', branches });
        continue;
      }

      // switch/case
      if (line.startsWith('switch')) {
        index++;
        const cases: { label?: string; body: ActivityNode[] }[] = [];
        while (index < lines.length && !lines[index].startsWith('endswitch')) {
          const c = lines[index].match(/^case(?:\s*\((.*)\))?/);
          if (c) {
            index++;
            const body = parseBlock(['case', 'endswitch']);
            cases.push({ label: c[1]?.trim(), body });
            continue;
          }
          // unexpected line inside switch, skip
          index++;
        }
        if (lines[index] === 'endswitch') index++;
        nodes.push({ type: 'switch', cases });
        continue;
      }

      // skip unrecognised lines
      index++;
    }
    return nodes;
  }

  return { type: 'ActivityDiagram', nodes: parseBlock() };
}
