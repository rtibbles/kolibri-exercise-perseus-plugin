export default (widget, rubric) => {
  const cells = widget.props.cells.map(row => {
    return row.map(cell => {
      return true;
    });
  });

  widget.props.onChange(
    {
      cells,
    },
    null, // cb
    false // silent
  );
};
