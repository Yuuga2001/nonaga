// GraphQL Operations for NONAGA Online

export const getGame = /* GraphQL */ `
  query GetGame($gameId: ID!) {
    getGame(gameId: $gameId) {
      gameId
      status
      hostPlayerId
      guestPlayerId
      hostColor
      tiles {
        q
        r
      }
      pieces {
        id
        player
        q
        r
      }
      turn
      phase
      winner
      victoryLine
      lastMoveAt
      createdAt
      updatedAt
    }
  }
`;

export const createGame = /* GraphQL */ `
  mutation CreateGame($hostPlayerId: String!) {
    createGame(hostPlayerId: $hostPlayerId) {
      gameId
      status
      hostPlayerId
      hostColor
      tiles {
        q
        r
      }
      pieces {
        id
        player
        q
        r
      }
      turn
      phase
      createdAt
      updatedAt
    }
  }
`;

export const joinGame = /* GraphQL */ `
  mutation JoinGame($gameId: ID!, $guestPlayerId: String!) {
    joinGame(gameId: $gameId, guestPlayerId: $guestPlayerId) {
      gameId
      status
      hostPlayerId
      guestPlayerId
      hostColor
      tiles {
        q
        r
      }
      pieces {
        id
        player
        q
        r
      }
      turn
      phase
      createdAt
      updatedAt
    }
  }
`;

export const movePiece = /* GraphQL */ `
  mutation MovePiece($input: MovePieceInput!) {
    movePiece(input: $input) {
      gameId
      status
      hostPlayerId
      guestPlayerId
      hostColor
      tiles {
        q
        r
      }
      pieces {
        id
        player
        q
        r
      }
      turn
      phase
      winner
      victoryLine
      lastMoveAt
      updatedAt
    }
  }
`;

export const moveTile = /* GraphQL */ `
  mutation MoveTile($input: MoveTileInput!) {
    moveTile(input: $input) {
      gameId
      status
      hostPlayerId
      guestPlayerId
      hostColor
      tiles {
        q
        r
      }
      pieces {
        id
        player
        q
        r
      }
      turn
      phase
      winner
      victoryLine
      lastMoveAt
      updatedAt
    }
  }
`;

export const abandonGame = /* GraphQL */ `
  mutation AbandonGame($gameId: ID!, $playerId: String!) {
    abandonGame(gameId: $gameId, playerId: $playerId) {
      gameId
      status
      winner
      phase
      updatedAt
    }
  }
`;

export const onGameUpdated = /* GraphQL */ `
  subscription OnGameUpdated($gameId: ID!) {
    onGameUpdated(gameId: $gameId) {
      gameId
      status
      hostPlayerId
      guestPlayerId
      hostColor
      tiles {
        q
        r
      }
      pieces {
        id
        player
        q
        r
      }
      turn
      phase
      winner
      victoryLine
      lastMoveAt
      updatedAt
    }
  }
`;
