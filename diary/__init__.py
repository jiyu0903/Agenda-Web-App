# -*- coding: utf-8 -*-

import os

from flask import Flask

from diary.db import close_db, init_db
from diary.views import diary


def create_app(config_object=None):
    app = Flask(__name__, instance_relative_config=True)

    if config_object is None:
        app.config.from_object('diary.config')
    else:
        app.config.from_object(config_object)

    app.config.setdefault('SECRET_KEY', os.environ.get('SECRET_KEY', 'cozy-diary-secret'))
    app.config.setdefault('DATABASE', os.environ.get('DIARY_DB_PATH', os.path.join(app.root_path, 'diary.db')))
    app.register_blueprint(diary)

    app.teardown_appcontext(close_db)

    with app.app_context():
        init_db()

    return app


app = create_app()
