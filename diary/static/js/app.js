const THEME_KEY = 'bloom-and-bond-theme';
const moodMap = {
    happy: { marker: 'H', label: 'Happy', color: '#f6b4c5' },
    calm: { marker: 'C', label: 'Calm', color: '#b8d9bf' },
    reflective: { marker: 'R', label: 'Reflective', color: '#d9c0f2' },
    excited: { marker: 'E', label: 'Excited', color: '#ffdca8' },
    sad: { marker: 'S', label: 'Sad', color: '#9bbde0' },
    anxious: { marker: 'A', label: 'Anxious', color: '#b9a8d5' },
    grateful: { marker: 'G', label: 'Grateful', color: '#e7c66a' },
    tired: { marker: 'T', label: 'Tired', color: '#aab5a2' }
};
const categoryMap = {
    all: { marker: '•', label: 'All' },
    personal: { marker: 'P', label: 'Personal' },
    'self-care': { marker: 'S', label: 'Self-care' },
    work: { marker: 'W', label: 'Work' },
    health: { marker: 'H', label: 'Health' },
    family: { marker: 'F', label: 'Family' },
    plans: { marker: 'Pl', label: 'Plans' }
};
const dailyQuotes = [
    { text: 'The universe is change; our life is what our thoughts make it.', source: 'Marcus Aurelius, Meditations 4.3 (George Long translation)' },
    { text: 'Be still, and know that I am God.', source: 'Psalm 46:10, King James Version' },
    { text: 'Some things are in our control and others not.', source: 'Epictetus, Enchiridion 1 (George Long translation)' },
    { text: 'I can do all things through Christ which strengtheneth me.', source: 'Philippians 4:13, King James Version' },
    { text: 'The unexamined life is not worth living.', source: 'Plato, Apology 38a (Benjamin Jowett translation)' },
    { text: 'Trust in the LORD with all thine heart; and lean not unto thine own understanding.', source: 'Proverbs 3:5, King James Version' },
    { text: 'Fate leads the willing, and drags along the reluctant.', source: 'Seneca, Letters 107.11' },
    { text: 'They that wait upon the LORD shall renew their strength.', source: 'Isaiah 40:31, King James Version' }
];

const today = new Date();
const state = {
    currentMonth: today.getMonth(),
    currentYear: today.getFullYear(),
    selectedDate: formatDate(today),
    selectedCategory: 'all',
    entries: [],
    archivedEntries: [],
    reminders: []
};

function formatDate(date) {
    const local = new Date(date);
    const year = local.getFullYear();
    const month = String(local.getMonth() + 1).padStart(2, '0');
    const day = String(local.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateString) {
    if (!dateString) return 'No date';
    const date = new Date(`${dateString}T12:00:00`);
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function renderDailyQuote() {
    const today = new Date();
    const dayNumber = Math.floor(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) / 86400000);
    const quote = dailyQuotes[dayNumber % dailyQuotes.length];
    document.getElementById('dailyQuoteText').textContent = `“${quote.text}”`;
    document.getElementById('dailyQuoteSource').textContent = quote.source;
}

function getRemindersForDate(dateString) {
    const date = new Date(`${dateString}T12:00:00`);

    return state.reminders.filter((reminder) => {
        if (!reminder.active || dateString < reminder.due_date) return false;

        const dueDate = new Date(`${reminder.due_date}T12:00:00`);
        if (reminder.repeat === 'daily') return true;
        if (reminder.repeat === 'weekly') return date.getDay() === dueDate.getDay();
        if (reminder.repeat === 'monthly') return date.getDate() === dueDate.getDate();
        return dateString === reminder.due_date;
    });
}

async function fetchJson(url, options = {}) {
    const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        ...options
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
        throw new Error(data?.error || 'Something went wrong.');
    }

    return data;
}

function getVisibleEntries() {
    return state.entries.filter((entry) => (
        state.selectedCategory === 'all' || entry.category === state.selectedCategory
    ));
}

function getEntriesForSelectedDate() {
    return getVisibleEntries()
        .filter((entry) => entry.date === state.selectedDate)
        .sort((a, b) => b.title.localeCompare(a.title));
}

function getMoodSummary() {
    const summary = Object.fromEntries(Object.keys(moodMap).map((mood) => [mood, 0]));
    getVisibleEntries().forEach((entry) => {
        summary[entry.mood] = (summary[entry.mood] || 0) + 1;
    });
    return summary;
}

function renderCategoryFilters() {
    const categoryFilters = document.getElementById('categoryFilters');
    if (!categoryFilters) return;

    const counts = Object.keys(categoryMap).reduce((acc, key) => {
        acc[key] = state.entries.filter((entry) => (key === 'all' || entry.category === key)).length;
        return acc;
    }, {});

    categoryFilters.innerHTML = Object.entries(categoryMap)
        .map(([key, category]) => {
            const isActive = state.selectedCategory === key;
            return `
                <button
                    type="button"
                    class="category-chip ${isActive ? 'active' : ''}"
                    data-category="${key}"
                    aria-pressed="${isActive}"
                >
                    <span class="category-mark">${category.marker}</span>
                    <strong>${category.label}</strong>
                    <em>${counts[key] || 0}</em>
                </button>
            `;
        })
        .join('');

    categoryFilters.querySelectorAll('.category-chip').forEach((button) => {
        button.addEventListener('click', () => {
            state.selectedCategory = button.dataset.category;
            renderCategoryFilters();
            renderCalendar();
            renderEntries();
            renderMoodChart();
        });
    });
}

function renderMoodChart() {
    const moodSummary = getMoodSummary();
    const visibleEntries = getVisibleEntries();
    const totalEntries = visibleEntries.length || 1;
    const moodOverview = document.getElementById('moodOverview');

    moodOverview.innerHTML = Object.entries(moodMap)
        .map(([key, mood]) => {
            const count = moodSummary[key] || 0;
            const width = Math.max((count / totalEntries) * 100, count > 0 ? 12 : 0);
            return `
                <div class="mood-bar-row">
                    <div class="mood-bar-label">
                        <span class="mood-token">${mood.marker}</span>
                        <small>${mood.label}</small>
                    </div>
                    <div class="mood-bar-track">
                        <span style="width:${width}%; background:${mood.color};"></span>
                    </div>
                    <strong>${count}</strong>
                </div>
            `;
        })
        .join('');

    const happyEntries = moodSummary.happy || 0;
    document.getElementById('moodCount').textContent = String(happyEntries);
    document.getElementById('entryCount').textContent = String(visibleEntries.length);
}

function renderCalendar() {
    const monthLabel = document.getElementById('monthLabel');
    const calendarGrid = document.getElementById('calendarGrid');
    const monthDate = new Date(state.currentYear, state.currentMonth, 1);

    monthLabel.textContent = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(monthDate);

    const firstDay = new Date(state.currentYear, state.currentMonth, 1);
    const startOffset = firstDay.getDay();
    const daysInMonth = new Date(state.currentYear, state.currentMonth + 1, 0).getDate();

    calendarGrid.innerHTML = '';

    for (let i = 0; i < startOffset; i += 1) {
        const blank = document.createElement('div');
        blank.className = 'day day-empty';
        calendarGrid.appendChild(blank);
    }

    const visibleEntries = getVisibleEntries();

    for (let day = 1; day <= daysInMonth; day += 1) {
        const cell = document.createElement('button');
        const dateValue = formatDate(new Date(state.currentYear, state.currentMonth, day));
        const isSelected = dateValue === state.selectedDate;
        const hasEntry = visibleEntries.some((entry) => entry.date === dateValue);
        const dateReminders = getRemindersForDate(dateValue);

        cell.type = 'button';
        cell.className = `day ${isSelected ? 'selected' : ''} ${dateReminders.length ? 'has-reminders' : ''}`;
        cell.dataset.date = dateValue;
        cell.innerHTML = `
            <span class="day-number">${day}</span>
            <span class="day-indicators">
                ${hasEntry ? '<span class="entry-dot" aria-hidden="true">•</span>' : ''}
                ${dateReminders.length ? '<span class="reminder-dot" aria-hidden="true"></span>' : ''}
            </span>
        `;
        if (dateReminders.length) {
            const reminderTitles = dateReminders.map((reminder) => reminder.title);
            cell.dataset.reminderTooltip = reminderTitles.join('\n');
            cell.setAttribute('aria-label', `${formatDisplayDate(dateValue)}. Reminders: ${reminderTitles.join(', ')}`);
        } else {
            cell.setAttribute('aria-label', formatDisplayDate(dateValue));
        }

        if (isSelected) {
            cell.setAttribute('aria-pressed', 'true');
        }

        cell.addEventListener('click', () => {
            state.selectedDate = dateValue;
            renderCalendar();
            renderEntries();
        });

        calendarGrid.appendChild(cell);
    }

    renderSelectedDateDetails();
}

function renderSelectedDateDetails() {
    const details = document.getElementById('selectedDateDetails');
    if (!details) return;

    details.replaceChildren();
    const heading = document.createElement('h3');
    heading.textContent = `Reminders for ${formatDisplayDate(state.selectedDate)}`;
    details.appendChild(heading);

    const reminders = getRemindersForDate(state.selectedDate);
    if (!reminders.length) {
        const emptyMessage = document.createElement('p');
        emptyMessage.className = 'reminder-date-empty';
        emptyMessage.textContent = 'No reminders for this date.';
        details.appendChild(emptyMessage);
        return;
    }

    const list = document.createElement('ul');
    reminders.forEach((reminder) => {
        const item = document.createElement('li');
        const title = document.createElement('strong');
        title.textContent = reminder.title;
        item.appendChild(title);

        if (reminder.repeat !== 'none') {
            const repeat = document.createElement('small');
            repeat.textContent = `Repeats ${reminder.repeat}`;
            item.appendChild(repeat);
        }

        list.appendChild(item);
    });
    details.appendChild(list);
}

function renderEntries() {
    const entriesList = document.getElementById('entriesList');
    const selectedEntries = getEntriesForSelectedDate();

    entriesList.replaceChildren();
    if (!selectedEntries.length) {
        const emptyState = document.createElement('li');
        emptyState.className = 'empty-state';
        emptyState.textContent = `No notes for ${formatDisplayDate(state.selectedDate)} yet.`;
        entriesList.appendChild(emptyState);
        return;
    }

    selectedEntries.forEach((entry) => entriesList.appendChild(createEntryCard(entry)));
}

function createEntryCard(entry, archived = false) {
    const mood = moodMap[entry.mood] || moodMap.happy;
    const item = document.createElement('li');
    item.className = 'entry-item';

    const meta = document.createElement('div');
    meta.className = 'entry-meta';
    const moodPill = document.createElement('span');
    moodPill.className = 'mood-pill';
    const moodToken = document.createElement('span');
    moodToken.className = 'mood-token';
    moodToken.textContent = mood.marker;
    moodPill.append(moodToken, ` ${mood.label}`);
    const date = document.createElement('span');
    date.className = 'entry-date';
    date.textContent = formatDisplayDate(entry.date);
    meta.append(moodPill, date);

    const title = document.createElement('h4');
    title.textContent = entry.title;
    const note = document.createElement('p');
    note.textContent = entry.note;
    item.append(meta, title, note);

    const actions = document.createElement('div');
    actions.className = 'entry-actions';
    const action = document.createElement('button');
    action.type = 'button';
    action.className = `entry-action ${archived ? 'restore-entry' : 'archive-entry'}`;
    action.dataset.entryAction = archived ? 'restore' : 'archive';
    action.dataset.entryId = entry.id;
    action.textContent = archived ? 'Restore' : 'Move to archive';
    action.setAttribute('aria-label', `${archived ? 'Restore' : 'Move to archive'}: ${entry.title}`);
    actions.appendChild(action);

    if (archived) {
        const retention = document.createElement('small');
        retention.className = 'archive-retention';
        const expiresAt = Date.parse(entry.archived_at) + 30 * 24 * 60 * 60 * 1000;
        const daysRemaining = Math.max(1, Math.ceil((expiresAt - Date.now()) / (24 * 60 * 60 * 1000)));
        retention.textContent = `Deleted in ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'}`;
        actions.prepend(retention);
    }

    item.appendChild(actions);
    return item;
}

function renderAllEntries() {
    const entriesList = document.getElementById('allEntriesList');
    if (!entriesList) return;

    entriesList.replaceChildren();
    if (!state.entries.length) {
        const emptyState = document.createElement('li');
        emptyState.className = 'empty-state';
        emptyState.textContent = 'Your saved notes will appear here.';
        entriesList.appendChild(emptyState);
        return;
    }

    state.entries.forEach((entry) => {
        entriesList.appendChild(createEntryCard(entry));
    });
}

function renderArchivedEntries() {
    const entriesList = document.getElementById('archivedEntriesList');
    if (!entriesList) return;

    entriesList.replaceChildren();
    if (!state.archivedEntries.length) {
        const emptyState = document.createElement('li');
        emptyState.className = 'empty-state';
        emptyState.textContent = 'Archived notes will stay here for 30 days.';
        entriesList.appendChild(emptyState);
        return;
    }

    state.archivedEntries.forEach((entry) => entriesList.appendChild(createEntryCard(entry, true)));
}

function renderReminderList() {
    const reminderList = document.getElementById('reminderList');

    if (!state.reminders.length) {
        reminderList.innerHTML = `
            <li class="empty-state compact">
                <span>•</span>
                <p>Nothing scheduled yet.</p>
            </li>
        `;
        return;
    }

    reminderList.innerHTML = state.reminders
        .map((reminder) => `
            <li class="reminder-item">
                <div>
                    <strong>${reminder.title}</strong>
                    <small>${formatDisplayDate(reminder.due_date)} • ${reminder.repeat}</small>
                </div>
                <span class="status-badge ${reminder.active ? 'on' : 'off'}">
                    ${reminder.active ? 'On' : 'Off'}
                </span>
            </li>
        `)
        .join('');
}

async function loadDiaryData() {
    try {
        const [entries, reminders, archivedEntries] = await Promise.all([
            fetchJson('/api/entries'),
            fetchJson('/api/reminders'),
            fetchJson('/api/entries/archive')
        ]);
        state.entries = entries;
        state.reminders = reminders;
        state.archivedEntries = archivedEntries;
        renderCategoryFilters();
        renderCalendar();
        renderEntries();
        renderAllEntries();
        renderArchivedEntries();
        renderMoodChart();
        renderReminderList();
    } catch (error) {
        console.error('Could not load diary data:', error);
    }
}

function applyTheme(theme = localStorage.getItem(THEME_KEY) || 'light') {
    const isDark = theme === 'dark';
    document.body.classList.toggle('dark', isDark);
    const button = document.getElementById('themeToggle');
    if (button) {
        const action = isDark ? 'Switch to light mode' : 'Switch to dark mode';
        button.setAttribute('aria-label', action);
        button.title = action;
    }
}

function updateMobileHeader() {
    const sidebar = document.querySelector('.sidebar');
    const isMobile = window.matchMedia('(max-width: 900px)').matches;
    sidebar.classList.toggle('compact', isMobile && window.scrollY > 40);
}

function attachEvents() {
    window.addEventListener('scroll', updateMobileHeader, { passive: true });
    window.addEventListener('resize', updateMobileHeader);
    updateMobileHeader();

    document.getElementById('prevMonth').addEventListener('click', () => {
        state.currentMonth -= 1;
        if (state.currentMonth < 0) {
            state.currentMonth = 11;
            state.currentYear -= 1;
        }
        renderCalendar();
    });

    document.getElementById('nextMonth').addEventListener('click', () => {
        state.currentMonth += 1;
        if (state.currentMonth > 11) {
            state.currentMonth = 0;
            state.currentYear += 1;
        }
        renderCalendar();
    });

    document.getElementById('entryForm').addEventListener('submit', async (event) => {
        event.preventDefault();

        const title = document.getElementById('entryTitle').value.trim();
        const note = document.getElementById('entryNote').value.trim();
        const mood = document.getElementById('entryMood').value;
        const category = document.getElementById('entryCategory').value;
        const date = document.getElementById('entryDate').value || state.selectedDate;

        if (!title || !note) {
            return;
        }

        try {
            await fetchJson('/api/entries', {
                method: 'POST',
                body: JSON.stringify({ title, note, mood, category, date })
            });

            state.selectedDate = date;
            document.getElementById('entryForm').reset();
            document.getElementById('entryDate').value = date;
            document.getElementById('entryCategory').value = 'personal';
            await loadDiaryData();
        } catch (error) {
            console.error('Could not save entry:', error);
        }
    });

    document.getElementById('reminderForm').addEventListener('submit', async (event) => {
        event.preventDefault();

        const title = document.getElementById('reminderTitle').value.trim();
        const dueDate = document.getElementById('reminderDate').value;
        const repeat = document.getElementById('reminderRepeat').value;

        if (!title || !dueDate) {
            return;
        }

        try {
            await fetchJson('/api/reminders', {
                method: 'POST',
                body: JSON.stringify({ title, due_date: dueDate, repeat, active: true })
            });

            document.getElementById('reminderForm').reset();
            document.getElementById('reminderDate').value = state.selectedDate;
            await loadDiaryData();
        } catch (error) {
            console.error('Could not save reminder:', error);
        }
    });

    document.getElementById('themeToggle').addEventListener('click', () => {
        const nextTheme = document.body.classList.contains('dark') ? 'light' : 'dark';
        localStorage.setItem(THEME_KEY, nextTheme);
        applyTheme(nextTheme);
    });

    document.addEventListener('click', async (event) => {
        const actionButton = event.target.closest('[data-entry-action]');
        if (!actionButton) return;

        const entryId = actionButton.dataset.entryId;
        const action = actionButton.dataset.entryAction;
        actionButton.disabled = true;
        try {
            const endpoint = action === 'restore'
                ? `/api/entries/${entryId}/restore`
                : `/api/entries/${entryId}`;
            await fetchJson(endpoint, { method: action === 'restore' ? 'POST' : 'DELETE' });
            await loadDiaryData();
        } catch (error) {
            actionButton.disabled = false;
            console.error(`Could not ${action} entry:`, error);
        }
    });

    document.querySelectorAll('.journal-tab').forEach((button) => {
        button.addEventListener('click', () => {
            const selectedPanel = button.dataset.panel;
            document.querySelectorAll('.journal-pane').forEach((panel) => {
                panel.hidden = panel.id !== selectedPanel;
            });
            document.querySelectorAll('.journal-tab').forEach((tab) => {
                const isSelected = tab === button;
                tab.classList.toggle('active', isSelected);
                tab.setAttribute('aria-selected', String(isSelected));
            });
        });
    });

    document.querySelectorAll('.nav-item').forEach((button) => {
        button.addEventListener('click', () => {
            const targetId = button.dataset.target;
            const target = document.getElementById(targetId);
            if (!target) return;

            document.querySelectorAll('.page-view').forEach((view) => {
                view.hidden = view !== target;
            });
            document.querySelectorAll('.nav-item').forEach((item) => {
                const isActive = item === button;
                item.classList.toggle('active', isActive);
                if (isActive) {
                    item.setAttribute('aria-current', 'page');
                } else {
                    item.removeAttribute('aria-current');
                }
            });
            if (window.matchMedia('(min-width: 901px)').matches) {
                document.getElementById('mainContent').scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}

function init() {
    const initialDate = document.getElementById('entryDate');
    initialDate.value = state.selectedDate;
    document.getElementById('reminderDate').value = state.selectedDate;
    applyTheme();
    renderDailyQuote();
    attachEvents();
    loadDiaryData();
}

init();
