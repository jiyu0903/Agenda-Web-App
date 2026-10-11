import { getStore } from '@netlify/blobs';

const ARCHIVE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const MOODS = ['happy', 'calm', 'reflective', 'excited', 'sad', 'anxious', 'grateful', 'tired'];

const entriesStore = getStore('diary-entries');
const remindersStore = getStore('diary-reminders');

function jsonResponse(data, statusCode = 200) {
    return new Response(JSON.stringify(data), {
        status: statusCode,
        headers: { 'content-type': 'application/json; charset=utf-8' }
    });
}

async function listStoreRecords(store, prefix) {
    const { blobs } = await store.list({ prefix });
    const records = await Promise.all(blobs.map(({ key }) => store.get(key, { type: 'json' })));
    return records.filter(Boolean);
}

async function purgeExpiredEntries() {
    const archivedEntries = await listStoreRecords(entriesStore, 'entry:');
    const now = Date.now();
    const expiredEntries = archivedEntries.filter((entry) => (
        entry.archived_at && now - Date.parse(entry.archived_at) >= ARCHIVE_RETENTION_MS
    ));
    await Promise.all(expiredEntries.map((entry) => entriesStore.delete(`entry:${entry.id}`)));
}

async function handleEntries(method, remainingPath, request) {
    await purgeExpiredEntries();

    if (remainingPath === 'entries' && method === 'GET') {
        const entries = await listStoreRecords(entriesStore, 'entry:');
        return jsonResponse(entries.filter((entry) => !entry.archived_at).sort((a, b) => (
            b.date.localeCompare(a.date) || String(b.id).localeCompare(String(a.id))
        )));
    }

    if (remainingPath === 'entries' && method === 'POST') {
        const payload = await request.json().catch(() => ({}));
        const title = String(payload.title || '').trim();
        const date = String(payload.date || '').trim();
        const note = String(payload.note || '').trim();
        if (!title || !date || !note) {
            return jsonResponse({ error: 'title, date, and note are required' }, 400);
        }

        const entry = {
            id: crypto.randomUUID(),
            title,
            date,
            mood: String(payload.mood || 'happy').trim(),
            category: String(payload.category || 'personal').trim(),
            note
        };
        await entriesStore.setJSON(`entry:${entry.id}`, entry);
        return jsonResponse(entry, 201);
    }

    if (remainingPath === 'entries/archive' && method === 'GET') {
        const entries = await listStoreRecords(entriesStore, 'entry:');
        return jsonResponse(entries.filter((entry) => entry.archived_at).sort((a, b) => (
            b.archived_at.localeCompare(a.archived_at)
        )));
    }

    const entryAction = remainingPath.match(/^entries\/([^/]+)(?:\/(restore))?$/);
    if (entryAction) {
        const [, entryId, restoreAction] = entryAction;
        const key = `entry:${entryId}`;
        const entry = await entriesStore.get(key, { type: 'json' });

        if (method === 'DELETE' && !restoreAction) {
            if (!entry || entry.archived_at) return jsonResponse({ error: 'entry not found' }, 404);
            entry.archived_at = new Date().toISOString();
            await entriesStore.setJSON(key, entry);
            return jsonResponse({ archived: true, id: entryId });
        }

        if (method === 'POST' && restoreAction) {
            if (!entry || !entry.archived_at) return jsonResponse({ error: 'archived entry not found' }, 404);
            entry.archived_at = null;
            await entriesStore.setJSON(key, entry);
            return jsonResponse({ restored: true, id: entryId });
        }
    }

    return jsonResponse({ error: 'not found' }, 404);
}

async function handleReminders(method, remainingPath, request) {
    if (remainingPath !== 'reminders') return jsonResponse({ error: 'not found' }, 404);

    if (method === 'GET') {
        const reminders = await listStoreRecords(remindersStore, 'reminder:');
        return jsonResponse(reminders.sort((a, b) => (
            a.due_date.localeCompare(b.due_date) || String(a.id).localeCompare(String(b.id))
        )));
    }

    if (method === 'POST') {
        const payload = await request.json().catch(() => ({}));
        const title = String(payload.title || '').trim();
        const dueDate = String(payload.due_date || '').trim();
        if (!title || !dueDate) {
            return jsonResponse({ error: 'title and due_date are required' }, 400);
        }

        const reminder = {
            id: crypto.randomUUID(),
            title,
            due_date: dueDate,
            repeat: String(payload.repeat || 'none').trim(),
            active: Boolean(payload.active ?? true)
        };
        await remindersStore.setJSON(`reminder:${reminder.id}`, reminder);
        return jsonResponse(reminder, 201);
    }

    return jsonResponse({ error: 'method not allowed' }, 405);
}

export default async (request) => {
    try {
        const url = new URL(request.url);
        const route = (url.searchParams.get('route') || '').replace(/^\/+|\/+$/g, '');
        const method = request.method.toUpperCase();

        if (route.startsWith('entries')) {
            return await handleEntries(method, route, request);
        }

        if (route === 'reminders') {
            return await handleReminders(method, route, request);
        }

        if (route === 'mood-summary' && method === 'GET') {
            const entries = await listStoreRecords(entriesStore, 'entry:');
            const counts = Object.fromEntries(MOODS.map((mood) => [mood, 0]));
            entries.filter((entry) => !entry.archived_at).forEach((entry) => {
                counts[entry.mood] = (counts[entry.mood] || 0) + 1;
            });
            return jsonResponse(counts);
        }

        return jsonResponse({ error: 'not found' }, 404);
    } catch (error) {
        console.error('Netlify API error:', error);
        return jsonResponse({ error: 'Internal server error' }, 500);
    }
};