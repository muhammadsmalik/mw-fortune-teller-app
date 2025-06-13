'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { CheckSquare, Square, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

const MAX_SELECTIONS = 2;

export default function QuestionStage({ questions = [], ctaLabel, onConfirm, onBack }) {
  const [selectedScenarioIds, setSelectedScenarioIds] = useState([]);
  const [error, setError] = useState(null);

  const handleScenarioToggle = (scenarioId) => {
    setSelectedScenarioIds(prevSelected => {
      if (prevSelected.includes(scenarioId)) {
        return prevSelected.filter(id => id !== scenarioId);
      }
      if (prevSelected.length < MAX_SELECTIONS) {
        return [...prevSelected, scenarioId];
      }
      return prevSelected;
    });
  };

  const handleConfirm = () => {
    if (selectedScenarioIds.length !== MAX_SELECTIONS) {
      setError(`Please select exactly ${MAX_SELECTIONS} powers to master.`);
      return;
    }
    setError(null);
    onConfirm(selectedScenarioIds);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-2xl"
    >
      <Card className="bg-card/80 backdrop-blur-sm rounded-lg shadow-xl w-full">
        <CardHeader className="text-center pt-8">
          <CardTitle className="text-mw-light-blue font-bold tracking-wide text-3xl">
            To realize your dreams, you must choose your tools wisely.
          </CardTitle>
          <p className="text-mw-white/70 text-lg mt-2">
            Which powers do you wish to master? Select two.
          </p>
        </CardHeader>
        <CardContent className="px-8 pt-6 pb-8">
          {error && (
            <div className="mb-6 p-3 text-center text-red-400 bg-red-900/30 border border-red-700 rounded-md">
              {error}
            </div>
          )}
          <div className="space-y-4">
            {questions.map((scenario) => {
              const isSelected = selectedScenarioIds.includes(scenario.id);
              return (
                <div
                  key={scenario.id}
                  onClick={() => handleScenarioToggle(scenario.id)}
                  className={`flex items-center space-x-3 cursor-pointer rounded-md p-4 transition-all duration-200 border 
                              ${isSelected 
                                ? 'bg-mw-light-blue/30 border-mw-light-blue shadow-lg' 
                                : 'bg-mw-dark-blue/20 border-transparent hover:border-mw-light-blue/50 hover:bg-mw-light-blue/10'}`}
                >
                  {isSelected ? (
                    <CheckSquare className="h-6 w-6 text-mw-gold flex-shrink-0" />
                  ) : (
                    <Square className="h-6 w-6 text-mw-white/50 flex-shrink-0" />
                  )}
                  <span className={`text-lg leading-snug ${isSelected ? 'text-mw-white font-semibold' : 'text-mw-white/80'}`}>
                    {scenario.text}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
        <CardFooter className="pt-0 pb-8 flex justify-center">
          <Button
            onClick={handleConfirm}
            size="lg"
            className="px-8 py-3 text-lg font-semibold bg-gradient-to-r from-[#FEDA24] to-[#FAAE25] text-mw-dark-navy hover:opacity-90 rounded-lg shadow-md transform transition-all duration-150 hover:shadow-xl active:scale-95"
            disabled={selectedScenarioIds.length !== MAX_SELECTIONS}
          >
            {`${ctaLabel} (${selectedScenarioIds.length}/${MAX_SELECTIONS})`}
          </Button>
        </CardFooter>
      </Card>
      
      {onBack && (
        <div className="text-center mt-6">
            <Button
                onClick={onBack}
                variant="link"
                className="text-mw-white/70 hover:text-mw-gold"
            >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
            </Button>
        </div>
      )}

    </motion.div>
  );
} 