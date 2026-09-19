const initialPlayers = () => ({
  A1: { id: "A1", team: "A", side: "right" },
  A2: { id: "A2", team: "A", side: "left" },
  B1: { id: "B1", team: "B", side: "left" },
  B2: { id: "B2", team: "B", side: "right" },
});

const createInitialState = () => ({
  scoreA: 0,
  scoreB: 0,
  maxPoint: null,
  server: "A1",
  receiver: "B1",
  players: initialPlayers(),
  history: [],
});

let state = createInitialState();

const elements = {
  maxPointInput: document.getElementById("max-point-input"),
  applyMaxButton: document.getElementById("apply-max-button"),
  maxPointStatus: document.getElementById("max-point-status"),
  teamALabel: document.getElementById("team-a-label"),
  teamBLabel: document.getElementById("team-b-label"),
  teamANameInput: document.getElementById("team-a-name"),
  teamBNameInput: document.getElementById("team-b-name"),
  scoreA: document.getElementById("score-a"),
  scoreB: document.getElementById("score-b"),
  serverLabel: document.getElementById("server-label"),
  receiverLabel: document.getElementById("receiver-label"),
  serveSideLabel: document.getElementById("serve-side-label"),
  serveIcon: document.getElementById("serve-icon"),
  gameStatus: document.getElementById("game-status"),
  playerList: document.getElementById("player-list"),
  courtSvg: document.getElementById("court-svg"),
  scoreButtons: document.querySelectorAll(".score-btn"),
  undoButton: document.getElementById("undo-btn"),
  resetButton: document.getElementById("reset-btn"),
};

function clonePlayers(players) {
  return Object.fromEntries(
    Object.entries(players).map(([key, value]) => [key, { ...value }])
  );
}

function snapshotState() {
  return {
    scoreA: state.scoreA,
    scoreB: state.scoreB,
    maxPoint: state.maxPoint,
    server: state.server,
    receiver: state.receiver,
    players: clonePlayers(state.players),
  };
}

function getTeamDisplayName(team) {
  const inputValue = team === "A" ? elements.teamANameInput.value.trim() : elements.teamBNameInput.value.trim();
  return inputValue || (team === "A" ? "Team A" : "Team B");
}

function getPlayerDisplayName(playerId) {
  const inputId = `player-${playerId}-name`;
  const input = document.getElementById(inputId);
  if (!input) {
    return playerId;
  }
  return input.value.trim() || playerId;
}

function escapeMarkup(value) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  }[character]));
}

function teamLabel(team) {
  return getTeamDisplayName(team);
}

function servingTeam() {
  return state.server[0];
}

function otherTeam(team) {
  return team === "A" ? "B" : "A";
}

function getTeamPlayers(team) {
  return Object.values(state.players).filter((player) => player.team === team);
}

function getServeSideFor(team) {
  const score = team === "A" ? state.scoreA : state.scoreB;
  return score % 2 === 0 ? "right" : "left";
}

function getFirstPlayerOfTeam(team) {
  const players = getTeamPlayers(team);
  return players.length ? players[0].id : "A1";
}

function getDiagonalReceiverForServer(serverId) {
  const serverPlayer = state.players[serverId];
  if (!serverPlayer) {
    return "B1";
  }

  const targetTeam = otherTeam(serverPlayer.team);
  const targetPlayers = getTeamPlayers(targetTeam);
  const receiverCandidate = targetPlayers.find((player) => player.side !== serverPlayer.side);

  return receiverCandidate ? receiverCandidate.id : targetPlayers[0]?.id || "B1";
}

function findCorrectServer(team) {
  const teamPlayers = getTeamPlayers(team);
  const serveSide = getServeSideFor(team);
  const chosen = teamPlayers.find((player) => player.side === serveSide);
  return chosen ? chosen.id : teamPlayers[0].id;
}

function setStatus(message, tone = "default") {
  elements.gameStatus.textContent = message;
  elements.gameStatus.dataset.type = tone;
}

function showMaxStatus() {
  if (state.maxPoint === null) {
    elements.maxPointStatus.textContent = "MAX点未設定";
    return;
  }

  elements.maxPointStatus.textContent = `MAX点: ${state.maxPoint}`;
}

function isGameOver() {
  if (state.maxPoint === null) {
    return false;
  }

  const diff = Math.abs(state.scoreA - state.scoreB);
  const leader = Math.max(state.scoreA, state.scoreB);
  return leader >= state.maxPoint && diff >= 2;
}

function setMaxPointFromInput() {
  const rawValue = Number(elements.maxPointInput.value);

  if (!Number.isInteger(rawValue) || rawValue < 1) {
    setStatus("MAX点は 1 以上の整数を入力してください。", "warning");
    return;
  }

  state.maxPoint = rawValue;
  elements.maxPointInput.value = String(rawValue);
  setStatus(`MAX点 ${rawValue} で開始します。0-0 からスタートです。`, "success");
  render();
}

function swapSides(team) {
  const teamPlayers = getTeamPlayers(team);
  const leftPlayer = teamPlayers.find((player) => player.side === "left");
  const rightPlayer = teamPlayers.find((player) => player.side === "right");

  if (leftPlayer && rightPlayer) {
    leftPlayer.side = "right";
    rightPlayer.side = "left";
  }
}

function updateReceiverForCurrentServer() {
  state.receiver = getDiagonalReceiverForServer(state.server);
}

function rallyWonBy(team) {
  if (state.maxPoint === null) {
    setStatus("まず MAX点 を設定してください。", "warning");
    elements.maxPointInput.focus();
    return;
  }

  if (isGameOver()) {
    setStatus("ゲーム終了済みです。Reset で初期状態に戻してください。", "danger");
    return;
  }

  state.history.push(snapshotState());

  if (team === servingTeam()) {
    if (team === "A") {
      state.scoreA += 1;
    } else {
      state.scoreB += 1;
    }

    swapSides(team);
    updateReceiverForCurrentServer();
    setStatus(`${teamLabel(team)} がラリーを取りました。\n${teamLabel(team)} が同じサーバーで続行します。`, "success");
  } else {
    if (team === "A") {
      state.scoreA += 1;
    } else {
      state.scoreB += 1;
    }

    state.server = findCorrectServer(team);
    updateReceiverForCurrentServer();
    setStatus(`${teamLabel(team)} がラリーを取り、\nサーブ権が ${teamLabel(team)} に移りました。`, "success");
  }

  if (isGameOver()) {
    const winner = state.scoreA > state.scoreB ? "A" : "B";
    setStatus(`${teamLabel(winner)} の勝利です。最終スコア ${state.scoreA}-${state.scoreB}.`, "success");
  }

  render();
}

function undoGame() {
  if (state.history.length === 0) {
    setStatus("戻せる手数がありません。", "warning");
    return;
  }

  const previous = state.history.pop();
  state.scoreA = previous.scoreA;
  state.scoreB = previous.scoreB;
  state.maxPoint = previous.maxPoint;
  state.server = previous.server;
  state.receiver = previous.receiver;
  state.players = clonePlayers(previous.players);
  setStatus("1手戻しました。", "default");
  render();
}

function resetGame() {
  state = createInitialState();
  elements.maxPointInput.value = "";
  setStatus("MAX点を設定して開始してください。", "default");
  render();
}

function getCourtCoordinates(player) {
  return {
    x: player.team === "A" ? 190 : 530,
    y: player.side === "left" ? 142 : 278,
  };
}

function renderCourt() {
  const serveSide = getServeSideFor(servingTeam());
  const serveStroke = serveSide === "left" ? "#0f766e" : "#2563eb";

  const serverPlayer = state.players[state.server];
  const serverPosition = getCourtCoordinates(serverPlayer);

  const receiverPlayer = state.players[state.receiver];
  const receiverPosition = getCourtCoordinates(receiverPlayer);

  const arrowStartX = serverPosition.x;
  const arrowStartY = serverPosition.y;

  const arrowEndX = receiverPosition.x;
  const arrowEndY = receiverPosition.y;
  const markerId = `serve-arrow-${serveSide}`;
  const teamALabel = escapeMarkup(getTeamDisplayName("A"));
  const teamBLabel = escapeMarkup(getTeamDisplayName("B"));

  const playerMarkup = Object.values(state.players)
    .map((player) => {
      const isServer = player.id === state.server;
      const fill = player.team === "A" ? "#3b82f6" : "#ef4444";
      const position = getCourtCoordinates(player);
      const playerName = escapeMarkup(getPlayerDisplayName(player.id));
      const ringWidth = isServer ? 5 : 2;
      const ringColor = isServer ? "#facc15" : "#ffffff";

      return `
        <g transform="translate(${position.x}, ${position.y})">
          <circle r="${isServer ? 24 : 20}" fill="${fill}" stroke="${ringColor}" stroke-width="${ringWidth}" />
          <text x="0" y="5" direction="ltr" text-anchor="middle" fill="white" font-size="14" font-weight="700" font-family="Segoe UI, sans-serif">${player.id.replace("A", "").replace("B", "")}</text>
          <text class="court-player-label" x="0" y="42" text-anchor="middle" fill="#122033" font-family="Segoe UI, sans-serif">${playerName}</text>
          ${isServer ? `<circle cx="28" cy="-28" r="12" fill="#facc15" /><text x="28" y="-22" text-anchor="middle" fill="#1f2937" font-size="12" font-weight="800">S</text>` : ""}
        </g>
      `;
    })
    .join("");

  elements.courtSvg.innerHTML = `
    <defs>
      <marker id="${markerId}" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto" markerUnits="strokeWidth">
        <path d="M0,0 L0,12 L12,6 z" fill="${serveStroke}" />
      </marker>
    </defs>
    <image href="assets/court.svg" width="720" height="420" preserveAspectRatio="xMidYMid meet" />
    <line x1="${arrowStartX}" y1="${arrowStartY}" x2="${arrowEndX}" y2="${arrowEndY}" stroke="${serveStroke}" stroke-width="7" stroke-linecap="round" marker-end="url(#${markerId})" opacity="0.96" />
    <text class="court-team-label" x="120" y="38" text-anchor="middle" fill="#3b82f6" font-family="Segoe UI, sans-serif">${teamALabel}</text>
    <text class="court-team-label" x="600" y="38" text-anchor="middle" fill="#ef4444" font-family="Segoe UI, sans-serif">${teamBLabel}</text>
    <g aria-label="Serve ${serveSide === "left" ? "Left" : "Right"}">
      <rect class="court-serve-pill" x="282" y="8" width="156" height="32" rx="16" />
      <text class="court-serve-label" x="360" y="29" text-anchor="middle" font-family="Segoe UI, sans-serif">SERVE · ${serveSide === "left" ? "LEFT" : "RIGHT"}</text>
    </g>
    ${playerMarkup}
  `;
}

function renderPlayerList() {
  const playerCards = Object.values(state.players)
    .map((player) => {
      const isServer = player.id === state.server;
      const isReceiver = player.id === state.receiver;
      const playerName = getPlayerDisplayName(player.id);
      return `
        <div class="player-card ${player.team === "A" ? "team-a" : "team-b"} ${isServer ? "is-server" : ""}">
          <div class="player-main">
            <span class="player-bullet">${player.id.slice(-1)}</span>
            <div>
              <span class="player-name">${playerName}</span>
              <span class="player-side">${player.side === "left" ? "Left" : "Right"} / ${teamLabel(player.team)}</span>
            </div>
          </div>
          <div class="player-tags">
            ${isServer ? '<span class="tag tag-server">Server</span>' : ""}
            ${isReceiver ? '<span class="tag tag-receiver">Receive</span>' : ""}
          </div>
        </div>
      `;
    })
    .join("");

  elements.playerList.innerHTML = playerCards;
}

function renderScore() {
  elements.scoreA.textContent = String(state.scoreA);
  elements.scoreB.textContent = String(state.scoreB);
}

function renderNames() {
  elements.teamALabel.textContent = getTeamDisplayName("A");
  elements.teamBLabel.textContent = getTeamDisplayName("B");
}

function renderMeta() {
  const serveSide = getServeSideFor(servingTeam());
  const serveDirectionText = serveSide === "left" ? "Left ←" : "→ Right";

  elements.serverLabel.textContent = getPlayerDisplayName(state.server);
  elements.receiverLabel.textContent = getPlayerDisplayName(state.receiver);
  elements.serveSideLabel.textContent = serveDirectionText;

  if (elements.serveIcon) {
    elements.serveIcon.src = serveSide === "left" ? "assets/icons/serve-left.svg" : "assets/icons/serve-right.svg";
    elements.serveIcon.alt = `Serve side ${serveSide}`;
  }
}

function updateButtonsState() {
  const disabled = state.maxPoint === null || isGameOver();
  elements.scoreButtons.forEach((button) => {
    button.disabled = disabled;
  });
  elements.undoButton.disabled = state.history.length === 0;
}

function render() {
  showMaxStatus();
  renderScore();
  renderNames();
  renderMeta();
  renderPlayerList();
  renderCourt();
  updateButtonsState();
}

elements.applyMaxButton.addEventListener("click", setMaxPointFromInput);
elements.maxPointInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    setMaxPointFromInput();
  }
});

elements.scoreButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const team = button.dataset.team;
    rallyWonBy(team);
  });
});

elements.undoButton.addEventListener("click", undoGame);
elements.resetButton.addEventListener("click", resetGame);

[
  elements.teamANameInput,
  elements.teamBNameInput,
  document.getElementById("player-A1-name"),
  document.getElementById("player-A2-name"),
  document.getElementById("player-B1-name"),
  document.getElementById("player-B2-name"),
].forEach((input) => {
  input.addEventListener("input", render);
});

render();
setStatus("MAX点を設定して開始してください。", "default");
