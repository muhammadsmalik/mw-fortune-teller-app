'use client';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users, Building, Combine } from 'lucide-react';
import { motion } from 'framer-motion';

const personas = [
  { key: 'publisher', name: 'Publisher', icon: Building, description: "You own the spaces and screens where stories unfold." },
  { key: 'advertiser', name: 'Advertiser', icon: Users, description: "You seek the right audience to hear your message." },
  { key: 'platform', name: 'Platform / Service Provider', icon: Combine, description: "You build the bridges that connect advertisers to publishers." },
];

export default function PersonaSelect({ onPersonaSelected }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <Card className="bg-card/70 backdrop-blur-sm rounded-lg shadow-xl w-full">
        <CardHeader className="text-center pt-8">
          <CardTitle className="text-mw-light-blue font-bold tracking-wide text-3xl">
            To chart your course, I must first know who you are.
          </CardTitle>
          <p className="text-mw-white/70 text-lg mt-2">
            Choose your path.
          </p>
        </CardHeader>
        <CardContent className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {personas.map((persona, index) => {
              const Icon = persona.icon;
              return (
                <motion.div
                  key={persona.key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Button
                    onClick={() => onPersonaSelected(persona.key)}
                    variant="outline"
                    className="h-full w-full p-6 flex flex-col items-center justify-start text-center space-y-4 border-2 border-mw-light-blue/40 hover:border-mw-gold hover:bg-mw-light-blue/10 transition-all duration-200 group"
                  >
                    <Icon className="h-12 w-12 text-mw-gold group-hover:scale-110 transition-transform" />
                    <div className="flex flex-col">
                        <span className="text-xl font-semibold text-mw-white">{persona.name}</span>
                        <p className="text-mw-white/60 text-sm font-normal mt-1">{persona.description}</p>
                    </div>
                  </Button>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
} 