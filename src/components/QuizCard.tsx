"use client";

import { useState, useTransition } from "react";
import { answerQuiz } from "@/app/actions";

type Question = {
  id: string;
  question: string;
  category: string;
  points: number;
  correctIndex: number;
  explanation: string;
  options: string[];
};

export function QuizCard({
  question,
  profileId,
  alreadyAnswered,
}: {
  question: Question;
  profileId: string;
  alreadyAnswered: { chosenIndex: number; correct: boolean } | null;
}) {
  const [chosen, setChosen] = useState<number | null>(alreadyAnswered?.chosenIndex ?? null);
  const [, startTransition] = useTransition();

  const answered = chosen !== null;

  function choose(index: number) {
    if (answered) return;
    setChosen(index);
    startTransition(() => answerQuiz(question.id, profileId, index));
  }

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <p className="card-title">Question of the Day</p>
        <span className="chip gold">
          {answered ? (chosen === question.correctIndex ? `+${question.points} pts earned` : "+0 pts") : `+${question.points} pts`}
        </span>
      </div>
      <p style={{ fontSize: 14.5, fontWeight: 700, lineHeight: 1.4, margin: "2px 0 12px" }}>{question.question}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 2 }}>
        {question.options.map((opt, i) => {
          const letter = "ABCD"[i];
          let cls = "quiz-opt";
          if (answered) {
            if (i === question.correctIndex) cls += " correct";
            else if (i === chosen) cls += " wrong";
          }
          return (
            <button key={letter} className={cls} onClick={() => choose(i)} disabled={answered}>
              <span className="letter">{letter}</span>
              {opt}
            </button>
          );
        })}
      </div>
      {answered && (
        <div style={{ fontSize: 12.5, lineHeight: 1.55, color: "var(--ink-soft)", marginTop: 11 }}>
          {question.explanation}
        </div>
      )}
      <div style={{ marginTop: 10, fontSize: 11.5, color: "var(--muted)", fontWeight: 650 }}>{question.category}</div>
    </div>
  );
}
