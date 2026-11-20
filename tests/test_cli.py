import json
from app.models import Quiz


def test_import_quiz_valid(app, tmp_path):
    quiz_file = tmp_path / "quiz.json"
    quiz_file.write_text(json.dumps({
        "title": "CLI Sample Quiz",
        "description": "Test quiz",
        "questions": [
            {
                "text": "2 + 2?",
                "option_a": "3",
                "option_b": "4",
                "option_c": "5",
                "option_d": "6",
                "correct_option": "b"
            }
        ]
    }), encoding="utf-8")

    runner = app.test_cli_runner()
    result = runner.invoke(args=["import-quiz", str(quiz_file)])

    assert result.exit_code == 0
    with app.app_context():
        assert Quiz.query.filter_by(title="CLI Sample Quiz").first() is not None


def test_import_quiz_invalid_saves_nothing(app, tmp_path):
    quiz_file = tmp_path / "bad_quiz.json"
    quiz_file.write_text(json.dumps({
        "title": "Bad Quiz",
        "questions": [
            {
                "text": "Bad question",
                "option_a": "1",
                "option_b": "2",
                "option_c": "3",
                "option_d": "4",
                "correct_option": "z"
            }
        ]
    }), encoding="utf-8")

    runner = app.test_cli_runner()
    result = runner.invoke(args=["import-quiz", str(quiz_file)])

    assert "Question 1" in result.output
    with app.app_context():
        assert Quiz.query.filter_by(title="Bad Quiz").first() is None