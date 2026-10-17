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

    // floating animation
    function animate(time) {

        const dt = lastTime
            ? Math.min((time - lastTime) / 1000, 0.05)
            : 0.016;

        lastTime = time;

        if (time >= nextChange) {
            chooseNewTarget(time);
        }

        const ease = 1 - Math.exp(-dt / 1.6);

        current.x += (target.x - current.x) * ease;
        current.y += (target.y - current.y) * ease;
        current.rotation +=
            (target.rotation - current.rotation) * ease;

        // apply the movement
        yarn.style.transform = `
            translate3d(
                ${current.x}px,
                ${current.y}px,
                0
            )
            rotate(${current.rotation}deg)
        `;

        requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);

});
