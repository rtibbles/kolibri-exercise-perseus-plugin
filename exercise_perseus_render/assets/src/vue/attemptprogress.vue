<template>

  <div>
    <div id="attempt" v-for="attempt in recentAttempts">
      <div v-if="attempt.hinted">?</div>
      <div v-if="!attempt.hinted && attempt.correct">1</div>
      <div v-if="!attempt.hinted && !attempt.correct">0</div>
    </div>
  </div>

</template>


<script>

  module.exports = {

    data: () => ({
      item: undefined,
    }),
    methods: {
      dummy() {
        console.log('this is  a dummy method.');
      },
    },
    props: {
      recentAttempts: {
        type: Array,
        default: function () {
          return [{ correct: 0 }]
        },
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri/styles/coreTheme'

  attempt
    float: left;

</style>
