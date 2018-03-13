export default (widget, rubric) => {
  widget.setState({
    values: rubric.correct,
  });
};
