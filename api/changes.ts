
import { changesValidator } from '@/models/validations'
import { Database } from './database'
import { Tournament, Match, winMatch } from '@/models/tournament'
import { NotAuthorizedError, BadRequestError, NotImplementedError } from './api'
import { PlayerNameEdit, MatchEdit, Edit } from '@/models/changes'
import { Setup } from '@/models/setup'

const players = ['p1', 'p2'] as const
const undoMatch = (next: Match, targetPlayer: number) => {
  const k = players.find(k => next[k] === targetPlayer)
  if (k === undefined) {
    throw Error('Invalid state - cannot undo match')
  }
  [next.p1Score, next.p2Score] = [null, null]
  next[k] = null
}

export const changeHandler = (
  user: number,
  database: Database,
  id: number,
  body: Edit
) => {
  const chain = database.db.get('tournaments')
  const found = chain.find({ id }).value() as Setup | Tournament | undefined
  if (found === undefined) {
    throw new BadRequestError('Invalid tournament')
  }
  if (found.status !== 'started') {
    throw new NotImplementedError('Tournament not started yet')
  }
  const tournament = { ...found }

  const { organizer, referees } = tournament.information

  if (user !== organizer && !referees.includes(user)) {
    throw new NotAuthorizedError()
  }

  // validate
  changesValidator(tournament, body)

  if (body.type === 'nameEdit') {
    const edit = body as PlayerNameEdit
    tournament.players[edit.playerId] = edit.edited
  }
  else {
    const matchEdit = body as MatchEdit
    const match = tournament.matches[matchEdit.matchId]
    if (matchEdit.type === 'scoreEdit') {
      [match.p1Score, match.p2Score] = matchEdit.edited
    }
    else {
      // undo next round
      if (match.winner !== null) {
        const loser = match.winner === match.p1 ? match.p2 : match.p1
        if (loser === null) {
          throw Error('Invalid state - has winner but not loser')
        }
        if (match.winnerNext !== null) {
          undoMatch(tournament.matches[match.winnerNext], match.winner)
        }
        if (match.loserNext !== null) {
          undoMatch(tournament.matches[match.loserNext], loser)
        }
      }

      // apply new winners
      match.winner = matchEdit.edited
      if (match.winner !== null) {
        const winner = match.winner === match.p1 ? 'p1' : 'p2'
        winMatch(tournament, matchEdit.matchId, winner)
      }
    }
  }

  // apply changes
  (chain as any).replaceById(id, tournament).value()
}

