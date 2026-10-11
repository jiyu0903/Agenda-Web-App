import sqlite3

from flask import current_app, g


def get_db():
    if 'db' not in g:
        connection = sqlite3.connect(current_app.config['DATABASE'])
        connection.row_factory = sqlite3.Row
        g.db = connection
    return g.db


def close_db(exception=None):
    db = g.pop('db', None)
    if db is not None:
        db.close()


def init_db():
    db = get_db()
    db.execute(
        '''
        CREATE TABLE IF NOT EXISTS entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            date TEXT NOT NULL,
            mood TEXT NOT NULL,
            category TEXT NOT NULL DEFAULT 'personal',
            note TEXT NOT NULL
        )
        '''
    )

    try:
        db.execute("SELECT category FROM entries LIMIT 1")
    except sqlite3.DatabaseError:
        db.execute('ALTER TABLE entries ADD COLUMN category TEXT NOT NULL DEFAULT "personal"')

    try:
        db.execute('SELECT archived_at FROM entries LIMIT 1')
    except sqlite3.DatabaseError:
        db.execute('ALTER TABLE entries ADD COLUMN archived_at TEXT')

    db.execute(
        '''
        CREATE TABLE IF NOT EXISTS reminders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            due_date TEXT NOT NULL,
            repeat TEXT NOT NULL DEFAULT 'none',
            active INTEGER NOT NULL DEFAULT 1
        )
        '''
    )
    db.commit()


def fetch_entries():
    purge_expired_entries()
    rows = get_db().execute(
        'SELECT id, title, date, mood, category, note FROM entries '
        'WHERE archived_at IS NULL ORDER BY date DESC, id DESC'
    ).fetchall()
    return [dict(row) for row in rows]


def fetch_archived_entries():
    purge_expired_entries()
    rows = get_db().execute(
        'SELECT id, title, date, mood, category, note, archived_at FROM entries '
        'WHERE archived_at IS NOT NULL ORDER BY archived_at DESC, id DESC'
    ).fetchall()
    return [dict(row) for row in rows]


def archive_entry(entry_id):
    cursor = get_db().execute(
        "UPDATE entries SET archived_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') "
        'WHERE id = ? AND archived_at IS NULL',
        (entry_id,),
    )
    get_db().commit()
    return cursor.rowcount > 0


def restore_entry(entry_id):
    purge_expired_entries()
    cursor = get_db().execute(
        'UPDATE entries SET archived_at = NULL WHERE id = ? AND archived_at IS NOT NULL',
        (entry_id,),
    )
    get_db().commit()
    return cursor.rowcount > 0


def purge_expired_entries():
    db = get_db()
    db.execute(
        "DELETE FROM entries WHERE archived_at IS NOT NULL "
        "AND datetime(archived_at) <= datetime('now', '-30 days')"
    )
    db.commit()


def create_entry(title, date, mood, category, note):
    cursor = get_db().execute(
        'INSERT INTO entries (title, date, mood, category, note) VALUES (?, ?, ?, ?, ?)',
        (title, date, mood, category, note),
    )
    get_db().commit()
    return {
        'id': cursor.lastrowid,
        'title': title,
        'date': date,
        'mood': mood,
        'category': category,
        'note': note,
    }


def fetch_reminders():
    rows = get_db().execute(
        'SELECT id, title, due_date, repeat, active FROM reminders ORDER BY due_date ASC, id ASC'
    ).fetchall()
    return [
        {
            'id': row['id'],
            'title': row['title'],
            'due_date': row['due_date'],
            'repeat': row['repeat'],
            'active': bool(row['active']),
        }
        for row in rows
    ]


def create_reminder(title, due_date, repeat, active):
    cursor = get_db().execute(
        'INSERT INTO reminders (title, due_date, repeat, active) VALUES (?, ?, ?, ?)',
        (title, due_date, repeat, 1 if active else 0),
    )
    get_db().commit()
    return {
        'id': cursor.lastrowid,
        'title': title,
        'due_date': due_date,
        'repeat': repeat,
        'active': bool(active),
    }
