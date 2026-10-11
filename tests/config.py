from diary import create_app

TESTING = True


def make_app():
    app = create_app()
    app.config['TESTING'] = True
    return app
