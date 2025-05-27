import { NextResponse } from 'next/server';
import fs from 'fs/promises'; // Using promises version of fs
import path from 'path';

// Path to your JSON file
const scenariosFilePath = path.join(process.cwd(), 'lib', 'predefined_scenarios.json');

export async function POST(request) {
  try {
    const body = await request.json();
    const { selectedScenarios } = body; // These will be the *IDs* of the selected scenarios

    if (!selectedScenarios || !Array.isArray(selectedScenarios) || selectedScenarios.length === 0) {
      return NextResponse.json({ error: 'Selected scenarios are required and must be an array.' }, { status: 400 });
    }
    if (selectedScenarios.length > 4) {
        return NextResponse.json({ error: 'Maximum of four scenarios can be processed at once.' }, { status: 400 });
    }

    // Read the predefined scenarios from the JSON file
    const fileContents = await fs.readFile(scenariosFilePath, 'utf8');
    const allScenarios = JSON.parse(fileContents);

    // TODO: In a future phase, this section would be replaced with a call to OpenAI,
    // potentially using the `selectedScenarios` text and `userContext` to generate dynamic insights.
    // For now, we find the predefined answers based on the IDs passed from the frontend.

    const answers = selectedScenarios.map(selectedId => {
      const foundScenario = allScenarios.find(s => s.id === selectedId);
      if (foundScenario) {
        return {
          scenario: foundScenario.displayText, // Or perhaps the full object if needed by frontend
          insight: foundScenario.details // Send the whole details object
        };
      }
      return {
        scenario: `Scenario with ID ${selectedId} not found`,
        insight: { subQuestion: "N/A", howMWHelps: [], businessImpact: "Details not available." }
      };
    });

    return NextResponse.json({ scenarioAnswers: answers });

  } catch (error) {
    console.error('Error in /api/generate-scenario-answers:', error);
    // Check if it's a file system error (e.g., file not found)
    if (error.code === 'ENOENT') {
        return NextResponse.json({ error: 'Scenario data file not found on server.' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Failed to generate scenario answers.', details: error.message }, { status: 500 });
  }
} 