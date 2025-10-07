'use client';

import { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import personaQuestions from '@/lib/persona_questions.json';
import questionPlatformMapping from '@/lib/question_platform_mapping.json';

const MAX_SELECTIONS = 2;

// 7 Universal Tarot Cards (not persona-specific)
const allCards = [
    { id: 'architect', name: 'The Architect', platform: 'Studio', image: 'architect.jpg' },
    { id: 'navigator', name: 'The Navigator', platform: 'Planner', image: 'navigator.jpg' },
    { id: 'connector', name: 'The Connector', platform: 'Influence', image: 'connector.jpg' },
    { id: 'magician', name: 'The Magician', platform: 'Activate', image: 'magician.jpg' },
    { id: 'merchant', name: 'The Merchant', platform: 'Market', image: 'merchant.jpg' },
    { id: 'judge', name: 'The Judge', platform: 'Measure', image: 'judge.jpg' },
    { id: 'oracle', name: 'The Oracle', platform: 'Science', image: 'oracle.jpg' },
];


export default function TacticalCardSelection({
    persona,
    selectedQuestionIds = [], // NEW: Array of question IDs user selected
    onConfirm,
    onBack
}) {
    const [selectedIds, setSelectedIds] = useState([]);
    const [error, setError] = useState(null);
    const [isReady, setIsReady] = useState(false);

    // Use questions based on the persona (KEEP for backward compatibility)
    const questions = useMemo(() => {
        if (!persona || !personaQuestions[persona]) return [];
        return personaQuestions[persona].questions || [];
    }, [persona]);

    // Determine which 2 cards should glow (based on selected questions)
    const guidedCardIds = useMemo(() => {
        try {
            if (!persona || !selectedQuestionIds || selectedQuestionIds.length === 0) return [];
            if (!questionPlatformMapping || !questionPlatformMapping[persona]) return [];

            // Map tarot card name to card id
            const cardNameToId = {
                'The Architect': 'architect',
                'The Navigator': 'navigator',
                'The Connector': 'connector',
                'The Magician': 'magician',
                'The Merchant': 'merchant',
                'The Judge': 'judge',
                'The Oracle': 'oracle',
            };

            return selectedQuestionIds.map(questionId => {
                const mapping = questionPlatformMapping[persona]?.[questionId];
                if (!mapping) return null;
                return cardNameToId[mapping.tarotCard];
            }).filter(Boolean);
        } catch (error) {
            console.error('[TacticalCardSelection] Error in guidedCardIds:', error);
            return [];
        }
    }, [persona, selectedQuestionIds]);

    useEffect(() => {
        // A short delay to allow for a transition animation from the parent
        const timer = setTimeout(() => setIsReady(true), 500);
        return () => clearTimeout(timer);
    }, []);

    const handleSelectCard = (id) => {
        setError(null);
        setSelectedIds(prev => {
            if (prev.includes(id)) {
                return prev.filter(cardId => cardId !== id);
            }
            if (prev.length < MAX_SELECTIONS) {
                return [...prev, id];
            }
            return prev;
        });
    };

    const handleConfirm = () => {
        if (selectedIds.length !== MAX_SELECTIONS) {
            setError(`Please select exactly ${MAX_SELECTIONS} powers to command.`);
            return;
        }
        onConfirm({ scenarios: selectedIds });
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.3,
            }
        }
    };

    const cardVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } }
    };

    const renderCards = () => {
        return (
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6 max-w-6xl w-full"
            >
                {allCards.map((card) => {
                    const isSelected = selectedIds.includes(card.id);
                    const isGuided = guidedCardIds.includes(card.id);
                    const imagePath = `/tarot_cards/${card.image}`;

                    return (
                        <motion.div
                            key={card.id}
                            variants={cardVariants}
                            onClick={() => handleSelectCard(card.id)}
                            className={`relative cursor-pointer rounded-xl border-4 transition-all duration-300 transform hover:scale-105
                                        ${isSelected ? 'border-mw-gold shadow-2xl shadow-mw-gold/20 scale-105' : 'border-transparent'}
                                        ${isGuided && !isSelected ? 'ring-4 ring-mw-gold shadow-lg shadow-mw-gold/30' : ''}`}
                        >
                            <Image
                                src={imagePath}
                                alt={`${card.name} - ${card.platform}`}
                                width={400}
                                height={600}
                                className="rounded-lg w-full h-full object-cover"
                            />
                            <AnimatePresence>
                                {isSelected && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center"
                                    >
                                        <CheckCircle className="h-24 w-24 text-mw-gold" />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    );
                })}
            </motion.div>
        );
    };

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-mw-dark-navy text-mw-white p-4 sm:p-8 overflow-hidden">
            <AnimatePresence>
                {isReady && (
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="text-center mb-8 z-10"
                    >
                        <h1 className="text-4xl font-morrison bg-gradient-to-r from-mw-gold via-yellow-300 to-mw-gold bg-clip-text text-transparent tracking-wider">
                            The Instruments of Fate
                        </h1>
                        <p className="text-mw-white/80 mt-2 text-lg font-caveat">
                            Six powers lie before you. Choose the two you wish to command.
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {allCards.length > 0 ? (
                <div className="w-full flex justify-center">
                    {renderCards()}
                </div>
            ) : (
                <div className="flex items-center text-lg text-mw-white/70">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Summoning the cards...
                </div>
            )}

            <div className="mt-8 z-10 w-full max-w-6xl flex flex-col items-center">
                {error && <p className="text-red-400 mb-4">{error}</p>}
                <Button
                    onClick={handleConfirm}
                    disabled={selectedIds.length !== MAX_SELECTIONS}
                    size="lg"
                    className="px-8 py-3 text-lg font-semibold bg-gradient-to-r from-[#FEDA24] to-[#FAAE25] text-mw-dark-navy hover:opacity-90 rounded-lg shadow-md transform transition-all duration-150 hover:shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {`Forge My Blueprint (${selectedIds.length}/${MAX_SELECTIONS})`}
                </Button>
            </div>

            <div className="absolute bottom-6 left-6 z-20">
                <Button
                    onClick={onBack}
                    variant="outline"
                    className="border-mw-light-blue/50 text-mw-light-blue hover:bg-mw-light-blue/10 hover:text-white"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Return to the Vision
                </Button>
            </div>
        </div>
    );
} 