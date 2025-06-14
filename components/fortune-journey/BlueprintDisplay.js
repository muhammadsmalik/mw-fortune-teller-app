'use client';

import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2, ArrowLeft, CheckCircle, Sparkles, BookOpen } from 'lucide-react';
import allQuestions from '@/lib/persona_questions.json';
import Image from 'next/image';

export default function BlueprintDisplay({ userInfo, highLevelChoices, tacticalChoices, persona, onComplete, onBack }) {
  const [productMapping, setProductMapping] = useState(null);
  const [generatedSummary, setGeneratedSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const tacticalSolutions = useMemo(() => {
    if (!productMapping) return [];
    return tacticalChoices.map(id => {
      const allPersonaQuestions = [...allQuestions[persona].high, ...allQuestions[persona].tactical];
      const question = allPersonaQuestions.find(q => q.id === id);
      const tacticalIndex = allQuestions[persona].tactical.findIndex(q => q.id === id);

      return {
        id,
        questionText: question ? question.text : 'Unknown Challenge',
        solution: productMapping[id],
        imagePath: persona === 'advertiser' ? `/tactical_cards/advertiser/adv_${tacticalIndex + 1}.png` : null
      };
    });
  }, [productMapping, tacticalChoices, persona]);

  useEffect(() => {
    const fetchAndGenerate = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const mappingRes = await fetch('/product_mapping.json');
        if (!mappingRes.ok) throw new Error('Could not load the cosmic blueprints.');
        const mappingData = await mappingRes.json();
        setProductMapping(mappingData);

        const allPersonaQuestions = [...allQuestions[persona].high, ...allQuestions[persona].tactical];
        const tacticalChallenges = tacticalChoices.map(id => allPersonaQuestions.find(q => q.id === id));
        const selectedSolutions = tacticalChoices.map(id => mappingData[id]);

        const payload = {
            ...userInfo,
            selectedPersona: persona,
            tacticalChallenges,
            selectedSolutions,
        };

        const summaryRes = await fetch('/api/generate-blueprint-summary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!summaryRes.ok) {
            const errorData = await summaryRes.json();
            throw new Error(errorData.error || 'The Oracle is silent. The final prophecy could not be generated.');
        }

        const summaryData = await summaryRes.json();
        setGeneratedSummary(summaryData);

      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (userInfo && persona && highLevelChoices.length > 0 && tacticalChoices.length > 0) {
        fetchAndGenerate();
    } else {
        setError("Missing critical information from the journey to forge the blueprint.");
        setIsLoading(false);
    }
  }, [userInfo, persona, highLevelChoices, tacticalChoices]);
  
  const unselectedQuestions = useMemo(() => {
    if (!productMapping) return [];
    return allQuestions[persona] ? 
      allQuestions[persona].tactical
        .filter(q => !tacticalChoices.includes(q.id))
        .map(q => ({
          id: q.id,
          text: q.text,
          solution: productMapping[q.id] ? `Solution: ${productMapping[q.id].productName}` : 'A mystery to be unraveled.'
        })) 
      : [];
  }, [productMapping, tacticalChoices, persona]);

  if (isLoading || !generatedSummary) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-mw-dark-navy text-mw-white p-4">
        <Loader2 className="h-12 w-12 animate-spin text-mw-light-blue" />
        <p className="mt-4 text-lg font-caveat">The Oracle is weaving the final threads of your destiny...</p>
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
                        {generatedSummary.blueprintTitle}
                    </CardTitle>
                </CardHeader>

                <CardContent className="p-8">
                    <div className="space-y-16">
                        {[generatedSummary.solution1, generatedSummary.solution2].map((solution, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -30 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.5 + index * 0.2, duration: 0.5 }}
                                className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 items-center"
                            >
                                {tacticalSolutions[index]?.imagePath && (
                                  <div className="md:col-span-1 flex justify-center">
                                    <Image 
                                      src={tacticalSolutions[index].imagePath}
                                      alt={`Tarot card for: ${solution.challenge}`}
                                      width={200}
                                      height={300}
                                      className="rounded-lg shadow-lg"
                                    />
                                  </div>
                                )}
                                <div className={tacticalSolutions[index]?.imagePath ? "md:col-span-2" : "md:col-span-3"}>
                                    <h3 className="text-2xl font-semibold text-mw-light-blue mb-4">{solution.challenge}</h3>
                                    <p className="text-mw-white/90 leading-relaxed">{solution.prophecy}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="text-center mt-16 border-t border-mw-gold/20 pt-8">
                        <p className="text-lg text-mw-white/90 italic leading-relaxed">
                            "{generatedSummary.closingProphecy}"
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
                <Button onClick={onComplete} size="lg" className="px-8 py-3 text-lg font-semibold bg-gradient-to-r from-[#FEDA24] to-[#FAAE25] text-mw-dark-navy hover:opacity-90 rounded-lg shadow-md">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Complete My Journey
                </Button>
            </div>
        </motion.div>
    </div>
  );
} 