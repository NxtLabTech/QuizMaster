
const message = document.getElementById("message");
const saved = sessionStorage.getItem("result");

if (saved === null) {
    message.textContent = "No result found. Take a quiz first.";
} else {
    const result = JSON.parse(saved);

    // Display basic result information
    document.getElementById("result-name").textContent =
        "Well done, " + result.player_name;

    document.getElementById("result-score").textContent =
        "You scored " + result.score + " out of " + result.total_questions;

    document.getElementById("result-correct").textContent =
        "Correct answers: " + result.correct;

    document.getElementById("result-wrong").textContent =
        "Wrong answers: " + result.wrong;

    document.getElementById("result-time").textContent =
        "Time taken: " + result.time_taken_seconds + " seconds";

    // Calculate accuracy
    const accuracy = result.total_questions > 0
        ? Math.round((result.correct / result.total_questions) * 100)
        : 0;

    // Motivational message
    let motivationalMessage;

    if (accuracy === 100) {
        motivationalMessage = "🏆 Perfect score! Outstanding work!";
    } else if (accuracy >= 80) {
        motivationalMessage = "🌟 Excellent work! Keep it up!";
    } else if (accuracy >= 60) {
        motivationalMessage = "👏 Good job! You are improving!";
    } else if (accuracy >= 40) {
        motivationalMessage = "💪 Keep practising. You can do better!";
    } else {
        motivationalMessage = "📚 Don't give up! Learn and try again!";
    }

    message.textContent = motivationalMessage;

    // Display accuracy
    const accuracyElement = document.getElementById("result-accuracy");

    if (accuracyElement) {
        accuracyElement.textContent = "Accuracy: " + accuracy + "%";
    }

    // Display question review
    const reviewContainer = document.getElementById("answer-review");

    if (reviewContainer && Array.isArray(result.review)) {
        reviewContainer.replaceChildren();

        result.review.forEach((item, index) => {
            const card = document.createElement("div");
            card.className = item.is_correct
                ? "review-card correct-answer"
                : "review-card wrong-answer";

            const heading = document.createElement("h3");
            heading.textContent = `Question ${index + 1}: ${item.question}`;

            const yourAnswer = document.createElement("p");
            yourAnswer.textContent =
                "Your answer: " + (item.submitted_answer || "Not answered");

            const correctAnswer = document.createElement("p");
            correctAnswer.textContent =
                "Correct answer: " + item.correct_option;

            const status = document.createElement("p");
            status.textContent = item.is_correct
                ? "✅ Correct"
                : "❌ Incorrect";

            const explanation = document.createElement("p");
            explanation.textContent = item.explanation
                ? "Explanation: " + item.explanation
                : "No explanation available.";

            card.append(
                heading,
                yourAnswer,
                correctAnswer,
                status,
                explanation
            );

            reviewContainer.appendChild(card);
        });
    }

    // Navigation links
    document.getElementById("leaderboard-link").href =
        "/leaderboard?quiz=" + result.quiz_id;

    document.getElementById("history-link").href =
        "/history?name=" + encodeURIComponent(result.player_name);

    document.getElementById("result-box").hidden = false;
}
