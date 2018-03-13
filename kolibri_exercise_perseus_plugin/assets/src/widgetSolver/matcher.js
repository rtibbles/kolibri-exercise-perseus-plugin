export default (widget, rubric) => {
  const left = rubric.left;
  const right = rubric.right;

  widget.props.onChange(
    {
      left,
      right,
    },
    null, // cb
    false // silent
  );
};
