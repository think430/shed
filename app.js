
const STORAGE_KEY = 'shed-data';
const FILE_EXTENSION = '.shed';
const FILE_MIME = 'application/json';
const XP_PER_DAY_BASE = 10;
const XP_PER_LEVEL = 100;

const today = () => new Date().toISOString().slice(0, 10);
const daysBetween = (a, b) => {
  const msPerDay = 1000 * 60 * 60 * 24;
  const start = new Date(a).setHours(0, 0, 0, 0);
  const end = new Date(b).setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((end - start) / msPerDay));
};
const generateId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

let state = {
  version: 1,
  habits: [],
  globalXp: 0,
  lastAwardDate: null
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const save = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const load = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.habits)) {
        state = { ...state, ...parsed };
      }
    }
  } catch (e) {
    console.error('Failed to load Shed data', e);
  }
};

const levelFromXp = (xp) => Math.floor(xp / XP_PER_LEVEL) + 1;

const dailyXp = (difficulty) => difficulty * XP_PER_DAY_BASE;

const habitStreak = (habit) => {
  const anchor = habit.relapses.length > 0
    ? habit.relapses[habit.relapses.length - 1]
    : habit.createdAt;
  return daysBetween(anchor, new Date().toISOString());
};

const awardDailyXp = () => {
  const currentDate = today();
  if (state.lastAwardDate === currentDate) return;

  state.habits.forEach((habit) => {
    if (habitStreak(habit) > 0) {
      const gain = dailyXp(habit.difficulty);
      habit.xp += gain;
      state.globalXp += gain;
    }
    const s = habitStreak(habit);
    if (s > habit.bestStreak) habit.bestStreak = s;
  });

  state.lastAwardDate = currentDate;
  save();
};

const updateGlobalStats = () => {
  $('#globalLevel').textContent = `Lv. ${levelFromXp(state.globalXp)}`;
  $('#globalXp').textContent = `${state.globalXp} XP`;
};

const emptyState = () => {
  const container = $('#habitsContainer');
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon" aria-hidden="true">🌱</div>
      <p>No habits yet.</p>
      <p class="empty-hint">Tap <strong>New habit</strong> to start breaking one.</p>
    </div>
  `;
};

const renderHabits = () => {
  const container = $('#habitsContainer');
  if (state.habits.length === 0) {
    emptyState();
    updateGlobalStats();
    return;
  }

  container.innerHTML = '';

  const sorted = [...state.habits].sort((a, b) => {
    const sa = habitStreak(a);
    const sb = habitStreak(b);
    return sb - sa || b.xp - a.xp;
  });

  sorted.forEach((habit) => {
    const streak = habitStreak(habit);
    const level = levelFromXp(habit.xp);
    const relapseCount = habit.relapses.length;
    const nextMilestone = Math.ceil((streak + 1) / 7) * 7;
    const progressToMilestone = streak % 7;

    const card = document.createElement('article');
    card.className = 'habit-card';
    card.dataset.id = habit.id;

    card.innerHTML = `
      <div class="habit-header">
        <div class="habit-title-row">
          <h3 class="habit-name">${escapeHtml(habit.name)}</h3>
          <span class="habit-level" title="Habit level">Lv. ${level}</span>
        </div>
        <div class="habit-meta">
          <span class="difficulty difficulty-${habit.difficulty}">${difficultyLabel(habit.difficulty)}</span>
          <span>${relapseCount} relapse${relapseCount === 1 ? '' : 's'}</span>
        </div>
      </div>
      <div class="streak-display">
        <div class="streak-number" aria-label="${streak} day streak">${streak}</div>
        <div class="streak-label">day${streak === 1 ? '' : 's'} clean</div>
        <div class="streak-best" aria-label="Best streak ${habit.bestStreak} days">Best: ${habit.bestStreak}</div>
      </div>
      <div class="milestone-bar" aria-hidden="true">
        <div class="milestone-track">
          <div class="milestone-fill" style="width: ${(progressToMilestone / 7) * 100}%"></div>
        </div>
        <span class="milestone-label">${nextMilestone - streak} day${nextMilestone - streak === 1 ? '' : 's'} to ${nextMilestone}🔥</span>
      </div>
      <div class="habit-actions">
        <button class="button relapse" data-action="relapse" type="button" title="Log a relapse">Confess relapse</button>
        <button class="button ghost" data-action="edit" type="button" title="Edit habit">Edit</button>
        <button class="button ghost danger" data-action="delete" type="button" title="Delete habit">Delete</button>
      </div>
    `;

    container.appendChild(card);
  });

  updateGlobalStats();
};

const escapeHtml = (str) => {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

const difficultyLabel = (value) => {
  switch (Number(value)) {
    case 1: return 'Easy';
    case 3: return 'Hard';
    default: return 'Medium';
  }
};

let editingId = null;

const openHabitDialog = (habit = null) => {
  editingId = habit ? habit.id : null;
  $('#habitDialogTitle').textContent = habit ? 'Edit habit' : 'New habit';
  $('#habitName').value = habit ? habit.name : '';
  $('#habitDifficulty').value = habit ? habit.difficulty : 2;
  $('#habitDialog').showModal();
  setTimeout(() => $('#habitName').focus(), 0);
};

const closeHabitDialog = () => {
  $('#habitDialog').close();
  editingId = null;
};

const addOrUpdateHabit = (name, difficulty) => {
  if (editingId) {
    const habit = state.habits.find((h) => h.id === editingId);
    if (habit) {
      habit.name = name;
      habit.difficulty = Number(difficulty);
    }
  } else {
    const now = new Date().toISOString();
    state.habits.push({
      id: generateId(),
      name,
      difficulty: Number(difficulty),
      createdAt: now,
      relapses: [],
      xp: 0,
      bestStreak: 0
    });
  }
  save();
  awardDailyXp();
  renderHabits();
  closeHabitDialog();
};

const logRelapse = (id) => {
  const habit = state.habits.find((h) => h.id === id);
  if (!habit) return;

  const currentStreak = habitStreak(habit);
  if (currentStreak > habit.bestStreak) {
    habit.bestStreak = currentStreak;
  }

  habit.relapses.push(new Date().toISOString());

  const penalty = Math.min(habit.xp, dailyXp(habit.difficulty));
  habit.xp -= penalty;
  state.globalXp = Math.max(0, state.globalXp - penalty);

  save();
  renderHabits();
};

const deleteHabit = (id) => {
  const habit = state.habits.find((h) => h.id === id);
  if (!habit) return;
  state.globalXp = Math.max(0, state.globalXp - habit.xp);
  state.habits = state.habits.filter((h) => h.id !== id);
  save();
  renderHabits();
};

const showConfirm = ({ title, message, actionLabel, onConfirm }) => {
  $('#confirmTitle').textContent = title;
  $('#confirmMessage').textContent = message;
  $('#confirmActionBtn').textContent = actionLabel;
  const dialog = $('#confirmDialog');
  const form = $('#confirmForm');

  const handler = (event) => {
    event.preventDefault();
    const value = event.submitter ? event.submitter.value : 'cancel';
    dialog.close();
    if (value === 'confirm') onConfirm();
    form.removeEventListener('submit', handler);
  };

  form.addEventListener('submit', handler);
  dialog.showModal();
};

const exportData = () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: FILE_MIME });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `shed-progress-${today()}${FILE_EXTENSION}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const importData = async (file) => {
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!data || !Array.isArray(data.habits)) {
      throw new Error('Invalid Shed progress file');
    }
    state = {
      version: data.version || 1,
      habits: data.habits,
      globalXp: typeof data.globalXp === 'number' ? data.globalXp : 0,
      lastAwardDate: data.lastAwardDate || null
    };
    save();
    awardDailyXp();
    renderHabits();
    alert('Progress opened successfully.');
  } catch (e) {
    alert('Could not open progress file. Make sure it is a valid .shed file.');
    console.error(e);
  }
};

const init = () => {
  load();
  awardDailyXp();
  renderHabits();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch((err) => {
      console.warn('Service worker registration failed', err);
    });
  }
};

$('#addHabitBtn').addEventListener('click', () => openHabitDialog());
$('#cancelHabitBtn').addEventListener('click', closeHabitDialog);

$('#habitForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.target;
  const name = form.name.value.trim();
  if (!name) return;
  addOrUpdateHabit(name, form.difficulty.value);
});

[$('#habitDialog'), $('#confirmDialog')].forEach((dialog) => {
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    ) {
      dialog.close();
    }
  });
});

$('#habitsContainer').addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const card = button.closest('.habit-card');
  const id = card.dataset.id;
  const action = button.dataset.action;
  const habit = state.habits.find((h) => h.id === id);

  if (action === 'relapse') {
    showConfirm({
      title: 'Confess a relapse',
      message: `Log a relapse for “${habit.name}”? Your streak will reset, but you keep your progress.`,
      actionLabel: 'Confess',
      onConfirm: () => logRelapse(id)
    });
  } else if (action === 'edit') {
    openHabitDialog(habit);
  } else if (action === 'delete') {
    showConfirm({
      title: 'Delete habit',
      message: `Remove “${habit.name}” and its progress permanently?`,
      actionLabel: 'Delete',
      onConfirm: () => deleteHabit(id)
    });
  }
});

$('#exportBtn').addEventListener('click', exportData);

$('#importBtn').addEventListener('click', () => {
  $('#importFileInput').click();
});

$('#importFileInput').addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) importData(file);
  event.target.value = '';
});

window.addEventListener('DOMContentLoaded', init);
