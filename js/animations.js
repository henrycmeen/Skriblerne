export function handleDiceAnimation(button, callback) {
    button.classList.add('spinning');
    setTimeout(() => {
        button.classList.remove('spinning');
        callback();
    }, 500);
}