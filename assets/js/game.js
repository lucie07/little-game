
document.addEventListener('DOMContentLoaded', () => {

    // screen 3: constellation puzzle

    const puzzleYarn = document.querySelector('#puzzle-yarn');
    const constellationPoint = document.querySelector('#constellation-point');
    const puzzleStatus = document.querySelector('#puzzle-status');

    if (puzzleYarn && constellationPoint && puzzleStatus) {

        let drag = null;

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