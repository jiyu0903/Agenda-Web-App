import pytest

from diary import create_app


@pytest.fixture
def client(tmp_path):
    app = create_app()
    app.config['TESTING'] = True
    app.config['DATABASE'] = str(tmp_path / 'diary.db')
    with app.app_context():
        from diary.db import init_db
        init_db()
    with app.test_client() as client:
        yield client


def test_home_route(client):
    response = client.get('/')
    assert response.status_code == 200
    assert b'Bloom' in response.data


def test_entries_api_persists(client):
    response = client.post(
        '/api/entries',
        json={
            'date': '2026-10-11',
            'title': 'Coffee date',
            'mood': 'happy',
            'category': 'self-care',
            'note': 'A sweet little moment that felt like a hug.'
        }
    )
    assert response.status_code == 201
    data = response.get_json()
    assert data['title'] == 'Coffee date'
    assert data['category'] == 'self-care'

    all_entries = client.get('/api/entries').get_json()
    assert any(entry['title'] == 'Coffee date' for entry in all_entries)


def test_reminders_api(client):
    response = client.post(
        '/api/reminders',
        json={
            'title': 'Tea break',
            'due_date': '2026-10-12',
            'repeat': 'weekly',
            'active': True
        }
    )
    assert response.status_code == 201
    reminders = client.get('/api/reminders').get_json()
    assert any(reminder['title'] == 'Tea break' for reminder in reminders)


def test_additional_mood_is_saved_and_summarized(client):
    response = client.post(
        '/api/entries',
        json={
            'date': '2026-10-11',
            'title': 'A thankful moment',
            'mood': 'grateful',
            'category': 'personal',
            'note': 'I appreciated a kind message today.'
        }
    )

    assert response.status_code == 201
    assert response.get_json()['mood'] == 'grateful'
    assert client.get('/api/mood-summary').get_json()['grateful'] == 1


def test_entry_archive_restore_and_expiration(client):
    created = client.post(
        '/api/entries',
        json={
            'date': '2026-10-11',
            'title': 'Archive me',
            'mood': 'calm',
            'category': 'personal',
            'note': 'This entry should be recoverable.'
        }
    ).get_json()
    entry_id = created['id']

    archived = client.delete(f'/api/entries/{entry_id}')
    assert archived.status_code == 200
    assert all(entry['id'] != entry_id for entry in client.get('/api/entries').get_json())
    assert any(entry['id'] == entry_id for entry in client.get('/api/entries/archive').get_json())

    restored = client.post(f'/api/entries/{entry_id}/restore')
    assert restored.status_code == 200
    assert any(entry['id'] == entry_id for entry in client.get('/api/entries').get_json())

    client.delete(f'/api/entries/{entry_id}')
    with client.application.app_context():
        from diary.db import get_db
        get_db().execute(
            "UPDATE entries SET archived_at = datetime('now', '-31 days') WHERE id = ?",
            (entry_id,),
        )
        get_db().commit()

    assert client.get('/api/entries/archive').get_json() == []
    assert client.post(f'/api/entries/{entry_id}/restore').status_code == 404
