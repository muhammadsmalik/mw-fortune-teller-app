'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

// Helper function to calculate duration (simplified)
function calculateDuration(startsAt, endsAt) {
  if (!startsAt) return 'N/A';
  const startDate = new Date(startsAt.year, startsAt.month - 1, startsAt.day);
  const endDate = endsAt ? new Date(endsAt.year, endsAt.month - 1, endsAt.day) : new Date();

  let years = endDate.getFullYear() - startDate.getFullYear();
  let months = endDate.getMonth() - startDate.getMonth();

  if (months < 0) {
    years--;
    months += 12;
  }
  
  let durationString = '';
  if (years > 0) {
    durationString += `${years} year${years > 1 ? 's' : ''}`;
  }
  if (months > 0) {
    if (durationString.length > 0) durationString += ', ';
    durationString += `${months} month${months > 1 ? 's' : ''}`;
  }
  if (!durationString) durationString = 'Less than a month';

  const startStr = `${startDate.toLocaleString('default', { month: 'short' })} ${startDate.getFullYear()}`;
  const endStr = endsAt ? `${endDate.toLocaleString('default', { month: 'short' })} ${endDate.getFullYear()}` : 'Present';

  return `${startStr} - ${endStr} (${durationString})`;
}

// Helper to summarize LinkedIn data
function summarizeLinkedInData(linkedInData) {
  if (!linkedInData || typeof linkedInData !== 'object') return null;

  const profile = linkedInData.profileData || {};

  const experiences = (profile.experiences || []).map(exp => ({
    title: exp.title || 'N/A',
    company: exp.company || 'N/A',
    description: exp.description || 'N/A',
    duration: calculateDuration(exp.starts_at, exp.ends_at)
  }));

  const education = (profile.education || []).map(edu => ({
    degree: edu.degree_name || 'N/A',
    fieldOfStudy: edu.field_of_study || 'N/A',
    school: edu.school || 'N/A'
  }));

  let skills = [];
  if (profile.skills && Array.isArray(profile.skills)) {
    skills = profile.skills.map(skill => typeof skill === 'string' ? skill : skill.name).filter(Boolean);
  } else if (typeof profile.skills === 'string') { // some proxycurl versions might return string CSV
    skills = profile.skills.split(',').map(s => s.trim()).filter(Boolean);
  }
  

  const keyAccomplishments = [];
  (profile.accomplishment_honors_awards || []).forEach(a => a.title && keyAccomplishments.push(`Award: ${a.title}`));
  (profile.accomplishment_publications || []).forEach(p => p.title && keyAccomplishments.push(`Publication: ${p.title}`));
  (profile.accomplishment_projects || []).forEach(pr => pr.title && keyAccomplishments.push(`Project: ${pr.title}`));
  (profile.articles || []).forEach(art => art.title && keyAccomplishments.push(`Article: ${art.title}`));

  return {
    fullName: profile.full_name || 'N/A',
    headline: profile.headline || 'N/A',
    summary: profile.summary || 'N/A',
    occupation: profile.occupation || 'N/A',
    industry: profile.industry || (linkedInData.latestCompanyData ? linkedInData.latestCompanyData.industry : 'N/A'),
    experiences,
    education,
    skills,
    keyAccomplishments
  };
}

export default function ArchetypeDiscoveryPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [archetypeInsightData, setArchetypeInsightData] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [userName, setUserName] = useState('');
  const fetchInitiatedRef = useRef(false);

  const fetchArchetypeData = useCallback(async () => {
    setIsLoading(true);
    setApiError(null);
    console.log("fetchArchetypeData called");

    try {
      const storedLinkedInData = localStorage.getItem('fetchedLinkedInData');
      const storedManualData = localStorage.getItem('userInfoForFortune');
      const storedFullName = localStorage.getItem('fortuneApp_fullName') || 'Guest';
      setUserName(storedFullName);

      let userDataPayload = {};

      if (storedLinkedInData) {
        const parsedLinkedInData = JSON.parse(storedLinkedInData);
        const summarizedData = summarizeLinkedInData(parsedLinkedInData);
        if (summarizedData) {
            userDataPayload.linkedInProfileSummary = summarizedData;
        } else {
            console.warn("LinkedIn data was present but could not be summarized. Checking for manual data.");
            if (storedManualData) {
                 userDataPayload.manualData = JSON.parse(storedManualData);
            } else {
                throw new Error("No valid user data available for archetype matching after failing to summarize LinkedIn data.");
            }
        }
      } else if (storedManualData) {
        userDataPayload.manualData = JSON.parse(storedManualData);
      } else {
        throw new Error("No user data found in local storage for archetype matching.");
      }
      
      if (userDataPayload.manualData && !userDataPayload.manualData.fullName && storedFullName !== 'Guest') {
        userDataPayload.manualData.fullName = storedFullName;
      }

      const response = await fetch('/api/match-archetype', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            userData: userDataPayload,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API request failed with status ${response.status}`);
      }

      const data = await response.json();
      setArchetypeInsightData(data);
      console.log("Archetype data fetched and set", data);
    } catch (error) {
      console.error("Failed to fetch archetype data:", error);
      setApiError(error.message);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    console.log("useEffect for fetchArchetypeData triggered");
    if (!fetchInitiatedRef.current) {
      console.log("Initiating fetch...");
      fetchArchetypeData();
      fetchInitiatedRef.current = true;
    } else {
      console.log("Fetch already initiated, skipping.");
    }
  }, [fetchArchetypeData]);

  if (isLoading) {
    return <div style={{ textAlign: 'center', marginTop: '50px' }}>Loading your archetype...</div>;
  }

  if (apiError) {
    return (
      <div style={{ textAlign: 'center', marginTop: '50px', color: 'red' }}>
        <h2>Error</h2>
        <p>{apiError}</p>
        <button onClick={() => router.push('/')}>Start New Fortune</button>
      </div>
    );
  }

  if (!archetypeInsightData) {
    return (
      <div style={{ textAlign: 'center', marginTop: '50px' }}>
        <p>Could not retrieve your archetype data. Please try again.</p>
        <button onClick={() => router.push('/')}>Start New Fortune</button>
      </div>
    );
  }

  const { userMatchedArchetype, mwEmpowerment, suggestedConferenceConnection, overallNarrative } = archetypeInsightData;

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>{overallNarrative || "Discover Your Conference Archetype!"}</h1>
      <p>Hello, {userName}!</p>

      {userMatchedArchetype && (
        <div style={{ border: '1px solid #ccc', padding: '15px', margin: '15px 0' }}>
          <h2>Your Archetype: {userMatchedArchetype.name}</h2>
          <p>{userMatchedArchetype.explanation}</p>
        </div>
      )}

      {mwEmpowerment && (
        <div style={{ border: '1px solid #ccc', padding: '15px', margin: '15px 0' }}>
          <h2>{mwEmpowerment.title}</h2>
          <p>{mwEmpowerment.advice}</p>
        </div>
      )}

      {suggestedConferenceConnection && (
        <div style={{ border: '1px solid #ccc', padding: '15px', margin: '15px 0' }}>
          <h2>Connect & Collaborate</h2>
          {suggestedConferenceConnection.profileImageURL && (
            <div style={{ marginBottom: '10px' }}>
              <Image 
                src={suggestedConferenceConnection.profileImageURL}
                alt={`Profile picture of ${suggestedConferenceConnection.attendeeName}`}
                width={100} 
                height={100} 
                style={{ borderRadius: '50%', objectFit: 'cover' }} 
              />
            </div>
          )}
          <p>
            Meet: <strong>{suggestedConferenceConnection.attendeeName}</strong>
            <br />
            Their Archetype: {suggestedConferenceConnection.attendeeArchetype}
          </p>
          <p>Why connect? {suggestedConferenceConnection.connectionReason}</p>
        </div>
      )}

      <button 
        onClick={() => router.push('/')}
        style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}
      >
        Start New Fortune
      </button>
    </div>
  );
} 