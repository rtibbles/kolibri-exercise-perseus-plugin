<template>

  <div>
    <div id="attempt" v-for="attempt in recentAttempts">
      <div v-if="attempt.hinted"><svg id="lightbulb" src="./lightbulb_black.svg"></svg></div>
      <div v-if="!attempt.hinted && attempt.correct"><svg id="correct" src="./check_black.svg"></svg></div>
      <div v-if="!attempt.hinted && !attempt.correct"><svg id="incorrect" src="./clear_black.svg"></svg></div>
    </div>

    <p id="message" v-if="passRatioN === passNum">{{ $tr("get") }} <b>{{passRatioN}} {{ $tr("outof") }} {{passRatioM}}</b> {{ $tr("correct") }}</p>
    <p id="message" v-if="passNum > 0 && passRatioN !== passNum">{{ $tr("get") }} <b>{{ passNum }}</b> {{ $tr("more") }}</p>
    <p id="message" v-if="passNum <= 0 && passRatioN !== passNum">{{ $tr("hooray") }}</p>
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
      passNum: {
        type: Number,
      },
      passRatioM: {
        type: Number,
      },
      passRatioN: {
        type: Number,
      },
    },
    $trNameSpace: 'attemptprogress',
    $trs: {
      hooray: 'Hooray! Good job.',
      get: 'Get',
      outof: 'out of',
      correct: 'correct!',
      more: 'more correct!',
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri/styles/coreTheme'

  #message
    color: grey
    position: relative
    text-align: center
    top: 6px

  #attempt
    float: left;
    border-bottom: thin solid grey
    margin-left: 6px

  #lightbulb
    fill: grey

  #incorrect
    fill: grey

  #correct
    fill: $core-action-normal

</style>
