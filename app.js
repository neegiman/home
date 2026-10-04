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
    clownJuggle: new Image(),
    trainer: new Image(),
    trainerCutscene: new Image(),
    lastPlace: new Image(),
    loserCutscene: new Image(),
    drawStage: new Image(),
    championArena: new Image()
  };
  characterAssets.clown.decoding = "async";
  characterAssets.clownJuggle.decoding = "async";
  characterAssets.trainer.decoding = "async";
  characterAssets.trainerCutscene.decoding = "async";
  characterAssets.lastPlace.decoding = "async";
  characterAssets.loserCutscene.decoding = "async";
  characterAssets.drawStage.decoding = "async";
  characterAssets.championArena.decoding = "async";
  characterAssets.clown.src = "assets/characters/clown-spritesheet.png";
  characterAssets.clownJuggle.src = "assets/characters/clown-juggle-8f.png";
  characterAssets.trainer.src = "assets/characters/trainer-spritesheet.png";
  characterAssets.trainerCutscene.src = "assets/characters/trainer-cutscene-12f.png";
  characterAssets.lastPlace.src = "assets/characters/last-place-bow-spritesheet.png";
  characterAssets.loserCutscene.src = "assets/characters/loser-cutscene-12f.png";
  characterAssets.drawStage.src = "assets/backgrounds/draw-stage.png";
  characterAssets.championArena.src = "assets/backgrounds/champion-arena.png";

  const visualAssetsReady = Promise.allSettled(Object.values(characterAssets).map((image) => {
    if (image.complete && image.naturalWidth) return Promise.resolve();
    return new Promise((resolve) => {
      image.addEventListener("load", resolve, { once: true });
      image.addEventListener("error", resolve, { once: true });
    });
  }));

  function waitForVisualAssets(maxWait = 6000) {
    return Promise.race([
      visualAssetsReady,
      new Promise((resolve) => setTimeout(resolve, maxWait))
    ]);
  }

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

  async function playFinalStairScene(firstId, lastId) {
    showOnly("finalStair");
    cancelAnimationFrame(stairAnimationFrame);
    const canvas = refs.finalStairCanvas;
    const context = canvas.getContext("2d");
    const first = participantById(firstId);
    const last = participantById(lastId);
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const sequence = [
      { name: "ENTER", duration: 500 },
      { name: "WALK_TOGETHER", duration: 2600 },
      { name: "LOSER_STUMBLE", duration: 600 },
      { name: "LOSER_FALL", duration: 750 },
      { name: "WINNER_LOOK_BACK", duration: 450 },
      { name: "WINNER_CLIMB", duration: 1700 },
      { name: "WINNER_ARRIVE", duration: 500 },
      { name: "VICTORY", duration: 900 },
      { name: "LOOK_DOWN", duration: 650 },
      { name: "FINAL_WIDE_SHOT", duration: 1000 }
    ];
    const duration = sequence.reduce((sum, state) => sum + state.duration, 0);
    const playbackRate = reducedMotion ? duration / 1300 : 1;
    let startedAt = 0;
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
    function easeOut(value) { const t = clamp(value); return 1 - (1 - t) * (1 - t); }
    function mix(from, to, value) { return from + (to - from) * value; }

    function stateAt(elapsed) {
      let cursor = 0;
      for (const state of sequence) {
        if (elapsed < cursor + state.duration) {
          const local = elapsed - cursor;
          return { ...state, local, progress: clamp(local / state.duration), start: cursor };
        }
        cursor += state.duration;
      }
      const state = sequence[sequence.length - 1];
      return { ...state, local: state.duration, progress: 1, start: duration - state.duration };
    }

    function drawCover(image) {
      if (!image.complete || !image.naturalWidth) {
        context.fillStyle = "#111332";
        context.fillRect(0, 0, innerWidth, innerHeight);
        return;
      }
      const scale = Math.max(innerWidth / image.naturalWidth, innerHeight / image.naturalHeight) * 1.14;
      const width = image.naturalWidth * scale;
      const height = image.naturalHeight * scale;
      context.drawImage(image, (innerWidth - width) / 2, (innerHeight - height) / 2, width, height);
    }

    function drawSprite(sheet, frame, x, feetY, size, options = {}) {
      if (!sheet.complete || !sheet.naturalWidth) return;
      const columns = options.columns || 4;
      const rows = options.rows || 3;
      const cellWidth = sheet.naturalWidth / columns;
      const cellHeight = sheet.naturalHeight / rows;
      const sourceX = (frame % columns) * cellWidth;
      const sourceY = Math.floor(frame / columns) * cellHeight;
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

    function stairPosition(progress, lane, size) {
      const steps = 8;
      const clamped = clamp(progress);
      const scaled = Math.min(steps - .001, clamped * steps);
      const stepIndex = Math.floor(scaled);
      const local = scaled - stepIndex;
      const startX = innerWidth * (lane === "winner" ? .38 : .57);
      const finishX = innerWidth * (lane === "winner" ? .50 : .60);
      const startY = innerHeight * .92;
      const finishY = innerHeight * .61;
      const stepWidth = (finishX - startX) / steps;
      const stepHeight = (startY - finishY) / steps;
      const horizontal = easeOut(clamp(local / .6));
      const rise = local < .42 ? 0 : ease((local - .42) / .58);
      const lift = Math.sin(Math.PI * local) * Math.min(8, size * .035);
      return {
        x: startX + stepIndex * stepWidth + stepWidth * horizontal,
        y: startY - stepIndex * stepHeight - stepHeight * rise - lift,
        stepIndex,
        local
      };
    }

    function drawFallEffects(x, y, age) {
      const life = clamp(age / 720);
      if (life >= 1) return;
      for (let index = 0; index < 14; index += 1) {
        const angle = -.25 - index * .18;
        const speed = 20 + index % 5 * 9;
        const px = x + Math.cos(angle) * speed * life + (index % 2 ? 1 : -1) * 12 * life;
        const py = y - 8 + Math.sin(angle) * speed * life + 58 * life * life;
        context.globalAlpha = 1 - life;
        context.fillStyle = index % 3 === 0 ? "#ffd84d" : index % 3 === 1 ? "#ff718d" : "#fff1c2";
        context.fillRect(Math.round(px), Math.round(py), index % 4 === 0 ? 7 : 4, index % 4 === 0 ? 7 : 4);
      }
      context.globalAlpha = 1;
    }

    function drawVictoryEffects(x, y, size, age) {
      for (let index = 0; index < 20; index += 1) {
        const angle = index * .82 + age * .0015;
        const radius = 62 + (index % 5) * 22 + Math.sin(age * .004 + index) * 8;
        const px = x + Math.cos(angle) * radius;
        const py = y - size * .62 + Math.sin(angle) * radius * .52;
        context.globalAlpha = .55 + Math.sin(age * .01 + index) * .35;
        context.fillStyle = ["#ffd84d", "#fff5cf", "#48c7ff"][index % 3];
        context.fillRect(Math.round(px), Math.round(py), 4 + index % 2 * 3, 4 + index % 2 * 3);
      }
      context.globalAlpha = 1;
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

    function nameplateAbove(feetY, spriteSize) {
      const safeTop = innerWidth <= 700 ? 92 : 96;
      return Math.max(safeTop, feetY - spriteSize - 30);
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
      const elapsed = (now - startedAt) * playbackRate;
      if (elapsed >= duration) { finish(); return; }
      const state = stateAt(elapsed);
      canvas.dataset.state = state.name;
      const size = Math.min(260, innerWidth * .27, innerHeight * .38);
      const lastSize = size * .93;
      let winnerProgress = 0;
      let loserProgress = 0;
      let winnerFrame = 0;
      let loserFrame = 0;
      let fallPosition = null;
      let winnerGlow = "rgba(72,199,255,.35)";

      if (state.name === "WALK_TOGETHER") {
        winnerProgress = state.progress * .56;
        loserProgress = clamp((state.progress - .04) / .96) * .52;
        winnerFrame = Math.floor(state.local / 105) % 6;
        loserFrame = (Math.floor(state.local / 128) + 1) % 6;
      } else if (["LOSER_STUMBLE", "LOSER_FALL", "WINNER_LOOK_BACK"].includes(state.name)) {
        winnerProgress = .56;
        loserProgress = .52;
        winnerFrame = state.name === "WINNER_LOOK_BACK" ? 6 : Math.floor(elapsed / 115) % 6;
        loserFrame = state.name === "LOSER_STUMBLE" ? (state.progress < .46 ? 6 : 7) : state.name === "LOSER_FALL" ? (state.progress < .34 ? 8 : state.progress < .7 ? 9 : 10) : 10;
      } else if (state.name === "WINNER_CLIMB") {
        winnerProgress = .56 + state.progress * .44;
        loserProgress = .52;
        winnerFrame = Math.floor(state.local / 105) % 6;
        loserFrame = state.local < 420 ? 10 : 11;
      } else if (state.name === "WINNER_ARRIVE") {
        winnerProgress = 1;
        loserProgress = .52;
        winnerFrame = state.progress < .5 ? 7 : 8;
        loserFrame = 11;
      } else if (state.name === "VICTORY") {
        winnerProgress = 1;
        loserProgress = .52;
        winnerFrame = state.progress < .35 ? 9 : 10;
        loserFrame = 11;
        winnerGlow = "#ffd84d";
      } else if (["LOOK_DOWN", "FINAL_WIDE_SHOT"].includes(state.name)) {
        winnerProgress = 1;
        loserProgress = .52;
        winnerFrame = 11;
        loserFrame = 11;
        winnerGlow = "#ffd84d";
      }

      const winnerPos = stairPosition(winnerProgress, "winner", size);
      let loserPos = stairPosition(loserProgress, "loser", lastSize);
      const stumbleOrigin = stairPosition(.52, "loser", lastSize);
      if (state.name === "LOSER_STUMBLE") {
        loserPos = { x: stumbleOrigin.x + Math.sin(state.local * .065) * (2 + state.progress * 5), y: stumbleOrigin.y + state.progress * 3 };
      } else if (state.name === "LOSER_FALL") {
        const move = ease(state.progress);
        const bounce = state.progress > .72 ? Math.sin((state.progress - .72) / .28 * Math.PI) * 10 : 0;
        loserPos = {
          x: mix(stumbleOrigin.x, innerWidth * .69, move),
          y: mix(stumbleOrigin.y, innerHeight * .85, move) - bounce
        };
        fallPosition = loserPos;
      } else if (!["ENTER", "WALK_TOGETHER", "LOSER_STUMBLE"].includes(state.name)) {
        loserPos = { x: innerWidth * .69, y: innerHeight * .85 };
        fallPosition = loserPos;
      }

      let camera = { x: 0, y: 0, zoom: .94, shakeX: 0, shakeY: 0 };
      if (state.name === "ENTER") camera.zoom = mix(.88, .96, ease(state.progress));
      if (state.name === "WALK_TOGETHER") camera = { ...camera, zoom: mix(.96, 1.06, state.progress), y: -innerHeight * .045 * state.progress };
      if (state.name === "LOSER_STUMBLE") camera = { ...camera, x: innerWidth * .035, y: -innerHeight * .025, zoom: 1.07 };
      if (state.name === "LOSER_FALL") {
        const shakeLife = Math.max(0, 1 - Math.abs(state.local - 430) / 180);
        camera = { ...camera, x: innerWidth * .06, y: innerHeight * .015, zoom: 1.045, shakeX: Math.sin(state.local * .13) * 3 * shakeLife, shakeY: Math.cos(state.local * .16) * 2 * shakeLife };
      }
      if (state.name === "WINNER_LOOK_BACK") camera = { ...camera, x: innerWidth * .025, y: -innerHeight * .015, zoom: 1.035 };
      if (state.name === "WINNER_CLIMB") camera = { ...camera, x: mix(innerWidth * .02, 0, state.progress), y: mix(-innerHeight * .02, -innerHeight * .095, state.progress), zoom: mix(1.04, 1.1, state.progress) };
      if (state.name === "WINNER_ARRIVE") camera = { ...camera, y: -innerHeight * .09, zoom: mix(1.1, 1.13, ease(state.progress)) };
      if (state.name === "VICTORY") camera = { ...camera, y: -innerHeight * .085, zoom: mix(1.13, 1.17, ease(state.progress)) };
      if (state.name === "LOOK_DOWN") camera = { ...camera, y: mix(-innerHeight * .085, -innerHeight * .04, state.progress), zoom: mix(1.15, 1.04, state.progress) };
      if (state.name === "FINAL_WIDE_SHOT") camera = { ...camera, y: mix(-innerHeight * .04, 0, state.progress), zoom: mix(1.04, .88, ease(state.progress)) };

      const captions = {
        ENTER: "최종 1위와 최하위의 운명이 결정되었습니다",
        WALK_TOGETHER: "두 참가자가 계단을 한 칸씩 오릅니다",
        LOSER_STUMBLE: `${honorName(last?.name || "")}이 발을 헛디뎠습니다!`,
        LOSER_FALL: `${honorName(last?.name || "")}이 균형을 잃었습니다`,
        WINNER_LOOK_BACK: `${honorName(first?.name || "")}이 잠시 뒤를 돌아봅니다`,
        WINNER_CLIMB: `${honorName(first?.name || "")}은 다시 정상으로 향합니다`,
        WINNER_ARRIVE: "마지막 계단에 도착했습니다",
        VICTORY: `${honorName(first?.name || "")} 최종 1위!`,
        LOOK_DOWN: "우승자가 아래의 참가자를 돌아봅니다",
        FINAL_WIDE_SHOT: "토너먼트의 모든 순위가 결정되었습니다"
      };
      setCaption(captions[state.name]);

      context.save();
      context.translate(innerWidth / 2 + camera.shakeX, innerHeight / 2 + camera.shakeY);
      context.scale(camera.zoom, camera.zoom);
      context.translate(-innerWidth / 2 - camera.x, -innerHeight / 2 - camera.y);
      drawCover(characterAssets.championArena);
      const shade = context.createLinearGradient(0, 0, 0, innerHeight);
      shade.addColorStop(0, "rgba(10,12,42,.12)");
      shade.addColorStop(1, "rgba(8,5,22,.42)");
      context.fillStyle = shade;
      context.fillRect(-innerWidth * .2, -innerHeight * .2, innerWidth * 1.4, innerHeight * 1.4);

      drawSprite(characterAssets.trainerCutscene, winnerFrame, winnerPos.x, winnerPos.y, size, { glow: winnerGlow });
      drawNameplate(first?.name || "", winnerPos.x, nameplateAbove(winnerPos.y, size), "#ffd84d");

      drawSprite(characterAssets.loserCutscene, loserFrame, loserPos.x, loserPos.y, lastSize, { mirror: true, glow: "rgba(255,73,108,.25)" });
      drawNameplate(last?.name || "", loserPos.x, nameplateAbove(loserPos.y, lastSize), "#ff6b87");

      if (state.name === "LOSER_FALL") drawFallEffects(loserPos.x, loserPos.y, state.local);
      if (["VICTORY", "LOOK_DOWN", "FINAL_WIDE_SHOT"].includes(state.name)) drawVictoryEffects(winnerPos.x, winnerPos.y, size, state.local);
      context.restore();

      if (state.name === "LOSER_FALL" && state.local > 390 && state.local < 520) {
        context.fillStyle = `rgba(255,245,207,${.18 * (1 - (state.local - 390) / 130)})`;
        context.fillRect(0, 0, innerWidth, innerHeight);
      }
      stairAnimationFrame = requestAnimationFrame(frame);
    }
    await waitForVisualAssets();
    if (views.finalStair.hidden) return;
    startedAt = performance.now();
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
    resultView.classList.remove("playing", "reveal-now");
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
    views.result.classList.add("reveal-now");
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
  async function startDrawAnimation() {
    showOnly("animation");
    cancelAnimationFrame(animationFrame);
    const canvas = $("#tournamentAnimation");
    const context = canvas.getContext("2d");
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const sequence = [
      { name: "ENTER", duration: 600 },
      { name: "JUGGLE", duration: 2500 },
      { name: "BALL_UNSTABLE", duration: 850 },
      { name: "BALL_DROP", duration: 950 },
      { name: "BALL_IMPACT", duration: 450 },
      { name: "NAME_REVEAL", duration: 1150 },
      { name: "CELEBRATE", duration: 850 },
      { name: "TRANSITION", duration: 900 }
    ];
    const duration = sequence.reduce((sum, state) => sum + state.duration, 0);
    const playbackRate = reducedMotion ? duration / 1100 : 1;
    const ballColors = ["#ff496c", "#48c7ff", "#ffd84d"];
    let startedAt = 0;
    let particles = [];
    let exploded = false;
    let previousTime = 0;

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

    function clamp(value, min = 0, max = 1) { return Math.max(min, Math.min(max, value)); }
    function ease(value) { const t = clamp(value); return t * t * (3 - 2 * t); }
    function mix(from, to, value) { return from + (to - from) * value; }

    function stateAt(elapsed) {
      let cursor = 0;
      for (const state of sequence) {
        if (elapsed < cursor + state.duration) {
          const local = elapsed - cursor;
          return { ...state, local, progress: clamp(local / state.duration), start: cursor };
        }
        cursor += state.duration;
      }
      const state = sequence[sequence.length - 1];
      return { ...state, local: state.duration, progress: 1, start: duration - state.duration };
    }

    function stateDuration(name) {
      return sequence.find((state) => state.name === name)?.duration || 0;
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

    function drawStage(time) {
      context.save();
      const stage = characterAssets.drawStage;
      if (stage.complete && stage.naturalWidth) {
        const scale = Math.max(innerWidth / stage.naturalWidth, innerHeight / stage.naturalHeight) * 1.13;
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

    function clownLayout() {
      const size = Math.min(430, innerWidth * .52, innerHeight * .58);
      return { size, stageY: innerHeight * .79 };
    }

    function drawSheetFrame(sprite, frameIndex, columns, rows, cx, feetY, size, options = {}) {
      if (!sprite.complete || !sprite.naturalWidth) return;
      const cellWidth = sprite.naturalWidth / columns;
      const cellHeight = sprite.naturalHeight / rows;
      const sx = (frameIndex % columns) * cellWidth;
      const sy = Math.floor(frameIndex / columns) * cellHeight;
      context.save();
      context.translate(Math.round(cx), Math.round(feetY + (options.offsetY || 0)));
      if (options.mirror) context.scale(-1, 1);
      context.globalAlpha = options.alpha ?? 1;
      context.shadowColor = options.glow || "rgba(72,199,255,.38)";
      context.shadowBlur = options.glow ? 25 : 10;
      context.drawImage(sprite, sx, sy, cellWidth, cellHeight, -size / 2, -size * .91, size, size);
      context.restore();
    }

    function drawJuggleClown(frameIndex, cx, contactPulse = 0) {
      const { size, stageY } = clownLayout();
      drawSheetFrame(characterAssets.clownJuggle, frameIndex, 4, 2, cx, stageY, size, { offsetY: contactPulse * 2 });
    }

    function drawReactionClown(frameIndex, cx, options = {}) {
      const { size, stageY } = clownLayout();
      drawSheetFrame(characterAssets.clown, frameIndex, 2, 2, cx, stageY, size, options);
    }

    function drawBall(x, y, color, options = {}) {
      const { glow = true, spin = 0, scaleX = 1, scaleY = 1, alpha = 1 } = options;
      const responsiveScale = Math.max(.8, Math.min(1.15, Math.min(innerWidth, innerHeight) / 700));
      context.save();
      if (glow) { context.shadowColor = color; context.shadowBlur = 24; }
      context.globalAlpha = alpha;
      context.translate(Math.round(x), Math.round(y));
      context.rotate(spin);
      context.scale(responsiveScale * scaleX, responsiveScale * scaleY);
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

    function handPoints(cx) {
      const { size, stageY } = clownLayout();
      return {
        left: { x: cx - size * .23, y: stageY - size * .49 },
        right: { x: cx + size * .23, y: stageY - size * .49 },
        arcHeight: Math.min(190, size * .43)
      };
    }

    function cascadePoint(index, time, cx) {
      const hands = handPoints(cx);
      const flightDuration = 860;
      const phase = index / 3;
      const flight = time / flightDuration + phase;
      const throwIndex = Math.floor(flight);
      const progress = flight - throwIndex;
      const leftToRight = throwIndex % 2 === 0;
      const from = leftToRight ? hands.left : hands.right;
      const to = leftToRight ? hands.right : hands.left;
      return {
        x: mix(from.x, to.x, progress),
        y: mix(from.y, to.y, progress) - hands.arcHeight * 4 * progress * (1 - progress),
        progress,
        angle: (throwIndex + progress) * Math.PI * 1.15,
        from,
        to
      };
    }

    function unstablePoint(time, cx) {
      const baseTime = stateDuration("JUGGLE") + time;
      const point = cascadePoint(0, baseTime, cx);
      const progress = clamp(time / stateDuration("BALL_UNSTABLE"));
      point.x += Math.sin(time * .085) * (2 + progress * 9) + progress * 16;
      point.y += Math.cos(time * .07) * (1 + progress * 4) + progress * progress * 15;
      return point;
    }

    function dropRelease(cx) {
      const { size } = clownLayout();
      const point = unstablePoint(stateDuration("BALL_UNSTABLE"), cx);
      point.x = Math.max(point.x, cx + size * .25);
      return point;
    }

    function contactStrength(point) {
      const contact = Math.min(point.progress, 1 - point.progress);
      return contact > .075 ? 0 : 1 - contact / .075;
    }

    function drawCatchSparkle(point) {
      const strength = contactStrength(point);
      if (!strength) return 0;
      for (let index = 0; index < 4; index += 1) {
        const angle = index * Math.PI / 2;
        const radius = 8 + strength * 7;
        context.globalAlpha = strength;
        rect(point.x + Math.cos(angle) * radius - 2, point.y + Math.sin(angle) * radius - 2, 4, 4, index % 2 ? "#fff5cf" : "#ffd84d");
      }
      context.globalAlpha = 1;
      return strength;
    }

    function drawJugglingBalls(state, cx) {
      const floorY = innerHeight * .76 - 12;
      const juggleBase = state.name === "JUGGLE" ? state.local : stateDuration("JUGGLE") + state.local;
      let strongestContact = 0;

      for (let index = 2; index >= 0; index -= 1) {
        let point = cascadePoint(index, juggleBase, cx);
        let scaleX = 1;
        let scaleY = 1;
        let alpha = 1;

        if (index === 0 && state.name === "BALL_UNSTABLE") point = unstablePoint(state.local, cx);
        if (index === 0 && ["BALL_DROP", "BALL_IMPACT"].includes(state.name)) {
          const release = dropRelease(cx);
          if (state.name === "BALL_DROP") {
            const fall = ease(state.progress);
            point = {
              x: release.x + state.progress * 18,
              y: release.y + (floorY - release.y) * state.progress * state.progress,
              angle: release.angle + state.local * .015
            };
            for (let trailIndex = 1; trailIndex <= 3; trailIndex += 1) {
              const past = clamp(state.progress - trailIndex * .06);
              const tx = release.x + past * 18;
              const ty = release.y + (floorY - release.y) * past * past;
              drawBall(tx, ty, ballColors[index], { glow: false, spin: point.angle, alpha: .18 / trailIndex, scaleX: .68, scaleY: .68 });
            }
          } else {
            const bounce = Math.sin(state.progress * Math.PI) * 27 * (1 - state.progress);
            point = { x: release.x + 18 + state.progress * 8, y: floorY - bounce, angle: release.angle + state.local * .018 };
            const squash = Math.max(0, 1 - state.local / 120);
            scaleX = 1 + squash * .38;
            scaleY = 1 - squash * .34;
          }
        } else if (["BALL_DROP", "BALL_IMPACT"].includes(state.name)) {
          point = cascadePoint(index, stateDuration("JUGGLE") + stateDuration("BALL_UNSTABLE") + state.local, cx);
          alpha = state.name === "BALL_IMPACT" ? 1 - state.progress * .75 : 1;
        }

        if (["JUGGLE", "BALL_UNSTABLE"].includes(state.name) || index !== 0) {
          const trailPoint = index === 0 && state.name === "BALL_UNSTABLE" ? unstablePoint(Math.max(0, state.local - 45), cx) : cascadePoint(index, Math.max(0, juggleBase - 45), cx);
          context.globalAlpha = .35 * alpha;
          rect(trailPoint.x - 3, trailPoint.y - 3, 6, 6, ballColors[index]);
          context.globalAlpha = 1;
        }
        drawBall(point.x, point.y, ballColors[index], { spin: point.angle, scaleX, scaleY, alpha });
        if (state.name === "JUGGLE") strongestContact = Math.max(strongestContact, drawCatchSparkle(point));
      }
      return strongestContact;
    }

    function finish() {
      cancelAnimationFrame(animationFrame);
      renderTournament();
    }

    $("#skipAnimation").onclick = finish;

    function frame(now) {
      const elapsed = (now - startedAt) * playbackRate;
      if (elapsed >= duration) { finish(); return; }
      const delta = Math.min(34, Math.max(0, elapsed - previousTime));
      previousTime = elapsed;
      const state = stateAt(elapsed);
      canvas.dataset.state = state.name;
      const cx = innerWidth / 2;

      let camera = { x: 0, y: 0, zoom: .92, shakeX: 0, shakeY: 0 };
      if (state.name === "ENTER") camera.zoom = mix(.9, .98, ease(state.progress));
      if (state.name === "JUGGLE") camera.zoom = mix(.98, 1.08, ease(state.progress));
      if (state.name === "BALL_UNSTABLE") camera = { ...camera, x: innerWidth * .018 * state.progress, y: -innerHeight * .015, zoom: mix(1.08, 1.12, state.progress) };
      if (state.name === "BALL_DROP") camera = { ...camera, x: innerWidth * .025, y: innerHeight * .035 * state.progress, zoom: mix(1.12, 1.08, state.progress) };
      if (state.name === "BALL_IMPACT") {
        const shakeLife = Math.max(0, 1 - state.local / 220);
        camera = { ...camera, x: innerWidth * .02, y: innerHeight * .035, zoom: 1.07, shakeX: Math.sin(state.local * .16) * 3 * shakeLife, shakeY: Math.cos(state.local * .19) * 2 * shakeLife };
      }
      if (state.name === "NAME_REVEAL") camera.zoom = mix(1.07, 1.03, ease(state.progress));
      if (state.name === "CELEBRATE") camera.zoom = mix(1.03, 1.07, Math.sin(state.progress * Math.PI));
      if (state.name === "TRANSITION") camera.zoom = mix(1.03, 1, state.progress);

      context.save();
      context.translate(innerWidth / 2 + camera.shakeX, innerHeight / 2 + camera.shakeY);
      context.scale(camera.zoom, camera.zoom);
      context.translate(-innerWidth / 2 - camera.x, -innerHeight / 2 - camera.y);
      drawStage(elapsed);

      let contactPulse = 0;
      if (state.name === "ENTER") drawReactionClown(0, cx, { alpha: ease(state.progress) });
      if (state.name === "JUGGLE") {
        const spriteFrame = Math.floor(state.local / 105) % 8;
        contactPulse = [0, 1, 2].reduce((strongest, index) => (
          Math.max(strongest, contactStrength(cascadePoint(index, state.local, cx)))
        ), 0);
        drawJuggleClown(spriteFrame, cx, contactPulse);
        drawJugglingBalls(state, cx);
      }
      if (state.name === "BALL_UNSTABLE") {
        drawJuggleClown(state.progress < .48 ? 6 : 7, cx);
        drawJugglingBalls(state, cx);
      }
      if (["BALL_DROP", "BALL_IMPACT"].includes(state.name)) {
        drawReactionClown(2, cx, { offsetY: Math.sin(state.local * .04) * 2 });
        drawJugglingBalls(state, cx);
      }
      if (["NAME_REVEAL", "CELEBRATE"].includes(state.name)) drawReactionClown(3, cx, { glow: "#ffd84d" });

      if (state.name === "BALL_IMPACT" && !exploded) {
        exploded = true;
        const release = dropRelease(cx);
        particles = Array.from({ length: 36 }, (_, index) => ({
          x: release.x + 18, y: innerHeight * .76 - 18,
          vx: Math.cos(index * .9) * (2 + index % 5), vy: -2 - index % 7,
          color: ["#ffd84d", "#ff496c", "#48c7ff"][index % 3]
        }));
      }
      particles.forEach((particle) => {
        const step = delta / 16.67;
        particle.x += particle.vx * step; particle.y += particle.vy * step; particle.vy += .17 * step;
        rect(particle.x, particle.y, 6, 6, particle.color);
      });
      context.restore();

      const captions = {
        ENTER: ["행운을 준비하는 중...", "곧 추첨을 시작합니다", "#fff5cf"],
        JUGGLE: ["대진표 추천 중...", "세 개의 구슬이 손에서 손으로 날아갑니다", "#fff5cf"],
        BALL_UNSTABLE: ["구슬 하나가 궤도를 벗어납니다!", "삐에로가 이상한 움직임을 알아챘습니다", "#ffd84d"],
        BALL_DROP: ["운명의 구슬이 떨어집니다!", "놓친 구슬을 따라 시선이 내려갑니다", "#ffd84d"],
        BALL_IMPACT: ["운명의 구슬이 선택되었습니다!", "PIXEL IMPACT!", "#ffd84d"]
      };
      if (captions[state.name]) {
        const [headline, subline, color] = captions[state.name];
        centerText(headline, Math.max(65, innerHeight * .12), Math.min(29, innerWidth * .055), color);
        centerText(subline, Math.max(100, innerHeight * .18), 12, state.name === "JUGGLE" ? "#7eeeff" : "#fff5cf");
      }

      if (["NAME_REVEAL", "CELEBRATE"].includes(state.name)) {
        const revealed = participantById(tournamentState.drawOrder[0]);
        const { size, stageY } = clownLayout();
        const panelY = clamp(stageY - size * .91 - 142, 58, innerHeight * .19);
        rect(cx - Math.min(300, innerWidth * .43), panelY, Math.min(600, innerWidth * .86), 118, "#101638");
        context.strokeStyle = "#ffd84d"; context.lineWidth = 5; context.strokeRect(cx - Math.min(300, innerWidth * .43), panelY, Math.min(600, innerWidth * .86), 118);
        centerText(honorName(revealed.name), panelY + 48, Math.min(45, innerWidth * .09), "#ffd84d");
        centerText("첫 번째 참가자가 결정되었습니다!", panelY + 91, 13, "#a9edff");
      }

      if (state.name === "TRANSITION") {
        const progress = state.progress;
        context.fillStyle = `rgba(255,245,207,${Math.sin(progress * Math.PI) * .82})`;
        context.fillRect(0, 0, innerWidth, innerHeight);
        const gateWidth = Math.min(620, innerWidth * .86);
        rect(cx - gateWidth / 2, innerHeight * .27, gateWidth, innerHeight * .45, "#172052");
        rect(cx - gateWidth / 2 + 12, innerHeight * .27 + 12, gateWidth - 24, innerHeight * .45 - 24, "#0b102c");
        centerText("TOURNAMENT", innerHeight * .43, Math.min(52, innerWidth * .09), "#ffd84d");
        centerText("대진 추천 완료!", innerHeight * .54, Math.min(24, innerWidth * .05), "#5effe5");
        for (let i = 0; i < 24; i += 1) {
          const size = 8 + (i % 3) * 6;
          rect((i * 97 + state.local * .2) % innerWidth, (i * 53) % innerHeight, size, size, i % 2 ? "#ffd84d" : "#48c7ff");
        }
      }
      animationFrame = requestAnimationFrame(frame);
    }
    drawStage(0);
    centerText("캐릭터 불러오는 중...", Math.max(65, innerHeight * .12), Math.min(24, innerWidth * .05), "#fff5cf");
    await waitForVisualAssets();
    if (views.animation.hidden) return;
    startedAt = performance.now();
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
