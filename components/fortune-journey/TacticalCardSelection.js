'use client';

import { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ArrowLeft, ShieldCheck, PieChart, Map, Wand, Store, ClipboardList, Target, Layers, GitMerge, Database, FileText, Cpu, Users, AppWindow, TestTube, CheckCircle } from 'lucide-react';
import personaQuestions from '@/lib/persona_questions.json';

const MAX_SELECTIONS = 2;

// Mapping icons for other personas (fallback)
const iconMapping = {
    // Platform / Service Provider
    'ROI: Clean Room Attribution?': <ShieldCheck className="h-12 w-12 mx-auto text-mw-gold" />,
    "Budget: DOOH's Digital Share?": <PieChart className="h-12 w-12 mx-auto text-mw-gold" />,
    'Programmatic: Prime vs. Audience Mix?': <Map className="h-12 w-12 mx-auto text-mw-gold" />,
    'Creative: Affordable Dynamic Ads?': <Wand className="h-12 w-12 mx-auto text-mw-gold" />,
    'Integration: Retail Media Sync?': <Store className="h-12 w-12 mx-auto text-mw-gold" />,
    'Audience: Unified KPIs?': <ClipboardList className="h-12 w-12 mx-auto text-mw-gold" />,
    // Advertiser
    'ROI: Linking DOOH to Sales?': <Target className="h-12 w-12 mx-auto text-mw-gold" />,
    'Creative: Dynamic Content for Recall?': <Layers className="h-12 w-12 mx-auto text-mw-gold" />,
    'Integration: Incremental Reach?': <GitMerge className="h-12 w-12 mx-auto text-mw-gold" />,
    'Audience: 1st-Party Data Activation?': <Database className="h-12 w-12 mx-auto text-mw-gold" />,
    // Publisher
    'Data: Unified Audience Graphs?': <Database className="h-12 w-12 mx-auto text-mw-gold" />,
    'Marketing: Inbound Case Studies?': <FileText className="h-12 w-12 mx-auto text-mw-gold" />,
    'Distribution: Vertical SaaS APIs?': <AppWindow className="h-12 w-12 mx-auto text-mw-gold" />,
    'Technology: Low-Code CRM?': <Cpu className="h-12 w-12 mx-auto text-mw-gold" />,
    'People: Audience Architects?': <Users className="h-12 w-12 mx-auto text-mw-gold" />,
    'Products: Dynamic Trial Campaigns?': <TestTube className="h-12 w-12 mx-auto text-mw-gold" />,
};

export default function TacticalCardSelection({ persona, onConfirm, onBack }) {
    const [selectedIds, setSelectedIds] = useState([]);
    const [error, setError] = useState(null);
    const [isReady, setIsReady] = useState(false);
    
    // Use tactical questions based on the persona
    const questions = useMemo(() => {
        if (!persona || !personaQuestions[persona]) return [];
        return personaQuestions[persona].tactical || [];
    }, [persona]);

    const personaPathConfig = {
        brand_owner: { prefix: 'adv', folder: 'brand_owner' },
        media_owner: { prefix: 'pub', folder: 'media_owner' },
        media_agency: { prefix: 'plat', folder: 'media_agency' }
    };

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
        const config = personaPathConfig[persona];
        if (!config) {
            // Fallback for an unknown persona, though this case is unlikely.
            // This preserves the icon-based view if a new persona is added without card images.
            return (
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl w-full z-10"
                >
                    {questions.map(q => {
                        const isSelected = selectedIds.includes(q.id);
                        const icon = iconMapping[q.crisp] || <ShieldCheck className="h-12 w-12 mx-auto text-mw-gold" />;
                        return (
                            <motion.div
                                key={q.id}
                                variants={cardVariants}
                                onClick={() => handleSelectCard(q.id)}
                                className={`cursor-pointer rounded-lg border-2 p-6 text-center transition-all duration-300 transform hover:scale-105 relative
                                            ${isSelected ? 'border-mw-gold bg-mw-gold/10 shadow-2xl shadow-mw-gold/20' : 'border-mw-light-blue/30 bg-mw-dark-blue/40 hover:border-mw-gold/50'}`}
                            >
                                <AnimatePresence>
                                    {isSelected && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.5 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.5 }}
                                            className="absolute top-3 right-3 bg-mw-dark-navy p-1 rounded-full"
                                        >
                                            <CheckCircle className="h-6 w-6 text-mw-gold" />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                <div className="mb-4">{icon}</div>
                                <h3 className="text-xl font-bold text-mw-light-blue mb-2 h-14 flex items-center justify-center">{q.crisp}</h3>
                                <p className="text-mw-white/70 text-sm h-20">{q.text}</p>
                            </motion.div>
                        );
                    })}
                </motion.div>
            );
        }

        return (
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl w-full"
            >
                {questions.map((q, index) => {
                    const isSelected = selectedIds.includes(q.id);
                    const imagePath = `/tactical_cards/${config.folder}/${config.prefix}_${index + 1}.png`;
                    return (
                        <motion.div
                            key={q.id}
                            variants={cardVariants}
                            onClick={() => handleSelectCard(q.id)}
                            className={`relative cursor-pointer rounded-xl border-4 transition-all duration-300 transform hover:scale-105
                                        ${isSelected ? 'border-mw-gold shadow-2xl shadow-mw-gold/20 scale-105' : 'border-transparent'}`}
                        >
                            <Image
                                src={imagePath}
                                alt={`A tarot card representing the question: ${q.text}`}
                                width={500}
                                height={750}
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

            {questions.length > 0 ? (
                <div className="w-full flex justify-center">
                    {renderCards()}
                </div>
            ) : (
                <div className="flex items-center text-lg text-mw-white/70">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Summoning the instruments...
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