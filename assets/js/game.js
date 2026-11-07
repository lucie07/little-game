
document.addEventListener('DOMContentLoaded', () => {

    // screen 3: three independent yarns and one reusable puzzle engine

    const puzzleLayout = document.querySelector('.puzzle-layout');
    const puzzleBoard = document.querySelector('#puzzle-board');
    const puzzlePlayfield = document.querySelector('#yarn-playfield');
    const puzzleStatus = document.querySelector('#puzzle-status');
    const gameplayPanel = document.querySelector('#gameplay-screen');

    const yarnConfigs = {
        dark:   { personality: 'bouncer',  zone: 'left-top' },
        medium: { personality: 'dasher',   zone: 'right' },
        light:  { personality: 'wanderer', zone: 'left-bottom' }
    };

    const randomRange = (min, max) => min + Math.random() * (max - min);
    const clampValue = (value, min, max) => Math.max(min, Math.min(max, value));
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    if (puzzleLayout && puzzleBoard && puzzlePlayfield && puzzleStatus && gameplayPanel) {
        const yarns = [...puzzlePlayfield.querySelectorAll('.puzzle-yarn[data-yarn]')]
            .map((element) => {
                const id = element.dataset.yarn;
                const config = yarnConfigs[id];
                const target = puzzleBoard.querySelector(`[data-target="${id}"]`);
                if (!config || !target) return null;
                return {
                    id, element, target, config,
                    x: 0, y: 0, vx: 0, vy: 0,
                    bounds: null, matched: false, dragging: false,
                    nextTurn: 0, nextAction: 0, dashPhase: 'paused',
                    nextTarget: 0, targetX: 0, targetY: 0,
                    phase: randomRange(0, Math.PI * 2)
                };
            })
            .filter(Boolean);

        let puzzleStarted = false;
        let puzzleFrameId = null;
        let lastFrameTime = 0;
        let activeDrag = null;
        let matchCount = 0;

        // desktop: dark/light yarns have separate left side areas, medium on right
        // mobile: each yarn has its own horizontal lane below the fabric board
        function movementBounds(state) {
            const field = puzzlePlayfield.getBoundingClientRect();
            const board = puzzleBoard.getBoundingClientRect();
            const sizeX = state.element.offsetWidth;
            const sizeY = state.element.offsetHeight;
            const maxX = Math.max(0, field.width - sizeX);
            const maxY = Math.max(0, field.height - sizeY);

            if (window.matchMedia('(max-width: 820px)').matches) {
                const laneIndex = { dark: 0, medium: 1, light: 2 }[state.id];
                const laneHeight = field.height / 3;
                const minY = Math.min(maxY, laneHeight * laneIndex + 8);
                const laneEnd = Math.min(maxY, laneHeight * (laneIndex + 1) - sizeY - 8);
                return {
                    minX: 0, maxX,
                    minY, maxY: Math.max(minY, laneEnd),
                    mobile: true
                };
            }

            const gap = 14;
            const leftMax = board.left - field.left - sizeX - gap;
            const rightMin = board.right - field.left + gap;
            const boardTop = Math.max(0, board.top - field.top);
            const boardBottom = Math.min(maxY, board.bottom - field.top - sizeY);
            const heightRange = Math.max(0, boardBottom - boardTop);

            // if the available space collapses in an unusual layout, stay onscreen
            if (leftMax < 0 || rightMin > maxX) {
                return { minX: 0, maxX, minY: 0, maxY, mobile: true };
            }

            if (state.config.zone === 'right') {
                return {
                    minX: rightMin, maxX,
                    minY: boardTop, maxY: Math.max(boardTop, boardBottom),
                    mobile: false
                };
            }

            const onTop = state.config.zone === 'left-top';
            const minY = onTop ? boardTop : boardTop + heightRange * 0.57;
            const topY = onTop ? boardTop + heightRange * 0.43 : boardBottom;
            return {
                minX: 0, maxX: Math.max(0, leftMax),
                minY, maxY: Math.max(minY, topY),
                mobile: false
            };
        }

        function paintYarn(state) {
            state.element.style.left = `${state.x}px`;
            state.element.style.top = `${state.y}px`;
        }

        function bounceAtEdges(state) {
            const b = state.bounds;
            if (state.x < b.minX || state.x > b.maxX) {
                state.x = clampValue(state.x, b.minX, b.maxX);
                state.vx *= -1;
            }
            if (state.y < b.minY || state.y > b.maxY) {
                state.y = clampValue(state.y, b.minY, b.maxY);
                state.vy *= -1;
            }
        }

        // movement 1 BOUNCER: perpetual rebounds with occasional changes in direction
        function moveBouncer(state, dt, time) {
            if (time >= state.nextTurn) {
                if (state.bounds.mobile) {
                    state.vx = randomRange(140, 205) * (Math.random() < .5 ? -1 : 1);
                    state.vy = randomRange(-38, 38);
                } else {
                    state.vx = randomRange(55, 110) * (Math.random() < .5 ? -1 : 1);
                    state.vy = randomRange(135, 195) * (Math.random() < .5 ? -1 : 1);
                }
                state.nextTurn = time + randomRange(900, 1750);
            }
            state.x += state.vx * dt;
            state.y += state.vy * dt;
            bounceAtEdges(state);
        }

        // movement 2 DASHER: quick bursts, interrupted by short, unpredictable pauses
        function moveDasher(state, dt, time) {
            if (time >= state.nextAction) {
                if (state.dashPhase === 'paused') {
                    state.dashPhase = 'dashing';
                    const direction = Math.random() < .5 ? -1 : 1;
                    if (state.bounds.mobile) {
                        state.vx = randomRange(220, 320) * direction;
                        state.vy = randomRange(-32, 32);
                    } else {
                        state.vx = randomRange(-90, 90);
                        state.vy = randomRange(210, 295) * direction;
                    }
                    state.nextAction = time + randomRange(350, 760);
                } else {
                    state.dashPhase = 'paused';
                    state.vx = 0;
                    state.vy = 0;
                    state.nextAction = time + randomRange(250, 720);
                }
            }
            state.x += state.vx * dt;
            state.y += state.vy * dt;
            bounceAtEdges(state);
        }

        // movement 3 WANDERER: softly steers towards changing random destinations
        function moveWanderer(state, dt, time) {
            const b = state.bounds;
            if (time >= state.nextTarget) {
                state.targetX = randomRange(b.minX, b.maxX);
                state.targetY = randomRange(b.minY, b.maxY);
                state.nextTarget = time + randomRange(1200, 2800);
            }
            const waveX = Math.sin(time / 630 + state.phase) * 14;
            const waveY = Math.cos(time / 810 + state.phase) * 10;
            const desiredVx = clampValue((state.targetX - state.x) * 1.25 + waveX, -100, 100);
            const desiredVy = clampValue((state.targetY - state.y) * 1.25 + waveY, -75, 75);
            const ease = Math.min(1, dt * 2.3);
            state.vx += (desiredVx - state.vx) * ease;
            state.vy += (desiredVy - state.vy) * ease;
            state.x += state.vx * dt;
            state.y += state.vy * dt;
            bounceAtEdges(state);
        }

        const movementFunctions = {
            bouncer: moveBouncer,
            dasher: moveDasher,
            wanderer: moveWanderer
        };

    }

    const yarn = document.querySelector('.yarn-stage');
    const gameWorld = document.querySelector('#game-world');

    // game screens & background music

    // screens
    const welcomeScreen = document.querySelector('#welcome-screen');
    const yarnScreen = document.querySelector('#game');
    const gameplayScreen = document.querySelector('#gameplay-screen');

    // buttons
    const startButton = document.querySelector('#start-button');
    const playButton = document.querySelector('#play-button');

    // background music web audio API
    const backgroundMusic = document.querySelector('#background-music');

    let audioContext = null;
    let musicGain = null;
    let musicLevel = 0.35;

    // initial volume - fallback for standard HTML audio
    if (backgroundMusic) {
        backgroundMusic.volume = musicLevel;
    }

    function initialiseMusicAudio() {

        if (!backgroundMusic || audioContext) return;

        const AudioContextClass =
            window.AudioContext || window.webkitAudioContext;

        if (!AudioContextClass) return;

        try {
            const context = new AudioContextClass();

            const source = context.createMediaElementSource(backgroundMusic);

            const gain = context.createGain();

            source.connect(gain);
            gain.connect(context.destination);

            gain.gain.value = musicLevel;

            // set web audio to control the volume
            backgroundMusic.volume = 1;

            audioContext = context;
            musicGain = gain;

        } catch (error) {
            console.warn('Web Audio setup failed:', error);
        }
    }

    // music volume
    function setMusicVolume(percent) {

        musicLevel = Math.max(0, Math.min(1, Number(percent) / 100));

        if (musicGain) {

            // Web Audio volume control
            musicGain.gain.value = musicLevel;

        } else if (backgroundMusic) {

            // Fallback for browsers without Web Audio
            backgroundMusic.volume = musicLevel;
            backgroundMusic.muted = musicLevel === 0;

        }
    }

    // settings window

    // elements
    const settingsButton = document.querySelector('#settings-button');
    const settingsDialog = document.querySelector('#settings-dialog');
    const closeSettings = document.querySelector('#close-settings');

    const musicVolume = document.querySelector('#music-volume');
    const musicVolumeValue = document.querySelector('#music-volume-value');

    // open settings
    settingsButton.addEventListener('click', () => {

        settingsDialog.showModal();

    });

    closeSettings.addEventListener('click', () => {

        settingsDialog.close();

    });

    // music volume control

    musicVolume.value = Math.round(musicLevel * 100);
    musicVolumeValue.textContent = `${musicVolume.value}%`;

    // update volume in real time
    musicVolume.addEventListener('input', () => {

        setMusicVolume(musicVolume.value);

        // update displayed percentage
        musicVolumeValue.textContent = `${musicVolume.value}%`;

    });

    // screen 1 to screen 2
    startButton.addEventListener('click', () => {

        // start background music
        if (backgroundMusic) {

            initialiseMusicAudio();

            // activate web audio on mobile
            if (audioContext) {
                audioContext.resume().catch(error => {
                    console.warn('AudioContext could not resume:', error);
                });
            }

            backgroundMusic.play().catch(error => {
                console.warn('Music could not start:', error);
            });

        }

        welcomeScreen.hidden = true;

        yarnScreen.hidden = false;

        playButton.focus({ preventScroll: true });

    });

    // screen 2 to screen 3
    playButton.addEventListener('click', () => {

        yarnScreen.hidden = true;

        gameplayScreen.hidden = false;

        document.querySelector('#gameplay-heading')
            .focus({ preventScroll: true });

    });

    if (!yarn || !gameWorld) return;

    // respect reduced-motion preferences
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
    }

    // current position
    const position = {
        x: 0,
        y: 0,
        rotation: 0
    };

    const velocity = {
        x: 0,
        y: 0,
        rotation: 0
    };

    const target = {
        x: 0,
        y: 0,
        rotation: 0
    };

    // floating behaviour settings
    const settings = {
        spring: 1.8,
        drag: 1.4,
        buoyancy: 5,
        maxRotation: 4,
        horizontalRange: 42,
        verticalRange: 35
    };

    let nextChange = 0;
    let lastTime = 0;

    function random(min, max) {
        return Math.random() * (max - min) + min;
    }

    function chooseNewTarget(time) {

        const maxX = Math.max(0, Math.min(
            settings.horizontalRange,
            (gameWorld.clientWidth - yarn.offsetWidth) / 2 - 12
        ));

        const maxY = Math.max(0, Math.min(
            settings.verticalRange,
            (gameWorld.clientHeight - yarn.offsetHeight) / 2 - 12
        ));

        target.x = random(-maxX, maxX);

        target.y = random(-maxY, maxY * 0.65);

        target.rotation = random(
            -settings.maxRotation,
            settings.maxRotation
        );

        nextChange = time + random(2800, 5400);
    }

    function animate(time) {

        const dt = lastTime
            ? Math.min((time - lastTime) / 1000, 0.05)
            : 0.016;

        lastTime = time;

        if (time >= nextChange) {
            chooseNewTarget(time);
        }

        const ax =
            (target.x - position.x) * settings.spring;

        const ay =
            (target.y - position.y) * settings.spring
            - settings.buoyancy;

        const ar =
            (target.rotation - position.rotation) * 2.2;

        velocity.x += ax * dt;
        velocity.y += ay * dt;
        velocity.rotation += ar * dt;

        const resistance = Math.exp(-settings.drag * dt);

        velocity.x *= resistance;
        velocity.y *= resistance;
        velocity.rotation *= Math.exp(-2 * dt);

        // update position using momentum
        position.x += velocity.x * dt;
        position.y += velocity.y * dt;
        position.rotation += velocity.rotation * dt;

        // apply motion to the yarn
        yarn.style.transform = `
            translate3d(
                ${position.x}px,
                ${position.y}px,
                0
            )
            rotate(${position.rotation}deg)
        `;

        requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);

});