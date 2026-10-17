document.addEventListener('DOMContentLoaded', () => {

    const yarn = document.querySelector('.yarn-stage');

    if (!yarn) return;

    // respect reduced-motion accessibility settings
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
    }

    // current yarn position
    const current = {
        x: 0,
        y: 0,
        rotation: 0
    };

    const target = {
        x: 0,
        y: 0,
        rotation: 0
    };

    let nextChange = 0;
    let lastTime = 0;

    function random(min, max) {
        return Math.random() * (max - min) + min;
    }

    function chooseNewTarget(time) {

        target.x = random(-35, 35);
        target.y = random(-30, 30);
        target.rotation = random(-4, 4);

        nextChange = time + random(2500, 5500);
    }

    requestAnimationFrame(animate);

});
