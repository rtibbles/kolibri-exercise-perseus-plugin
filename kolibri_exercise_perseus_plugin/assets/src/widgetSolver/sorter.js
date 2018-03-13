export default (widget, rubric) => {
  widget.setState({
    options: rubric.correct,
  });
};
