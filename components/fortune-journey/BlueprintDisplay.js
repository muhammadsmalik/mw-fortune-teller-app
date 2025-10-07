'use client';

import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2, ArrowLeft, CheckCircle, Sparkles, BookOpen, Star } from 'lucide-react';
import allQuestions from '@/lib/persona_questions.json';
import Image from 'next/image';
import productMappingData from '@/public/product_mapping.json';

export default function BlueprintDisplay({ userInfo, highLevelChoices, tacticalChoices, persona, onComplete, onBack }) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const title = useMemo(() => {
    if (!userInfo || !userInfo.fullName) return "Blueprint for DOOH Mastery";
    return `${userInfo.fullName}'s Blueprint for DOOH Mastery`;
  }, [userInfo]);

  const tacticalSolutions = useMemo(() => {
    const personaPathConfig = {
      brand_owner: { prefix: 'adv', folder: 'brand_owner' },
      media_owner: { prefix: 'pub', folder: 'media_owner' },
      media_agency: { prefix: 'plat', folder: 'media_agency' }
    };

    return tacticalChoices.map(id => {
      const allPersonaQuestions = allQuestions[persona]?.questions || [];
      const question = allPersonaQuestions.find(q => q.id === id);
      const questionIndex = allPersonaQuestions.findIndex(q => q.id === id);
      const config = personaPathConfig[persona];

      let imagePath = null;
      if (config && questionIndex !== -1) {
        imagePath = `/tactical_cards/${config.folder}/${config.prefix}_${questionIndex + 1}.png`;
      }

      return {
        id,
        questionText: question ? question.text : 'Unknown Challenge',
        solution: productMappingData[id],
        imagePath
      };
    });
  }, [tacticalChoices, persona]);

  const unselectedQuestions = useMemo(() => {
    return allQuestions[persona] ?
      allQuestions[persona].questions
        .filter(q => !tacticalChoices.includes(q.id))
        .map(q => ({
          id: q.id,
          text: q.text,
          solution: productMappingData[q.id] ? `Solution: ${productMappingData[q.id].productName}` : 'A mystery to be unraveled.'
        }))
      : [];
  }, [tacticalChoices, persona]);

  const generateBlueprintHtml = () => {
    let html = `<h2 style="font-family: Arial, sans-serif; color: #1a202c; font-size: 22px; font-weight: bold;">${title}</h2>`;
    html += `<div style="margin-top: 20px;">`;
    
    html += `<h3 style="font-family: Arial, sans-serif; color: #2d3748; font-size: 18px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-top: 24px;">Your Chosen Solutions</h3>`;
    html += '<div>';
    tacticalSolutions.forEach(item => {
      html += `<div style="margin-top: 16px; padding-bottom: 16px; border-bottom: 1px solid #edf2f7;">`;
      html += `<h4 style="font-family: Arial, sans-serif; color: #2c5282; font-size: 16px; font-weight: bold; margin-bottom: 4px;">${item.solution.productName}</h4>`;
      html += `<p style="font-family: Arial, sans-serif; color: #4a5568; font-style: italic; margin-bottom: 8px;">"${item.solution.oneLiner}"</p>`;
      if (item.solution.features && item.solution.features.length > 0) {
        html += `<ul style="list-style-type: none; padding-left: 0; margin-top: 8px;">`;
        item.solution.features.forEach(feature => {
          html += `<li style="font-family: Arial, sans-serif; color: #4a5568; font-size: 14px; margin-bottom: 4px;">- ${feature}</li>`;
        });
        html += `</ul>`;
      }
      html += `</div>`;
    });
    html += '</div>';

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
                    <div className="space-y-12">
                        {tacticalSolutions.map((item, index) => (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, x: -30 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.5 + index * 0.2, duration: 0.5 }}
                                className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-8 items-center"
                            >
                                {item.imagePath && (
                                  <div className="md:col-span-1 flex justify-center">
                                    <Image 
                                      src={item.imagePath}
                                      alt={`Tarot card for: ${item.questionText}`}
                                      width={150}
                                      height={225}
                                      className="rounded-lg shadow-lg"
                                    />
                                  </div>
                                )}
                                <div className={item.imagePath ? "md:col-span-3" : "md:col-span-4"}>
                                    <div className="flex items-start gap-4">
                                        <div className="text-4xl">{item.solution.icon}</div>
                                        <div>
                                            {item.solution.platformPillar && (
                                                <div className="mb-2">
                                                    <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${
                                                        item.solution.platformPillar === 'Measure' ? 'bg-blue-500/20 text-blue-300' :
                                                        item.solution.platformPillar === 'Influence' ? 'bg-purple-500/20 text-purple-300' :
                                                        'bg-teal-500/20 text-teal-300' // Automate
                                                    }`}>
                                                        {item.solution.platformPillar}
                                                    </span>
                                                </div>
                                            )}
                                            <h3 className="text-2xl font-bold text-mw-light-blue mb-2">{item.solution.productName}</h3>
                                            <p className="text-mw-white/90 leading-relaxed italic mb-4">&ldquo;{item.solution.oneLiner}&rdquo;</p>
                                            <div className="flex flex-wrap gap-2">
                                                {item.solution.features.map(feature => (
                                                    <div key={feature} className="flex items-center gap-1.5 bg-mw-dark-blue/40 text-mw-light-blue text-xs font-medium px-2 py-1 rounded-full">
                                                        <Star className="h-3 w-3" />
                                                        {feature}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="text-center mt-16 border-t border-mw-gold/20 pt-8">
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