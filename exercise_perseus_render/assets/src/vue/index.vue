<template>

  <div id="exercise-container">
    <perseus v-if="item" :item="item"></perseus>
  </div>

</template>


<script>

  const defaultQuestion = require('./question.json');

  module.exports = {
    data: () => ({
      item: defaultQuestion,
    }),
    components: {
      perseus: require('./perseus'),
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

  #exercise-container
    border: double 3px grey
    height: 100%
    overflow: auto

</style>

