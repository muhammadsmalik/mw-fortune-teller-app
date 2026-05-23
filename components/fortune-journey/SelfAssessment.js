'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Loader2, ArrowLeft, CheckCircle2, Circle } from 'lucide-react';
import questions from '@/lib/self_assessment_questions.json';

// Deterministic scoring: each answer is 1-5 (top option = 5).
// overall = normalised to 0..100 regardless of how many questions; sub-score per dimension = answer * 20.
export function scoreSelfAssessment(answers) {
  const vals = questions.map((q) => answers[q.id] || 0); // answers[id] is 1..5
  const sum = vals.reduce((a, b) => a + b, 0);
  const overall = Math.round((sum / (questions.length * 5)) * 100);
  const subScores = {};
  questions.forEach((q) => { subScores[q.id] = { dimension: q.dimension, product: q.product, score: (answers[q.id] || 0) * 20 }; });
  return { overall, subScores };
}

export default function SelfAssessment({ onComplete, onBack, ctaLabel = "See My Reading" }) {
  // answers: { [questionId]: 1..5 }
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const allAnswered = questions.every((q) => answers[q.id]);

  const select = (qId, optionIndex) => {
    setAnswers((prev) => ({ ...prev, [qId]: optionIndex + 1 }));
  };

  const handleSubmit = () => {
    if (!allAnswered || submitting) return;
    setSubmitting(true);
    const { overall, subScores } = scoreSelfAssessment(answers);
    onComplete({ answers, score: overall, subScores });
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-mw-dark-navy text-mw-white p-4 sm:p-8 relative isolate overflow-y-auto">
      <Button
        variant="outline"
        size="icon"
        className="absolute top-6 left-6 z-20 bg-mw-dark-navy/50 text-mw-white hover:bg-mw-dark-navy/80 border-mw-light-blue/50"
        onClick={onBack}
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <div className="absolute top-6 right-6 flex items-center text-sm text-mw-white/70">
        <Image src="/MW-logo-web.svg" alt="Moving Walls Logo" width={24} height={24} className="h-6 w-auto mr-2" />
        <span className="font-semibold">Moving Walls</span>
      </div>

      <div className="w-full max-w-2xl my-16">
        <Card className="bg-card/80 backdrop-blur-sm rounded-lg shadow-xl w-full">
          <CardHeader className="text-center pt-8">
            <CardTitle className="text-mw-light-blue font-bold tracking-wide text-2xl sm:text-3xl">
              Rate Your Operation
            </CardTitle>
            <p className="text-mw-white/70 text-sm mt-2">
              Five quick questions. Pick the line that sounds most like you today — be honest, the Oracle can tell.
            </p>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pt-2 pb-6 space-y-7">
            {questions.map((q, qi) => (
              <div key={q.id} className="bg-mw-dark-blue/40 border border-mw-light-blue/30 rounded-lg p-4">
                <p className="text-mw-white font-semibold text-base sm:text-lg">
                  <span className="text-mw-gold mr-1">{qi + 1}.</span>{q.stem}
                </p>
                <p className="text-mw-white/50 text-xs italic mt-1 mb-3">{q.clarifier}</p>
                <div className="space-y-2">
                  {q.options.map((opt, oi) => {
                    const selected = answers[q.id] === oi + 1;
                    return (
                      <div
                        key={oi}
                        onClick={() => select(q.id, oi)}
                        className={`flex items-start space-x-2 cursor-pointer rounded-md p-2.5 transition-all duration-150 border
                          ${selected
                            ? 'bg-mw-light-blue/30 border-mw-light-blue'
                            : 'bg-mw-dark-blue/20 border-transparent hover:border-mw-light-blue/50 hover:bg-mw-light-blue/10'}`}
                      >
                        {selected
                          ? <CheckCircle2 className="h-5 w-5 text-mw-gold flex-shrink-0 mt-0.5" />
                          : <Circle className="h-5 w-5 text-mw-white/40 flex-shrink-0 mt-0.5" />}
                        <span className={`text-sm sm:text-base leading-snug ${selected ? 'text-mw-white' : 'text-mw-white/80'}`}>{opt}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </CardContent>
          <CardFooter className="pt-2 pb-8 flex justify-center">
            <Button
              onClick={handleSubmit}
              disabled={!allAnswered || submitting}
              size="lg"
              className="px-8 py-3 text-lg font-semibold bg-gradient-to-r from-[#FEDA24] to-[#FAAE25] text-mw-dark-navy hover:opacity-90 rounded-lg shadow-md transform transition-all duration-150 hover:shadow-xl active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting
                ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Reading the cards…</>
                : `${ctaLabel} (${Object.keys(answers).length}/${questions.length})`}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
