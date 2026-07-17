(function() {
    // ========== RÉFÉRENCES DOM ==========
    const moderatorInput = document.getElementById('moderatorInput');
    const btnSetModerator = document.getElementById('btnSetModerator');
    const moderatorBadge = document.getElementById('moderatorBadge');
    const moderatorDisplayName = document.getElementById('moderatorDisplayName');

    const participantInput = document.getElementById('participantInput');
    const btnAddParticipant = document.getElementById('btnAddParticipant');
    const participantsList = document.getElementById('participantsList');
    const participantsListContainer = document.getElementById('participantsListContainer');
    const participantCount = document.getElementById('participantCount');

    const wheelWrapper = document.getElementById('wheelWrapper');
    const wheelCanvas = document.getElementById('wheelCanvas');
    const btnSpin = document.getElementById('btnSpin');

    const modalOverlay = document.getElementById('modalOverlay');
    const modalWinnerName = document.getElementById('modalWinnerName');
    const btnCloseModal = document.getElementById('btnCloseModal');
    const confettiContainer = document.getElementById('confettiContainer');

    const ctx = wheelCanvas.getContext('2d');

    // ========== ÉTAT ==========
    let participants = [];
    let moderatorName = '';
    let isSpinning = false;
    let currentRotation = 0;
    let animationId = null;
    let audioCtx = null;
    let lastTickSectionIndex = -1;
    let canvasSize = 440;

    // Couleurs des sections
    const sectionColors = [
        '#7c3aed','#3b82f6','#8b5cf6','#ec4899',
        '#6366f1','#a855f7','#f59e0b','#06b6d4',
        '#e11d48','#10b981','#f97316','#84cc16',
        '#d946ef','#14b8a6','#eab308','#f43f5e',
        '#8b5cf6','#0ea5e9','#d4a853','#fb7185'
    ];

    function getSectionColor(index, total) {
        return sectionColors[index % sectionColors.length];
    }

    // ========== AUDIO ==========
    function getAudioContext() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') audioCtx.resume();
        return audioCtx;
    }

    function playTick() {
        try {
            const ctxAudio = getAudioContext();
            const osc = ctxAudio.createOscillator();
            const gain = ctxAudio.createGain();
            osc.connect(gain); gain.connect(ctxAudio.destination);
            osc.type = 'sine';
            const now = ctxAudio.currentTime;
            osc.frequency.setValueAtTime(800 + Math.random() * 400, now);
            osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            osc.start(now); osc.stop(now + 0.05);
        } catch(e) { /* son indisponible */ }
    }

    function playWinSound() {
        try {
            const ctxAudio = getAudioContext();
            const notes = [523.25, 659.25, 783.99, 1046.5];
            notes.forEach((freq, i) => {
                const osc = ctxAudio.createOscillator();
                const gain = ctxAudio.createGain();
                osc.connect(gain); gain.connect(ctxAudio.destination);
                osc.type = 'triangle';
                const t = ctxAudio.currentTime + i * 0.12;
                osc.frequency.setValueAtTime(freq, t);
                gain.gain.setValueAtTime(0.15, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
                osc.start(t); osc.stop(t + 0.35);
            });
        } catch(e) {}
    }

    // ========== DESSIN DE LA ROUE ==========
    function drawWheel(rotationAngle) {
        const size = canvasSize;
        wheelCanvas.width = size;
        wheelCanvas.height = size;
        const cx = size / 2, cy = size / 2, radius = size / 2 - 8;
        ctx.clearRect(0, 0, size, size);

        const n = participants.length;
        if (n === 0) {
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.fillStyle = '#1a2040';
            ctx.fill();
            ctx.strokeStyle = '#2a3050';
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(cx, cy, radius * 0.25, 0, Math.PI * 2);
            ctx.fillStyle = '#0f1528';
            ctx.fill();
            ctx.strokeStyle = '#3a4060';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.fillStyle = '#8899bb';
            ctx.font = '600 15px "Space Grotesk", "Poppins", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Aucun participant', cx, cy);
            return;
        }

        const sliceAngle = (Math.PI * 2) / n;
        for (let i = 0; i < n; i++) {
            const startAngle = rotationAngle + i * sliceAngle - Math.PI / 2;
            const endAngle = startAngle + sliceAngle;
            const color = getSectionColor(i, n);

            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, radius, startAngle, endAngle);
            ctx.closePath();
            ctx.fillStyle = color;
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.12)';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            const textAngle = startAngle + sliceAngle / 2;
            const textRadius = radius * 0.62;
            const tx = cx + Math.cos(textAngle) * textRadius;
            const ty = cy + Math.sin(textAngle) * textRadius;
            ctx.save();
            ctx.translate(tx, ty);
            ctx.rotate(textAngle + Math.PI / 2);
            ctx.fillStyle = '#ffffff';
            let displayName = participants[i];
            const maxChars = Math.max(3, Math.floor(18 / n) * 2);
            if (displayName.length > maxChars) displayName = displayName.substring(0, maxChars - 1) + '…';
            ctx.font = `600 ${Math.max(10, Math.min(15, 180 / n))}px "Poppins", "Space Grotesk", sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(displayName, 0, 0);
            ctx.restore();
        }

        // Contour extérieur
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Cercle décoratif intérieur
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.82, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        ctx.setLineDash([8, 12]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Moyeu central
        const hubRadius = radius * 0.16;
        const gradient = ctx.createRadialGradient(cx, cy, hubRadius * 0.2, cx, cy, hubRadius);
        gradient.addColorStop(0, '#f0d078');
        gradient.addColorStop(0.5, '#d4a853');
        gradient.addColorStop(1, '#8b6914');
        ctx.beginPath();
        ctx.arc(cx, cy, hubRadius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy, hubRadius * 0.28, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
    }

    // ========== GAGNANT SELON L'ANGLE ==========
    function getWinnerIndex(rotationAngle) {
        const n = participants.length;
        if (n === 0) return -1;
        const sliceAngle = (Math.PI * 2) / n;
        // La flèche est en haut, angle local = -rotationAngle
        let raw = -rotationAngle;
        let norm = ((raw % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        return Math.floor(norm / sliceAngle) % n;
    }

    // ========== MISE À JOUR DE L'INTERFACE ==========
    function updateParticipantsList() {
        participantsList.innerHTML = '';
        if (participants.length === 0) {
            const li = document.createElement('li');
            li.className = 'empty-state';
            li.textContent = 'Aucun participant pour le moment.';
            participantsList.appendChild(li);
        } else {
            participants.forEach((name, index) => {
                const li = document.createElement('li');
                li.className = 'participant-item';
                li.innerHTML = `
                    <span class="participant-item__left">
                        <span class="participant-item__index">#${index + 1}</span>
                        <span class="participant-item__name">${escapeHTML(name)}</span>
                    </span>
                    <button class="btn btn--danger-sm" data-index="${index}">✕</button>
                `;
                participantsList.appendChild(li);
            });
            // Gestionnaires de suppression
            participantsList.querySelectorAll('.btn--danger-sm').forEach(btn => {
                btn.addEventListener('click', function() {
                    removeParticipant(parseInt(this.getAttribute('data-index')));
                });
            });
        }
        participantCount.textContent = `(${participants.length})`;
        updateSpinButton();
        drawWheel(currentRotation);
    }

    function escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function updateModeratorDisplay() {
        if (moderatorName.trim()) {
            moderatorBadge.style.display = 'inline-flex';
            moderatorDisplayName.textContent = moderatorName.trim();
        } else {
            moderatorBadge.style.display = 'none';
        }
    }

    function updateSpinButton() {
        btnSpin.disabled = participants.length === 0 || isSpinning;
        btnSpin.textContent = participants.length === 0
            ? '🎯 Ajoutez des participants'
            : isSpinning ? '⏳ Rotation en cours...' : '🎯 Lancer la roulette';
    }

    // ========== AJOUT / SUPPRESSION ==========
    function addParticipant(name) {
        const trimmed = name.trim();
        if (!trimmed) return;
        if (trimmed.length > 30) {
            alert('Le nom ne doit pas dépasser 30 caractères.');
            return;
        }
        participants.push(trimmed);
        participantInput.value = '';
        participantInput.focus();
        currentRotation = 0;
        updateParticipantsList();
        participantsListContainer.scrollTop = participantsListContainer.scrollHeight;
    }

    function removeParticipant(index) {
        if (isSpinning) return;
        participants.splice(index, 1);
        currentRotation = 0;
        updateParticipantsList();
    }

    function setModerator(name) {
        const trimmed = name.trim();
        if (!trimmed) return;
        if (trimmed.length > 40) {
            alert('Le nom du modérateur ne doit pas dépasser 40 caractères.');
            return;
        }
        moderatorName = trimmed;
        moderatorInput.value = '';
        updateModeratorDisplay();
    }

    // ========== LANCEMENT DE LA ROULETTE ==========
    function spin() {
        if (isSpinning || participants.length === 0) return;

        isSpinning = true;
        updateSpinButton();
        wheelWrapper.classList.add('spinning');
        btnAddParticipant.disabled = true;
        btnSetModerator.disabled = true;
        participantInput.disabled = true;
        moderatorInput.disabled = true;
        participantsList.querySelectorAll('.btn--danger-sm').forEach(b => b.disabled = true);

        const n = participants.length;
        const sliceAngle = (Math.PI * 2) / n;
        const winnerIndex = Math.floor(Math.random() * n);
        // Angle auquel le centre de la section gagnante est sous la flèche
        const winnerCenterLocal = winnerIndex * sliceAngle + sliceAngle / 2;
        let targetOffset = (-winnerCenterLocal) % (Math.PI * 2);
        if (targetOffset < 0) targetOffset += Math.PI * 2;

        const fullTurns = (6 + Math.floor(Math.random() * 7)) * Math.PI * 2;
        const jitter = (Math.random() - 0.5) * sliceAngle * 0.7;
        const targetRotation = currentRotation + fullTurns + targetOffset + jitter;

        const startRotation = currentRotation;
        const duration = 4000 + Math.random() * 2000;
        const startTime = performance.now();
        lastTickSectionIndex = getWinnerIndex(currentRotation);

        function animate(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 4);
            currentRotation = startRotation + (targetRotation - startRotation) * eased;
            drawWheel(currentRotation);

            const currentSection = getWinnerIndex(currentRotation);
            if (currentSection !== lastTickSectionIndex && participants.length > 1) {
                playTick();
                lastTickSectionIndex = currentSection;
            }

            if (progress < 1) {
                animationId = requestAnimationFrame(animate);
            } else {
                currentRotation = targetRotation;
                drawWheel(currentRotation);
                onSpinComplete();
            }
        }

        animationId = requestAnimationFrame(animate);
    }

    function onSpinComplete() {
        isSpinning = false;
        animationId = null;
        wheelWrapper.classList.remove('spinning');
        updateSpinButton();

        btnAddParticipant.disabled = false;
        btnSetModerator.disabled = false;
        participantInput.disabled = false;
        moderatorInput.disabled = false;
        participantsList.querySelectorAll('.btn--danger-sm').forEach(b => b.disabled = false);

        const winnerIndex = getWinnerIndex(currentRotation);
        if (winnerIndex >= 0 && winnerIndex < participants.length) {
            showWinnerModal(participants[winnerIndex]);
        }
    }

    // ========== MODALE & CONFETTIS ==========
    function showWinnerModal(winnerName) {
        modalWinnerName.textContent = winnerName;
        modalOverlay.classList.add('active');
        playWinSound();
        launchConfetti();
    }

    function hideModal() {
        modalOverlay.classList.remove('active');
        clearConfetti();
    }

    let confettiTimeout = null;
    function launchConfetti() {
        clearConfetti();
        const colors = [
            '#f0d078','#d4a853','#ffd700','#ff6b6b','#51cf66',
            '#ff922b','#845ef7','#339af0','#f06595','#20c997',
            '#ffd43b','#ff8787','#748ffc','#69db7c','#e599f7'
        ];
        for (let i = 0; i < 160; i++) {
            const piece = document.createElement('div');
            piece.className = 'confetti-piece';
            piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            piece.style.width = (6 + Math.random() * 12) + 'px';
            piece.style.height = (8 + Math.random() * 20) + 'px';
            piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '3px';
            piece.style.left = '50%';
            piece.style.top = '45%';
            piece.style.setProperty('--duration', (1.8 + Math.random() * 2.5) + 's');
            piece.style.setProperty('--delay', (Math.random() * 0.6) + 's');

            const angle = Math.random() * Math.PI * 2;
            piece.style.setProperty('--drift-x-1', (Math.cos(angle) * (80 + Math.random() * 250)) + 'px');
            piece.style.setProperty('--drift-y-1', (Math.sin(angle) * (80 + Math.random() * 250) - 60 - Math.random() * 200) + 'px');
            piece.style.setProperty('--drift-x-2', (Math.cos(angle + (Math.random() - 0.5) * 1.5) * (150 + Math.random() * 400)) + 'px');
            piece.style.setProperty('--drift-y-2', (Math.sin(angle + (Math.random() - 0.5) * 1.5) * (150 + Math.random() * 400) - 40) + 'px');
            piece.style.setProperty('--final-x', (Math.cos(angle + (Math.random() - 0.5) * 2) * (200 + Math.random() * 600)) + 'px');
            piece.style.setProperty('--final-y', (Math.sin(angle + (Math.random() - 0.5) * 2) * (200 + Math.random() * 600) + 300 + Math.random() * 400) + 'px');
            piece.style.setProperty('--spin-1', (Math.random() * 720 - 360) + 'deg');
            piece.style.setProperty('--spin-2', (Math.random() * 1080 - 540) + 'deg');
            piece.style.setProperty('--spin-final', (Math.random() * 1440 - 720) + 'deg');

            confettiContainer.appendChild(piece);
        }
        confettiTimeout = setTimeout(clearConfetti, 4500);
    }

    function clearConfetti() {
        if (confettiTimeout) { clearTimeout(confettiTimeout); confettiTimeout = null; }
        while (confettiContainer.firstChild) confettiContainer.removeChild(confettiContainer.firstChild);
    }

    // ========== ÉCOUTEURS D'ÉVÉNEMENTS ==========
    btnSetModerator.addEventListener('click', () => setModerator(moderatorInput.value));
    moderatorInput.addEventListener('keydown', e => { if (e.key === 'Enter') setModerator(moderatorInput.value); });

    btnAddParticipant.addEventListener('click', () => addParticipant(participantInput.value));
    participantInput.addEventListener('keydown', e => { if (e.key === 'Enter') addParticipant(participantInput.value); });

    btnSpin.addEventListener('click', spin);

    btnCloseModal.addEventListener('click', hideModal);
    modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) hideModal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && modalOverlay.classList.contains('active')) hideModal(); });

    // Empêcher l'envoi de formulaire
    document.querySelectorAll('input').forEach(input => {
        input.addEventListener('keydown', function(e) { if (e.key === 'Enter') e.preventDefault(); });
    });

    // ========== REDIMENSIONNEMENT ==========
    function updateCanvasSize() {
        const wrapperWidth = wheelWrapper.clientWidth;
        canvasSize = Math.max(Math.min(wrapperWidth - 20, 440), 200);
        if (!isSpinning) drawWheel(currentRotation);
    }
    window.addEventListener('resize', updateCanvasSize);

    // ========== INITIALISATION ==========
    function init() {
        updateCanvasSize();
        updateParticipantsList();
        updateModeratorDisplay();
        updateSpinButton();
        drawWheel(currentRotation);
        participantInput.focus();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    console.log('%c🌙 Midnight S.R %cRoulette fonctionnelle.',
        'font-size:1.4em;font-weight:bold;color:#d4a853;', 'color:#a8b8d4;');
})();