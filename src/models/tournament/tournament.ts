import { SetupLike } from '@/models/setup'
import {
  isArray,
  FromDefinition,
  getTypeChecker,
  isNumberOrNull
} from '@/utils'
import isObject from 'lodash/isObject'
import isNumber from 'lodash/isNumber'

const matchDefinition = {
  winnerNext: isNumberOrNull,
  loserNext: isNumberOrNull,
  p1: isNumberOrNull,
  p2: isNumberOrNull,
  p1Score: isNumberOrNull,
  p2Score: isNumberOrNull,
  winner: isNumberOrNull
};
export type Match = FromDefinition<typeof matchDefinition>;
export const isMatch = getTypeChecker(matchDefinition);
export const createMatch = (): Match => {
  return {
    winnerNext: null,
    loserNext: null,
    p1: null,
    p2: null,
    p1Score: null,
    p2Score: null,
    winner: null
  };
}

const tournamentSpecificDefinition = {
  status: (x: unknown): x is 'started' => x === 'started',
  matches: (x: unknown): x is Match[] => isArray(x, isMatch),
  origins(x: unknown): x is Record<number, number[]> {
    // make sure all values of origins are number array
    return isObject(x) && Object.values(x).every(x => isArray(x, isNumber));
  }
}
type TournamentSpeficic = FromDefinition<typeof tournamentSpecificDefinition>;
const checkTournamentSpecific = getTypeChecker(tournamentSpecificDefinition);
export type Tournament = SetupLike & TournamentSpeficic;
export const isTournament = (x: SetupLike): x is Tournament => {
  return checkTournamentSpecific(x);
}

export const getKeyInNext = (
  tournament: Tournament,
  currentMatch: number,
  nextMatch: number,
  isWinner?: boolean // used when currentMatch is the only origin of nextMatch
) => {
  const origins = tournament.origins[nextMatch];
  const index = origins.indexOf(currentMatch);
  if (index === 0) {
    if (origins[0] !== origins[1]) {
      return 'p1';
    }
    // if currentMatch is the only origin of nextMatch
    switch (isWinner) {
      case undefined: throw Error('isWinner not specified');
      case true: return 'p1';
      case false: return 'p2';
    }
  }
  else if (index === 1) {
    return 'p2';
  }
  throw Error('Invalid origin index');
}

export const winMatch = (
  tournament: Tournament,
  matchId: number,
  winner: 'p1' | 'p2'
) => {
  const match = tournament.matches[matchId];
  const distribute = (targetId: number, player: number) => {
    const target = tournament.matches[targetId];
    const isWinner = match.winner === player;
    const key = getKeyInNext(tournament, matchId, targetId, isWinner);
    if (target[key] !== null) {
      throw Error('Player slot already taken');
    }
    target[key] = player;
  }

  if (match.p1 === null || match.p2 === null) {
    throw Error('Cannot win with null players');
  }

  match.winner = match[winner];
  if (match.winner === null) {
    throw Error('Cannot win with null players');
  }

  const loser = winner === 'p1' ? match.p2 : match.p1;
  if (match.winnerNext !== null) {
    distribute(match.winnerNext, match.winner);
  }
  if (match.loserNext !== null) {
    distribute(match.loserNext, loser);
  }
}

export const getOrigins = (tournament: Tournament, matches: number[]) =>
  matches
    .reduce((record, m) => {
      const match = tournament.matches[m];
      const setOrAppend = (key: number | null) => {
        if (key !== null) {
          record[key] = (record[key] || []).concat(m);
        }
      };
      setOrAppend(match.winnerNext);
      setOrAppend(match.loserNext);
      return record;
    }, Object.create(null) as Record<number, number[]>);

export const isRounds = (r: unknown): r is number[][] => {
  return isArray(r, (e): e is number[] => isArray(e, isNumber));
}