import os

DEBUG = True
SECRET_KEY = os.environ.get('SECRET_KEY', 'cozy-diary-secret')
DATABASE = os.environ.get('DIARY_DB_PATH', os.path.join(os.path.dirname(__file__), 'diary.db'))
MONGO_URI = os.environ.get('MONGO_URI', 'mongodb://localhost:27017')
