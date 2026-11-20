import os
import json
import click
from flask.cli import with_appcontext
from dotenv import load_dotenv
from flask import Flask
from flask_sqlalchemy import SQLAlchemy

load_dotenv()

db = SQLAlchemy()

def register_commands(app):
    """Register custom Flask CLI commands."""
    @app.cli.command("import-quiz")
    @click.argument("filepath")
    @with_appcontext
    def import_quiz(filepath):
        """Import a quiz and its questions from a JSON file."""
        # Import models and validation here to avoid circular imports
        from app.models import Quiz, Question
        from app.routes import validate_quiz_data

        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except FileNotFoundError:
            click.echo(f"Error: File '{filepath}' not found.", err=True)
            return
        except json.JSONDecodeError as e:
            click.echo(f"Error: Invalid JSON format: {e}", err=True)
            return
        except Exception as e:
            click.echo(f"Error reading file: {e}", err=True)
            return

        # 1. Validate the quiz data using the shared validation function
        error = validate_quiz_data(data)
        if error:
            click.echo(f"Validation Error: {error}", err=True)
            return

        # 2. Save inside a transaction (atomic)
        try:
            quiz = Quiz(
                title=data["title"], 
                description=data.get("description", "")
            )
            db.session.add(quiz)
            db.session.flush() # Generates quiz.id without committing yet

            for q_data in data["questions"]:
                question = Question(
                    text=q_data["text"],
                    option_a=q_data["option_a"],
                    option_b=q_data["option_b"],
                    option_c=q_data["option_c"],
                    option_d=q_data["option_d"],
                    correct_option=q_data["correct_option"],
                    quiz_id=quiz.id
                )
                db.session.add(question)

            db.session.commit()
            click.echo(f"Successfully imported quiz: '{quiz.title}' with {len(data['questions'])} questions.")
        except Exception as e:
            db.session.rollback()
            click.echo(f"Database Error: {e}", err=True)


def create_app(test_config=None):
    app = Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get(
        "DATABASE_URL", "sqlite:///quizmaster.db"
    )
    app.config["LOAD_SEED_DATA"] = True
    if test_config:
        app.config.update(test_config)

    db.init_app(app)

    from app.routes import api, pages
    app.register_blueprint(api)
    app.register_blueprint(pages)

    # Register the CLI commands we defined above
    register_commands(app)

    with app.app_context():
        from app.seed import seed_data
        db.create_all()
        if app.config["LOAD_SEED_DATA"]:
            seed_data()

    return app