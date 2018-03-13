export default (widget, rubric) => {
  const correct = rubric.choices.find(choice => choice.correct);
  widget.state.value = rubric.choices.indexOf(correct) + 1;
};
