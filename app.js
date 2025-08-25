
// Application State
let currentUser = null;
let users = [];
let weighIns = [];
let nextUserId = 1;
let nextWeighInId = 1;
let nextChallengeId = 1;
let challenges = [];
let currentChallengeId = 1; // ID текущего активного челленджа
let challengeSettings = {
    startDate: null,
    endDate: null
};

// Password toggle function
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const button = input.nextElementSibling;
    const icon = button.querySelector('.eye-icon');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.textContent = '🙈';
    } else {
        input.type = 'password';
        icon.textContent = '👁️';
    }
}

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    // Clear any incorrect challenge settings from localStorage first
    localStorage.removeItem('challengeSettings');
    
    initializeData();
    initializeEventListeners();
    checkAuthentication();
    
    // Update challenge status every minute
    setInterval(() => {
        if (currentUser) {
            if (currentUser.isAdmin) {
                updateChallengeStatus();
            } else {
                updateUserChallengeStatus();
            }
        }
    }, 60000); // 60000 ms = 1 minute
    
    // Update countdown every second
    setInterval(() => {
        if (currentUser) {
            let timeLeft;
            let targetDate;
            
            if (currentUser.isAdmin) {
                // For admin: show time until registration ends
                if (challengeSettings.endDate) {
                    targetDate = new Date(challengeSettings.endDate);
                    timeLeft = targetDate - new Date();
                }
            } else {
                // For users: show time until their individual challenge ends
                if (currentUser.challengeApprovedAt && challengeSettings.duration) {
                    const challengeStart = new Date(currentUser.challengeApprovedAt);
                    targetDate = new Date(challengeStart.getTime() + challengeSettings.duration * 24 * 60 * 60 * 1000);
                    timeLeft = targetDate - new Date();
                }
            }
            
            if (timeLeft > 0) {
                const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
                const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
                
                // Debug logging
                if (currentUser && !currentUser.isAdmin) {
                    console.log(`🕐 setInterval update for user ${currentUser.username}:`);
                    console.log(`  - targetDate: ${targetDate.toISOString()}`);
                    console.log(`  - timeLeft: ${timeLeft} ms (${timeLeft / (1000 * 60 * 60 * 24)} days)`);
                    console.log(`  - calculated: ${days}д ${hours}ч ${minutes}м`);
                }
                
                // Update countdown displays
                if (currentUser.isAdmin) {
                    // Update admin time elements
                    const adminTimeElements = document.querySelectorAll('#time-remaining');
                    adminTimeElements.forEach(element => {
                        if (days > 0) {
                            element.textContent = `${days}д ${hours}ч ${minutes}м`;
                        } else if (hours > 0) {
                            element.textContent = `${hours}ч ${minutes}м ${seconds}с`;
                        } else if (minutes > 0) {
                            element.textContent = `${minutes}м ${seconds}с`;
                        } else {
                            element.textContent = `${seconds}с`;
                        }
                    });
                } else {
                    // Update user time elements
                    const userTimeElements = document.querySelectorAll('#user-time-remaining');
                    userTimeElements.forEach(element => {
                        if (days > 0) {
                            element.textContent = `${days}д ${hours}ч ${minutes}м`;
                        } else if (hours > 0) {
                            element.textContent = `${hours}ч ${minutes}м ${seconds}с`;
                        } else if (minutes > 0) {
                            element.textContent = `${minutes}м ${seconds}с`;
                        } else {
                            element.textContent = `${seconds}с`;
                        }
                    });
                }
            }
        }
    }, 1000); // 1000 ms = 1 second
    
    // Check challenge status changes every 5 minutes
    setInterval(() => {
        if (currentUser && !currentUser.isAdmin) {
            const status = getChallengeStatus();
            if (status === 'finished') {
                showChallengeNotification('Челлендж завершен! Результаты подведены.');
            } else if (status === 'active') {
                // Check if challenge ends soon (within 24 hours)
                if (challengeSettings.endDate) {
                    const timeLeft = new Date(challengeSettings.endDate) - new Date();
                    const hoursLeft = timeLeft / (1000 * 60 * 60);
                    
                                    if (hoursLeft <= 24 && hoursLeft > 23) {
                    showChallengeNotification('Внимание! Челлендж завершается через 24 часа. Успейте добавить последние измерения!');
                } else if (hoursLeft <= 1 && hoursLeft > 0) {
                    showChallengeNotification('Последний час челленджа! Финальные измерения!');
                }
                
                // Check if registration closes soon
                const registrationEnd = new Date(challengeSettings.endDate);
                const registrationHoursLeft = (registrationEnd - new Date()) / (1000 * 60 * 60);
                
                if (registrationHoursLeft <= 24 && registrationHoursLeft > 23) {
                    showChallengeNotification('⚠️ Регистрация в челлендж закроется через 24 часа!');
                } else if (registrationHoursLeft <= 1 && registrationHoursLeft > 0) {
                    showChallengeNotification('🚨 Последний час для регистрации в челлендж!');
                }
                }
            }
        }
    }, 300000); // 300000 ms = 5 minutes
});

function showChallengeNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'challenge-notification';
    notification.innerHTML = `
        <div class="notification-content">
            <span>${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 10000);
}

function showRegistrationNotification(username) {
    const message = `🎉 ${username} присоединился к челленджу!`;
    showChallengeNotification(message);
    
    // Also show notification for admin if they're logged in
    if (currentUser && currentUser.isAdmin) {
        setTimeout(() => {
            showChallengeNotification(`👤 Новый участник: ${username}`);
        }, 1000);
    }
    
    // Update admin dashboard if admin is logged in
    if (currentUser && currentUser.isAdmin) {
        updateAdminStats();
        updateParticipantsTable();
    }
}

// Challenge management functions
function showChallengeModal() {
    const modal = document.getElementById('challenge-modal');
    modal.classList.remove('hidden');
    
    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    const twoWeeksLater = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    document.getElementById('challenge-start-input').value = today;
    document.getElementById('challenge-end-input').value = twoWeeksLater;
    document.getElementById('challenge-duration-input').value = 14;
    
    // Add event listeners for automatic duration calculation
    document.getElementById('challenge-start-input').addEventListener('change', calculateDuration);
    document.getElementById('challenge-end-input').addEventListener('change', calculateDuration);
}

function hideChallengeModal() {
    const modal = document.getElementById('challenge-modal');
    modal.classList.add('hidden');
    document.getElementById('challenge-form').reset();
}

function handleCreateChallenge(e) {
    e.preventDefault();
    
    const name = document.getElementById('challenge-name-input').value.trim();
    const description = document.getElementById('challenge-description').value.trim();
    const startDate = document.getElementById('challenge-start-input').value;
    const endDate = document.getElementById('challenge-end-input').value;
    const duration = parseInt(document.getElementById('challenge-duration-input').value);
    
    // Validation
    if (new Date(startDate) >= new Date(endDate)) {
        alert('Дата окончания должна быть позже даты начала');
        return;
    }
    
    if (new Date(startDate) < new Date().toISOString().split('T')[0]) {
        alert('Дата начала не может быть в прошлом');
        return;
    }
    
    // Create new challenge
    const newChallenge = {
        id: nextChallengeId++,
        name: name,
        description: description,
        startDate: startDate,
        endDate: endDate,
        duration: duration,
        status: "pending",
        createdAt: new Date().toISOString().split('T')[0]
    };
    
    challenges.push(newChallenge);
    saveChallenges();
    
    // Update display
    updateChallengesList();
    
    // Hide modal
    hideChallengeModal();
    
    // Show success message
    showChallengeSettingsSuccess(`Челлендж "${name}" создан успешно!`);
}

function updateChallengesList() {
    const challengesList = document.getElementById('challenges-list');
    if (!challengesList) return;
    
    challengesList.innerHTML = '';
    
    if (challenges.length === 0) {
        challengesList.innerHTML = '<p class="empty-state">Нет созданных челленджей</p>';
        return;
    }
    
    challenges.forEach(challenge => {
        const challengeElement = document.createElement('div');
        challengeElement.className = `challenge-item ${challenge.status === 'active' ? 'active' : ''}`;
        
        const startDate = new Date(challenge.startDate).toLocaleDateString('ru-RU');
        const endDate = new Date(challenge.endDate).toLocaleDateString('ru-RU');
        
        challengeElement.innerHTML = `
            <div class="challenge-info">
                <div class="challenge-name">${challenge.name}</div>
                <div class="challenge-dates">Период регистрации: ${startDate} - ${endDate}</div>
                <div class="challenge-duration">Длительность челленджа: ${challenge.duration} дней</div>
                ${challenge.description ? `<div class="challenge-description">${challenge.description}</div>` : ''}
            </div>
            <div class="challenge-actions-item">
                <span class="challenge-status ${challenge.status}">${getChallengeStatusText(challenge.status)}</span>
                <button type="button" class="btn btn--sm btn--secondary" onclick="activateChallenge(${challenge.id})" ${challenge.status === 'active' ? 'disabled' : ''}>
                    ${challenge.status === 'active' ? 'Активен' : 'Активировать'}
                </button>
                <button type="button" class="btn btn--sm btn--outline" onclick="deleteChallenge(${challenge.id})" ${challenge.status === 'active' ? 'disabled' : ''}>
                    Удалить
                </button>
            </div>
        `;
        
        challengesList.appendChild(challengeElement);
    });
}

function getChallengeStatusText(status) {
    switch (status) {
        case 'active': return 'Активен';
        case 'pending': return 'Ожидает';
        case 'finished': return 'Завершен';
        default: return 'Неизвестно';
    }
}

function activateChallenge(challengeId) {
    // Deactivate all other challenges
    challenges.forEach(challenge => {
        challenge.status = 'pending';
    });
    
    // Activate selected challenge
    const challenge = challenges.find(c => c.id === challengeId);
    if (challenge) {
        challenge.status = 'active';
        currentChallengeId = challengeId;
        
        // Update challenge settings
        challengeSettings = {
            startDate: challenge.startDate,
            endDate: challenge.endDate,
            name: challenge.name,
            duration: challenge.duration
        };
        
        saveChallenges();
        saveChallengeSettings();
        
        // Update displays
        updateChallengesList();
        updateChallengeStatus();
        updateUserChallengeStatus();
        
        showChallengeSettingsSuccess(`Челлендж "${challenge.name}" активирован!`);
    }
}

function deleteChallenge(challengeId) {
    if (confirm('Вы уверены, что хотите удалить этот челлендж? Это действие нельзя отменить.')) {
        challenges = challenges.filter(c => c.id !== challengeId);
        saveChallenges();
        updateChallengesList();
        showChallengeSettingsSuccess('Челлендж удален');
    }
}

function calculateDuration() {
    const startDate = document.getElementById('challenge-start-input').value;
    const endDate = document.getElementById('challenge-end-input').value;
    
    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        
        if (duration > 0) {
            document.getElementById('challenge-duration-input').value = duration;
        }
    }
}

function exportChallengeResults() {
    // Get participants who joined during the registration period
    // 25.08.2025 - 15.09.2025 is REGISTRATION period
    // Each participant gets 14 days from their individual join date
    const participants = users.filter(u => {
        if (u.isAdmin) return false;
        
        // Check if user joined during the registration period
        const joinDate = new Date(u.challengeJoinedAt || u.createdAt);
        const challengeStart = new Date(challengeSettings.startDate);
        const challengeEnd = new Date(challengeSettings.endDate);
        
        return joinDate >= challengeStart && joinDate <= challengeEnd;
    });
    
    const participantsData = participants.map(user => {
        const userWeighIns = weighIns.filter(w => w.userId === user.id);
        const hasWeighIns = userWeighIns.length > 0;
        const latestWeighIn = hasWeighIns ? userWeighIns.sort((a, b) => new Date(b.date) - new Date(a.date))[0] : null;
        const currentWeight = latestWeighIn ? latestWeighIn.weight : user.initialWeight;
        const weightChange = user.initialWeight - currentWeight;
        const percentChange = (weightChange / user.initialWeight) * 100;
        const lastUpdate = latestWeighIn ? latestWeighIn.date : user.createdAt;
        
        return {
            'Имя участника': user.username,
            'Начальный вес (кг)': user.initialWeight.toFixed(1),
            'Текущий вес (кг)': currentWeight.toFixed(1),
            'Изменение (кг)': weightChange.toFixed(1),
            'Изменение (%)': percentChange.toFixed(1),
            'Дата регистрации': user.createdAt,
            'Присоединился к челленджу': user.challengeJoinedAt || user.createdAt,
            'Последнее обновление': lastUpdate,
            'Статус': hasWeighIns ? 'Активен' : 'Начальный вес'
        };
    });
    
    // Sort by percent change (descending)
    participantsData.sort((a, b) => parseFloat(b['Изменение (%)']) - parseFloat(a['Изменение (%)']));
    
    // Add challenge info
    const challengeInfo = {
        'Дата экспорта': new Date().toLocaleDateString('ru-RU'),
        'Статус челленджа': getStatusText(getChallengeStatus()),
        'Дата начала': challengeSettings.startDate || 'Не настроено',
        'Дата окончания': challengeSettings.endDate || 'Не настроено',
        'Всего участников': participants.length
    };
    
    // Create CSV content
    let csvContent = 'data:text/csv;charset=utf-8,\uFEFF';
    
    // Add challenge info
    Object.entries(challengeInfo).forEach(([key, value]) => {
        csvContent += `${key},${value}\n`;
    });
    csvContent += '\n';
    
    // Add headers
    const headers = Object.keys(participantsData[0]);
    csvContent += headers.join(',') + '\n';
    
    // Add data
    participantsData.forEach(row => {
        const values = headers.map(header => `"${row[header]}"`);
        csvContent += values.join(',') + '\n';
    });
    
    // Download file
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `результаты_челленджа_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showChallengeSettingsSuccess('Результаты экспортированы в CSV файл');
}

function resetChallenge() {
    if (confirm('Вы уверены, что хотите сбросить текущий челлендж? Это действие нельзя отменить.')) {
        // Get participants who joined during the registration period
        // 25.08.2025 - 15.09.2025 is REGISTRATION period
        // Each participant gets 14 days from their individual join date
        const currentParticipants = users.filter(u => {
            if (u.isAdmin) return false;
            
            const joinDate = new Date(u.challengeJoinedAt || u.createdAt);
            const challengeStart = new Date(challengeSettings.startDate);
            const challengeEnd = new Date(challengeSettings.endDate);
            
            return joinDate >= challengeStart && joinDate <= challengeEnd;
        });
        
        // Clear weigh-ins only for current challenge participants
        const currentParticipantIds = currentParticipants.map(p => p.id);
        weighIns = weighIns.filter(w => !currentParticipantIds.includes(w.userId));
        saveData();
        
        // Update displays
        updateChallengeStatus();
        updateAdminStats();
        updateParticipantsTable();
        
        showChallengeSettingsSuccess(`Челлендж "${challengeSettings.name}" сброшен. Все измерения участников удалены.`);
    }
}

// Initialize with test data
function initializeData() {
    // Load from localStorage or use test data
    const savedUsers = localStorage.getItem('challengeUsers');
    const savedWeighIns = localStorage.getItem('challengeWeighIns');
    const savedChallengeSettings = localStorage.getItem('challengeSettings');
    
    if (savedUsers && savedWeighIns) {
        users = JSON.parse(savedUsers);
        weighIns = JSON.parse(savedWeighIns);
        nextUserId = Math.max(...users.map(u => u.id), 0) + 1;
        nextWeighInId = Math.max(...weighIns.map(w => w.id), 0) + 1;
    } else {
        // Initialize with test data
        users = [
            {
                id: 1,
                username: "admin",
                password: "admin123", // In real app, this would be hashed
                initialWeight: 0,
                createdAt: "2025-08-20",
                isAdmin: true
            },
            {
                id: 2,
                username: "иван_петров",
                password: "password123",
                initialWeight: 85.5,
                createdAt: "2025-08-20",
                isAdmin: false
            },
            {
                id: 3,
                username: "мария_сидорова",
                password: "password123",
                initialWeight: 68.2,
                createdAt: "2025-08-21",
                isAdmin: false
            },
            {
                id: 4,
                username: "александр_козлов",
                password: "password123",
                initialWeight: 92.0,
                createdAt: "2025-08-21",
                isAdmin: false
            }
        ];

        weighIns = [
            { id: 1, userId: 2, weight: 85.5, date: "2025-08-20" },
            { id: 2, userId: 2, weight: 84.8, date: "2025-08-22" },
            { id: 3, userId: 2, weight: 83.9, date: "2025-08-24" },
            { id: 4, userId: 3, weight: 68.2, date: "2025-08-21" },
            { id: 5, userId: 3, weight: 67.5, date: "2025-08-23" },
            { id: 6, userId: 3, weight: 66.8, date: "2025-08-25" },
            { id: 7, userId: 4, weight: 92.0, date: "2025-08-21" },
            { id: 8, userId: 4, weight: 91.2, date: "2025-08-23" },
            { id: 9, userId: 4, weight: 90.5, date: "2025-08-25" }
        ];

        nextUserId = 5;
        nextWeighInId = 10;
        
        saveData();
    }
    
    // Load challenges
    const savedChallenges = localStorage.getItem('challenges');
    if (savedChallenges) {
        challenges = JSON.parse(savedChallenges);
        nextChallengeId = Math.max(...challenges.map(c => c.id), 0) + 1;
    } else {
        // Create default challenge
        // 25.08.2025 - 15.09.2025 is the REGISTRATION period, not challenge duration
        // Each participant gets 14 days from their join date
        const defaultChallenge = {
            id: 1,
            name: "Челлендж №1",
            startDate: "2025-08-25", // Registration start
            endDate: "2025-09-15",   // Registration end
            duration: 14,            // Challenge duration for each participant
            status: "active",
            createdAt: "2025-08-25",
            description: "Корпоративный челлендж по снижению веса. Регистрация: 25.08-15.09.2025. Длительность: 14 дней с момента присоединения."
        };
        challenges = [defaultChallenge];
        nextChallengeId = 2;
        saveChallenges();
    }
    
    // Set current challenge
    const activeChallenge = challenges.find(c => c.status === "active") || challenges[0];
    if (activeChallenge) {
        currentChallengeId = activeChallenge.id;
        challengeSettings = {
            startDate: activeChallenge.startDate,
            endDate: activeChallenge.endDate,
            name: activeChallenge.name,
            duration: activeChallenge.duration
        };
        
        // Save challenge settings to localStorage
        saveChallengeSettings();
    }
    
    // Load challenge settings only if they don't exist
    if (!challengeSettings && savedChallengeSettings) {
        challengeSettings = JSON.parse(savedChallengeSettings);
    }
    
    // Clear old incorrect challenge settings from localStorage
    // This ensures we always use the correct dates from the active challenge
    if (challengeSettings && activeChallenge) {
        if (challengeSettings.startDate !== activeChallenge.startDate || 
            challengeSettings.endDate !== activeChallenge.endDate) {
            // Clear old settings and use new ones
            localStorage.removeItem('challengeSettings');
            challengeSettings = {
                startDate: activeChallenge.startDate,
                endDate: activeChallenge.endDate,
                name: activeChallenge.name,
                duration: activeChallenge.duration
            };
            saveChallengeSettings();
        }
    }
    
    // Force update challenge settings to ensure consistency
    if (activeChallenge) {
        challengeSettings = {
            startDate: activeChallenge.startDate,
            endDate: activeChallenge.endDate,
            name: activeChallenge.name,
            duration: activeChallenge.duration
        };
        saveChallengeSettings();
        
        // Double-check that dates are correct
        console.log('Challenge settings updated:', challengeSettings);
        console.log('Active challenge dates:', activeChallenge.startDate, 'to', activeChallenge.endDate);
    }
    
    // Final verification - ensure dates are exactly what we expect
    if (challengeSettings.startDate === "2025-08-25" && challengeSettings.endDate === "2025-09-15") {
        console.log('✅ Challenge dates are correct');
    } else {
        console.log('❌ Challenge dates are incorrect, forcing correction');
        challengeSettings = {
            startDate: "2025-08-25",
            endDate: "2025-09-15",
            name: "Челлендж №1",
            duration: 14
        };
        saveChallengeSettings();
    }
    
    // Initialize challenge status
    updateChallengeStatus();
    
    // Check if challenge is finished and show notification
    setTimeout(() => {
        const status = getChallengeStatus();
        if (status === 'finished') {
            showChallengeNotification('Челлендж завершен! Результаты подведены.');
        }
    }, 2000);
}

// Save data to localStorage
function saveData() {
    localStorage.setItem('challengeUsers', JSON.stringify(users));
    localStorage.setItem('challengeWeighIns', JSON.stringify(weighIns));
}

// Save challenge settings to localStorage
function saveChallengeSettings() {
    localStorage.setItem('challengeSettings', JSON.stringify(challengeSettings));
}

// Save challenges to localStorage
function saveChallenges() {
    localStorage.setItem('challenges', JSON.stringify(challenges));
}

// Function to fix challenge dates - can be called from browser console
function fixChallengeDates() {
    console.log('🔧 Fixing challenge dates...');
    
    // Clear localStorage
    localStorage.removeItem('challengeSettings');
    
    // Set correct dates
    challengeSettings = {
        startDate: "2025-08-25",
        endDate: "2025-09-15",
        name: "Челлендж №1",
        duration: 14
    };
    
    // Save to localStorage
    saveChallengeSettings();
    
    // Update active challenge
    const activeChallenge = challenges.find(c => c.status === "active") || challenges[0];
    if (activeChallenge) {
        activeChallenge.startDate = "2025-08-25";
        activeChallenge.endDate = "2025-09-15";
        saveChallenges();
    }
    
    // Update displays
    updateChallengeStatus();
    updateChallengeDetails(getRegistrationStatus());
    
    console.log('✅ Challenge dates fixed!');
    console.log('New settings:', challengeSettings);
    
    // Reload page to ensure all changes take effect
    setTimeout(() => {
        if (confirm('Даты исправлены. Перезагрузить страницу для применения изменений?')) {
            location.reload();
        }
    }, 1000);
}

// Function to approve user by username - can be called from browser console
function approveUserByUsername(username) {
    console.log(`🔧 Approving user: ${username}`);
    
    const user = users.find(u => u.username === username);
    if (!user) {
        console.log('❌ User not found');
        return;
    }
    
    console.log('Found user:', user);
    
    // Approve the user
    user.status = 'approved';
    user.challengeApprovedAt = new Date().toISOString().split('T')[0];
    user.challengeJoinedAt = new Date().toISOString().split('T')[0];
    
    // Save data
    saveData();
    
    // Update displays if admin is logged in
    if (currentUser && currentUser.isAdmin) {
        updateAdminStats();
        updateParticipantsTable();
        updatePendingParticipantsTable();
    }
    
    console.log('✅ User approved!');
    console.log('Updated user:', user);
    
    // Show notification
    showChallengeNotification(`Пользователь ${username} утвержден!`);
    
    // Reload page if user is logged in
    if (currentUser && currentUser.username === username) {
        setTimeout(() => {
            if (confirm('Вы утверждены! Перезагрузить страницу для применения изменений?')) {
                location.reload();
            }
        }, 1000);
    }
}

// Function to fix user challenge dates - can be called from browser console
function fixUserChallengeDates(username) {
    console.log(`🔧 Fixing challenge dates for user: ${username}`);
    
    const user = users.find(u => u.username === username);
    if (!user) {
        console.log('❌ User not found');
        return;
    }
    
    console.log('Found user:', user);
    console.log('Current challengeApprovedAt:', user.challengeApprovedAt);
    
    // Set challengeApprovedAt to today if it's not set or if it's in the future
    const today = new Date().toISOString().split('T')[0];
    const currentApprovedAt = user.challengeApprovedAt ? new Date(user.challengeApprovedAt) : null;
    const now = new Date();
    
    if (!currentApprovedAt || currentApprovedAt > now) {
        user.challengeApprovedAt = today;
        user.challengeJoinedAt = today;
        
        console.log(`Fixed dates for ${username}:`);
        console.log(`  - challengeApprovedAt: ${today}`);
        console.log(`  - challengeJoinedAt: ${today}`);
        
        // Save data
        saveData();
        
        // Update displays
        if (currentUser && currentUser.username === username) {
            updateUserChallengeStatus();
        }
        
        console.log('✅ User challenge dates fixed!');
        showChallengeNotification(`Даты челленджа для ${username} исправлены!`);
    } else {
        console.log(`Dates for ${username} are already correct`);
    }
}

// Function to force reset user challenge to start today - can be called from browser console
function forceResetUserChallenge(username) {
    console.log(`🔧 Force resetting challenge for user: ${username}`);
    
    const user = users.find(u => u.username === username);
    if (!user) {
        console.log('❌ User not found');
        return;
    }
    
    console.log('Found user:', user);
    
    // Force set challenge to start today
    const today = new Date().toISOString().split('T')[0];
    user.challengeApprovedAt = today;
    user.challengeJoinedAt = today;
    
    console.log(`Force reset challenge for ${username}:`);
    console.log(`  - challengeApprovedAt: ${today}`);
    console.log(`  - challengeJoinedAt: ${today}`);
    
    // Save data
    saveData();
    
    // Update displays
    if (currentUser && currentUser.username === username) {
        updateUserChallengeStatus();
    }
    
    console.log('✅ User challenge force reset!');
    showChallengeNotification(`Челлендж для ${username} принудительно сброшен на сегодня!`);
    
    // Show new time calculation
    setTimeout(() => {
        const newTimeRemaining = getUserTimeRemaining(user.id);
        console.log(`New time remaining: ${newTimeRemaining}`);
    }, 100);
}

// Function to debug time display issue - can be called from browser console
function debugTimeDisplay() {
    console.log(`🔍 Debugging time display issue...`);
    
    if (!currentUser) {
        console.log('❌ No current user');
        return;
    }
    
    console.log(`Current user: ${currentUser.username}`);
    console.log(`User ID: ${currentUser.id}`);
    console.log(`User status: ${currentUser.status}`);
    console.log(`User challengeApprovedAt: ${currentUser.challengeApprovedAt}`);
    
    // Check what function returns
    const timeFromFunction = getUserTimeRemaining(currentUser.id);
    console.log(`Time from getUserTimeRemaining: ${timeFromFunction}`);
    
    // Check what's displayed in the element
    const timeElement = document.getElementById('user-time-remaining');
    if (timeElement) {
        console.log(`Time element content: "${timeElement.textContent}"`);
        console.log(`Time element ID: ${timeElement.id}`);
    } else {
        console.log('❌ Time element not found');
    }
    
    // Check if there are multiple elements with similar IDs
    const allTimeElements = document.querySelectorAll('[id*="time"]');
    console.log(`All elements with "time" in ID:`, allTimeElements);
    
    // Check challenge settings
    console.log(`Challenge settings:`, challengeSettings);
}

// Function to quickly switch to user account for debugging - can be called from browser console
function switchToUser(username) {
    console.log(`🔄 Switching to user: ${username}`);
    
    const user = users.find(u => u.username === username);
    if (!user) {
        console.log('❌ User not found');
        return;
    }
    
    console.log('Found user:', user);
    
    // Set as current user
    currentUser = user;
    localStorage.setItem('currentUser', JSON.stringify(user));
    
    console.log(`✅ Switched to user: ${username}`);
    console.log(`Current user is now:`, currentUser);
    
    // Update UI to show user dashboard
    showUserDashboard();
    
    // Force update challenge status
    setTimeout(() => {
        updateUserChallengeStatus();
        console.log('✅ User dashboard updated');
    }, 100);
}

// Function to switch back to admin - can be called from browser console
function switchToAdmin() {
    console.log(`🔄 Switching back to admin`);
    
    const adminUser = users.find(u => u.isAdmin);
    if (!adminUser) {
        console.log('❌ Admin user not found');
        return;
    }
    
    // Set as current user
    currentUser = adminUser;
    localStorage.setItem('currentUser', JSON.stringify(adminUser));
    
    console.log(`✅ Switched back to admin`);
    console.log(`Current user is now:`, currentUser);
    
    // Update UI to show admin dashboard
    showAdminDashboard();
    
    console.log('✅ Admin dashboard updated');
}

// Function to create test participants with realistic data - can be called from browser console
function createTestParticipants() {
    console.log(`🧪 Creating test participants...`);
    
    // Clear existing non-admin users
    users = users.filter(u => u.isAdmin);
    
    // Test participants data
    const testParticipants = [
        {
            id: 2,
            username: 'Саша',
            password: 'test123',
            initialWeight: 63.3,
            currentWeight: 61.8,
            status: 'approved',
            challengeApprovedAt: '2025-08-25',
            challengeJoinedAt: '2025-08-25',
            createdAt: '2025-08-20',
            isAdmin: false
        },
        {
            id: 3,
            username: 'Мария',
            password: 'test123',
            initialWeight: 58.5,
            currentWeight: 56.2,
            status: 'approved',
            challengeApprovedAt: '2025-08-26',
            challengeJoinedAt: '2025-08-26',
            createdAt: '2025-08-21',
            isAdmin: false
        },
        {
            id: 4,
            username: 'Дмитрий',
            password: 'test123',
            initialWeight: 82.1,
            currentWeight: 79.5,
            status: 'approved',
            challengeApprovedAt: '2025-08-27',
            challengeJoinedAt: '2025-08-27',
            createdAt: '2025-08-22',
            isAdmin: false
        },
        {
            id: 5,
            username: 'Анна',
            password: 'test123',
            initialWeight: 55.8,
            currentWeight: 54.1,
            status: 'approved',
            challengeApprovedAt: '2025-08-28',
            challengeJoinedAt: '2025-08-28',
            createdAt: '2025-08-23',
            isAdmin: false
        },
        {
            id: 6,
            username: 'Сергей',
            password: 'test123',
            initialWeight: 75.3,
            currentWeight: 72.8,
            status: 'approved',
            challengeApprovedAt: '2025-08-29',
            challengeJoinedAt: '2025-08-29',
            createdAt: '2025-08-24',
            isAdmin: false
        }
    ];
    
    // Add test participants
    users.push(...testParticipants);
    
    // Create realistic weigh-ins for each participant
    weighIns = [];
    
    testParticipants.forEach(participant => {
        const startDate = new Date(participant.challengeApprovedAt);
        const initialWeight = participant.initialWeight;
        const targetWeight = participant.currentWeight;
        const totalDays = 14;
        
        // Create weigh-ins for each day
        for (let day = 0; day <= totalDays; day++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + day);
            
            // Calculate weight for this day (realistic weight loss curve)
            const progress = day / totalDays;
            const weightLoss = (initialWeight - targetWeight) * progress;
            const currentWeight = initialWeight - weightLoss;
            
            // Add some realistic variation
            const variation = (Math.random() - 0.5) * 0.3;
            const finalWeight = Math.max(currentWeight + variation, targetWeight);
            
            weighIns.push({
                id: weighIns.length + 1,
                userId: participant.id,
                weight: Math.round(finalWeight * 10) / 10,
                date: currentDate.toISOString().split('T')[0]
            });
        }
    });
    
    // Save data
    saveData();
    
    console.log(`✅ Created ${testParticipants.length} test participants:`);
    testParticipants.forEach(p => {
        console.log(`  - ${p.username}: ${p.initialWeight} → ${p.currentWeight} кг`);
    });
    
    // Update displays
    if (currentUser && currentUser.isAdmin) {
        updateAdminStats();
        updateParticipantsTable();
        updatePendingParticipantsTable();
        updateAdminWeightChart();
        updateAdminPercentageChart();
    }
    
    showChallengeNotification(`Создано ${testParticipants.length} тестовых участников!`);
    
    return testParticipants;
}

// Function to clear test data - can be called from browser console
function clearTestData() {
    console.log(`🧹 Clearing test data...`);
    
    // Keep only admin users
    users = users.filter(u => u.isAdmin);
    
    // Clear all weigh-ins
    weighIns = [];
    
    // Save data
    saveData();
    
    console.log(`✅ Test data cleared`);
    
    // Force destroy existing charts
    if (window.adminWeightChart) {
        window.adminWeightChart.destroy();
        window.adminWeightChart = null;
    }
    if (window.adminPercentageChart) {
        window.adminPercentageChart.destroy();
        window.adminPercentageChart = null;
    }
    
    // Update displays
    if (currentUser && currentUser.isAdmin) {
        updateAdminStats();
        updateParticipantsTable();
        updatePendingParticipantsTable();
        
        // Force update charts with empty data
        setTimeout(() => {
            updateAdminWeightChart();
            updateAdminPercentageChart();
        }, 100);
    }
    
    showChallengeNotification('Тестовые данные удалены!');
}

// Function to debug approval system - can be called from browser console
function debugApprovalSystem() {
    console.log('🔍 Debugging approval system...');
    console.log('=== CURRENT STATE ===');
    console.log('Current user:', currentUser);
    console.log('All users:', users);
    console.log('Challenge settings:', challengeSettings);
    console.log('Challenges:', challenges);
    
    console.log('\n=== PENDING USERS ===');
    const pendingUsers = users.filter(u => u.status === 'pending');
    console.log('Pending users:', pendingUsers);
    
    console.log('\n=== APPROVED USERS ===');
    const approvedUsers = users.filter(u => u.status === 'approved');
    console.log('Approved users:', approvedUsers);
    
    console.log('\n=== REGISTRATION PERIOD CHECK ===');
    if (challengeSettings.startDate && challengeSettings.endDate) {
        const startDate = new Date(challengeSettings.startDate);
        const endDate = new Date(challengeSettings.endDate);
        console.log('Registration period:', startDate.toISOString(), 'to', endDate.toISOString());
        
        pendingUsers.forEach(u => {
            const joinDate = new Date(u.challengeJoinedAt || u.createdAt);
            const inPeriod = joinDate >= startDate && joinDate <= endDate;
            console.log(`${u.username}: joinDate=${joinDate.toISOString()}, joinDate=${joinDate.toISOString()}, inPeriod=${inPeriod}`);
        });
    }
    
    console.log('\n=== CHALLENGE TIME CALCULATION ===');
    approvedUsers.forEach(u => {
        if (u.challengeApprovedAt) {
            const joinDate = new Date(u.challengeApprovedAt);
            const userEndDate = new Date(joinDate.getTime() + challengeSettings.duration * 24 * 60 * 60 * 1000);
            const now = new Date();
            const timeLeft = userEndDate - now;
            const daysLeft = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
            
            console.log(`${u.username}:`);
            console.log(`  - challengeApprovedAt: ${u.challengeApprovedAt}`);
            console.log(`  - joinDate: ${joinDate.toISOString()}`);
            console.log(`  - userEndDate: ${userEndDate.toISOString()}`);
            console.log(`  - now: ${now.toISOString()}`);
            console.log(`  - timeLeft: ${timeLeft} ms`);
            console.log(`  - daysLeft: ${daysLeft} days`);
        }
    });
    
    console.log('\n=== RECOMMENDATIONS ===');
    if (pendingUsers.length > 0) {
        console.log('To approve pending users, use: approveUserByUsername("username")');
    }
    if (!challengeSettings.startDate || !challengeSettings.endDate) {
        console.log('Challenge dates are not set properly. Use: fixChallengeDates()');
    }
}

// Event listeners
function initializeEventListeners() {
    // Auth form toggles
    const showRegisterBtn = document.getElementById('show-register');
    if (showRegisterBtn) {
        showRegisterBtn.addEventListener('click', showRegisterForm);
    }
    
    const showLoginBtn = document.getElementById('show-login');
    if (showLoginBtn) {
        showLoginBtn.addEventListener('click', showLoginForm);
    }
    
    // Forms
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    const weightForm = document.getElementById('weight-form');
    if (weightForm) {
        weightForm.addEventListener('submit', handleAddWeight);
    }
    
    // Logout buttons
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    const adminLogoutBtn = document.getElementById('admin-logout-btn');
    if (adminLogoutBtn) {
        adminLogoutBtn.addEventListener('click', handleLogout);
    }
    
    // Set default date to today
    const weightDateInput = document.getElementById('weight-date');
    if (weightDateInput) {
        const today = new Date().toISOString().split('T')[0];
        weightDateInput.value = today;
    }
    
    // Admin table sorting
    const sortableHeaders = document.querySelectorAll('.sortable');
    if (sortableHeaders.length > 0) {
        sortableHeaders.forEach(th => {
            th.addEventListener('click', () => sortTable(th.dataset.sort));
        });
    }
    
    // Challenge settings form
    const challengeSettingsForm = document.getElementById('challenge-settings');
    if (challengeSettingsForm) {
        challengeSettingsForm.addEventListener('submit', handleChallengeSettings);
    }
    
    // Challenge action buttons
    const exportResultsBtn = document.getElementById('export-results');
    if (exportResultsBtn) {
        exportResultsBtn.addEventListener('click', exportChallengeResults);
    }
    
    const resetChallengeBtn = document.getElementById('reset-challenge');
    if (resetChallengeBtn) {
        resetChallengeBtn.addEventListener('click', resetChallenge);
    }
    

        
        const createTestDataBtn = document.getElementById('create-test-data');
        if (createTestDataBtn) {
            createTestDataBtn.addEventListener('click', () => createTestParticipants());
        }
        
        const clearTestDataBtn = document.getElementById('clear-test-data');
        if (clearTestDataBtn) {
            clearTestDataBtn.addEventListener('click', () => clearTestData());
        }
    
    // Challenge management
    const createChallengeBtn = document.getElementById('create-challenge');
    if (createChallengeBtn) {
        createChallengeBtn.addEventListener('click', showChallengeModal);
    }
    
    const closeChallengeModalBtn = document.getElementById('close-challenge-modal');
    if (closeChallengeModalBtn) {
        closeChallengeModalBtn.addEventListener('click', hideChallengeModal);
    }
    
    const cancelChallengeBtn = document.getElementById('cancel-challenge');
    if (cancelChallengeBtn) {
        cancelChallengeBtn.addEventListener('click', hideChallengeModal);
    }
    
    const challengeForm = document.getElementById('challenge-form');
    if (challengeForm) {
        challengeForm.addEventListener('submit', handleCreateChallenge);
    }
}

// Authentication functions
function checkAuthentication() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        if (currentUser.isAdmin) {
            showAdminDashboard();
        } else {
            showUserDashboard();
        }
    } else {
        showAuthScreen();
    }
}

function showAuthScreen() {
    hideAllScreens();
    document.getElementById('auth-screen').classList.remove('hidden');
}

function showLoginForm() {
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('register-form').classList.add('hidden');
}

function showRegisterForm() {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('register-form').classList.remove('hidden');
}

function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
        currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        if (user.isAdmin) {
            showAdminDashboard();
        } else {
            showUserDashboard();
            
            // Check challenge status for regular users
            const status = getChallengeStatus();
            if (status === 'finished') {
                setTimeout(() => {
                    showChallengeNotification('Челлендж завершен! Результаты подведены.');
                }, 1000);
            } else if (status === 'not-started') {
                setTimeout(() => {
                    showChallengeNotification('Челлендж еще не начался. Дождитесь старта.');
                }, 1000);
            }
        }
        
        clearAuthErrors();
    } else {
        showAuthError('login', 'Неверное имя пользователя или пароль');
    }
}

function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('register-username').value.trim();
    const password = document.getElementById('register-password').value;
    const initialWeight = parseFloat(document.getElementById('register-weight').value);
    
    // Check if registration is open
    const registrationStatus = getRegistrationStatus();
    if (registrationStatus === 'closed') {
        showAuthError('register', 'Регистрация в челлендж закрыта. Челлендж завершен.');
        return;
    }
    
    if (registrationStatus === 'not-started') {
        showAuthError('register', 'Регистрация в челлендж еще не открыта. Дождитесь старта.');
        return;
    }
    
    // Validation
    if (users.find(u => u.username === username)) {
        showAuthError('register', 'Пользователь с таким именем уже существует');
        return;
    }
    
    if (username.length < 3) {
        showAuthError('register', 'Имя пользователя должно содержать минимум 3 символа');
        return;
    }
    
    if (password.length < 6) {
        showAuthError('register', 'Пароль должен содержать минимум 6 символов');
        return;
    }
    
    // Create new user
    const newUser = {
        id: nextUserId++,
        username: username,
        password: password, // In real app, this would be hashed
        initialWeight: initialWeight,
        createdAt: new Date().toISOString().split('T')[0],
        challengeJoinedAt: null, // Will be set after admin approval
        challengeApprovedAt: null, // When admin approves
        isAdmin: false,
        status: 'pending' // pending, approved, rejected
    };
    
    users.push(newUser);
    
    // Add initial weight measurement
    const initialWeighIn = {
        id: nextWeighInId++,
        userId: newUser.id,
        weight: initialWeight,
        date: newUser.createdAt
    };
    
    weighIns.push(initialWeighIn);
    
    saveData();
    
    // Auto-login new user
    currentUser = newUser;
    localStorage.setItem('currentUser', JSON.stringify(newUser));
    showUserDashboard();
    
    // Check challenge status for new user
    const status = getUserChallengeStatus(newUser.id);
    if (status === 'finished') {
        setTimeout(() => {
            showChallengeNotification('Челлендж завершен! Результаты подведены.');
        }, 1000);
    } else if (status === 'not-started') {
        setTimeout(() => {
            showChallengeNotification('Челлендж еще не начался. Дождитесь старта.');
        }, 1000);
    } else if (status === 'active') {
        setTimeout(() => {
            const daysLeft = Math.ceil((new Date(challengeSettings.endDate) - new Date()) / (1000 * 60 * 60 * 24));
            showChallengeNotification(`Добро пожаловать в активный челлендж! У вас ${daysLeft} дней для достижения цели!`);
        }, 1000);
    }
    
    // Show registration notification for admin
    setTimeout(() => {
        showRegistrationNotification(newUser.username);
    }, 2000);
    
    clearAuthErrors();
}

function handleLogout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    showAuthScreen();
    clearAuthErrors();
    
    // Reset forms
    document.getElementById('loginForm').reset();
    document.getElementById('registerForm').reset();
    document.getElementById('weight-form').reset();
}

function showAuthError(type, message) {
    const errorElement = document.getElementById(`${type}-error`);
    errorElement.textContent = message;
    errorElement.classList.remove('hidden');
}

function clearAuthErrors() {
    document.getElementById('login-error').classList.add('hidden');
    document.getElementById('register-error').classList.add('hidden');
    document.getElementById('weight-error').classList.add('hidden');
}

// Challenge management functions
function handleChallengeSettings(e) {
    e.preventDefault();
    const startDate = document.getElementById('challenge-start').value;
    const endDate = document.getElementById('challenge-end').value;
    
    // Validation
    if (new Date(startDate) >= new Date(endDate)) {
        showChallengeSettingsError('Дата окончания должна быть позже даты начала');
        return;
    }
    
    if (new Date(startDate) < new Date().toISOString().split('T')[0]) {
        showChallengeSettingsError('Дата начала не может быть в прошлом');
        return;
    }
    
    // Update challenge settings
    challengeSettings.startDate = startDate;
    challengeSettings.endDate = endDate;
    saveChallengeSettings();
    
    // Update displays
    updateChallengeStatus();
    updateUserChallengeStatus();
    
    // Show success message
    showChallengeSettingsSuccess('Настройки челленджа обновлены');
    
    // Reset form
    document.getElementById('challenge-settings').reset();
    document.getElementById('challenge-start').value = startDate;
    document.getElementById('challenge-end').value = endDate;
    
    // Check if challenge just started or finished
    const status = getChallengeStatus();
    if (status === 'active') {
        showChallengeSettingsSuccess('Челлендж активирован! Участники могут добавлять измерения.');
    } else if (status === 'finished') {
        showChallengeSettingsSuccess('Челлендж завершен! Определен победитель.');
    }
}

function showChallengeSettingsError(message) {
    const errorElement = document.getElementById('challenge-settings-error');
    errorElement.textContent = message;
    errorElement.classList.remove('hidden');
    document.getElementById('challenge-settings-success').classList.add('hidden');
}

function showChallengeSettingsSuccess(message) {
    const successElement = document.getElementById('challenge-settings-success');
    if (successElement) {
        successElement.textContent = message;
        successElement.classList.remove('hidden');
        const errorElement = document.getElementById('challenge-settings-error');
        if (errorElement) {
            errorElement.classList.add('hidden');
        }
    }
    
    // Show notification for all success messages
    showChallengeNotification(message);
}

function showChallengeSettingsError(message) {
    const errorElement = document.getElementById('challenge-settings-error');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.remove('hidden');
        const successElement = document.getElementById('challenge-settings-success');
        if (successElement) {
            successElement.classList.add('hidden');
        }
    }
    
    // Show error notification
    showChallengeNotification(`❌ ${message}`);
}

function showChallengeSettingsError(message) {
    const errorElement = document.getElementById('challenge-settings-error');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.remove('hidden');
        const successElement = document.getElementById('challenge-settings-success');
        if (successElement) {
            successElement.classList.add('hidden');
        }
    }
    
    // Show error notification
    showChallengeNotification(`❌ ${message}`);
}

function getChallengeStatus() {
    if (!challengeSettings.startDate || !challengeSettings.endDate) {
        return 'not-configured';
    }
    
    const now = new Date();
    const startDate = new Date(challengeSettings.startDate);
    const endDate = new Date(challengeSettings.endDate);
    
    if (now < startDate) {
        return 'not-started';
    } else if (now > endDate) {
        return 'finished';
    } else {
        return 'active';
    }
}

// Get challenge status for specific user (from their join date)
// 25.08.2025 - 15.09.2025 is REGISTRATION period
// Each participant gets 14 days from their individual join date
function getUserChallengeStatus(userId) {
    if (!challengeSettings.duration) {
        return 'not-configured';
    }
    
    const user = users.find(u => u.id === userId);
    if (!user) return 'not-configured';
    
    // Check if user is approved
    if (user.status !== 'approved') {
        return 'pending';
    }
    
    // Check if user has been approved and has a start date
    if (!user.challengeApprovedAt) {
        return 'pending';
    }
    
    const joinDate = new Date(user.challengeApprovedAt);
    const userEndDate = new Date(joinDate.getTime() + challengeSettings.duration * 24 * 60 * 60 * 1000);
    const now = new Date();
    
    if (now < joinDate) {
        return 'not-started';
    } else if (now > userEndDate) {
        return 'finished';
    } else {
        return 'active';
    }
}

function getRegistrationStatus() {
    if (!challengeSettings.startDate || !challengeSettings.endDate) {
        return 'closed';
    }
    
    const now = new Date();
    const startDate = new Date(challengeSettings.startDate);
    const endDate = new Date(challengeSettings.endDate);
    
    if (now < startDate) {
        return 'not-started';
    } else if (now > endDate) {
        return 'closed';
    } else {
        return 'open';
    }
}

// Get time remaining until registration period ends (for admin panel)
function getRegistrationTimeRemaining() {
    if (!challengeSettings.endDate) {
        return 'Не настроено';
    }
    
    const now = new Date();
    const endDate = new Date(challengeSettings.endDate);
    const timeLeft = endDate - now;
    
    if (timeLeft <= 0) {
        return 'Регистрация закрыта';
    }
    
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
        return `${days} дн. ${hours} ч.`;
    } else if (hours > 0) {
        return `${hours} ч.`;
    } else {
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        return `${minutes} мин.`;
    }
}

// Get time remaining until challenge ends (for admin panel - shows time until last participant's challenge ends)
function getTimeRemaining() {
    console.log(`🚀 getTimeRemaining CALLED (admin function)`);
    console.log(`  - challengeSettings:`, challengeSettings);
    
    if (!challengeSettings.duration) {
        console.log(`  - No duration set, returning 'Не настроено'`);
        return 'Не настроено';
    }
    
    // Find the latest approved participant to calculate when the last challenge will end
    const approvedParticipants = users.filter(u => 
        !u.isAdmin && 
        u.status === 'approved' && 
        u.challengeApprovedAt
    );
    
    console.log(`  - Found ${approvedParticipants.length} approved participants`);
    
    if (approvedParticipants.length === 0) {
        console.log(`  - No approved participants, returning 'Нет утвержденных участников'`);
        return 'Нет утвержденных участников';
    }
    
    // Find the participant whose challenge ends last
    let latestEndDate = null;
    approvedParticipants.forEach(p => {
        const userEndDate = new Date(p.challengeApprovedAt);
        userEndDate.setDate(userEndDate.getDate() + challengeSettings.duration);
        
        console.log(`  - ${p.username}: challengeApprovedAt=${p.challengeApprovedAt}, userEndDate=${userEndDate.toISOString()}`);
        
        if (!latestEndDate || userEndDate > latestEndDate) {
            latestEndDate = userEndDate;
            console.log(`  - New latest end date: ${latestEndDate.toISOString()}`);
        }
    });
    
    const now = new Date();
    const timeLeft = latestEndDate - now;
    
    console.log(`  - Latest end date: ${latestEndDate.toISOString()}`);
    console.log(`  - Now: ${now.toISOString()}`);
    console.log(`  - Time left: ${timeLeft} ms (${timeLeft / (1000 * 60 * 60 * 24)} days)`);
    
    if (timeLeft <= 0) {
        console.log(`  - All challenges finished, returning 'Все челленджи завершены'`);
        return 'Все челленджи завершены';
    }
    
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    console.log(`  - Calculated: ${days} days, ${hours} hours`);
    console.log(`  - Final return value: "${days} дн. ${hours} ч."`);
    
    if (days > 0) {
        return `${days} дн. ${hours} ч.`;
    } else if (hours > 0) {
        return `${hours} ч.`;
    } else {
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        return `${minutes} мин.`;
    }
}

// Get time remaining for specific user (from their join date)
// 25.08.2025 - 15.09.2025 is REGISTRATION period
// Each participant gets 14 days from their individual join date
function getUserTimeRemaining(userId) {
    console.log(`🚀 getUserTimeRemaining CALLED with userId: ${userId}`);
    console.log(`  - challengeSettings:`, challengeSettings);
    console.log(`  - challengeSettings.duration: ${challengeSettings.duration}`);
    
    if (!challengeSettings.duration) {
        console.log(`  - No duration set, returning 'Не настроено'`);
        return 'Не настроено';
    }
    
    const user = users.find(u => u.id === userId);
    if (!user) {
        console.log(`  - User not found, returning 'Пользователь не найден'`);
        return 'Пользователь не найден';
    }
    
    console.log(`  - Found user:`, user);
    
    // Check if user is approved
    if (user.status !== 'approved' || !user.challengeApprovedAt) {
        console.log(`  - User not approved or no challengeApprovedAt, returning 'Ожидает утверждения'`);
        return 'Ожидает утверждения';
    }
    
    const joinDate = new Date(user.challengeApprovedAt);
    const userEndDate = new Date(joinDate.getTime() + challengeSettings.duration * 24 * 60 * 60 * 1000);
    const now = new Date();
    const timeLeft = userEndDate - now;
    
    // Debug logging
    console.log(`🔍 getUserTimeRemaining for user ${user.username}:`);
    console.log(`  - challengeSettings.duration: ${challengeSettings.duration} days`);
    console.log(`  - user.challengeApprovedAt: ${user.challengeApprovedAt}`);
    console.log(`  - joinDate: ${joinDate.toISOString()}`);
    console.log(`  - userEndDate: ${userEndDate.toISOString()}`);
    console.log(`  - now: ${now.toISOString()}`);
    console.log(`  - timeLeft: ${timeLeft} ms (${timeLeft / (1000 * 60 * 60 * 24)} days)`);
    
    // Additional debugging
    console.log(`  - joinDate timestamp: ${joinDate.getTime()}`);
    console.log(`  - duration in ms: ${challengeSettings.duration * 24 * 60 * 60 * 1000}`);
    console.log(`  - userEndDate timestamp: ${userEndDate.getTime()}`);
    console.log(`  - now timestamp: ${now.getTime()}`);
    console.log(`  - Raw calculation: ${userEndDate.getTime()} - ${now.getTime()} = ${timeLeft}`);
    
    if (timeLeft <= 0) {
        console.log(`  - Challenge finished, returning 'Завершен'`);
        return 'Завершен';
    }
    
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    console.log(`  - Calculated: ${days} days, ${hours} hours`);
    console.log(`  - Final return value: "${days} дн. ${hours} ч."`);
    
    if (days > 0) {
        return `${days} дн. ${hours} ч.`;
    } else if (hours > 0) {
        return `${hours} ч.`;
    } else {
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        return `${minutes} мин.`;
    }
}

function getChallengeProgress() {
    if (!challengeSettings.startDate || !challengeSettings.endDate) {
        return 'Не настроено';
    }
    
    const now = new Date();
    const startDate = new Date(challengeSettings.startDate);
    const endDate = new Date(challengeSettings.endDate);
    
    if (now < startDate) {
        return '0%';
    } else if (now > endDate) {
        return '100%';
    } else {
        const totalDuration = endDate - startDate;
        const elapsed = now - startDate;
        const progress = Math.round((elapsed / totalDuration) * 100);
        return `${progress}%`;
    }
}

function getChallengeProgressBar() {
    const progress = getChallengeProgress();
    if (progress === 'Не настроено') return '';
    
    const percent = parseInt(progress);
    const filledWidth = Math.min(percent, 100);
    
    return `
        <div class="progress-bar">
            <div class="progress-fill" style="width: ${filledWidth}%"></div>
            <span class="progress-text">${progress}</span>
        </div>
    `;
}

function updateChallengeStatus() {
    const status = getChallengeStatus();
    const timeRemaining = getTimeRemaining();
    const registrationTimeRemaining = getRegistrationTimeRemaining();
    const progress = getChallengeProgress();
    const registrationStatus = getRegistrationStatus();
    
    const statusElement = document.getElementById('challenge-status');
    const timeElement = document.getElementById('time-remaining');
    const registrationTimeElement = document.getElementById('registration-time-remaining');
    const progressElement = document.getElementById('challenge-progress');
    
    // Update status with color coding
    statusElement.textContent = getStatusText(status);
    statusElement.className = `status-value challenge-${status}`;
    
    timeElement.textContent = timeRemaining;
    if (registrationTimeElement) {
        registrationTimeElement.textContent = registrationTimeRemaining;
    }
    progressElement.innerHTML = progress;
    
    // Add progress bar if challenge is active
    if (progress !== 'Не настроено' && progress !== '0%' && progress !== '100%') {
        progressElement.innerHTML = progress + getChallengeProgressBar();
    }
    
    // Update challenge details
    updateChallengeDetails(registrationStatus);
    
    // Update header badge
    const badgeElement = document.getElementById('admin-challenge-status-badge');
    if (badgeElement) {
        badgeElement.textContent = getStatusText(status);
        badgeElement.className = `challenge-status-badge challenge-${status}`;
    }
}

function updateChallengeDetails(registrationStatus) {
    // Log the dates being used for debugging
    console.log('updateChallengeDetails called with dates:', challengeSettings.startDate, 'to', challengeSettings.endDate);
    
    // Update challenge name
    const nameElement = document.getElementById('challenge-name');
    if (nameElement) {
        nameElement.textContent = challengeSettings.name || 'Челлендж №1';
    }
    
    // Update challenge period
    const periodElement = document.getElementById('challenge-period');
    if (periodElement) {
        const startDate = new Date(challengeSettings.startDate).toLocaleDateString('ru-RU');
        const endDate = new Date(challengeSettings.endDate).toLocaleDateString('ru-RU');
        periodElement.textContent = `${startDate} - ${endDate}`;
        console.log('Updated period element with:', `${startDate} - ${endDate}`);
    }
    
    // Update challenge duration
    const durationElement = document.getElementById('challenge-duration');
    if (durationElement) {
        durationElement.textContent = `${challengeSettings.duration || 14} дней`;
    }
    
    // Update registration status
    const registrationElement = document.getElementById('registration-status');
    if (registrationElement) {
        const statusText = getRegistrationStatusText(registrationStatus);
        const statusClass = getRegistrationStatusClass(registrationStatus);
        registrationElement.textContent = statusText;
        registrationElement.className = `detail-value ${statusClass}`;
    }
}

function getStatusText(status) {
    switch (status) {
        case 'active': return 'Активен';
        case 'finished': return 'Завершен';
        case 'not-started': return 'Не начался';
        case 'not-configured': return 'Не настроен';
        default: return 'Неизвестно';
    }
}

function getRegistrationStatusText(status) {
    switch (status) {
        case 'open': return 'Открыта';
        case 'closed': return 'Закрыта';
        case 'not-started': return 'Не началась';
        default: return 'Неизвестно';
    }
}

function getRegistrationStatusClass(status) {
    switch (status) {
        case 'open': return 'status-open';
        case 'closed': return 'status-closed';
        case 'not-started': return 'status-not-started';
        default: return '';
    }
}

function updateUserChallengeStatus() {
    if (!currentUser || currentUser.isAdmin) return;
    
    console.log(`🔍 updateUserChallengeStatus for user: ${currentUser.username}`);
    
    const status = getUserChallengeStatus(currentUser.id); // Use user-specific status
    const timeRemaining = getUserTimeRemaining(currentUser.id); // Use user-specific time
    const position = getUserPosition();
    const daysInChallenge = getDaysInChallenge();
    
    console.log(`  - Status: ${status}`);
    console.log(`  - Time remaining: ${timeRemaining}`);
    console.log(`  - Position: ${position}`);
    console.log(`  - Days in challenge: ${daysInChallenge}`);
    
    const statusElement = document.getElementById('user-challenge-status');
    const timeElement = document.getElementById('user-time-remaining');
    const positionElement = document.getElementById('user-position');
    const daysElement = document.getElementById('user-days-in-challenge');
    
    if (statusElement) statusElement.textContent = getStatusText(status);
    if (statusElement) statusElement.className = `status-value challenge-${status}`;
    
    if (timeElement) {
        console.log(`  - Updating time element with: ${timeRemaining}`);
        timeElement.textContent = timeRemaining;
        console.log(`  - Element content after update: "${timeElement.textContent}"`);
        console.log(`  - Element ID: ${timeElement.id}`);
        console.log(`  - Element exists: ${!!timeElement}`);
    } else {
        console.log(`  - ❌ Time element not found!`);
        // Check if there are similar elements
        const similarElements = document.querySelectorAll('[id*="time"]');
        console.log(`  - Similar elements found:`, similarElements);
    }
    if (positionElement) positionElement.textContent = position;
    if (daysElement) daysElement.textContent = `${daysInChallenge} дн.`;
    
    // Update header badge
    const badgeElement = document.getElementById('user-challenge-status-badge');
    if (badgeElement) {
        badgeElement.textContent = getStatusText(status);
        badgeElement.className = `challenge-status-badge challenge-${status}`;
    }
    
    // Disable weight form if challenge is not active
    const weightForm = document.getElementById('weight-form');
    const submitButton = weightForm.querySelector('button[type="submit"]');
    const inputs = weightForm.querySelectorAll('input');
    
    if (status === 'finished' || status === 'not-started') {
        submitButton.disabled = true;
        submitButton.textContent = status === 'finished' ? 'Челлендж завершен' : 'Челлендж не начался';
        inputs.forEach(input => input.disabled = true);
    } else {
        submitButton.disabled = false;
        submitButton.textContent = 'Добавить измерение';
        inputs.forEach(input => input.disabled = false);
    }
}

// Calculate days since user joined the challenge
// 25.08.2025 - 15.09.2025 is REGISTRATION period
// Each participant gets 14 days from their individual join date
function getDaysInChallenge() {
    if (!currentUser || currentUser.isAdmin) return 0;
    
    // Check if user is approved
    if (currentUser.status !== 'approved' || !currentUser.challengeApprovedAt) {
        return 0;
    }
    
    const joinDate = new Date(currentUser.challengeApprovedAt);
    const now = new Date();
    const daysDiff = Math.ceil((now - joinDate) / (1000 * 60 * 60 * 1000));
    
    return Math.max(0, daysDiff);
}

// Calculate user position among participants who joined during registration period
// 25.08.2025 - 15.09.2025 is REGISTRATION period
// Each participant gets 14 days from their individual join date
function getUserPosition() {
    if (!currentUser || currentUser.isAdmin) return '--';
    
    console.log('🔍 Debugging getUserPosition for user:', currentUser.username);
    console.log('User status:', currentUser.status);
    console.log('User challengeApprovedAt:', currentUser.challengeApprovedAt);
    console.log('Challenge settings:', challengeSettings);
    
    // Check if user is approved
    if (currentUser.status !== 'approved' || !currentUser.challengeApprovedAt) {
        console.log('User not approved, returning "Ожидает утверждения"');
        return 'Ожидает утверждения';
    }
    
    // Get approved participants who joined during the registration period
    const participants = users.filter(u => {
        if (u.isAdmin || u.status !== 'approved') return false;
        
        // Check if user joined during the registration period
        const joinDate = new Date(u.challengeJoinedAt || u.createdAt);
        const challengeStart = new Date(challengeSettings.startDate);
        const challengeEnd = new Date(challengeSettings.endDate);
        
        return joinDate >= challengeStart && joinDate <= challengeEnd;
    });
    
    if (participants.length === 0) return '--';
    
    const participantsData = participants.map(user => {
        const userWeighIns = weighIns.filter(w => w.userId === user.id);
        if (userWeighIns.length === 0) return { ...user, percentChange: 0 };
        
        const latestWeight = userWeighIns.sort((a, b) => new Date(b.date) - new Date(a.date))[0].weight;
        const percentChange = ((user.initialWeight - latestWeight) / user.initialWeight) * 100;
        return { ...user, percentChange };
    });
    
    // Sort by percent change (descending)
    participantsData.sort((a, b) => b.percentChange - a.percentChange);
    
    // Find current user position
    const position = participantsData.findIndex(p => p.id === currentUser.id) + 1;
    const total = participantsData.length;
    
    if (position === 0) return '--';
    return `${position} из ${total}`;
}

// Dashboard functions
function hideAllScreens() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('user-screen').classList.add('hidden');
    document.getElementById('admin-screen').classList.add('hidden');
}

function showUserDashboard() {
    hideAllScreens();
    document.getElementById('user-screen').classList.remove('hidden');
    document.getElementById('current-user').textContent = `Добро пожаловать, ${currentUser.username}!`;
    
    updateUserStats();
    updateUserCharts();
    updateWeightHistory();
    updateUserChallengeStatus();
}

function showAdminDashboard() {
    hideAllScreens();
    document.getElementById('admin-screen').classList.remove('hidden');
    document.getElementById('admin-user').textContent = `Администратор: ${currentUser.username}`;
    
    updateAdminStats();
    updateParticipantsTable();
    updateOverallChart();
    updateChallengeStatus();
    updateChallengesList();
}

// User dashboard functions
function updateUserStats() {
    const userWeighIns = weighIns.filter(w => w.userId === currentUser.id).sort((a, b) => new Date(a.date) - new Date(b.date));
    const initialWeight = currentUser.initialWeight;
    const currentWeight = userWeighIns.length > 0 ? userWeighIns[userWeighIns.length - 1].weight : initialWeight;
    
    const weightChange = initialWeight - currentWeight;
    const percentChange = initialWeight > 0 ? (weightChange / initialWeight) * 100 : 0;
    
    document.getElementById('initial-weight-display').textContent = `${initialWeight.toFixed(1)} кг`;
    document.getElementById('current-weight-display').textContent = `${currentWeight.toFixed(1)} кг`;
    document.getElementById('weight-change-kg').textContent = `${weightChange >= 0 ? '-' : '+'}${Math.abs(weightChange).toFixed(1)} кг`;
    document.getElementById('weight-change-percent').textContent = `${percentChange >= 0 ? '-' : '+'}${Math.abs(percentChange).toFixed(1)}%`;
    
    // Color coding
    const changeKgElement = document.getElementById('weight-change-kg');
    const changePercentElement = document.getElementById('weight-change-percent');
    
    if (weightChange > 0) {
        changeKgElement.style.color = 'var(--color-success)';
        changePercentElement.style.color = 'var(--color-success)';
    } else if (weightChange < 0) {
        changeKgElement.style.color = 'var(--color-error)';
        changePercentElement.style.color = 'var(--color-error)';
    } else {
        changeKgElement.style.color = 'var(--color-text-secondary)';
        changePercentElement.style.color = 'var(--color-text-secondary)';
    }
}

function updateUserCharts() {
    // Проверяем, что необходимые элементы и данные существуют
    if (!currentUser || !weighIns) return;
    
    const weightChartElement = document.getElementById('weight-chart');
    const allParticipantsChartElement = document.getElementById('all-participants-chart');
    
    if (!weightChartElement || !allParticipantsChartElement) return;
    
    const userWeighIns = weighIns.filter(w => w.userId === currentUser.id).sort((a, b) => new Date(a.date) - new Date(b.date));
    
    if (userWeighIns.length === 0) return;
    
    // Calculate challenge days for user (1-14)
    const joinDate = new Date(currentUser.challengeJoinedAt || currentUser.createdAt);
    const challengeDays = userWeighIns.map(w => {
        const weighInDate = new Date(w.date);
        const dayDiff = Math.ceil((weighInDate - joinDate) / (1000 * 60 * 60 * 24));
        return Math.max(1, dayDiff);
    });
    
    const weights = userWeighIns.map(w => w.weight);
    
    // Weight chart (only user's data)
    if (!(weightChartElement instanceof HTMLCanvasElement)) return;
    
    const weightCtx = weightChartElement.getContext('2d');
    if (window.weightChart) window.weightChart.destroy();
    
    window.weightChart = new Chart(weightCtx, {
        type: 'line',
        data: {
            labels: challengeDays.map(day => `День ${day}`),
            datasets: [{
                label: 'Вес (кг)',
                data: weights,
                backgroundColor: '#1FB8CD',
                borderColor: '#1FB8CD',
                borderWidth: 2,
                fill: false,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'День челленджа'
                        },
                    min: 1,
                    max: 14,
                    ticks: {
                        stepSize: 1
                    }
                },
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: 'Вес (кг)'
                    }
                }
            }
        }
    });
    
    // Update all participants comparison chart (percentage change)
    updateAllParticipantsChart();
}

// Create chart showing all participants (including current user) with anonymous labels
function updateAllParticipantsChart() {
    // Проверяем, что необходимые данные существуют
    if (!currentUser || !users || !weighIns || !challengeSettings) return;
    
    // Get all participants who joined during the registration period (including current user)
    // 25.08.2025 - 15.09.2025 is REGISTRATION period
    // Each participant gets 14 days from their individual join date
    const participants = users.filter(u => {
        if (u.isAdmin) return false;
        
        const joinDate = new Date(u.challengeJoinedAt || u.createdAt);
        const challengeStart = new Date(challengeSettings.startDate);
        const challengeEnd = new Date(challengeSettings.endDate);
        
        return joinDate >= challengeStart && joinDate <= challengeEnd;
    });
    
    if (participants.length === 0) return;
    
    // Create datasets for each participant (anonymous)
    const datasets = [];
    
    participants.forEach((participant, index) => {
        const userWeighIns = weighIns.filter(w => w.userId === participant.id).sort((a, b) => new Date(a.date) - new Date(b.date));
        
        if (userWeighIns.length === 0) return;
        
        // Calculate challenge days for this participant (1-14)
        const joinDate = new Date(participant.challengeJoinedAt || participant.createdAt);
        const challengeDays = userWeighIns.map(w => {
            const weighInDate = new Date(w.date);
            const dayDiff = Math.ceil((weighInDate - joinDate) / (1000 * 60 * 60 * 24));
            return Math.max(1, dayDiff);
        });
        
        // Calculate percentage changes
        const percentages = userWeighIns.map(w => {
            const change = (participant.initialWeight - w.weight) / participant.initialWeight * 100;
            return change;
        });
        
        // Create data points
        const data = challengeDays.map((day, i) => ({
            x: day,
            y: percentages[i]
        }));
        
        // Use special styling for current user
        const isCurrentUser = participant.id === currentUser.id;
        const lineWidth = isCurrentUser ? 4 : 2;
        const pointRadius = isCurrentUser ? 6 : 3;
        
        datasets.push({
            label: `Участник ${index + 1}${isCurrentUser ? ' (Вы)' : ''}`,
            data: data,
            backgroundColor: getUserColor(participant.username),
            borderColor: getUserColor(participant.username),
            borderWidth: lineWidth,
            fill: false,
            tension: 0.1,
            pointRadius: pointRadius
        });
    });
    
    if (datasets.length === 0) return;
    
    // Create the chart
    const ctx = document.getElementById('all-participants-chart');
    if (!ctx) return;
    
    // Проверяем, что элемент является canvas
    if (!(ctx instanceof HTMLCanvasElement)) return;
    
    if (window.allParticipantsChart) window.allParticipantsChart.destroy();
    
    window.allParticipantsChart = new Chart(ctx, {
        type: 'line',
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            return `День ${context[0].parsed.x}`;
                        },
                        label: function(context) {
                            return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}%`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    title: {
                        display: true,
                        text: 'День челленджа'
                    },
                    min: 1,
                    max: 14,
                    ticks: {
                        stepSize: 1
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Изменение веса (%)'
                    }
                }
            }
        }
    });
}

function updateWeightHistory() {
    const userWeighIns = weighIns.filter(w => w.userId === currentUser.id).sort((a, b) => new Date(b.date) - new Date(a.date));
    const tbody = document.getElementById('weight-history');
    tbody.innerHTML = '';
    
    if (userWeighIns.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Нет данных об измерениях</td></tr>';
        return;
    }
    
    userWeighIns.forEach(weighIn => {
        const weightChange = currentUser.initialWeight - weighIn.weight;
        const percentChange = (weightChange / currentUser.initialWeight) * 100;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${new Date(weighIn.date).toLocaleDateString('ru-RU')}</td>
            <td>${weighIn.weight.toFixed(1)} кг</td>
            <td class="${weightChange >= 0 ? 'status-positive' : 'status-negative'}">
                ${weightChange >= 0 ? '-' : '+'}${Math.abs(weightChange).toFixed(1)} кг
            </td>
            <td class="${percentChange >= 0 ? 'status-positive' : 'status-negative'}">
                ${percentChange >= 0 ? '-' : '+'}${Math.abs(percentChange).toFixed(1)}%
            </td>
        `;
        tbody.appendChild(row);
    });
}

function handleAddWeight(e) {
    e.preventDefault();
    const weight = parseFloat(document.getElementById('new-weight').value);
    const date = document.getElementById('weight-date').value;
    
    // Validation
    if (weight < 30 || weight > 300) {
        showAuthError('weight', 'Вес должен быть между 30 и 300 кг');
        return;
    }
    
    if (new Date(date) > new Date()) {
        showAuthError('weight', 'Дата не может быть в будущем');
        return;
    }
    
    // Check if challenge is active for this user
    const challengeStatus = getUserChallengeStatus(currentUser.id);
    if (challengeStatus === 'finished') {
        showAuthError('weight', 'Ваш челлендж завершен. Добавление измерений невозможно.');
        return;
    }
    
    if (challengeStatus === 'not-started') {
        showAuthError('weight', 'Ваш челлендж еще не начался.');
        return;
    }
    
    // Check if weight entry for this date already exists
    const existingEntry = weighIns.find(w => w.userId === currentUser.id && w.date === date);
    if (existingEntry) {
        // Update existing entry
        existingEntry.weight = weight;
    } else {
        // Add new entry
        const newWeighIn = {
            id: nextWeighInId++,
            userId: currentUser.id,
            weight: weight,
            date: date
        };
        weighIns.push(newWeighIn);
    }
    
    saveData();
    
    // Check for achievements
    checkAchievements(currentUser.id, weight);
    
    // Update dashboard
    updateUserStats();
    updateUserCharts();
    updateWeightHistory();
    updateUserChallengeStatus();
    
    // Reset form
    document.getElementById('weight-form').reset();
    document.getElementById('weight-date').value = new Date().toISOString().split('T')[0];
    
    clearAuthErrors();
    
    // Show registration notification for admin
    if (currentUser && !currentUser.isAdmin) {
        setTimeout(() => {
            showRegistrationNotification(currentUser.username);
        }, 2000);
    }
}

function checkAchievements(userId, newWeight) {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    const userWeighIns = weighIns.filter(w => w.userId === userId).sort((a, b) => new Date(a.date) - new Date(b.date));
    const totalWeightLost = user.initialWeight - newWeight;
    const percentLost = (totalWeightLost / user.initialWeight) * 100;
    
    // Check for weight loss milestones
    if (totalWeightLost >= 5 && totalWeightLost < 10) {
        showAchievementNotification('🎉 Достижение! Вы потеряли 5 кг!');
    } else if (totalWeightLost >= 10 && totalWeightLost < 15) {
        showAchievementNotification('🏆 Отлично! Вы потеряли 10 кг!');
    } else if (totalWeightLost >= 15) {
        showAchievementNotification('👑 Превосходно! Вы потеряли 15+ кг!');
    }
    
    // Check for percentage milestones
    if (percentLost >= 5 && percentLost < 10) {
        showAchievementNotification('💪 Молодец! Вы потеряли 5% от начального веса!');
    } else if (percentLost >= 10 && percentLost < 15) {
        showAchievementNotification('🔥 Фантастика! Вы потеряли 10% от начального веса!');
    } else if (percentLost >= 15) {
        showAchievementNotification('🌟 Легенда! Вы потеряли 15%+ от начального веса!');
    }
    
    // Check for consistency
    if (userWeighIns.length >= 7) {
        showAchievementNotification('📅 Неделя активности! Вы измеряете вес 7 дней подряд!');
    } else if (userWeighIns.length >= 30) {
        showAchievementNotification('📊 Месяц активности! Вы измеряете вес 30 дней подряд!');
    }
}

function showAchievementNotification(message) {
    // Create achievement notification
    const notification = document.createElement('div');
    notification.className = 'achievement-notification';
    notification.innerHTML = `
        <div class="achievement-content">
            <span class="achievement-icon">🎉</span>
            <span class="achievement-text">${message}</span>
            <button class="achievement-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto-remove after 15 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 15000);
}

// Admin dashboard functions
function updateAdminStats() {
    // Get approved participants who joined during the registration period
    // 25.08.2025 - 15.09.2025 is REGISTRATION period
    // Each participant gets 14 days from their individual join date
    const participants = users.filter(u => {
        if (u.isAdmin || u.status !== 'approved') return false;
        
        // Check if user joined during the registration period
        const joinDate = new Date(u.challengeJoinedAt || u.createdAt);
        const challengeStart = new Date(challengeSettings.startDate);
        const challengeEnd = new Date(challengeSettings.endDate);
        
        return joinDate >= challengeStart && joinDate <= challengeEnd;
    });
    
    // Get pending participants for approval
    const pendingParticipants = users.filter(u => {
        if (u.isAdmin || u.status !== 'pending') return false;
        
        const joinDate = new Date(u.challengeJoinedAt || u.createdAt);
        const challengeStart = new Date(challengeSettings.startDate);
        const challengeEnd = new Date(challengeSettings.endDate);
        
        return joinDate >= challengeStart && joinDate <= challengeEnd;
    });
    
    const participantsCount = participants.length;
    const pendingCount = pendingParticipants.length;
    const prizeFund = participantsCount * 1000;
    
    document.getElementById('participants-count').textContent = participantsCount;
    document.getElementById('prize-fund').textContent = `${prizeFund.toLocaleString()} руб.`;
    
    // Update pending count if element exists
    const pendingElement = document.getElementById('pending-count');
    if (pendingElement) {
        pendingElement.textContent = pendingCount;
    }
    
    // Find winner
    const winner = findWinner();
    const challengeStatus = getChallengeStatus();
    
    if (challengeStatus === 'finished' && winner) {
        document.getElementById('current-winner').textContent = `🏆 ${winner.username} (${winner.percentChange.toFixed(1)}%)`;
    } else if (winner) {
        document.getElementById('current-winner').textContent = `${winner.username} (${winner.percentChange.toFixed(1)}%)`;
    } else {
        document.getElementById('current-winner').textContent = 'Пока нет данных';
    }
    
    // Update challenge info with real-time data
    const activeParticipants = participants.filter(p => {
        const userWeighIns = weighIns.filter(w => w.userId === p.id);
        return userWeighIns.length > 0;
    });
    
    const totalWeightLost = activeParticipants.reduce((total, p) => {
        const userWeighIns = weighIns.filter(w => w.userId === p.id);
        if (userWeighIns.length === 0) return total;
        
        const latestWeight = userWeighIns.sort((a, b) => new Date(b.date) - new Date(a.date))[0].weight;
        return total + (p.initialWeight - latestWeight);
    }, 0);
    
    // Show additional stats if available
    if (activeParticipants.length > 0) {
        const avgWeightLost = totalWeightLost / activeParticipants.length;
        const bestResult = Math.max(...activeParticipants.map(p => {
            const userWeighIns = weighIns.filter(w => w.userId === p.id);
            if (userWeighIns.length === 0) return 0;
            
            const latestWeight = userWeighIns.sort((a, b) => new Date(b.date) - new Date(a.date))[0].weight;
            return ((p.initialWeight - latestWeight) / p.initialWeight) * 100;
        }));
        
        // You can add these stats to the UI if needed
        console.log(`Средняя потеря веса: ${avgWeightLost.toFixed(1)} кг`);
        console.log(`Лучший результат: ${bestResult.toFixed(1)}%`);
    }
    
    // Show challenge timeline stats
    showChallengeTimelineStats(participants);
    
    // Update pending participants table
    updatePendingParticipantsTable();
    
    // Update admin charts
    updateAdminWeightChart();
    updateAdminPercentageChart();
}

// Функция для создания графика веса всех участников в админской панели
function updateAdminWeightChart() {
    const ctx = document.getElementById('admin-weight-chart');
    if (!ctx) return;
    
    // Проверяем, что элемент является canvas
    if (!(ctx instanceof HTMLCanvasElement)) return;

    // Проверяем, что challengeSettings существует
    if (!challengeSettings || !challengeSettings.startDate || !challengeSettings.endDate || !challengeSettings.duration) {
        ctx.innerHTML = '<p class="no-data">Настройки челленджа не загружены</p>';
        return;
    }

    // Проверяем, что users и weighIns существуют
    if (!users || !weighIns) {
        ctx.innerHTML = '<p class="no-data">Данные пользователей не загружены</p>';
        return;
    }

    // Получаем участников текущего активного челленджа (только утвержденных)
    const participants = users.filter(user => 
        !user.isAdmin && 
        user.status === 'approved' &&
        new Date(user.challengeApprovedAt) >= new Date(challengeSettings.startDate) &&
        new Date(user.challengeApprovedAt) <= new Date(challengeSettings.endDate)
    );

    if (participants.length === 0) {
        ctx.innerHTML = '<p class="no-data">Нет данных для отображения</p>';
        return;
    }

    // Создаем данные для графика
    const datasets = participants.map(user => {
        const userWeighIns = weighIns.filter(w => w.userId === user.id);
        const challengeStartDate = new Date(user.challengeApprovedAt);
        
        // Создаем массив дней челленджа (1-14)
        const challengeDays = [];
        const weights = [];
        
        for (let day = 1; day <= challengeSettings.duration; day++) {
            challengeDays.push(day);
            
            // Находим вес для этого дня челленджа
            const targetDate = new Date(challengeStartDate);
            targetDate.setDate(targetDate.getDate() + day - 1);
            
            const weighInForDay = userWeighIns.find(w => {
                const weighInDate = new Date(w.date);
                return weighInDate.toDateString() === targetDate.toDateString();
            });
            
            if (weighInForDay) {
                weights.push(weighInForDay.weight);
            } else if (day === 1) {
                weights.push(user.initialWeight);
            } else {
                weights.push(null); // Нет данных для этого дня
            }
        }
        
        return {
            label: user.username,
            data: weights,
            borderColor: getUserColor(user.username),
            backgroundColor: 'transparent',
            tension: 0.1,
            spanGaps: true
        };
    });

    // Уничтожаем существующий график, если он есть
    if (window.adminWeightChart) {
        window.adminWeightChart.destroy();
    }

    // Если нет данных, показываем сообщение
    if (datasets.length === 0) {
        ctx.innerHTML = '<p class="no-data">Нет данных для отображения</p>';
        return;
    }

    // Создаем новый график
    window.adminWeightChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array.from({length: challengeSettings.duration}, (_, i) => `День ${i + 1}`),
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'График веса всех участников',
                    font: {
                        size: 16
                    }
                },
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        title: function(context) {
                            return `День ${context[0].dataIndex + 1}`;
                        },
                        label: function(context) {
                            return `${context.dataset.label}: ${context.parsed.y.toFixed(1)} кг`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Дни челленджа'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Вес (кг)'
                    },
                    beginAtZero: false
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });
}

// Функция для создания графика изменения веса в % всех участников в админской панели
function updateAdminPercentageChart() {
    const ctx = document.getElementById('admin-percentage-chart');
    if (!ctx) return;
    
    // Проверяем, что элемент является canvas
    if (!(ctx instanceof HTMLCanvasElement)) return;

    // Проверяем, что challengeSettings существует
    if (!challengeSettings || !challengeSettings.startDate || !challengeSettings.endDate || !challengeSettings.duration) {
        ctx.innerHTML = '<p class="no-data">Настройки челленджа не загружены</p>';
        return;
    }

    // Проверяем, что users и weighIns существуют
    if (!users || !weighIns) {
        ctx.innerHTML = '<p class="no-data">Данные пользователей не загружены</p>';
        return;
    }

    // Получаем участников текущего активного челленджа (только утвержденных)
    const participants = users.filter(user => 
        !user.isAdmin && 
        user.status === 'approved' &&
        new Date(user.challengeApprovedAt) >= new Date(challengeSettings.startDate) &&
        new Date(user.challengeApprovedAt) <= new Date(challengeSettings.endDate)
    );

    if (participants.length === 0) {
        ctx.innerHTML = '<p class="no-data">Нет данных для отображения</p>';
        return;
    }

    // Создаем данные для графика
    const datasets = participants.map(user => {
        const userWeighIns = weighIns.filter(w => w.userId === user.id);
        const challengeStartDate = new Date(user.challengeApprovedAt);
        
        // Создаем массив дней челленджа (1-14)
        const challengeDays = [];
        const percentages = [];
        
        for (let day = 1; day <= challengeSettings.duration; day++) {
            challengeDays.push(day);
            
            // Находим вес для этого дня челленджа
            const targetDate = new Date(challengeStartDate);
            targetDate.setDate(targetDate.getDate() + day - 1);
            
            const weighInForDay = userWeighIns.find(w => {
                const weighInDate = new Date(w.date);
                return weighInDate.toDateString() === targetDate.toDateString();
            });
            
            if (weighInForDay) {
                const weightChange = user.initialWeight - weighInForDay.weight;
                const percentChange = (weightChange / user.initialWeight) * 100;
                percentages.push(percentChange);
            } else if (day === 1) {
                percentages.push(0); // Начальный день - 0% изменения
            } else {
                percentages.push(null); // Нет данных для этого дня
            }
        }
        
        return {
            label: user.username,
            data: percentages,
            borderColor: getUserColor(user.username),
            backgroundColor: 'transparent',
            tension: 0.1,
            spanGaps: true
        };
    });

    // Уничтожаем существующий график, если он есть
    if (window.adminPercentageChart) {
        window.adminPercentageChart.destroy();
    }

    // Если нет данных, показываем сообщение
    if (datasets.length === 0) {
        ctx.innerHTML = '<p class="no-data">Нет данных для отображения</p>';
        return;
    }

    // Создаем новый график
    window.adminPercentageChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array.from({length: challengeSettings.duration}, (_, i) => `День ${i + 1}`),
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'График изменения веса в % всех участников',
                    font: {
                        size: 16
                    }
                },
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        title: function(context) {
                            return `День ${context[0].dataIndex + 1}`;
                        },
                        label: function(context) {
                            const value = context.parsed.y;
                            const sign = value >= 0 ? '+' : '';
                            return `${context.dataset.label}: ${sign}${value.toFixed(1)}%`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Дни челленджа'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Изменение веса (%)'
                    },
                    beginAtZero: false
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });
}

// Функция для генерации уникальных цветов для каждого участника
const userColors = new Map();

function getUserColor(username) {
    if (!userColors.has(username)) {
        const colors = [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
            '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384',
            '#36A2EB', '#FFCE56', '#FF9F40', '#9966FF', '#C9CBCF',
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
            '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
        ];
        const colorIndex = userColors.size % colors.length;
        userColors.set(username, colors[colorIndex]);
    }
    return userColors.get(username);
}

// Вспомогательная функция для генерации случайного цвета (для обратной совместимости)
function getRandomColor() {
    return getUserColor('default');
}

// Update table of participants waiting for approval
function updatePendingParticipantsTable() {
    console.log('🔍 Debugging pending participants table...');
    console.log('All users:', users.map(u => ({ id: u.id, username: u.username, status: u.status, createdAt: u.createdAt, challengeJoinedAt: u.challengeJoinedAt })));
    console.log('Challenge settings:', challengeSettings);
    
    const pendingParticipants = users.filter(u => {
        if (u.isAdmin || u.status !== 'pending') {
            console.log(`User ${u.username} filtered out: isAdmin=${u.isAdmin}, status=${u.status}`);
            return false;
        }
        
        const joinDate = new Date(u.challengeJoinedAt || u.createdAt);
        const challengeStart = new Date(challengeSettings.startDate);
        const challengeEnd = new Date(challengeSettings.endDate);
        
        const isInRegistrationPeriod = joinDate >= challengeStart && joinDate <= challengeEnd;
        console.log(`User ${u.username}: joinDate=${joinDate.toISOString()}, challengeStart=${challengeStart.toISOString()}, challengeEnd=${challengeEnd.toISOString()}, inPeriod=${isInRegistrationPeriod}`);
        
        return isInRegistrationPeriod;
    });
    
    console.log('Pending participants found:', pendingParticipants.length);
    console.log('Pending participants:', pendingParticipants);
    
    const tbody = document.getElementById('pending-participants-table');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (pendingParticipants.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Нет участников, ожидающих утверждения</td></tr>';
        return;
    }
    
    pendingParticipants.forEach(participant => {
        const row = document.createElement('tr');
        const joinDate = new Date(participant.challengeJoinedAt || participant.createdAt);
        
        row.innerHTML = `
            <td><strong>${participant.username}</strong></td>
            <td>${participant.initialWeight.toFixed(1)} кг</td>
            <td>${joinDate.toLocaleDateString('ru-RU')}</td>
            <td>
                <button type="button" class="btn btn--sm btn--success" onclick="approveParticipant(${participant.id})">
                    Утвердить
                </button>
                <button type="button" class="btn btn--sm btn--error" onclick="rejectParticipant(${participant.id})">
                    Отклонить
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Approve participant for challenge
function approveParticipant(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    user.status = 'approved';
    user.challengeApprovedAt = new Date().toISOString().split('T')[0];
    user.challengeJoinedAt = new Date().toISOString().split('T')[0];
    
    saveData();
    
    // Update displays
    updateAdminStats();
    updateParticipantsTable();
    
    // Show success message
    showChallengeSettingsSuccess(`Участник ${user.username} утвержден!`);
    
    // Show notification to user if they're logged in
    if (currentUser && currentUser.id === userId) {
        showChallengeNotification(`🎉 Поздравляем! Вы утверждены для участия в челлендже!`);
        updateUserChallengeStatus();
    }
}

// Reject participant
function rejectParticipant(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    if (confirm(`Вы уверены, что хотите отклонить участника ${user.username}?`)) {
        user.status = 'rejected';
        
        saveData();
        
        // Update displays
        updateAdminStats();
        
        // Show success message
        showChallengeSettingsSuccess(`Участник ${user.username} отклонен.`);
        
        // Show notification to user if they're logged in
        if (currentUser && currentUser.id === userId) {
            showChallengeNotification(`❌ К сожалению, ваша заявка на участие отклонена.`);
        }
    }
}

// Delete participant completely - can be called at any time
function deleteParticipant(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    if (confirm(`Вы уверены, что хотите УДАЛИТЬ участника ${user.username}? Это действие нельзя отменить!`)) {
        // Remove user from users array
        users = users.filter(u => u.id !== userId);
        
        // Remove all weigh-ins for this user
        weighIns = weighIns.filter(w => w.userId !== userId);
        
        // Save data
        saveData();
        
        // Update displays
        updateAdminStats();
        updateParticipantsTable();
        updatePendingParticipantsTable();
        
        // Show success message
        showChallengeSettingsSuccess(`Участник ${user.username} полностью удален из системы.`);
        
        // If deleted user is currently logged in, log them out
        if (currentUser && currentUser.id === userId) {
            showChallengeNotification(`❌ Ваш аккаунт был удален администратором.`);
            setTimeout(() => {
                handleLogout();
            }, 2000);
        }
    }
}

function showChallengeTimelineStats(participants) {
    // Group participants by when they joined during registration period
    // 25.08.2025 - 15.09.2025 is REGISTRATION period
    const joinDates = {};
    participants.forEach(p => {
        const joinDate = p.challengeJoinedAt || p.createdAt;
        const dateKey = new Date(joinDate).toLocaleDateString('ru-RU');
        
        if (!joinDates[dateKey]) {
            joinDates[dateKey] = [];
        }
        joinDates[dateKey].push(p.username);
    });
    
    console.log('Участники по датам присоединения (период регистрации):');
    Object.entries(joinDates).forEach(([date, users]) => {
        console.log(`${date}: ${users.join(', ')} (${users.length} чел.)`);
    });
    
    // Show early vs late joiners during registration period
    const earlyJoiners = participants.filter(p => {
        const joinDate = new Date(p.challengeJoinedAt || p.createdAt);
        const challengeStart = new Date(challengeSettings.startDate);
        const daysDiff = Math.ceil((joinDate - challengeStart) / (1000 * 60 * 60 * 24));
        return daysDiff <= 3; // Joined within first 3 days of registration
    });
    
    const lateJoiners = participants.filter(p => {
        const joinDate = new Date(p.challengeJoinedAt || p.createdAt);
        const challengeEnd = new Date(challengeSettings.endDate);
        const daysDiff = Math.ceil((challengeEnd - joinDate) / (1000 * 60 * 60 * 24));
        return daysDiff <= 3; // Joined within last 3 days of registration
    });
    
    console.log(`Ранние участники (первые 3 дня регистрации): ${earlyJoiners.length} чел.`);
    console.log(`Поздние участники (последние 3 дня регистрации): ${lateJoiners.length} чел.`);
    
    // Show individual challenge progress for each participant
    console.log('\n=== Прогресс участников в их индивидуальных челленджах ===');
    participants.forEach(p => {
        const joinDate = new Date(p.challengeJoinedAt || p.createdAt);
        const now = new Date();
        const daysInChallenge = Math.ceil((now - joinDate) / (1000 * 60 * 60 * 24));
        const daysRemaining = Math.max(0, challengeSettings.duration - daysInChallenge);
        
        console.log(`${p.username}: в челлендже ${daysInChallenge} дней, осталось ${daysRemaining} дней`);
    });
}

function findWinner() {
    // Get participants who joined during the registration period
    // 25.08.2025 - 15.09.2025 is REGISTRATION period
    // Each participant gets 14 days from their individual join date
    const participants = users.filter(u => {
        if (u.isAdmin) return false;
        
        // Check if user joined during the registration period
        const joinDate = new Date(u.challengeJoinedAt || u.createdAt);
        const challengeStart = new Date(challengeSettings.startDate);
        const challengeEnd = new Date(challengeSettings.endDate);
        
        return joinDate >= challengeStart && joinDate <= challengeEnd;
    });
    
    let winner = null;
    let maxPercentChange = -Infinity;
    
    participants.forEach(user => {
        const userWeighIns = weighIns.filter(w => w.userId === user.id);
        if (userWeighIns.length === 0) return;
        
        const latestWeight = userWeighIns.sort((a, b) => new Date(b.date) - new Date(a.date))[0].weight;
        const percentChange = ((user.initialWeight - latestWeight) / user.initialWeight) * 100;
        
        if (percentChange > maxPercentChange) {
            maxPercentChange = percentChange;
            winner = { ...user, percentChange, currentWeight: latestWeight };
        }
    });
    
    return winner;
}

function updateParticipantsTable() {
    // Get participants who joined during the registration period
    // 25.08.2025 - 15.09.2025 is REGISTRATION period
    // Each participant gets 14 days from their individual join date
    const participants = users.filter(u => {
        if (u.isAdmin) return false;
        
        // Check if user joined during the registration period
        const joinDate = new Date(u.challengeJoinedAt || u.createdAt);
        const challengeStart = new Date(challengeSettings.startDate);
        const challengeEnd = new Date(challengeSettings.endDate);
        
        return joinDate >= challengeStart && joinDate <= challengeEnd;
    });
    
    const tbody = document.getElementById('participants-table');
    tbody.innerHTML = '';
    
    if (participants.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" class="empty-state">Нет участников</td></tr>';
        return;
    }
    
    const participantsData = participants.map(user => {
        const userWeighIns = weighIns.filter(w => w.userId === user.id);
        const hasWeighIns = userWeighIns.length > 0;
        const latestWeighIn = hasWeighIns ? userWeighIns.sort((a, b) => new Date(b.date) - new Date(a.date))[0] : null;
        const currentWeight = latestWeighIn ? latestWeighIn.weight : user.initialWeight;
        const weightChange = user.initialWeight - currentWeight;
        const percentChange = (weightChange / user.initialWeight) * 100;
        const lastUpdate = latestWeighIn ? latestWeighIn.date : user.createdAt;
        
        // Calculate activity score
        const activityScore = calculateActivityScore(user.id);
        
        // Calculate days in challenge and days left
        let daysInChallenge = 0;
        let daysLeft = 0;
        
        if (user.challengeApprovedAt && challengeSettings.duration) {
            const challengeStart = new Date(user.challengeApprovedAt);
            const now = new Date();
            const challengeEnd = new Date(challengeStart.getTime() + challengeSettings.duration * 24 * 60 * 60 * 1000);
            
            // Days in challenge (from start to now)
            const timeInChallenge = now - challengeStart;
            daysInChallenge = Math.max(0, Math.floor(timeInChallenge / (1000 * 60 * 60 * 24)));
            
            // Days left until challenge ends
            const timeLeft = challengeEnd - now;
            daysLeft = Math.max(0, Math.ceil(timeLeft / (1000 * 60 * 60 * 24)));
        }
        
        return {
            ...user,
            currentWeight,
            weightChange,
            percentChange,
            lastUpdate,
            hasWeighIns,
            activityScore,
            daysInChallenge,
            daysLeft
        };
    });
    
    // Sort by percent change (descending) by default
    participantsData.sort((a, b) => b.percentChange - a.percentChange);
    
    participantsData.forEach((participant, index) => {
        const row = document.createElement('tr');
        if (index === 0 && participant.percentChange > 0) {
            row.classList.add('winner-row');
        }
        
        const statusClass = participant.percentChange > 0 ? 'status-positive' : 
                          participant.percentChange < 0 ? 'status-negative' : 'status-neutral';
        
        row.innerHTML = `
            <td><strong>${participant.username}</strong></td>
            <td>${participant.initialWeight.toFixed(1)} кг</td>
            <td>${participant.currentWeight.toFixed(1)} кг</td>
            <td class="${statusClass}">
                ${participant.weightChange >= 0 ? '-' : '+'}${Math.abs(participant.weightChange).toFixed(1)} кг
            </td>
            <td class="${statusClass}">
                ${participant.percentChange >= 0 ? '-' : '+'}${Math.abs(participant.percentChange).toFixed(1)}%
            </td>
            <td>${new Date(participant.lastUpdate).toLocaleDateString('ru-RU')}</td>
            <td>
                <span class="status ${participant.hasWeighIns ? 'status--success' : 'status--info'}">
                    ${participant.hasWeighIns ? 'Активен' : 'Начальный вес'}
                </span>
            </td>
            <td>
                <span class="days-in-challenge">
                    ${participant.daysInChallenge} дн.
                </span>
            </td>
            <td>
                <span class="days-left ${participant.daysLeft <= 3 ? 'days-left--warning' : 'days-left--normal'}">
                    ${participant.daysLeft} дн.
                </span>
            </td>
            <td>
                <span class="activity-score ${getActivityScoreClass(participant.activityScore)}">
                    ${participant.activityScore}%
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button type="button" class="btn btn--sm btn--outline" onclick="switchToUser('${participant.username}')" title="Переключиться в личный кабинет">
                        👤 Переключиться
                    </button>
                    <button type="button" class="btn btn--sm btn--error" onclick="deleteParticipant(${participant.id})" title="Удалить участника">
                        🗑️ Удалить
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function calculateActivityScore(userId) {
    const userWeighIns = weighIns.filter(w => w.userId === userId);
    if (userWeighIns.length === 0) return 0;
    
    const user = users.find(u => u.id === userId);
    if (!user) return 0;
    
    // Calculate based on when user joined the challenge
    const challengeStart = user.challengeJoinedAt ? new Date(user.challengeJoinedAt) : new Date(user.createdAt);
    const now = new Date();
    const totalDays = Math.ceil((now - challengeStart) / (1000 * 60 * 60 * 24));
    
    if (totalDays <= 0) return 100;
    
    const activeDays = userWeighIns.length;
    const score = Math.min((activeDays / totalDays) * 100, 100);
    
    return Math.round(score);
}

function getActivityScoreClass(score) {
    if (score >= 80) return 'activity-high';
    if (score >= 50) return 'activity-medium';
    return 'activity-low';
}

function updateOverallChart() {
    // Get participants who joined during the registration period
    // 25.08.2025 - 15.09.2025 is REGISTRATION period
    // Each participant gets 14 days from their individual join date
    const participants = users.filter(u => {
        if (u.isAdmin) return false;
        
        // Check if user joined during the registration period
        const joinDate = new Date(u.challengeJoinedAt || u.createdAt);
        const challengeStart = new Date(challengeSettings.startDate);
        const challengeEnd = new Date(challengeSettings.endDate);
        
        return joinDate >= challengeStart && joinDate <= challengeEnd && weighIns.some(w => w.userId === u.id);
    });
    
    if (participants.length === 0) return;
    
    const colors = ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5', '#5D878F', '#DB4545', '#D2BA4C', '#964325', '#944454', '#13343B'];
    
    const datasets = participants.map((user, index) => {
        const userWeighIns = weighIns.filter(w => w.userId === user.id).sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // Calculate challenge days for this user
        const joinDate = new Date(user.challengeJoinedAt || user.createdAt);
        const challengeDays = userWeighIns.map(w => {
            const weighInDate = new Date(w.date);
            const dayDiff = Math.ceil((weighInDate - joinDate) / (1000 * 60 * 60 * 24));
            return Math.max(1, dayDiff);
        });
        
        const data = challengeDays.map((day, i) => ({
            x: day,
            y: ((user.initialWeight - userWeighIns[i].weight) / user.initialWeight * 100)
        }));
        
        return {
            label: user.username,
            data: data,
            backgroundColor: colors[index % colors.length],
            borderColor: colors[index % colors.length],
            borderWidth: 2,
            fill: false,
            tension: 0.1
        };
    });
    
    const ctx = document.getElementById('overall-progress-chart').getContext('2d');
    if (window.overallChart) window.overallChart.destroy();
    
    window.overallChart = new Chart(ctx, {
        type: 'line',
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            return `День ${context[0].parsed.x}`;
                        },
                        label: function(context) {
                            return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}%`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    title: {
                        display: true,
                        text: 'День челленджа'
                    },
                    min: 1,
                    max: 14,
                    ticks: {
                        stepSize: 1
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Изменение веса (%)'
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
    
    // Add challenge timeline markers if challenge is configured
    if (challengeSettings.startDate && challengeSettings.endDate) {
        const startDate = new Date(challengeSettings.startDate);
        const endDate = new Date(challengeSettings.endDate);
        
        // Add vertical lines for challenge start and end
        const annotation = {
            annotations: {
                startLine: {
                    type: 'line',
                    xMin: startDate,
                    xMax: startDate,
                    borderColor: 'rgba(34, 197, 94, 0.8)',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    label: {
                        content: 'Старт',
                        position: 'start'
                    }
                },
                endLine: {
                    type: 'line',
                    xMin: endDate,
                    xMax: endDate,
                    borderColor: 'rgba(239, 68, 68, 0.8)',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    label: {
                        content: 'Финиш',
                        position: 'end'
                    }
                }
            }
        };
        
        // Apply annotations if Chart.js supports them
        if (window.overallChart.options.plugins) {
            window.overallChart.options.plugins.annotation = annotation;
            window.overallChart.update();
        }
    }
    
    // Add activity heatmap if available
    addActivityHeatmap();
}

function addActivityHeatmap() {
    // This function can be expanded to show activity patterns
    // For now, we'll just log some statistics
    
    // Get participants who joined during the registration period
    // 25.08.2025 - 15.09.2025 is REGISTRATION period
    const participants = users.filter(u => {
        if (u.isAdmin) return false;
        
        // Check if user joined during the registration period
        const joinDate = new Date(u.challengeJoinedAt || u.createdAt);
        const challengeStart = new Date(challengeSettings.startDate);
        const challengeEnd = new Date(challengeSettings.endDate);
        
        return joinDate >= challengeStart && joinDate <= challengeEnd;
    });
    
    if (participants.length === 0) return;
    
    // Get weigh-ins only for participants who joined during registration period
    const currentParticipantIds = participants.map(p => p.id);
    const currentWeighIns = weighIns.filter(w => currentParticipantIds.includes(w.userId));
    
    // Calculate activity by day of week
    const dayOfWeekActivity = {};
    const dayNames = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    
    currentWeighIns.forEach(weighIn => {
        const date = new Date(weighIn.date);
        const dayOfWeek = date.getDay();
        const dayName = dayNames[dayOfWeek];
        
        if (!dayOfWeekActivity[dayName]) {
            dayOfWeekActivity[dayName] = 0;
        }
        dayOfWeekActivity[dayName]++;
    });
    
    // Log activity statistics
    console.log('Активность по дням недели (участники периода регистрации):', dayOfWeekActivity);
    
    // Find most and least active days
    const sortedDays = Object.entries(dayOfWeekActivity).sort((a, b) => b[1] - a[1]);
    if (sortedDays.length > 0) {
        console.log(`Самый активный день: ${sortedDays[0][0]} (${sortedDays[0][1]} измерений)`);
        console.log(`Самый неактивный день: ${sortedDays[sortedDays.length - 1][0]} (${sortedDays[sortedDays.length - 1][1]} измерений)`);
    }
    
    // Calculate time-based activity patterns
    const timeOfDayActivity = {
        'Утро (6-12)': 0,
        'День (12-18)': 0,
        'Вечер (18-24)': 0,
        'Ночь (0-6)': 0
    };
    
    currentWeighIns.forEach(weighIn => {
        const date = new Date(weighIn.date);
        const hour = date.getHours();
        
        if (hour >= 6 && hour < 12) {
            timeOfDayActivity['Утро (6-12)']++;
        } else if (hour >= 12 && hour < 18) {
            timeOfDayActivity['День (12-18)']++;
        } else if (hour >= 18 && hour < 24) {
            timeOfDayActivity['Вечер (18-24)']++;
        } else {
            timeOfDayActivity['Ночь (0-6)']++;
        }
    });
    
    console.log('Активность по времени суток (участники периода регистрации):', timeOfDayActivity);
    
    // Find most active time of day
    const mostActiveTime = Object.entries(timeOfDayActivity).reduce((a, b) => a[1] > b[1] ? a : b);
    console.log(`Самое активное время: ${mostActiveTime[0]} (${mostActiveTime[1]} измерений)`);
    
    // Show challenge participation timeline
    showChallengeParticipationTimeline();
}

function showChallengeParticipationTimeline() {
    // Get participants who joined during the registration period
    // 25.08.2025 - 15.09.2025 is REGISTRATION period
    const participants = users.filter(u => {
        if (u.isAdmin) return false;
        
        // Check if user joined during the registration period
        const joinDate = new Date(u.challengeJoinedAt || u.createdAt);
        const challengeStart = new Date(challengeSettings.startDate);
        const challengeEnd = new Date(challengeSettings.endDate);
        
        return joinDate >= challengeStart && joinDate <= challengeEnd;
    });
    
    if (participants.length === 0) return;
    
    // Group participants by registration day they joined
    const challengeStart = new Date(challengeSettings.startDate);
    const challengeEnd = new Date(challengeSettings.endDate);
    const totalDays = Math.ceil((challengeEnd - challengeStart) / (1000 * 60 * 60 * 24));
    
    const dayParticipation = {};
    for (let i = 0; i <= totalDays; i++) {
        dayParticipation[i] = 0;
    }
    
    participants.forEach(p => {
        const joinDate = new Date(p.challengeJoinedAt || p.createdAt);
        const dayDiff = Math.ceil((joinDate - challengeStart) / (1000 * 60 * 60 * 24));
        const dayKey = Math.max(0, Math.min(dayDiff, totalDays));
        
        if (!dayParticipation[dayKey]) {
            dayParticipation[dayKey] = 0;
        }
        dayParticipation[dayKey]++;
    });
    
    console.log('Присоединение участников по дням периода регистрации:');
    Object.entries(dayParticipation).forEach(([day, count]) => {
        if (count > 0) {
            console.log(`День ${day}: ${count} участников присоединились`);
        }
    });
    
    // Find peak joining day
    const peakDay = Object.entries(dayParticipation).reduce((a, b) => a[1] > b[1] ? a : b);
    console.log(`Пик присоединения: день ${peakDay[0]} (${peakDay[1]} участников)`);
    
    // Show challenge statistics
    showChallengeStatistics();
}

function showChallengeStatistics() {
    console.log('=== Статистика по челленджам ===');
    console.log(`Всего челленджей: ${challenges.length}`);
    
    const activeChallenges = challenges.filter(c => c.status === 'active');
    const pendingChallenges = challenges.filter(c => c.status === 'pending');
    const finishedChallenges = challenges.filter(c => c.status === 'finished');
    
    console.log(`Активных: ${activeChallenges.length}`);
    console.log(`Ожидающих: ${pendingChallenges.length}`);
    console.log(`Завершенных: ${finishedChallenges.length}`);
    
    if (activeChallenges.length > 0) {
        const active = activeChallenges[0];
        console.log(`Текущий активный: ${active.name} (${active.startDate} - ${active.endDate})`);
        
        // Get participants who joined during the registration period
        // 25.08.2025 - 15.09.2025 is REGISTRATION period
        const participants = users.filter(u => {
            if (u.isAdmin) return false;
            
            const joinDate = new Date(u.challengeJoinedAt || u.createdAt);
            const challengeStart = new Date(active.startDate);
            const challengeEnd = new Date(active.endDate);
            
            return joinDate >= challengeStart && joinDate <= challengeEnd;
        });
        
        console.log(`Участников в периоде регистрации: ${participants.length}`);
        
        // Show individual challenge progress for each participant
        if (participants.length > 0) {
            console.log('\n=== Детали участников ===');
            participants.forEach(p => {
                const joinDate = new Date(p.challengeJoinedAt || p.createdAt);
                const now = new Date();
                const daysInChallenge = Math.ceil((now - joinDate) / (1000 * 60 * 60 * 24));
                const daysRemaining = Math.max(0, active.duration - daysInChallenge);
                
                console.log(`${p.username}: присоединился ${joinDate.toLocaleDateString('ru-RU')}, в челлендже ${daysInChallenge} дней, осталось ${daysRemaining} дней`);
            });
        }
    }
}

let currentSortColumn = null;
let currentSortDirection = 'desc';

function sortTable(column) {
    if (currentSortColumn === column) {
        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortColumn = column;
        currentSortDirection = 'desc';
    }
    
    const participants = users.filter(u => !u.isAdmin);
    const participantsData = participants.map(user => {
        const userWeighIns = weighIns.filter(w => w.userId === user.id);
        const hasWeighIns = userWeighIns.length > 0;
        const latestWeighIn = hasWeighIns ? userWeighIns.sort((a, b) => new Date(b.date) - new Date(a.date))[0] : null;
        const currentWeight = latestWeighIn ? latestWeighIn.weight : user.initialWeight;
        const weightChange = user.initialWeight - currentWeight;
        const percentChange = (weightChange / user.initialWeight) * 100;
        const lastUpdate = latestWeighIn ? latestWeighIn.date : user.createdAt;
        
        return {
            ...user,
            currentWeight,
            weightChange,
            percentChange,
            lastUpdate,
            hasWeighIns
        };
    });
    
    participantsData.sort((a, b) => {
        let valueA, valueB;
        
        switch (column) {
            case 'username':
                valueA = a.username;
                valueB = b.username;
                break;
            case 'initialWeight':
                valueA = a.initialWeight;
                valueB = b.initialWeight;
                break;
            case 'currentWeight':
                valueA = a.currentWeight;
                valueB = b.currentWeight;
                break;
            case 'weightChange':
                valueA = a.weightChange;
                valueB = b.weightChange;
                break;
            case 'percentChange':
                valueA = a.percentChange;
                valueB = b.percentChange;
                break;
            case 'lastUpdate':
                valueA = new Date(a.lastUpdate);
                valueB = new Date(b.lastUpdate);
                break;
            case 'activityScore':
                valueA = a.activityScore;
                valueB = b.activityScore;
                break;
            default:
                return 0;
        }
        
        if (currentSortDirection === 'asc') {
            return valueA > valueB ? 1 : -1;
        } else {
            return valueA < valueB ? 1 : -1;
        }
    });
    
    // Re-render table with sorted data
    const tbody = document.getElementById('participants-table');
    tbody.innerHTML = '';
    
    participantsData.forEach((participant, index) => {
        const row = document.createElement('tr');
        if (column === 'percentChange' && index === 0 && participant.percentChange > 0) {
            row.classList.add('winner-row');
        }
        
        const statusClass = participant.percentChange > 0 ? 'status-positive' : 
                          participant.percentChange < 0 ? 'status-negative' : 'status-neutral';
        
        row.innerHTML = `
            <td><strong>${participant.username}</strong></td>
            <td>${participant.initialWeight.toFixed(1)} кг</td>
            <td>${participant.currentWeight.toFixed(1)} кг</td>
            <td class="${statusClass}">
                ${participant.weightChange >= 0 ? '-' : '+'}${Math.abs(participant.weightChange).toFixed(1)} кг
            </td>
            <td class="${statusClass}">
                ${participant.percentChange >= 0 ? '-' : '+'}${Math.abs(participant.percentChange).toFixed(1)}%
            </td>
            <td>${new Date(participant.lastUpdate).toLocaleDateString('ru-RU')}</td>
            <td>
                <span class="status ${participant.hasWeighIns ? 'status--success' : 'status--info'}">
                    ${participant.hasWeighIns ? 'Активен' : 'Начальный вес'}
                </span>
            </td>
            <td>
                <span class="activity-score ${getActivityScoreClass(participant.activityScore)}">
                    ${participant.activityScore}%
                </span>
            </td>
        `;
        tbody.appendChild(row);
    });
}