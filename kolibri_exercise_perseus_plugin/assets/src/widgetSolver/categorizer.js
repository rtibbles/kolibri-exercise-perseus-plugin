export default (widget, rubric) => {
  widget.state.values = widget.state.values.map((value, i) => rubric.values[i]);
};
