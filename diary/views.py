# -*- coding: utf-8 -*-

from flask import Blueprint, jsonify, render_template, request

from diary.db import (
    archive_entry,
    create_entry,
    create_reminder,
    fetch_archived_entries,
    fetch_entries,
    fetch_reminders,
    restore_entry,
)


diary = Blueprint('diary', __name__)


@diary.route('/')
def index():
    return render_template('index.html')


@diary.route('/api/entries', methods=['GET'])
def list_entries():
    return jsonify(fetch_entries())


@diary.route('/api/entries', methods=['POST'])
def add_entry():
    payload = request.get_json(silent=True) or {}
    title = (payload.get('title') or '').strip()
    date = (payload.get('date') or '').strip()
    mood = (payload.get('mood') or 'happy').strip()
    category = (payload.get('category') or 'personal').strip()
    note = (payload.get('note') or '').strip()

    if not title or not date or not note:
        return jsonify({'error': 'title, date, and note are required'}), 400

    entry = create_entry(title, date, mood, category, note)
    return jsonify(entry), 201


@diary.route('/api/entries/archive', methods=['GET'])
def list_archived_entries():
    return jsonify(fetch_archived_entries())


@diary.route('/api/entries/<int:entry_id>', methods=['DELETE'])
def move_entry_to_archive(entry_id):
    if not archive_entry(entry_id):
        return jsonify({'error': 'entry not found'}), 404
    return jsonify({'archived': True, 'id': entry_id})


@diary.route('/api/entries/<int:entry_id>/restore', methods=['POST'])
def restore_archived_entry(entry_id):
    if not restore_entry(entry_id):
        return jsonify({'error': 'archived entry not found'}), 404
    return jsonify({'restored': True, 'id': entry_id})


@diary.route('/api/reminders', methods=['GET'])
def list_reminders():
    return jsonify(fetch_reminders())


@diary.route('/api/reminders', methods=['POST'])
def add_reminder():
    payload = request.get_json(silent=True) or {}
    title = (payload.get('title') or '').strip()
    due_date = (payload.get('due_date') or '').strip()
    repeat = (payload.get('repeat') or 'none').strip()
    active = bool(payload.get('active', True))

    if not title or not due_date:
        return jsonify({'error': 'title and due_date are required'}), 400

    reminder = create_reminder(title, due_date, repeat, active)
    return jsonify(reminder), 201


@diary.route('/api/mood-summary', methods=['GET'])
def mood_summary():
    entries = fetch_entries()
    counts = {
        'happy': 0,
        'calm': 0,
        'reflective': 0,
        'excited': 0,
        'sad': 0,
        'anxious': 0,
        'grateful': 0,
        'tired': 0,
    }
    for entry in entries:
        mood = entry.get('mood', 'happy')
        counts[mood] = counts.get(mood, 0) + 1
    return jsonify(counts)
