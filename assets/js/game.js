
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

    // audio
    const backgroundMusic = document.querySelector('#background-music');

    // set background music volume
    if (backgroundMusic) {
        backgroundMusic.volume = 0.35;
    }

    // start game
    if (startButton && entryScreen && gameplayScreen) {

        startButton.addEventListener('click', () => {

            // start music
            if (backgroundMusic) {
                backgroundMusic.play().catch(error => {
                    console.warn('Music could not start:', error);
                });
            }

            entryScreen.hidden = true;

            gameplayScreen.hidden = false;

        });

    }

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