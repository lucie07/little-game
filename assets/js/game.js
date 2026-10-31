
document.addEventListener('DOMContentLoaded', () => {

    // screen 3: constellation puzzle

    const puzzleYarn = document.querySelector('#puzzle-yarn');
    const constellationPoint = document.querySelector('#constellation-point');
    const puzzleStatus = document.querySelector('#puzzle-status');

    if (puzzleYarn && constellationPoint && puzzleStatus) {

        let drag = null;

    // runaway yarn movement

    const puzzleLayout = document.querySelector('.puzzle-layout');
    const puzzleBoard = document.querySelector('#puzzle-board');
    const gameplayPanel = document.querySelector('#gameplay-screen');

    const escapeSettings = {
        minSpeed: 130,
        maxSpeed: 220,
        minTurnTime: 700,
        maxTurnTime: 1500,
        boardGap: 12
    };

    const yarnMotion = {
        running: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        lastTime: 0,
        nextTurn: 0,
        bounds: null
    };

    function randomRunaway(min, max) {
        return min + Math.random() * (max - min);
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    // set where the yarn can move

    function getMovementBounds() {

        const layout = puzzleLayout.getBoundingClientRect();
        const board = puzzleBoard.getBoundingClientRect();

        const yarnWidth = puzzleYarn.offsetWidth;
        const yarnHeight = puzzleYarn.offsetHeight;

        const maxX = Math.max(0, layout.width - yarnWidth);
        const maxY = Math.max(0, layout.height - yarnHeight);

        const mobile = window.matchMedia('(max-width: 700px)').matches;

        if (mobile) {
            const status = puzzleStatus.getBoundingClientRect();

            const minY = Math.min(
                maxY,
                status.bottom - layout.top + 12
            );

            return {
                minX: 0,
                maxX,
                minY,
                maxY,
                mobile: true
            };
        }

        const leftLimit =
            board.left - layout.left - yarnWidth - escapeSettings.boardGap;

        const rightStart =
            board.right - layout.left + escapeSettings.boardGap;

        const verticalLimit = Math.max(
            0,
            Math.min(maxY, board.bottom - layout.top - yarnHeight)
        );

        if (leftLimit >= 0) {
            return {
                minX: 0,
                maxX: leftLimit,
                minY: 0,
                maxY: verticalLimit,
                mobile: false
            };
        }

        if (rightStart <= maxX) {
            return {
                minX: rightStart,
                maxX,
                minY: 0,
                maxY: verticalLimit,
                mobile: false
            };
        }

        // fallback when not enough space
        return {
            minX: 0,
            maxX,
            minY: Math.min(maxY, board.bottom - layout.top + 12),
            maxY,
            mobile: true
        };
    }

    // set a new unpredictable direction

    function changeYarnDirection(time) {

        const speed = random(
            escapeSettings.minSpeed,
            escapeSettings.maxSpeed
        );

        const direction = Math.random() < 0.5 ? -1 : 1;

        if (yarnMotion.bounds.mobile) {

            yarnMotion.vx = speed * direction;
            yarnMotion.vy = random(-25, 25);

        } else {

            yarnMotion.vx = random(-65, 65);
            yarnMotion.vy = speed * direction;

        }

        yarnMotion.nextTurn = time + random(
            escapeSettings.minTurnTime,
            escapeSettings.maxTurnTime
        );
    }

    // animate while yarn is free

    function animateRunawayYarn(time) {

        if (
            !yarnMotion.running ||
            puzzleYarn.disabled ||
            gameplayPanel.hidden
        ) {
            yarnMotion.running = false;
            return;
        }

        const dt = yarnMotion.lastTime
            ? Math.min((time - yarnMotion.lastTime) / 1000, 0.05)
            : 0.016;

        yarnMotion.lastTime = time;

        if (!drag && !puzzleYarn.matches(':focus-visible')) {

            if (time >= yarnMotion.nextTurn) {
                changeYarnDirection(time);
            }

            const b = yarnMotion.bounds;

            yarnMotion.x += yarnMotion.vx * dt;
            yarnMotion.y += yarnMotion.vy * dt;

            if (yarnMotion.x < b.minX || yarnMotion.x > b.maxX) {
                yarnMotion.x = clamp(yarnMotion.x, b.minX, b.maxX);
                yarnMotion.vx *= -1;
            }

            if (yarnMotion.y < b.minY || yarnMotion.y > b.maxY) {
                yarnMotion.y = clamp(yarnMotion.y, b.minY, b.maxY);
                yarnMotion.vy *= -1;
            }

            puzzleYarn.style.left = `${yarnMotion.x}px`;
            puzzleYarn.style.top = `${yarnMotion.y}px`;
        }

        requestAnimationFrame(animateRunawayYarn);
    }

    // begin animation when gameplay opens

    function startRunawayYarn() {

        if (
            yarnMotion.running ||
            puzzleYarn.disabled ||
            !puzzleLayout ||
            !puzzleBoard ||
            window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ) return;

        const layout = puzzleLayout.getBoundingClientRect();
        const yarn = puzzleYarn.getBoundingClientRect();

        yarnMotion.bounds = getMovementBounds();

        const b = yarnMotion.bounds;

        yarnMotion.x = clamp(yarn.left - layout.left, b.minX, b.maxX);
        yarnMotion.y = clamp(yarn.top - layout.top, b.minY, b.maxY);

        puzzleYarn.style.bottom = 'auto';
        puzzleYarn.style.left = `${yarnMotion.x}px`;
        puzzleYarn.style.top = `${yarnMotion.y}px`;

        yarnMotion.running = true;
        yarnMotion.lastTime = 0;
        yarnMotion.nextTurn = 0;

        requestAnimationFrame(animateRunawayYarn);
    }

    document.querySelector('#play-button')?.addEventListener('click', () => {
        requestAnimationFrame(startRunawayYarn);
    });

    window.addEventListener('resize', () => {

        if (!yarnMotion.running || drag) return;

        yarnMotion.bounds = getMovementBounds();

        const b = yarnMotion.bounds;

        yarnMotion.x = clamp(yarnMotion.x, b.minX, b.maxX);
        yarnMotion.y = clamp(yarnMotion.y, b.minY, b.maxY);

        puzzleYarn.style.left = `${yarnMotion.x}px`;
        puzzleYarn.style.top = `${yarnMotion.y}px`;
    });

        function isNearTarget() {

            const yarnRect = puzzleYarn.getBoundingClientRect();
            const pointRect = constellationPoint.getBoundingClientRect();

            const yarnX = yarnRect.left + yarnRect.width / 2;
            const yarnY = yarnRect.top + yarnRect.height / 2;

            const pointX = pointRect.left + pointRect.width / 2;
            const pointY = pointRect.top + pointRect.height / 2;

            const distance = Math.hypot(
                yarnX - pointX,
                yarnY - pointY
            );

            const tolerance = (yarnRect.width + pointRect.width) * 0.4;

            return distance <= tolerance;
        }


        function matchYarn() {

            if (puzzleYarn.classList.contains('is-matched')) return;

            drag = null;
            puzzleYarn.classList.remove('is-dragging');
            puzzleYarn.style.transform = '';

            yarnMotion.running = false;

            // slear automatic positioning
            puzzleYarn.style.left = '';
            puzzleYarn.style.top = '';
            puzzleYarn.style.bottom = '';

            constellationPoint.appendChild(puzzleYarn);

            // apply matched styles
            puzzleYarn.classList.add('is-matched');

            constellationPoint.classList.remove('is-near');
            constellationPoint.classList.add('is-matched');

            puzzleYarn.disabled = true;

            puzzleStatus.textContent = 'Matched! The yarn has found its star.';
        }

        // return unmatched yarn to starting position
        function resetYarn() {

            puzzleYarn.classList.remove('is-dragging');
            puzzleYarn.style.transform = '';

            constellationPoint.classList.remove('is-near');

            // pick a fresh direction when movement resumes
            yarnMotion.nextTurn = 0;
        }

        puzzleYarn.addEventListener('pointerdown', (event) => {

            if (event.pointerType === 'mouse' && event.button !== 0) return;
            if (puzzleYarn.disabled) return;

            event.preventDefault();

            drag = {
                pointerId: event.pointerId,
                startX: event.clientX,
                startY: event.clientY
            };

            puzzleYarn.classList.add('is-dragging');

            // keep receiving events while dragging
            puzzleYarn.setPointerCapture(event.pointerId);

        });

        puzzleYarn.addEventListener('pointermove', (event) => {

            if (!drag || event.pointerId !== drag.pointerId) return;

            const dx = event.clientX - drag.startX;
            const dy = event.clientY - drag.startY;

            // move yarn with mouse or finger
            puzzleYarn.style.transform =
                `translate3d(${dx}px, ${dy}px, 0)`;

            constellationPoint.classList.toggle(
                'is-near',
                isNearTarget()
            );

        });

        puzzleYarn.addEventListener('pointerup', (event) => {

            if (!drag || event.pointerId !== drag.pointerId) return;

            const matched = isNearTarget();

            if (puzzleYarn.hasPointerCapture(event.pointerId)) {
                puzzleYarn.releasePointerCapture(event.pointerId);
            }

            drag = null;

            if (matched) {

                matchYarn();

            } else {

                resetYarn();

            }

        });

        puzzleYarn.addEventListener('pointercancel', (event) => {

            if (!drag || event.pointerId !== drag.pointerId) return;

            drag = null;
            resetYarn();

        });

        // keyboard alternative to place the single yarn
        puzzleYarn.addEventListener('keydown', (event) => {

            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                matchYarn();
            }

        });

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