'use client';

import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2, ArrowLeft, CheckCircle, Sparkles, BookOpen } from 'lucide-react';
import allQuestions from '@/lib/persona_questions.json';
import Image from 'next/image';
import questionPlatformMapping from '@/lib/question_platform_mapping.json';
import fortunePredictions from '@/lib/fortune_predictions.json';

// Tarot card definitions
const tarotCards = {
  architect: { name: 'The Architect', platform: 'Studio', image: 'architect.jpg' },
  navigator: { name: 'The Navigator', platform: 'Planner', image: 'navigator.jpg' },
  connector: { name: 'The Connector', platform: 'Influence', image: 'connector.jpg' },
  magician: { name: 'The Magician', platform: 'Activate', image: 'magician.jpg' },
  merchant: { name: 'The Merchant', platform: 'Market', image: 'merchant.jpg' },
  judge: { name: 'The Judge', platform: 'Measure', image: 'judge.jpg' },
  oracle: { name: 'The Oracle', platform: 'Science', image: 'oracle.jpg' },
};

export default function BlueprintDisplay({ userInfo, highLevelChoices, tacticalChoices, selectedTarotCards, persona, onComplete, onBack }) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const title = useMemo(() => {
    if (!userInfo || !userInfo.fullName) return "Blueprint for DOOH Mastery";
    return `${userInfo.fullName}'s Blueprint for DOOH Mastery`;
  }, [userInfo]);

  const tarotPredictions = useMemo(() => {
    // Map card IDs to full objects with personalized predictions
    const tarotCardIds = selectedTarotCards || [];
    return tarotCardIds.slice(0, 2).map(cardId => {
      const card = tarotCards[cardId];
      if (!card) return null;

      const predictions = fortunePredictions[persona]?.[card.platform] || [];

      // Personalize predictions
      const personalizedPredictions = predictions.map(pred =>
        pred
          .replace(/\$\{Name\}/g, userInfo?.fullName || 'Seeker')
          .replace(/\$\{Company Name\}/g, userInfo?.companyName || 'Your Company')
          .replace(/\$\{Industry\}/g, userInfo?.industryType || 'Your Industry')
      );

      return {
        ...card,
        predictions: personalizedPredictions
      };
    }).filter(Boolean);
  }, [selectedTarotCards, persona, userInfo]);


  const unselectedQuestions = useMemo(() => {
    return allQuestions[persona] ?
      allQuestions[persona].questions
        .filter(q => !tacticalChoices.includes(q.id))
        .map(q => {
          const mapping = questionPlatformMapping[persona]?.[q.id];
          const platform = mapping?.platform || 'Unknown Path';
          const interpretation = mapping?.interpretation || 'A mystery to be unraveled.';

          return {
            id: q.id,
            text: q.text,
            solution: `Solution: Moving Walls ${platform} - ${interpretation}`
          };
        })
      : [];
  }, [tacticalChoices, persona]);

  const generateBlueprintHtml = () => {
    let html = `<h2 style="font-family: Arial, sans-serif; color: #1a202c; font-size: 22px; font-weight: bold;">${title}</h2>`;
    html += `<div style="margin-top: 20px;">`;

    // Add tarot cards section
    if (tarotPredictions.length > 0) {
      html += `<h3 style="font-family: Arial, sans-serif; color: #FEDA24; font-size: 18px; border-bottom: 2px solid #FEDA24; padding-bottom: 8px; margin-top: 24px;">Your Destiny Cards</h3>`;
      tarotPredictions.forEach(card => {
        html += `<div style="margin-top: 16px; padding-bottom: 16px;">`;
        html += `<h4 style="font-family: Arial, sans-serif; color: #2c5282; font-size: 16px; font-weight: bold; margin-bottom: 4px;">${card.name}</h4>`;
        html += `<ul style="list-style-type: disc; padding-left: 20px; margin-top: 8px;">`;
        card.predictions.forEach(pred => {
          html += `<li style="font-family: Arial, sans-serif; color: #4a5568; font-size: 14px; margin-bottom: 6px;">${pred}</li>`;
        });
        html += `</ul></div>`;
      });
    }

    if (unselectedQuestions.length > 0) {
        html += `<h3 style="font-family: Arial, sans-serif; color: #2d3748; font-size: 18px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-top: 24px;">Other Paths to Explore</h3>`;
        html += '<div>';
        unselectedQuestions.forEach(q => {
            html += `<div style="margin-top: 12px;">`;
            html += `<p style="font-family: Arial, sans-serif; font-weight: bold; color: #4a5568;">${q.text}</p>`;
            html += `<p style="font-family: Arial, sans-serif; color: #718096; font-size: 14px; margin-top: 4px;">${q.solution}</p>`;
            html += `</div>`;
        });
        html += '</div>';
    }

    html += `</div>`;
    return html;
  };

  useEffect(() => {
    setIsLoading(true);
    if (userInfo && persona && tacticalChoices.length > 0) {
      // Simulate a brief loading period for a smoother feel, as we are no longer fetching from an API
      setTimeout(() => setIsLoading(false), 500);
    } else {
        setError("Missing critical information from the journey to forge the blueprint.");
        setIsLoading(false);
    }
  }, [userInfo, persona, tacticalChoices]);

  const handleComplete = () => {
      const blueprintHtml = generateBlueprintHtml();
      onComplete(blueprintHtml);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-mw-dark-navy text-mw-white p-4">
        <Loader2 className="h-12 w-12 animate-spin text-mw-light-blue" />
        <p className="mt-4 text-lg font-caveat">Forging your strategic blueprint...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-mw-dark-navy text-red-400 p-4">
        <p className="text-xl font-semibold">A Cosmic Glitch!</p>
        <p className="mt-2 text-center">{error}</p>
        <Button onClick={onBack} className="mt-6">Try Again</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-mw-dark-navy text-mw-white p-4 sm:p-8 flex flex-col items-center overflow-y-auto">
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="w-full max-w-5xl my-12"
        >
            <Card className="bg-gradient-to-br from-mw-dark-blue/60 via-purple-900/30 to-mw-dark-blue/60 backdrop-blur-sm border border-mw-light-blue/30 shadow-2xl shadow-mw-light-blue/20">
                <CardHeader className="text-center p-8 border-b border-mw-light-blue/20">
                    <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2, type: 'spring' }}>
                        <Sparkles className="h-12 w-12 mx-auto text-mw-gold" />
                    </motion.div>
                    <CardTitle className="text-mw-gold font-morrison tracking-wide text-4xl mt-4">
                        {title}
                    </CardTitle>
                </CardHeader>

                <CardContent className="p-8">
                    {/* Tarot Cards Section */}
                    {tarotPredictions.length > 0 && (
                      <div className="mb-16 border-b border-mw-gold/20 pb-12">
                        <h2 className="text-3xl font-bold text-mw-gold mb-8 text-center">
                          Your Destiny Cards
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          {tarotPredictions.map((card, index) => (
                            <motion.div
                              key={card.platform}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.2 }}
                              className="flex flex-col items-center"
                            >
                              <Image
                                src={`/tarot_cards/${card.image}`}
                                alt={card.name}
                                width={150}
                                height={225}
                                className="rounded-lg shadow-xl mb-4"
                              />
                              <h3 className="text-xl font-bold text-mw-light-blue mb-3">{card.name}</h3>
                              <ul className="space-y-2 text-mw-white/90">
                                {card.predictions.map((pred, idx) => (
                                  <li key={idx} className="flex items-start gap-2">
                                    <span className="text-mw-gold mt-1">•</span>
                                    <span>{pred}</span>
                                  </li>
                                ))}
                              </ul>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}

                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="text-center mt-16 border-t border-mw-gold/20 pt-8">
                        <p className="text-lg text-mw-white/90 leading-relaxed">
                            Armed with this blueprint, you are poised to reshape the advertising landscape. Embrace the future, for the power to command attention is now yours.
                        </p>
                        <p className="text-md text-mw-gold mt-2">- The Oracle</p>
                    </motion.div>
                </CardContent>
            </Card>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }} className="w-full max-w-5xl mt-12">
                <Card className="bg-card/80 backdrop-blur-sm rounded-lg shadow-xl w-full border border-mw-light-blue/20">
                    <CardHeader className="text-center p-8">
                        <BookOpen className="h-10 w-10 mx-auto text-mw-gold" />
                        <CardTitle className="text-mw-light-blue font-bold tracking-wide text-3xl mt-4">Other Paths of Destiny</CardTitle>
                    </CardHeader>
                    <CardContent className="px-8 pb-8">
                         <ul className="space-y-3">
                            {unselectedQuestions.map(q => (
                                <li key={q.id} className="p-3 bg-mw-dark-blue/20 rounded-md">
                                    <p className="font-semibold text-mw-white/90">{q.text}</p>
                                    <p className="text-sm text-mw-gold/80">{q.solution}</p>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            </motion.div>

            <div className="mt-12 flex justify-between w-full max-w-5xl">
                <Button onClick={onBack} variant="outline" className="border-mw-light-blue/50 text-mw-light-blue hover:bg-mw-light-blue/10 hover:text-white">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Go Back
                </Button>
                <Button onClick={handleComplete} size="lg" className="px-8 py-3 text-lg font-semibold bg-gradient-to-r from-[#FEDA24] to-[#FAAE25] text-mw-dark-navy hover:opacity-90 rounded-lg shadow-md">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Complete My Journey
                </Button>
            </div>
        </motion.div>
    </div>
  );
} 