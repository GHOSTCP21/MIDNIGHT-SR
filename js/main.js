(function generateStars() {
    const container = document.getElementById('starfield');
    if (!container) return;
    const count = 80;
    let html = '';
    for (let i = 0; i < count; i++) {
        const size = Math.random() * 2.5 + 0.6;
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        const dur = Math.random() * 4 + 3;
        const delay = Math.random() * 5;
        html += `<span class="star" style="width:${size}px;height:${size}px;left:${x}%;top:${y}%;--dur:${dur}s;--delay:${delay}s;"></span>`;
    }
    container.innerHTML = html;
})();