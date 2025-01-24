document.addEventListener('DOMContentLoaded', () => {
    const menuButton = document.getElementById('menuButton');
    const menu = document.getElementById('menu');

    if (menuButton && menu) {
        menuButton.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.toggle('visible');
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.menu-container')) {
                menu.classList.remove('visible');
            }
        });
    }
});