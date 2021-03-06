<template>
  <div class="lanyi-match">
    <div class="lanyi-match-players" :class="{ 'lanyi-match-has-winner': hasWinner }">
      <v-row
        v-for="(p, i) in players"
        :key="i"
        class="lanyi-match-player"
        :class="{ 'lanyi-match-player-winner': p.isWinner }"
      >
        <v-col
          cols="10"
          class="lanyi-match-player-name px-2 py-0 ma-0 d-flex justify-center align-center"
          :class="{ 'lanyi-match-player-hint': p.id == null }"
        >{{ p.name }}</v-col>
        <v-col
          cols="2"
          class="lanyi-match-player-score pa-0 ma-0 d-flex justify-center align-center"
        >{{ p.score }}</v-col>
      </v-row>
    </div>
    <div class="lanyi-match-id d-flex justify-center align-center">#{{ value.id }}</div>
  </div>
</template>
<script lang="ts">
import Vue from "vue";
import { Tournament } from "@/models/tournament";
import VueI18n from "vue-i18n";

export type PlayerVM = {
  id: number | null;
  name: string;
  score: number | null;
  isWinner: boolean;
};

export type MatchVM = {
  id: number;
  p1: PlayerVM;
  p2: PlayerVM;
  next: number | null;
};

export const matchToVM = (
  model: Tournament,
  matchId: number,
  i18n: VueI18n
): MatchVM => {
  const match = model.matches[matchId];
  const origins = model.origins[matchId]
    ?.filter((m) => model.matches[m].winner === null)
    ?.reverse(); // reverse it so pop() now is actually popping from front
  // get hint of who might come to this match.
  // useful for losers' bracket
  const maybeHint = (from?: number) => {
    if (from === undefined) {
      return "";
    }
    if (model.matches[from].loserNext === matchId) {
      if (model.matches[from].winnerNext === matchId) {
        // there are some rare cases where both winners and losers will go to
        // the same match.
        return "";
      }
      return `${i18n.t("bracket.loserOf", { from })}`;
    }
    return "";
  };
  const playerToVM = (id: number | null, score: number | null): PlayerVM => ({
    id,
    name: id !== null ? model.players[id] : maybeHint(origins?.pop()),
    score,
    isWinner: id !== null && id === match.winner,
  });
  return {
    id: matchId,
    p1: playerToVM(match.p1, match.p1Score),
    p2: playerToVM(match.p2, match.p2Score),
    next: match.winnerNext,
  };
};

export default Vue.extend({
  props: {
    value: Object as () => MatchVM,
  },
  methods: {
    setScore(index: number, score: number) {
      if (index !== 0 && index !== 1) {
        throw Error("invalid argument");
      }
      const field = index === 0 ? "p1" : "p2";
      const updated = { ...this.value[field], score };
      this.$emit("input", { ...this.value, [field]: updated });
    },
  },
  computed: {
    players(): PlayerVM[] {
      return [this.value.p1, this.value.p2];
    },
    hasWinner(): boolean {
      return this.players.some((p) => p.isWinner);
    },
  },
});
</script>
<style scoped>
.lanyi-match * {
  border: none;
  margin: 0;
  border-spacing: 0;
  border-collapse: collapse;
}

[class^="lanyi-match-"] {
  box-shadow: inset 1px 1px black, inset -1px -1px black;
  color: white;
  font-weight: bold;
}

.lanyi-match {
  box-shadow: inset 1.5px 1.5px black, inset -1.5px -1.5px black;
  position: relative;
}

.lanyi-match-players {
  width: 82.5%;
  height: 100%;
  float: left;
}

.lanyi-match-player {
  position: relative;
  width: 100%;
  height: 50%;
}

.lanyi-match-player-name {
  overflow: hidden;
  white-space: nowrap;
  background: rgba(0, 0, 0, 0.6);
  background: radial-gradient(ellipse, rgba(0,0,0,0.416) 0%, rgba(0,0,0,0.686) 100%);
}

.lanyi-match-has-winner .lanyi-match-player-name {
  background: black;
}

.lanyi-match-has-winner .lanyi-match-player-winner .lanyi-match-player-name {
  background: rgb(73, 157, 240);
}

.lanyi-match-player-hint {
  color: #aaaaaa;
}

.lanyi-match-player-score {
  background: rgb(136, 136, 136);
  color: black;
}

.lanyi-match-player-winner .lanyi-match-player-score {
  background: white;
}

.lanyi-match-id {
  width: 17.5%;
  height: 100%;
  float: right;
  background: rgba(64, 64, 64, 0.5);
  background: url('~@/assets/main/mid/M_player/P_groupbar.png') 100% 100%;
}
</style>