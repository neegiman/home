(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const views = {
    registration: $("#registrationView"),
    animation: $("#animationView"),
    finalStair: $("#finalStairView"),
    tournament: $("#tournamentView"),
    result: $("#resultView")
  };

  const refs = {
    tournamentName: $("#tournamentName"),
    tournamentPrize: $("#tournamentPrize"),
    tournamentMemo: $("#tournamentMemo"),
    participantForm: $("#participantForm"),
    participantName: $("#participantName"),
    participantTeam: $("#participantTeam"),
    participantCount: $("#participantCount"),
    participantList: $("#participantList"),
    participantHint: $("#participantHint"),
    shufflePreview: $("#shufflePreview"),
    generateButton: $("#generateButton"),
    formError: $("#formError"),
    initialStage: $("#initialStage"),
    initialMatches: $("#initialMatches"),
    bracketStage: $("#bracketStage"),
    gameFlowNav: $("#gameFlowNav"),
    winnerStagePage: $("#winnerStagePage"),
    loserStagePage: $("#loserStagePage"),
    goLoserStage: $("#goLoserStage"),
    goResultStage: $("#goResultStage"),
    winnerBracket: $("#winnerBracket"),
    loserBracket: $("#loserBracket"),
    completionPanel: $("#completionPanel"),
    battleFx: $("#battleFx"),
    battleFxText: $("#battleFxText"),
    battleFxNames: $("#battleFxNames"),
    celebrationCanvas: $("#celebrationCanvas"),
    finalStairCanvas: $("#finalStairAnimation"),
    finalStairCaption: $("#finalStairCaption"),
    endingCredits: $("#endingCredits"),
    toast: $("#toast")
  };

  let draftParticipants = [];
  let tournamentState = null;
  let animationFrame = 0;
  let stairAnimationFrame = 0;
  let toastTimer = 0;
  let battleFxTimer = 0;
  let fireworksFrame = 0;
  let selectionLocked = false;
  let resultTimers = [];
  let initialReviewId = null;

  const characterAssets = {
    clown: new Image(),
    trainer: new Image(),
    lastPlace: new Image(),
    drawStage: new Image(),
    championArena: new Image()
  };
  characterAssets.clown.decoding = "async";
  characterAssets.trainer.decoding = "async";
  characterAssets.lastPlace.decoding = "async";
  characterAssets.drawStage.decoding = "async";
  characterAssets.championArena.decoding = "async";
  characterAssets.clown.src = "assets/characters/clown-spritesheet.png";
  characterAssets.trainer.src = "assets/characters/trainer-spritesheet.png";
  characterAssets.lastPlace.src = "assets/characters/last-place-bow-spritesheet.png";
  characterAssets.drawStage.src = "assets/backgrounds/draw-stage.png";
  characterAssets.championArena.src = "assets/backgrounds/champion-arena.png";

  function uid() {
    return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
    })[char]);
  }

  function honorName(value) {
    const name = String(value ?? "").trim();
    return name && !name.endsWith("님") ? `${name}님` : name;
  }

  function escapeName(value) {
    return escapeHtml(honorName(value));
  }

  function participantHue(id) {
    let hash = 0;
    for (const char of String(id || "")) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
    return Math.abs(hash) % 46 - 18;
  }

  function participantSprite(participant, slot = "a", state = "standing") {
    const hue = participantHue(participant?.id);
    return `<span class="battle-trainer battle-trainer--${slot}" data-state="${state}" style="--fighter-hue:${hue}deg" aria-hidden="true"></span>`;
  }

  function encodeState(value) {
    const bytes = new TextEncoder().encode(JSON.stringify(value));
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function decodeState(value) {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4));
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  function shuffled(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function showOnly(name) {
    Object.entries(views).forEach(([key, element]) => { element.hidden = key !== name; });
    document.body.classList.toggle("result-mode", name === "result");
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    refs.toast.textContent = message;
    refs.toast.classList.add("show");
    toastTimer = setTimeout(() => refs.toast.classList.remove("show"), 2300);
  }

  function playBattleFx(type, firstName, secondName) {
    clearTimeout(battleFxTimer);
    refs.battleFx.hidden = false;
    refs.battleFx.className = `battle-fx battle-fx--${type}`;
    refs.battleFxText.textContent = type === "loser" ? "패자 결정" : type === "intro" ? "BATTLE!" : "승자 결정";
    refs.battleFxNames.textContent = `${honorName(firstName)}  VS  ${honorName(secondName)}`;
    void refs.battleFx.offsetWidth;
    refs.battleFx.classList.add("active");
    battleFxTimer = setTimeout(() => {
      refs.battleFx.classList.remove("active");
      refs.battleFx.hidden = true;
    }, type === "loser" ? 1050 : 820);
  }

  function startFireworks(duration = 2600) {
    cancelAnimationFrame(fireworksFrame);
    const canvas = refs.celebrationCanvas;
    const context = canvas.getContext("2d");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const runTime = reducedMotion ? Math.min(duration, 700) : duration;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    canvas.hidden = false;

    const colors = ["#ffd84d", "#ff496c", "#48c7ff", "#5effe5", "#fff4cf"];
    const burstCount = reducedMotion ? 3 : 7;
    const particles = [];
    for (let burst = 0; burst < burstCount; burst += 1) {
      const originX = width * (.13 + ((burst * 37) % 74) / 100);
      const originY = height * (.13 + ((burst * 19) % 33) / 100);
      const delay = burst * (runTime / (burstCount + 2));
      const pieces = reducedMotion ? 18 : 34;
      for (let index = 0; index < pieces; index += 1) {
        const angle = (Math.PI * 2 * index) / pieces + burst * .37;
        const speed = 72 + (index % 6) * 17;
        particles.push({
          originX,
          originY,
          delay,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 28,
          color: colors[(index + burst) % colors.length],
          size: 3 + (index % 3),
          life: 760 + (index % 5) * 90
        });
      }
    }

    const startedAt = performance.now();
    function paint(now) {
      const elapsed = now - startedAt;
      context.clearRect(0, 0, width, height);
      particles.forEach((particle) => {
        const age = elapsed - particle.delay;
        if (age < 0 || age > particle.life) return;
        const seconds = age / 1000;
        const alpha = 1 - age / particle.life;
        const x = particle.originX + particle.vx * seconds;
        const y = particle.originY + particle.vy * seconds + 92 * seconds * seconds;
        context.globalAlpha = Math.max(0, alpha);
        context.fillStyle = particle.color;
        context.fillRect(Math.round(x), Math.round(y), particle.size, particle.size);
        if (age < 170) context.fillRect(Math.round(x - particle.size), Math.round(y), particle.size, particle.size);
      });
      context.globalAlpha = 1;
      if (elapsed < runTime) {
        fireworksFrame = requestAnimationFrame(paint);
      } else {
        context.clearRect(0, 0, width, height);
        canvas.hidden = true;
      }
    }
    fireworksFrame = requestAnimationFrame(paint);
  }

  function participantById(id) {
    return tournamentState?.participants.find((participant) => participant.id === id) || null;
  }

  function renderDraftParticipants() {
    refs.participantCount.textContent = draftParticipants.length;
    refs.shufflePreview.disabled = draftParticipants.length < 2;
    refs.participantHint.textContent = draftParticipants.length < 4
      ? `최소 4명을 권장해요. 현재 ${draftParticipants.length}명입니다.`
      : `${draftParticipants.length}명의 플레이어가 출전을 기다리고 있어요.`;

    if (!draftParticipants.length) {
      refs.participantList.innerHTML = '<div class="empty-party"><span>?</span><p>아직 참가자가 없습니다<br><small>용감한 플레이어를 등록해 주세요</small></p></div>';
      return;
    }

    refs.participantList.innerHTML = draftParticipants.map((participant, index) => `
      <article class="participant-card">
        <span class="participant-card__number">${String(index + 1).padStart(2, "0")}</span>
        <div class="participant-card__copy">
          <strong>${escapeName(participant.name)}</strong>
          <span>${escapeHtml(participant.team || "무소속 플레이어")}</span>
        </div>
        <button class="participant-card__remove" type="button" data-remove-id="${participant.id}" aria-label="${escapeName(participant.name)} 삭제">×</button>
      </article>`).join("");
  }

  refs.participantForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = refs.participantName.value.trim();
    if (!name) {
      refs.participantName.classList.add("invalid");
      refs.participantName.focus();
      setTimeout(() => refs.participantName.classList.remove("invalid"), 500);
      return;
    }
    draftParticipants.push({ id: uid(), name, team: refs.participantTeam.value.trim() });
    refs.participantForm.reset();
    renderDraftParticipants();
    refs.participantName.focus();
  });

  refs.participantList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-id]");
    if (!button) return;
    draftParticipants = draftParticipants.filter((participant) => participant.id !== button.dataset.removeId);
    renderDraftParticipants();
  });

  refs.shufflePreview.addEventListener("click", () => {
    draftParticipants = shuffled(draftParticipants);
    renderDraftParticipants();
    showToast("참가자 순서를 섞었습니다!");
  });

  function makeInitialMatches(order) {
    const matches = [];
    for (let i = 0; i < order.length; i += 2) {
      const a = order[i];
      const b = order[i + 1] || null;
      matches.push({
        id: `initial_${i / 2}`,
        a,
        b,
        winner: b ? null : a,
        loser: null,
        auto: !b
      });
    }
    return matches;
  }

  refs.generateButton.addEventListener("click", () => {
    const tournamentName = refs.tournamentName.value.trim();
    refs.formError.textContent = "";
    refs.tournamentName.classList.remove("invalid");

    if (!tournamentName) {
      refs.formError.textContent = "토너먼트명을 입력해 주세요.";
      refs.tournamentName.classList.add("invalid");
      refs.tournamentName.focus();
      return;
    }
    if (draftParticipants.length < 2) {
      refs.formError.textContent = "대결을 시작하려면 참가자가 2명 이상 필요합니다. (4명 이상 권장)";
      refs.participantName.focus();
      return;
    }

    const drawOrder = shuffled(draftParticipants.map((participant) => participant.id));
    tournamentState = {
      version: 1,
      tournament: {
        name: tournamentName,
        prize: refs.tournamentPrize.value.trim(),
        memo: refs.tournamentMemo.value.trim()
      },
      participants: draftParticipants.map((participant) => ({ ...participant })),
      drawOrder,
      initialMatches: makeInitialMatches(drawOrder),
      bracketChoices: { winner: {}, loser: {} },
      uiStage: "initial",
      createdAt: new Date().toISOString()
    };
    saveTournamentUrl();
    startDrawAnimation();
  });

  function saveTournamentUrl() {
    if (!tournamentState) return;
    const url = new URL(window.location.href);
    url.search = "";
    url.searchParams.set("mode", "tournament");
    url.searchParams.set("data", encodeState(tournamentState));
    history.replaceState(null, "", url);
  }

  function createSharePayload() {
    const winners = tournamentState.initialMatches.map((match) => match.winner).filter(Boolean);
    const losers = tournamentState.initialMatches.map((match) => match.loser).filter(Boolean);
    const winnerTree = buildBracket(winners, "winner");
    const loserTree = buildBracket(losers, "loser");
    return {
      version: 1,
      tournament: tournamentState.tournament,
      participants: tournamentState.participants,
      drawOrder: tournamentState.drawOrder,
      initialMatches: tournamentState.initialMatches,
      initialResults: tournamentState.initialMatches.map(({ id, winner, loser, auto }) => ({ id, winner, loser, auto })),
      winnerBracketRounds: winnerTree.rounds,
      winnerResults: tournamentState.bracketChoices.winner,
      loserBracketRounds: loserTree.rounds,
      loserResults: tournamentState.bracketChoices.loser,
      finalFirst: winnerTree.champion,
      finalLast: loserTree.champion,
      completedAt: new Date().toISOString()
    };
  }

  function getShareUrl() {
    const url = new URL(window.location.href);
    url.search = "";
    url.searchParams.set("share", encodeState(createSharePayload()));
    return url.href;
  }

  function sanitizeLoadedState(candidate) {
    if (!candidate || typeof candidate !== "object" || !candidate.tournament || !Array.isArray(candidate.participants)) throw new Error("invalid state");
    const participants = candidate.participants
      .filter((participant) => participant && typeof participant.id === "string" && typeof participant.name === "string")
      .map((participant) => ({ id: participant.id, name: participant.name.slice(0, 30), team: String(participant.team || "").slice(0, 40) }));
    if (participants.length < 2) throw new Error("not enough participants");
    const ids = new Set(participants.map((participant) => participant.id));
    const drawOrder = Array.isArray(candidate.drawOrder) ? candidate.drawOrder.filter((id) => ids.has(id)) : [];
    if (drawOrder.length !== participants.length) throw new Error("invalid draw order");

    return {
      version: 1,
      tournament: {
        name: String(candidate.tournament.name || "이름 없는 토너먼트").slice(0, 60),
        prize: String(candidate.tournament.prize || "").slice(0, 80),
        memo: String(candidate.tournament.memo || "").slice(0, 100)
      },
      participants,
      drawOrder,
      initialMatches: Array.isArray(candidate.initialMatches) ? candidate.initialMatches.map((match, index) => ({
        id: String(match.id || `initial_${index}`),
        a: ids.has(match.a) ? match.a : null,
        b: ids.has(match.b) ? match.b : null,
        winner: ids.has(match.winner) ? match.winner : null,
        loser: ids.has(match.loser) ? match.loser : null,
        auto: Boolean(match.auto)
      })) : makeInitialMatches(drawOrder),
      bracketChoices: {
        winner: { ...(candidate.bracketChoices?.winner || {}) },
        loser: { ...(candidate.bracketChoices?.loser || {}) }
      },
      uiStage: ["initial", "winner", "loser", "result"].includes(candidate.uiStage) ? candidate.uiStage : null,
      createdAt: candidate.createdAt || ""
    };
  }

  function initialComplete() {
    return tournamentState.initialMatches.every((match) => Boolean(match.winner));
  }

  function renderTournament() {
    showOnly("tournament");
    $("#gameTournamentName").textContent = tournamentState.tournament.name;
    $("#gamePlayerCount").textContent = `${tournamentState.participants.length}명`;
    $("#gamePrize").textContent = tournamentState.tournament.prize || "없음";
    $("#gameMemo").textContent = tournamentState.tournament.memo || "없음";
    renderInitialMatches();
    renderBrackets();
  }

  function fighterButton(participant, match, isWinner) {
    if (!participant) return "";
    const slot = participant.id === match.a ? "a" : "b";
    const className = match.winner
      ? (isWinner ? " chosen" : " rejected")
      : "";
    return `
      <button class="combatant${className}" type="button" data-initial-match="${match.id}" data-player-id="${participant.id}" ${match.auto ? "disabled" : ""}>
        ${participantSprite(participant, slot, isWinner ? "victory" : "standing")}
        <span class="fighter-copy"><strong>${escapeName(participant.name)}</strong><small>${escapeHtml(participant.team || "무소속")}</small></span>
        ${isWinner ? '<span class="winner-tag">WINNER</span>' : ""}
      </button>`;
  }

  function renderInitialMatches() {
    const playable = tournamentState.initialMatches.filter((match) => !match.auto);
    const pending = playable.find((match) => !match.winner);
    const reviewMatch = initialComplete() && initialReviewId ? playable.find((match) => match.id === initialReviewId) : null;
    const current = pending || reviewMatch || playable.at(-1);
    if (!current) {
      refs.initialMatches.innerHTML = '<div class="focus-complete"><span>BYE ROUND</span><strong>모든 참가자가 자동 진출했습니다</strong></div>';
      return;
    }
    const index = tournamentState.initialMatches.indexOf(current);
    const a = participantById(current.a);
    const b = participantById(current.b);
    const completedCount = playable.filter((match) => match.winner).length;
    const isReview = initialComplete();
    refs.initialMatches.innerHTML = `
      <div class="focus-match-shell">
        <div class="focus-match-status"><span>QUALIFYING · MATCH ${String(index + 1).padStart(2, "0")}</span><strong>${isReview ? "초기 대결 완료 · 마지막 결과" : `${completedCount + 1} / ${playable.length}`}</strong></div>
        <article class="match-card match-card--focus${current.winner ? " locked" : ""}">
          <div class="match-card__head"><span>1 VS 1</span><span class="${current.winner ? "done" : ""}">${current.winner ? "완료 · 상대를 눌러 변경" : "이 경기의 승자를 선택하세요"}</span></div>
          <div class="match-card__players">
            ${fighterButton(a, current, current.winner === current.a)}
            <span class="vs-pip">VS</span>
            ${fighterButton(b, current, current.winner === current.b)}
          </div>
        </article>
        <div class="initial-match-history" aria-label="초기 경기 기록">${playable.map((match, matchIndex) => `<button type="button" data-review-initial="${match.id}" class="${match.id === current.id ? "active" : ""}" ${!initialComplete() ? "disabled" : ""}>MATCH ${String(matchIndex + 1).padStart(2, "0")}<small>${match.winner ? escapeName(participantById(match.winner)?.name || "") : "대기"}</small></button>`).join("")}</div>
        <div class="focus-progress"><i style="width:${Math.round(completedCount / playable.length * 100)}%"></i></div>
      </div>`;
  }

  refs.initialMatches.addEventListener("click", (event) => {
    const reviewButton = event.target.closest("[data-review-initial]");
    if (reviewButton && !reviewButton.disabled) {
      initialReviewId = reviewButton.dataset.reviewInitial;
      renderInitialMatches();
      return;
    }
    const button = event.target.closest("[data-initial-match]");
    if (!button || selectionLocked) return;
    const match = tournamentState.initialMatches.find((item) => item.id === button.dataset.initialMatch);
    if (!match || match.auto || match.winner === button.dataset.playerId) return;
    const chosen = button.dataset.playerId;
    const rejected = chosen === match.a ? match.b : match.a;
    const chosenParticipant = participantById(chosen);
    const rejectedParticipant = participantById(rejected);
    selectionLocked = true;
    button.classList.add("selecting");
    const other = button.parentElement.querySelector(`[data-player-id="${CSS.escape(rejected)}"]`);
    other?.classList.add("dropping");
    playBattleFx("winner", chosenParticipant?.name || "", rejectedParticipant?.name || "");
    setTimeout(() => {
      match.winner = chosen;
      match.loser = rejected;
      tournamentState.bracketChoices = { winner: {}, loser: {} };
      tournamentState.uiStage = initialComplete() ? "winner" : "initial";
      selectionLocked = false;
      saveTournamentUrl();
      renderInitialMatches();
      renderBrackets();
      if (initialComplete()) {
        const winnerIds = tournamentState.initialMatches.map((item) => item.winner).filter(Boolean);
        const loserIds = tournamentState.initialMatches.map((item) => item.loser).filter(Boolean);
        const winnerTree = buildBracket(winnerIds, "winner");
        const loserTree = buildBracket(loserIds, "loser");
        if (winnerTree.champion && loserTree.champion) {
          tournamentState.uiStage = "result";
          saveTournamentUrl();
          playFinalStairScene(winnerTree.champion, loserTree.champion);
          return;
        }
        if (winnerTree.champion) {
          startFireworks(2400);
          showToast(`${honorName(participantById(winnerTree.champion)?.name || "")} 우승 확정!`);
        }
      }
      if (initialComplete()) refs.gameFlowNav.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 720);
  });

  function nextPowerOfTwo(value) {
    let result = 1;
    while (result < value) result *= 2;
    return result;
  }

  function buildBracket(playerIds, type) {
    if (!playerIds.length) return { type, rounds: [], champion: null };
    if (playerIds.length === 1) return { type, rounds: [], champion: playerIds[0] };

    const size = nextPowerOfTwo(playerIds.length);
    const slots = [...playerIds, ...Array(size - playerIds.length).fill(null)];
    const roundCount = Math.log2(size);
    const rounds = [];

    for (let roundIndex = 0; roundIndex < roundCount; roundIndex += 1) {
      const matchCount = size / (2 ** (roundIndex + 1));
      const matches = [];
      for (let matchIndex = 0; matchIndex < matchCount; matchIndex += 1) {
        let a;
        let b;
        let aKnown;
        let bKnown;
        if (roundIndex === 0) {
          a = slots[matchIndex * 2];
          b = slots[matchIndex * 2 + 1];
          aKnown = true;
          bKnown = true;
        } else {
          const sourceA = rounds[roundIndex - 1].matches[matchIndex * 2];
          const sourceB = rounds[roundIndex - 1].matches[matchIndex * 2 + 1];
          a = sourceA.advancer;
          b = sourceB.advancer;
          aKnown = sourceA.resolved;
          bKnown = sourceB.resolved;
        }
        const key = `${roundIndex}:${matchIndex}`;
        const saved = tournamentState.bracketChoices[type][key];
        let selected = null;
        let advancer = null;
        let resolved = false;
        let auto = false;

        if (aKnown && bKnown) {
          if (a && b) {
            if (saved === a || saved === b) {
              selected = saved;
              advancer = saved;
              resolved = true;
            }
          } else {
            advancer = a || b || null;
            resolved = true;
            auto = Boolean(advancer);
          }
        }
        matches.push({ key, a, b, aKnown, bKnown, selected, advancer, resolved, auto });
      }
      rounds.push({ index: roundIndex, matches });
    }

    const finalMatch = rounds.at(-1).matches[0];
    return { type, rounds, champion: finalMatch.resolved ? finalMatch.advancer : null };
  }

  function bracketRoundStatus(round) {
    if (round.matches.every((match) => match.resolved)) return ["완료", "complete"];
    if (round.matches.some((match) => match.aKnown && match.bKnown && match.a && match.b)) return ["진행 중", "active"];
    return ["대기", ""];
  }

  function bracketPlayerButton(id, match, treeType) {
    if (!id) return '<div class="bracket-player empty"><span>WAITING...</span><small>대기</small></div>';
    const participant = participantById(id);
    const selected = match.selected === id;
    const label = treeType === "winner" ? "승자로 선택" : "패자로 선택";
    const slot = id === match.a ? "a" : "b";
    const state = selected && treeType === "winner" ? "victory" : "standing";
    return `<button class="bracket-player focus-player${selected ? " selected" : ""}" type="button" data-bracket-type="${treeType}" data-round="${match.key.split(":")[0]}" data-match="${match.key.split(":")[1]}" data-player-id="${id}" ${!match.a || !match.b ? "disabled" : ""}>${participantSprite(participant, slot, state)}<span class="focus-player__copy"><strong>${participant?.name ? escapeName(participant.name) : "-"}</strong><em>${escapeHtml(participant?.team || "무소속")}</em></span><small>${selected ? (treeType === "winner" ? "WIN ↑" : "LOSE ↓") : label}</small></button>`;
  }

  function renderBracketMap(tree) {
    if (!tree.rounds.length) return "";
    return `<div class="bracket-map" aria-label="${tree.type === "winner" ? "승자조" : "패자조"} 전체 대진 경로">
      ${tree.rounds.map((round) => {
        const title = round.index === tree.rounds.length - 1 ? "FINAL" : `ROUND ${round.index + 1}`;
        return `<section class="bracket-map__round"><h3>${title}</h3><div class="bracket-map__matches">${round.matches.map((match) => {
          const a = participantById(match.a);
          const b = participantById(match.b);
          const picked = participantById(match.selected || match.advancer);
          return `<article class="bracket-map__match${match.resolved ? " complete" : ""}"><span>${a ? escapeName(a.name) : "BYE"}</span><i>VS</i><span>${b ? escapeName(b.name) : "BYE"}</span>${picked ? `<strong>${tree.type === "winner" ? "↑" : "↓"} ${escapeName(picked.name)}</strong>` : ""}</article>`;
        }).join("")}</div></section>`;
      }).join("")}
    </div>`;
  }

  function renderBracketTree(tree, container) {
    if (!tree.rounds.length) {
      const participant = participantById(tree.champion);
      container.innerHTML = `<div class="solo-result"><div><span>AUTO FINALIST</span><strong>${participant?.name ? escapeName(participant.name) : "대기 중"}</strong></div></div>`;
      return;
    }
    let activeRound = null;
    let activeMatch = null;
    let activeMatchIndex = -1;
    for (const round of tree.rounds) {
      const index = round.matches.findIndex((match) => !match.resolved && match.a && match.b);
      if (index >= 0) {
        activeRound = round;
        activeMatch = round.matches[index];
        activeMatchIndex = index;
        break;
      }
    }

    if (!activeMatch && tree.champion) {
      const champion = participantById(tree.champion);
      container.innerHTML = `<div class="focus-complete focus-complete--${tree.type}"><span>${tree.type === "winner" ? "WINNER BRACKET COMPLETE" : "LOSER BRACKET COMPLETE"}</span><strong>${champion?.name ? escapeName(champion.name) : "-"}</strong><small>${tree.type === "winner" ? "최종 1위 진출자 결정" : "최하위 확정"}</small></div>${renderBracketMap(tree)}`;
      return;
    }

    if (!activeMatch) {
      container.innerHTML = '<div class="focus-complete"><span>NEXT MATCH</span><strong>다음 대진을 준비하고 있습니다</strong></div>';
      return;
    }

    const roundTitle = activeRound.index === tree.rounds.length - 1 ? "FINAL" : `ROUND ${activeRound.index + 1}`;
    const resolvedInRound = activeRound.matches.filter((match) => match.resolved).length;
    const instruction = tree.type === "winner" ? "이 경기의 승자를 선택하세요" : "이 경기의 패자를 선택하세요";
    container.innerHTML = `<div class="duel-focus duel-focus--${tree.type}">
      <div class="focus-match-status"><span>${roundTitle} · MATCH ${activeMatchIndex + 1}</span><strong>${resolvedInRound + 1} / ${activeRound.matches.length}</strong></div>
      <div class="duel-instruction">${instruction}<small>${tree.type === "winner" ? "선택한 참가자가 다음 라운드로 진출합니다" : "선택한 참가자가 다음 최하위 결정전으로 이동합니다"}</small></div>
      <div class="duel-players">
        ${bracketPlayerButton(activeMatch.a, activeMatch, tree.type)}
        <div class="duel-vs"><span>VS</span><i></i></div>
        ${bracketPlayerButton(activeMatch.b, activeMatch, tree.type)}
      </div>
      <div class="focus-progress"><i style="width:${Math.round(resolvedInRound / activeRound.matches.length * 100)}%"></i></div>
    </div>${renderBracketMap(tree)}`;
  }

  function countPlayableMatches(tree) {
    return tree.rounds.flatMap((round) => round.matches).filter((match) => match.a && match.b).length;
  }

  function renderBrackets() {
    const completed = initialComplete();
    if (!completed) {
      tournamentState.uiStage = "initial";
      refs.initialStage.hidden = false;
      refs.bracketStage.hidden = true;
      refs.completionPanel.hidden = true;
      renderFlowNav(false, false, false);
      updateProgress(null, null);
      return;
    }

    const winnerIds = tournamentState.initialMatches.map((match) => match.winner).filter(Boolean);
    const loserIds = tournamentState.initialMatches.map((match) => match.loser).filter(Boolean);
    const winnerTree = buildBracket(winnerIds, "winner");
    const loserTree = buildBracket(loserIds, "loser");
    renderBracketTree(winnerTree, refs.winnerBracket);
    renderBracketTree(loserTree, refs.loserBracket);
    updateProgress(winnerTree, loserTree);

    const finished = Boolean(winnerTree.champion && loserTree.champion);
    if (!tournamentState.uiStage) tournamentState.uiStage = finished ? "result" : winnerTree.champion ? "loser" : "winner";
    if (tournamentState.uiStage === "loser" && !winnerTree.champion) tournamentState.uiStage = "winner";
    renderGameStage(winnerTree, loserTree, finished);
    if (finished) {
      $("#finalFirstName").textContent = honorName(participantById(winnerTree.champion)?.name || "");
      $("#finalLastName").textContent = honorName(participantById(loserTree.champion)?.name || "");
    }
  }

  function renderFlowNav(initialDone, winnerDone, loserDone) {
    const stage = tournamentState.uiStage || "initial";
    refs.gameFlowNav.querySelectorAll("[data-game-stage]").forEach((button) => {
      const target = button.dataset.gameStage;
      button.classList.toggle("active", target === stage);
      const targetDone = target === "initial" ? initialDone : target === "winner" ? winnerDone : target === "loser" ? loserDone : winnerDone && loserDone;
      button.classList.toggle("complete", targetDone);
      button.disabled = target === "winner" ? !initialDone : target === "loser" ? !winnerDone : target === "result" ? !(winnerDone && loserDone) : false;
      button.setAttribute("aria-current", target === stage ? "step" : "false");
    });
  }

  function renderGameStage(winnerTree, loserTree, finished) {
    const stage = tournamentState.uiStage;
    refs.initialStage.hidden = stage !== "initial";
    refs.bracketStage.hidden = stage === "initial" || stage === "result";
    refs.winnerStagePage.hidden = stage !== "winner";
    refs.loserStagePage.hidden = stage !== "loser";
    refs.goLoserStage.hidden = !winnerTree.champion;
    refs.goResultStage.hidden = !finished;
    refs.completionPanel.hidden = !(finished && stage === "result");
    renderFlowNav(true, Boolean(winnerTree.champion), Boolean(loserTree.champion));
  }

  function moveToGameStage(stage) {
    if (stage === "winner" && !initialComplete()) return;
    const winnerIds = tournamentState.initialMatches.map((match) => match.winner).filter(Boolean);
    const winnerTree = buildBracket(winnerIds, "winner");
    if (stage === "loser" && !winnerTree.champion) {
      showToast("승자조에서 최종 1위를 먼저 결정해 주세요.");
      return;
    }
    if (stage === "result") {
      const loserIds = tournamentState.initialMatches.map((match) => match.loser).filter(Boolean);
      const loserTree = buildBracket(loserIds, "loser");
      if (!winnerTree.champion || !loserTree.champion) return;
    }
    tournamentState.uiStage = stage;
    saveTournamentUrl();
    renderBrackets();
    refs.gameFlowNav.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  refs.gameFlowNav.addEventListener("click", (event) => {
    const button = event.target.closest("[data-game-stage]");
    if (!button || button.disabled) return;
    moveToGameStage(button.dataset.gameStage);
  });

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-move-stage]");
    if (button) moveToGameStage(button.dataset.moveStage);
  });

  refs.goLoserStage.addEventListener("click", () => moveToGameStage("loser"));
  refs.goResultStage.addEventListener("click", () => moveToGameStage("result"));

  function updateProgress(winnerTree, loserTree) {
    const initialTotal = tournamentState.initialMatches.filter((match) => !match.auto).length;
    const initialDone = tournamentState.initialMatches.filter((match) => !match.auto && match.winner).length;
    let total = initialTotal;
    let done = initialDone;
    if (winnerTree && loserTree) {
      total += countPlayableMatches(winnerTree) + countPlayableMatches(loserTree);
      done += Object.keys(tournamentState.bracketChoices.winner).length + Object.keys(tournamentState.bracketChoices.loser).length;
      const pendingWinner = winnerTree.rounds.find((round) => !round.matches.every((match) => match.resolved));
      const pendingLoser = loserTree.rounds.find((round) => !round.matches.every((match) => match.resolved));
      const winnerLabel = winnerTree.champion ? "승자조 완료" : `승자조 ${pendingWinner ? `ROUND ${pendingWinner.index + 1}` : "대기"}`;
      const loserLabel = loserTree.champion ? "패자조 완료" : `패자조 ${pendingLoser ? `ROUND ${pendingLoser.index + 1}` : "대기"}`;
      $("#currentProgressText").textContent = `${winnerLabel} · ${loserLabel}`;
    }
    $("#overallProgress").textContent = `${total ? Math.min(100, Math.round(done / total * 100)) : 100}%`;
  }

  [refs.winnerBracket, refs.loserBracket].forEach((container) => {
    container.addEventListener("click", (event) => {
      const button = event.target.closest("[data-bracket-type]");
      if (!button || button.disabled || selectionLocked) return;
      const type = button.dataset.bracketType;
      const roundIndex = Number(button.dataset.round);
      const matchIndex = Number(button.dataset.match);
      const key = `${roundIndex}:${matchIndex}`;
      if (tournamentState.bracketChoices[type][key] === button.dataset.playerId) return;
      const duelButtons = [...button.closest(".duel-players").querySelectorAll("[data-player-id]")];
      const opponentButton = duelButtons.find((candidate) => candidate !== button);
      const selectedParticipant = participantById(button.dataset.playerId);
      const opponentParticipant = participantById(opponentButton?.dataset.playerId);
      const beforeWinnerIds = tournamentState.initialMatches.map((match) => match.winner).filter(Boolean);
      const beforeLoserIds = tournamentState.initialMatches.map((match) => match.loser).filter(Boolean);
      const wasFinished = Boolean(buildBracket(beforeWinnerIds, "winner").champion && buildBracket(beforeLoserIds, "loser").champion);
      selectionLocked = true;
      button.classList.add("selected");
      opponentButton?.classList.add("impact-hit");
      if (type === "loser") button.classList.add("crying");
      playBattleFx(type, selectedParticipant?.name || "", opponentParticipant?.name || "");
      setTimeout(() => {
        tournamentState.bracketChoices[type][key] = button.dataset.playerId;
        Object.keys(tournamentState.bracketChoices[type]).forEach((choiceKey) => {
          if (Number(choiceKey.split(":")[0]) > roundIndex) delete tournamentState.bracketChoices[type][choiceKey];
        });
        if (type === "loser") {
          const winnerIds = tournamentState.initialMatches.map((match) => match.winner).filter(Boolean);
          const loserIds = tournamentState.initialMatches.map((match) => match.loser).filter(Boolean);
          if (buildBracket(winnerIds, "winner").champion && buildBracket(loserIds, "loser").champion) tournamentState.uiStage = "result";
        }
        const updatedIds = tournamentState.initialMatches
          .map((match) => type === "winner" ? match.winner : match.loser)
          .filter(Boolean);
        const updatedTree = buildBracket(updatedIds, type);
        selectionLocked = false;
        saveTournamentUrl();
        const finalWinnerTree = buildBracket(tournamentState.initialMatches.map((match) => match.winner).filter(Boolean), "winner");
        const finalLoserTree = buildBracket(tournamentState.initialMatches.map((match) => match.loser).filter(Boolean), "loser");
        const isNewFinal = !wasFinished && Boolean(finalWinnerTree.champion && finalLoserTree.champion);
        if (isNewFinal) {
          tournamentState.uiStage = "result";
          saveTournamentUrl();
          playFinalStairScene(finalWinnerTree.champion, finalLoserTree.champion);
          return;
        }
        renderBrackets();
        if (type === "winner" && updatedTree.champion) {
          const champion = participantById(updatedTree.champion);
          startFireworks(2800);
          showToast(`${honorName(champion?.name || "")} 우승 확정!`);
        }
      }, type === "loser" ? 1050 : 820);
    });
  });

  function transitionToShareResult() {
    const payload = createSharePayload();
    const url = new URL(window.location.href);
    url.search = "";
    url.searchParams.set("share", encodeState(payload));
    history.replaceState(null, "", url);
    renderSharePage(payload);
  }

  function playFinalStairScene(firstId, lastId) {
    showOnly("finalStair");
    cancelAnimationFrame(stairAnimationFrame);
    const canvas = refs.finalStairCanvas;
    const context = canvas.getContext("2d");
    const first = participantById(firstId);
    const last = participantById(lastId);
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reducedMotion ? 1300 : 8200;
    let startedAt = performance.now();
    let completed = false;
    let lastCaption = "";

    function resize() {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(innerWidth * ratio);
      canvas.height = Math.round(innerHeight * ratio);
      canvas.style.width = `${innerWidth}px`;
      canvas.style.height = `${innerHeight}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.imageSmoothingEnabled = false;
    }

    function clamp(value, min = 0, max = 1) { return Math.max(min, Math.min(max, value)); }
    function ease(value) { const t = clamp(value); return t * t * (3 - 2 * t); }
    function mix(from, to, value) { return from + (to - from) * value; }

    function drawCover(image) {
      if (!image.complete || !image.naturalWidth) {
        context.fillStyle = "#111332";
        context.fillRect(0, 0, innerWidth, innerHeight);
        return;
      }
      const scale = Math.max(innerWidth / image.naturalWidth, innerHeight / image.naturalHeight);
      const width = image.naturalWidth * scale;
      const height = image.naturalHeight * scale;
      context.drawImage(image, (innerWidth - width) / 2, (innerHeight - height) / 2, width, height);
    }

    function drawSprite(sheet, frame, x, feetY, size, options = {}) {
      if (!sheet.complete || !sheet.naturalWidth) return;
      const cellWidth = sheet.naturalWidth / 2;
      const cellHeight = sheet.naturalHeight / 2;
      const sourceX = (frame % 2) * cellWidth;
      const sourceY = Math.floor(frame / 2) * cellHeight;
      context.save();
      context.translate(Math.round(x), Math.round(feetY));
      if (options.mirror) context.scale(-1, 1);
      if (options.filter) context.filter = options.filter;
      context.globalAlpha = options.alpha ?? 1;
      context.shadowColor = options.glow || "rgba(7,9,28,.65)";
      context.shadowBlur = options.glow ? 24 : 9;
      context.drawImage(sheet, sourceX, sourceY, cellWidth, cellHeight, -size / 2, -size, size, size);
      context.restore();
    }

    function drawNameplate(name, x, y, tone) {
      const label = honorName(name);
      context.font = `900 ${Math.max(15, Math.min(22, innerWidth * .026))}px Pretendard, sans-serif`;
      const width = Math.min(250, Math.max(122, context.measureText(label).width + 52));
      context.fillStyle = "rgba(8,10,29,.94)";
      context.fillRect(Math.round(x - width / 2), Math.round(y - 23), Math.round(width), 46);
      context.strokeStyle = tone;
      context.lineWidth = 3;
      context.strokeRect(Math.round(x - width / 2), Math.round(y - 23), Math.round(width), 46);
      context.fillStyle = tone;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(label, x, y + 1, width - 18);
    }

    function setCaption(value) {
      if (value === lastCaption) return;
      lastCaption = value;
      refs.finalStairCaption.textContent = value;
    }

    function finish() {
      if (completed) return;
      completed = true;
      cancelAnimationFrame(stairAnimationFrame);
      transitionToShareResult();
    }

    resize();
    window.addEventListener("resize", resize, { once: true });
    $("#skipFinalStair").onclick = finish;

    function frame(now) {
      const elapsed = reducedMotion ? (now - startedAt) * 7 : now - startedAt;
      if (elapsed >= duration) { finish(); return; }
      drawCover(characterAssets.championArena);
      const shade = context.createLinearGradient(0, 0, 0, innerHeight);
      shade.addColorStop(0, "rgba(10,12,42,.16)");
      shade.addColorStop(1, "rgba(8,5,22,.45)");
      context.fillStyle = shade;
      context.fillRect(0, 0, innerWidth, innerHeight);

      const size = Math.min(260, innerWidth * .27, innerHeight * .38);
      const climb = ease((elapsed - 650) / 3000);
      const winnerContinue = ease((elapsed - 3400) / 2100);
      const winnerX = mix(innerWidth * .42, innerWidth * .5, winnerContinue);
      const winnerY = mix(innerHeight * .91, innerHeight * .69, Math.max(climb, winnerContinue));
      const lastX = mix(innerWidth * .58, innerWidth * .64, climb);
      const lastY = mix(innerHeight * .91, innerHeight * .73, climb);
      const winnerFrame = elapsed > 5700 ? (elapsed % 1200 < 600 ? 3 : 2) : 1;

      if (elapsed < 700) setCaption("최종 1위와 최하위의 운명이 결정되었습니다");
      else if (elapsed < 3200) setCaption("두 참가자가 마지막 계단을 오릅니다");
      else if (elapsed < 4550) setCaption(`${honorName(last?.name || "")}이 발을 헛디뎠습니다!`);
      else if (elapsed < 5900) setCaption(`${honorName(first?.name || "")}은 정상으로 향합니다`);
      else setCaption(`${honorName(first?.name || "")} 최종 1위!`);

      drawSprite(characterAssets.trainer, winnerFrame, winnerX, winnerY, size, { mirror: false, glow: elapsed > 5600 ? "#ffd84d" : "rgba(72,199,255,.35)" });
      drawNameplate(first?.name || "", winnerX, winnerY - size * .9, "#ffd84d");

      if (elapsed < 3300) {
        drawSprite(characterAssets.trainer, 1, lastX, lastY, size * .94, { mirror: true, filter: "hue-rotate(-18deg) saturate(.86)" });
        drawNameplate(last?.name || "", lastX, lastY - size * .84, "#ff6b87");
      } else {
        const fallAge = elapsed - 3300;
        const fallFrame = fallAge < 330 ? 0 : fallAge < 680 ? 1 : fallAge < 1080 ? 2 : 3;
        const fallX = innerWidth * .68 + Math.sin(fallAge * .025) * (fallAge < 550 ? 8 : 0);
        const fallY = innerHeight * .82 + Math.min(16, fallAge * .016);
        drawSprite(characterAssets.lastPlace, fallFrame, fallX, fallY, size * .82, { glow: "rgba(255,73,108,.25)" });
        drawNameplate(last?.name || "", fallX, fallY - size * .7, "#ff6b87");
        if (fallAge < 500) {
          context.fillStyle = `rgba(255,245,207,${.45 * (1 - fallAge / 500)})`;
          context.fillRect(0, 0, innerWidth, innerHeight);
        }
      }

      if (elapsed > 5700) {
        for (let index = 0; index < 18; index += 1) {
          const angle = index * .78 + elapsed * .002;
          const radius = 80 + (index % 4) * 24;
          const x = winnerX + Math.cos(angle) * radius;
          const y = winnerY - size * .58 + Math.sin(angle) * radius * .55;
          context.fillStyle = ["#ffd84d", "#fff5cf", "#48c7ff"][index % 3];
          context.fillRect(Math.round(x), Math.round(y), 5 + index % 2 * 3, 5 + index % 2 * 3);
        }
      }
      stairAnimationFrame = requestAnimationFrame(frame);
    }
    stairAnimationFrame = requestAnimationFrame(frame);
  }

  $("#resetButton").addEventListener("click", () => {
    if (!confirm("현재 토너먼트를 끝내고 새 게임을 시작할까요?")) return;
    const url = new URL(window.location.href);
    url.search = "";
    window.location.href = url.href;
  });

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (_) {
      const input = document.createElement("textarea");
      input.value = text;
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
  }

  $("#copyLinkButton").addEventListener("click", async () => {
    await copyText(getShareUrl());
    $("#shareMessage").textContent = "공유 링크를 복사했습니다!";
    showToast("링크 복사 완료!");
  });

  $("#nativeShareButton").addEventListener("click", async () => {
    const url = getShareUrl();
    if (navigator.share) {
      try {
        await navigator.share({ title: `${tournamentState.tournament.name} 결과`, text: "PIXEL CLASH 토너먼트 결과를 확인하세요!", url });
        return;
      } catch (error) {
        if (error.name === "AbortError") return;
      }
    }
    await copyText(url);
    $("#shareMessage").textContent = "공유 링크를 복사했습니다!";
    showToast("공유 링크 복사 완료!");
  });

  $("#viewResultButton").addEventListener("click", () => { window.location.href = getShareUrl(); });

  function computeStandings(payload) {
    const stats = new Map(payload.participants.map((participant, index) => [participant.id, {
      participant,
      wins: 0,
      advancement: 0,
      registrationIndex: index
    }]));
    const initialMatches = payload.initialResults || payload.initialMatches || [];
    initialMatches.forEach((match) => {
      if (match.winner && !match.auto && stats.has(match.winner)) stats.get(match.winner).wins += 1;
      if (match.winner && stats.has(match.winner)) stats.get(match.winner).advancement = Math.max(stats.get(match.winner).advancement, 100);
    });

    (payload.winnerBracketRounds || []).forEach((round) => {
      round.matches.forEach((match) => {
        const selected = match.selected || payload.winnerResults?.[match.key] || (match.auto ? match.advancer : null);
        if (!selected || !stats.has(selected)) return;
        if (!match.auto && match.a && match.b) stats.get(selected).wins += 1;
        stats.get(selected).advancement = Math.max(stats.get(selected).advancement, 200 + round.index);
      });
    });

    (payload.loserBracketRounds || []).forEach((round) => {
      round.matches.forEach((match) => {
        const selectedLoser = match.selected || payload.loserResults?.[match.key] || (match.auto ? match.advancer : null);
        if (!selectedLoser) return;
        if (!match.auto && match.a && match.b) {
          const actualWinner = selectedLoser === match.a ? match.b : match.a;
          if (actualWinner && stats.has(actualWinner)) {
            stats.get(actualWinner).wins += 1;
            stats.get(actualWinner).advancement = Math.max(stats.get(actualWinner).advancement, 50 + round.index);
          }
        }
        if (stats.has(selectedLoser)) stats.get(selectedLoser).advancement = Math.min(stats.get(selectedLoser).advancement, -(round.index + 1));
      });
    });

    if (stats.has(payload.finalFirst)) stats.get(payload.finalFirst).advancement = 999;
    if (stats.has(payload.finalLast)) stats.get(payload.finalLast).advancement = -999;
    return [...stats.values()].sort((a, b) => b.wins - a.wins || b.advancement - a.advancement || a.registrationIndex - b.registrationIndex);
  }

  function renderSharePage(payload) {
    showOnly("result");
    const byId = new Map(payload.participants.map((participant) => [participant.id, participant]));
    const first = byId.get(payload.finalFirst);
    const last = byId.get(payload.finalLast);
    if (!first || !last) throw new Error("finalists missing");
    $("#shareFirstName").textContent = honorName(first.name);
    $("#shareLastName").textContent = honorName(last.name);
    $("#shareTournamentName").textContent = payload.tournament.name;
    $("#sharePrize").textContent = payload.tournament.prize || "없음";
    $("#shareMemo").textContent = payload.tournament.memo || "없음";
    const standings = computeStandings(payload);
    $("#shareParticipantList").innerHTML = standings.map((entry, index) => {
      const id = entry.participant.id;
      const isFirst = id === payload.finalFirst;
      const isLast = id === payload.finalLast;
      const resultClass = isFirst ? " first" : isLast ? " last" : "";
      const title = isFirst ? "최종 1위" : isLast ? "최종 꼴등" : "";
      return `<article class="roster-player${resultClass}" style="--credit-index:${index}"><span>${String(index + 1).padStart(2, "0")}</span><div><strong>${escapeName(entry.participant.name)}</strong><small>${escapeHtml(entry.participant.team || "무소속")}</small></div><em>${entry.wins}승${title ? ` · ${title}` : ""}</em></article>`;
    }).join("");
    playResultSequence(false);
  }

  function setCreditsVisible(visible) {
    views.result.classList.toggle("show-credits", visible);
    $("#showEndingCredits").textContent = visible ? "× 캐스트 닫기" : "☷ 엔딩 캐스트";
  }

  function playResultSequence(withSound = true) {
    const resultView = views.result;
    const intro = $("#resultIntro");
    const trainer = $("#resultTrainer");
    const beat = $("#suspenseBeat");
    resultTimers.forEach(clearTimeout);
    resultTimers = [];
    cancelAnimationFrame(fireworksFrame);
    refs.celebrationCanvas.hidden = true;
    trainer.dataset.state = "idle";
    beat.textContent = "두구두구...";
    resultView.classList.remove("playing");
    setCreditsVisible(false);
    refs.endingCredits.scrollTop = 0;
    intro.classList.remove("done");
    void resultView.offsetWidth;
    resultView.classList.add("playing");
    window.scrollTo({ top: 0, behavior: "auto" });
    resultTimers.push(setTimeout(() => { beat.textContent = "두구두구…!"; }, 800));
    resultTimers.push(setTimeout(() => { beat.textContent = "3 · 2 · 1"; }, 1700));
    resultTimers.push(setTimeout(() => { beat.textContent = "결과 공개!"; }, 2450));
    resultTimers.push(setTimeout(() => intro.classList.add("done"), 2850));
    resultTimers.push(setTimeout(() => { trainer.dataset.state = "standing"; }, 2900));
    resultTimers.push(setTimeout(() => {
      trainer.dataset.state = "victory";
      startFireworks(3600);
    }, 3600));
    resultTimers.push(setTimeout(() => { trainer.dataset.state = "triumph"; }, 4750));
    resultTimers.push(setTimeout(() => { trainer.dataset.state = "victory"; }, 5750));
    resultTimers.push(setTimeout(() => { setCreditsVisible(true); }, 7200));
    if (withSound) playFanfare();
  }

  $("#skipResultReveal").addEventListener("click", () => {
    resultTimers.forEach(clearTimeout);
    resultTimers = [];
    $("#resultIntro").classList.add("done");
    $("#resultTrainer").dataset.state = "victory";
    startFireworks(3000);
    resultTimers.push(setTimeout(() => setCreditsVisible(true), 4200));
  });

  function playFanfare() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const context = new AudioContext();
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "square";
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(.06, context.currentTime + index * .12);
        gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + index * .12 + .22);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(context.currentTime + index * .12);
        oscillator.stop(context.currentTime + index * .12 + .23);
      });
      setTimeout(() => context.close(), 1300);
    } catch (_) { /* Sound is optional when autoplay is unavailable. */ }
  }

  $("#replayResult").addEventListener("click", () => playResultSequence(true));
  $("#showEndingCredits").addEventListener("click", () => {
    setCreditsVisible(!views.result.classList.contains("show-credits"));
  });
  $("#copyResultLink").addEventListener("click", async () => {
    await copyText(window.location.href);
    showToast("결과 공유 링크를 복사했습니다!");
  });

  // Canvas draw animation ---------------------------------------------------
  function startDrawAnimation() {
    showOnly("animation");
    cancelAnimationFrame(animationFrame);
    const canvas = $("#tournamentAnimation");
    const context = canvas.getContext("2d");
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reducedMotion ? 1100 : 7600;
    let startedAt = performance.now();
    let particles = [];
    let exploded = false;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(innerWidth * dpr);
      canvas.height = Math.floor(innerHeight * dpr);
      canvas.style.width = `${innerWidth}px`;
      canvas.style.height = `${innerHeight}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.imageSmoothingEnabled = false;
    }
    resize();
    window.addEventListener("resize", resize, { once: true });

    function rect(x, y, width, height, color) {
      context.fillStyle = color;
      context.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height));
    }

    function centerText(text, y, size, color = "#fff5cf") {
      context.font = `900 ${Math.max(12, size)}px Pretendard, Malgun Gothic, sans-serif`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillStyle = "#080a18";
      context.fillText(text, innerWidth / 2 + 3, y + 4);
      context.fillStyle = color;
      const max = innerWidth - 36;
      let width = context.measureText(text).width;
      if (width > max) {
        context.font = `900 ${Math.max(12, size * max / width)}px Pretendard, Malgun Gothic, sans-serif`;
      }
      context.fillText(text, innerWidth / 2, y);
    }

    function drawStage(time, shake) {
      context.save();
      context.translate(shake, 0);
      const stage = characterAssets.drawStage;
      if (stage.complete && stage.naturalWidth) {
        const scale = Math.max(innerWidth / stage.naturalWidth, innerHeight / stage.naturalHeight) * (time > 5800 ? 1.035 : 1);
        const width = stage.naturalWidth * scale;
        const height = stage.naturalHeight * scale;
        context.drawImage(stage, (innerWidth - width) / 2, (innerHeight - height) / 2, width, height);
      } else {
        context.fillStyle = "#080b24";
        context.fillRect(-10, 0, innerWidth + 20, innerHeight);
      }
      const shade = context.createLinearGradient(0, 0, 0, innerHeight);
      shade.addColorStop(0, "rgba(3,6,24,.56)");
      shade.addColorStop(.28, "rgba(3,6,24,.12)");
      shade.addColorStop(1, "rgba(3,6,24,.08)");
      context.fillStyle = shade;
      context.fillRect(-10, 0, innerWidth + 20, innerHeight);
      for (let i = 0; i < 14; i += 1) {
        const sparkle = (Math.sin(time * .006 + i * 2.1) + 1) / 2;
        context.globalAlpha = .2 + sparkle * .65;
        rect((i * 149 + 67) % innerWidth, (i * 83 + 45) % Math.max(120, innerHeight * .58), 3 + (i % 2) * 3, 3 + (i % 2) * 3, i % 3 ? "#ffd84d" : "#48c7ff");
      }
      context.globalAlpha = 1;
      context.restore();
    }

    function drawClownSprite(frameIndex, cx, time) {
      const sprite = characterAssets.clown;
      if (!sprite.complete || !sprite.naturalWidth) return;
      const cellWidth = sprite.naturalWidth / 2;
      const cellHeight = sprite.naturalHeight / 2;
      const size = Math.min(430, innerWidth * .52, innerHeight * .58);
      const stageY = innerHeight * .77;
      const bounce = frameIndex === 1 ? Math.round(Math.sin(time * .008) * 5) : 0;
      const shake = frameIndex === 2 ? Math.sin(time * .035) * 4 : 0;
      const sx = (frameIndex % 2) * cellWidth;
      const sy = Math.floor(frameIndex / 2) * cellHeight;
      context.save();
      context.translate(shake, bounce);
      context.shadowColor = frameIndex === 3 ? "#ffd84d" : "rgba(72,199,255,.38)";
      context.shadowBlur = frameIndex === 3 ? 28 : 10;
      context.drawImage(sprite, sx, sy, cellWidth, cellHeight, cx - size / 2, stageY - size * .91, size, size);
      context.restore();
    }

    function drawBall(x, y, color, glow = true) {
      context.save();
      if (glow) { context.shadowColor = color; context.shadowBlur = 24; }
      context.translate(Math.round(x), Math.round(y));
      context.fillStyle = "#15102c";
      context.beginPath();
      context.moveTo(-8, -16);
      context.lineTo(8, -16);
      context.lineTo(16, -8);
      context.lineTo(16, 8);
      context.lineTo(8, 16);
      context.lineTo(-8, 16);
      context.lineTo(-16, 8);
      context.lineTo(-16, -8);
      context.closePath();
      context.fill();
      context.shadowBlur = 0;
      context.fillStyle = color;
      context.beginPath();
      context.moveTo(-7, -12);
      context.lineTo(7, -12);
      context.lineTo(12, -7);
      context.lineTo(12, 7);
      context.lineTo(7, 12);
      context.lineTo(-7, 12);
      context.lineTo(-12, 7);
      context.lineTo(-12, -7);
      context.closePath();
      context.fill();
      rect(-7, -8, 5, 5, "#fffbd9");
      context.globalAlpha = .3;
      rect(-7, 8, 14, 4, "#15102c");
      context.restore();
    }

    function finish() {
      cancelAnimationFrame(animationFrame);
      renderTournament();
    }

    $("#skipAnimation").onclick = finish;

    function frame(now) {
      const elapsed = reducedMotion ? (now - startedAt) * 7 : now - startedAt;
      if (elapsed >= duration) { finish(); return; }
      let shake = 0;
      if (elapsed > 4050 && elapsed < 4550) shake = Math.round(Math.sin(elapsed * .12) * 8);
      drawStage(elapsed, shake);
      const cx = innerWidth / 2;
      const cy = innerHeight * .56;

      if (elapsed < 5200) {
        const clownFrame = elapsed < 450 ? 0 : elapsed < 2850 ? 1 : elapsed < 4500 ? 2 : 3;
        drawClownSprite(clownFrame, cx, elapsed);

        // During SURPRISED, the balls detach from the JUGGLING sprite so one can fall independently.
        if (elapsed >= 2850 && elapsed < 4500) {
          for (let index = 0; index < 3; index += 1) {
            const angle = elapsed * .0022 + index * Math.PI * 2 / 3;
            let x = cx + Math.cos(angle) * Math.min(135, innerWidth * .21);
            let y = cy - 145 + Math.sin(angle) * 45;
            if (index === 0) {
              if (elapsed < 3400) x = cx + 52 + Math.sin(elapsed * .09) * 9;
              else {
                const fall = (elapsed - 3400) / 700;
                x = cx + 52 + Math.sin(elapsed * .04) * 4;
                y = Math.min(innerHeight * .75 - 12, cy - 140 + 330 * fall * fall);
              }
            }
            drawBall(x, y, ["#ff496c", "#48c7ff", "#ffd84d"][index]);
          }
        }
      }

      if (elapsed > 4100 && !exploded) {
        exploded = true;
        particles = Array.from({ length: 36 }, (_, index) => ({
          x: cx + 55, y: innerHeight * .75 - 20,
          vx: Math.cos(index * .9) * (2 + index % 5), vy: -2 - index % 7,
          color: ["#ffd84d", "#ff496c", "#48c7ff"][index % 3]
        }));
      }
      particles.forEach((particle) => {
        particle.x += particle.vx; particle.y += particle.vy; particle.vy += .17;
        rect(particle.x, particle.y, 6, 6, particle.color);
      });

      if (elapsed < 2850) {
        centerText(elapsed < 450 ? "행운을 준비하는 중..." : "대진표 추천 중...", Math.max(65, innerHeight * .12), Math.min(30, innerWidth * .055), "#fff5cf");
        centerText(elapsed < 450 ? "곧 추첨을 시작합니다" : "빨강 · 파랑 · 노랑, 3개의 운명 구슬", Math.max(100, innerHeight * .18), 12, "#7eeeff");
      } else if (elapsed < 4500) {
        centerText("운명의 구슬이 선택되었습니다!", Math.max(65, innerHeight * .12), Math.min(25, innerWidth * .05), "#ffd84d");
      } else if (elapsed < 5800) {
        const revealed = participantById(tournamentState.drawOrder[0]);
        rect(cx - Math.min(300, innerWidth * .43), innerHeight * .16, Math.min(600, innerWidth * .86), 118, "#101638");
        context.strokeStyle = "#ffd84d"; context.lineWidth = 5; context.strokeRect(cx - Math.min(300, innerWidth * .43), innerHeight * .16, Math.min(600, innerWidth * .86), 118);
        centerText(honorName(revealed.name), innerHeight * .16 + 48, Math.min(45, innerWidth * .09), "#ffd84d");
        centerText("첫 번째 참가자가 결정되었습니다!", innerHeight * .16 + 91, 13, "#a9edff");
      } else {
        const progress = Math.min(1, (elapsed - 5800) / 1500);
        context.fillStyle = `rgba(255,245,207,${Math.sin(progress * Math.PI) * .82})`;
        context.fillRect(0, 0, innerWidth, innerHeight);
        const gateWidth = Math.min(620, innerWidth * .86);
        rect(cx - gateWidth / 2, innerHeight * .27, gateWidth, innerHeight * .45, "#172052");
        rect(cx - gateWidth / 2 + 12, innerHeight * .27 + 12, gateWidth - 24, innerHeight * .45 - 24, "#0b102c");
        centerText("TOURNAMENT", innerHeight * .43, Math.min(52, innerWidth * .09), "#ffd84d");
        centerText("대진 추천 완료!", innerHeight * .54, Math.min(24, innerWidth * .05), "#5effe5");
        for (let i = 0; i < 24; i += 1) {
          const size = 8 + (i % 3) * 6;
          rect((i * 97 + elapsed * .2) % innerWidth, (i * 53) % innerHeight, size, size, i % 2 ? "#ffd84d" : "#48c7ff");
        }
      }
      animationFrame = requestAnimationFrame(frame);
    }
    animationFrame = requestAnimationFrame(frame);
  }

  function showInvalidLink(message) {
    showOnly("registration");
    refs.formError.textContent = message;
    const cleanUrl = new URL(window.location.href);
    cleanUrl.search = "";
    history.replaceState(null, "", cleanUrl.href);
  }

  function bootstrap() {
    const params = new URLSearchParams(window.location.search);
    const share = params.get("share");
    const data = params.get("data");
    if (share) {
      try {
        const payload = decodeState(share);
        if (!payload?.tournament || !Array.isArray(payload.participants) || !payload.finalFirst || !payload.finalLast) throw new Error("invalid share");
        renderSharePage(payload);
      } catch (_) {
        showInvalidLink("공유 링크가 손상되었거나 올바르지 않습니다.");
      }
      return;
    }
    if (params.get("mode") === "tournament" && data) {
      try {
        tournamentState = sanitizeLoadedState(decodeState(data));
        const hasProgress = tournamentState.initialMatches.some((match) => !match.auto && match.winner)
          || Object.keys(tournamentState.bracketChoices.winner).length
          || Object.keys(tournamentState.bracketChoices.loser).length;
        if (hasProgress) renderTournament();
        else startDrawAnimation();
      } catch (_) {
        showInvalidLink("토너먼트 데이터를 복원할 수 없습니다. 새 게임을 시작해 주세요.");
      }
      return;
    }
    showOnly("registration");
    renderDraftParticipants();
  }

  bootstrap();
})();
