import { Fraction } from 'fractional';

export default (widget, rubric) => {
  const newProps = {};
  if (rubric.rel) {
    newProps.rel = rubric.rel;
  }
  if (rubric.correctX) {
    const correctX = rubric.correctX;
    const rangeMin = rubric.range[0];
    const rangeMax = rubric.range[1];

    const numDivisions = new Fraction((correctX - rangeMin) / (rangeMax - rangeMin)).denominator;

    newProps.numberLinePosition = correctX;
    newProps.numDivisions = numDivisions;
  }

  widget.props.onChange(
    newProps,
    () => {
      widget._renderGraphie();
    }, // cb
    false // silent
  );
};
