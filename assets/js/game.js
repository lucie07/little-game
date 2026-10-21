
document.addEventListener('DOMContentLoaded', () => {

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

    // match slider to current audio volume
    musicVolume.value = Math.round(backgroundMusic.volume * 100);
    musicVolumeValue.textContent = `${musicVolume.value}%`;

    musicVolume.addEventListener('input', () => {

        const volume = Number(musicVolume.value) / 100;

        backgroundMusic.volume = volume;

        // update displayed percentage
        musicVolumeValue.textContent = `${musicVolume.value}%`;

    });

    // screen 1 to screen 2
    startButton.addEventListener('click', () => {

        // start background music
        if (backgroundMusic) {
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