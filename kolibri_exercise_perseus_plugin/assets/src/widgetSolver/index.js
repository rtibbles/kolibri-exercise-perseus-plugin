import categorizer from './categorizer';
import dropdown from './dropdown';
import expression from './expression';
import grapher from './grapher';
import inputNumber from './inputNumber';
import interactiveGraph from './interactiveGraph';
import lightsPuzzle from './lightsPuzzle';
import matcher from './matcher';
import matrix from './matrix';
import numberLine from './numberLine';
import numericInput from './numericInput';
import orderer from './orderer';
import plotter from './plotter';
import radio from './radio';
import sorter from './sorter';
import table from './table';
import transformer from './transformer';
import unit from './unit';

const widgetSolvers = {
  categorizer,
  dropdown,
  expression,
  grapher,
  'input-number': inputNumber,
  'interactive-graph': interactiveGraph,
  'lights-puzzle': lightsPuzzle,
  matcher,
  matrix,
  'number-line': numberLine,
  'numeric-input': numericInput,
  orderer,
  plotter,
  radio,
  sorter,
  table,
  transformer,
  unit,
};

export default (widget, type, rubric) => {
  if (!widgetSolvers[type]) {
    throw new ReferenceError(`No solver available for widget type: ${type}`);
  }
  widgetSolvers[type](widget, rubric);
};
