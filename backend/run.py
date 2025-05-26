from app import create_app, db
from app.models import User, Role

app = create_app()

@app.shell_context_processor
def make_shell_context():
    return {
        'db': db, 'User': User, 'Role': Role, 'Book': Book,
        'Task': Task, 'News': News, 'Test': Test, 'Question': Question,
        'TestUser': TestUser
    }

if __name__ == '__main__':
    app.run(debug=True)